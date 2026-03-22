package sink

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/dop251/goja"
	"github.com/openilink/openilink-hub/internal/provider"
)

// Webhook pushes messages to a configured HTTP endpoint.
// If webhook_script is set, runs the JS script to transform the request.
type Webhook struct{}

func (s *Webhook) Name() string { return "webhook" }

func (s *Webhook) Handle(d Delivery) {
	cfg := d.Channel.WebhookConfig
	if cfg.URL == "" {
		return
	}

	msg := webhookPayload{
		Event:     "message",
		ChannelID: d.Channel.ID,
		BotID:     d.BotDBID,
		SeqID:     d.SeqID,
		Sender:    d.Message.Sender,
		MsgType:   d.MsgType,
		Content:   d.Content,
		Timestamp: d.Message.Timestamp,
		Items:     d.Message.Items,
	}

	if cfg.Script != "" {
		s.handleWithScript(d, msg)
	} else {
		s.handleDefault(d, msg)
	}
}

// handleDefault sends the standard webhook payload.
func (s *Webhook) handleDefault(d Delivery, msg webhookPayload) {
	cfg := d.Channel.WebhookConfig
	body, _ := json.Marshal(msg)
	req, err := http.NewRequest("POST", cfg.URL, bytes.NewReader(body))
	if err != nil {
		slog.Error("webhook build failed", "channel", d.Channel.ID, "err", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Event", "message")
	req.Header.Set("X-Hub-Channel", d.Channel.ID)
	applyWebhookAuth(req, cfg.Auth, body)
	doWebhook(req, d.Channel.ID)
}

// handleWithScript runs the user's JS script to build the request.
//
// Script API:
//
//	// `msg` is the message object with fields:
//	//   event, channel_id, bot_id, seq_id, sender, msg_type, content, timestamp, items
//	//
//	// Return an object to send:
//	//   { url?, headers?, body }
//	// Return null/undefined to skip.
//	//
//	// Examples:
//	//   Slack:    ({body: JSON.stringify({text: msg.sender + ": " + msg.content})})
//	//   Custom:   ({url: "https://x.com/api", headers: {"X-Token": "abc"}, body: JSON.stringify(msg)})
//	//   Filter:   if (msg.msg_type !== "text") null; else ({body: JSON.stringify({text: msg.content})})
func (s *Webhook) handleWithScript(d Delivery, msg webhookPayload) {
	cfg := d.Channel.WebhookConfig
	vm := goja.New()
	vm.SetFieldNameMapper(goja.TagFieldNameMapper("json", true))

	vm.Set("msg", msg)

	result, err := vm.RunString(cfg.Script)
	if err != nil {
		slog.Error("webhook script error", "channel", d.Channel.ID, "err", err)
		return
	}

	// null/undefined = skip
	if result == nil || goja.IsNull(result) || goja.IsUndefined(result) {
		return
	}

	// Extract result object
	obj := result.Export()
	m, ok := obj.(map[string]any)
	if !ok {
		slog.Error("webhook script must return object or null", "channel", d.Channel.ID)
		return
	}

	url := cfg.URL
	if u, ok := m["url"].(string); ok && u != "" {
		url = u
	}

	// Body
	bodyStr, _ := m["body"].(string)
	if bodyStr == "" {
		// Default to JSON of msg
		b, _ := json.Marshal(msg)
		bodyStr = string(b)
	}

	req, err := http.NewRequest("POST", url, strings.NewReader(bodyStr))
	if err != nil {
		slog.Error("webhook build failed", "channel", d.Channel.ID, "err", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Script headers
	if headers, ok := m["headers"].(map[string]any); ok {
		for k, v := range headers {
			if vs, ok := v.(string); ok {
				req.Header.Set(k, vs)
			}
		}
	}

	if cfg.Auth != "" && req.Header.Get("Authorization") == "" {
		applyWebhookAuth(req, cfg.Auth, []byte(bodyStr))
	}

	doWebhook(req, d.Channel.ID)
}

func doWebhook(req *http.Request, channelID string) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Error("webhook delivery failed", "channel", channelID, "err", err)
		return
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		slog.Warn("webhook returned error", "channel", channelID, "status", resp.StatusCode)
	}
}

func applyWebhookAuth(req *http.Request, secret string, body []byte) {
	if secret == "" {
		return
	}
	if strings.HasPrefix(secret, "bearer:") {
		req.Header.Set("Authorization", "Bearer "+secret[7:])
		return
	}
	if strings.HasPrefix(secret, "header:") {
		parts := strings.SplitN(secret[7:], ":", 2)
		if len(parts) == 2 {
			req.Header.Set(parts[0], parts[1])
		}
		return
	}
	key := secret
	if strings.HasPrefix(secret, "hmac:") {
		key = secret[5:]
	}
	mac := hmac.New(sha256.New, []byte(key))
	mac.Write(body)
	sig := hex.EncodeToString(mac.Sum(nil))
	req.Header.Set("X-Hub-Signature", "sha256="+sig)
}

type webhookPayload struct {
	Event     string                 `json:"event"`
	ChannelID string                 `json:"channel_id"`
	BotID     string                 `json:"bot_id"`
	SeqID     int64                  `json:"seq_id"`
	Sender    string                 `json:"sender"`
	MsgType   string                 `json:"msg_type"`
	Content   string                 `json:"content"`
	Timestamp int64                  `json:"timestamp"`
	Items     []provider.MessageItem `json:"items"`
}
