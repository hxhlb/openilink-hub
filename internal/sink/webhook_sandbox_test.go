package sink

import (
	"strings"
	"testing"
)

func TestScriptTimeout(t *testing.T) {
	s := &Webhook{}
	script := `function onRequest(ctx) { while(true) {} }`
	_, _, _, _, err := s.runScript(script, webhookPayload{}, &reqData{
		URL: "http://localhost", Method: "POST", Headers: map[string]string{},
	}, "test")
	if err == nil {
		t.Fatal("expected timeout error")
	}
	if !strings.Contains(err.Error(), "timeout") {
		t.Fatalf("expected timeout, got: %v", err)
	}
}

func TestScriptStackOverflow(t *testing.T) {
	s := &Webhook{}
	script := `function onRequest(ctx) { onRequest(ctx); }`
	_, _, _, _, err := s.runScript(script, webhookPayload{}, &reqData{
		URL: "http://localhost", Method: "POST", Headers: map[string]string{},
	}, "test")
	if err == nil {
		t.Fatal("expected stack overflow error")
	}
	t.Logf("stack overflow error: %v", err)
}

func TestScriptEvalDisabled(t *testing.T) {
	s := &Webhook{}
	script := `function onRequest(ctx) { eval("1+1"); }`
	_, _, _, _, err := s.runScript(script, webhookPayload{}, &reqData{
		URL: "http://localhost", Method: "POST", Headers: map[string]string{},
	}, "test")
	if err == nil {
		t.Fatal("expected eval error")
	}
	t.Logf("eval error: %v", err)
}

func TestScriptFunctionConstructorDisabled(t *testing.T) {
	s := &Webhook{}
	script := `function onRequest(ctx) { var f = new Function("return 1"); }`
	_, _, _, _, err := s.runScript(script, webhookPayload{}, &reqData{
		URL: "http://localhost", Method: "POST", Headers: map[string]string{},
	}, "test")
	if err == nil {
		t.Fatal("expected Function constructor error")
	}
	t.Logf("Function constructor error: %v", err)
}

func TestScriptReplyLimit(t *testing.T) {
	s := &Webhook{}
	script := `function onRequest(ctx) { for(var i=0; i<100; i++) reply("msg"+i); }`
	_, _, replies, _, err := s.runScript(script, webhookPayload{}, &reqData{
		URL: "http://localhost", Method: "POST", Headers: map[string]string{},
	}, "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(replies) != scriptMaxReplies {
		t.Errorf("replies: got %d, want %d", len(replies), scriptMaxReplies)
	}
}

func TestScriptNormalExecution(t *testing.T) {
	s := &Webhook{}
	script := `
	function onRequest(ctx) {
		ctx.req.headers["X-Custom"] = "hello";
		ctx.req.body = JSON.stringify({text: ctx.msg.content});
	}`
	outReq, _, _, _, err := s.runScript(script, webhookPayload{Content: "test message"}, &reqData{
		URL: "http://localhost", Method: "POST", Headers: map[string]string{"Content-Type": "application/json"},
	}, "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outReq.Headers["X-Custom"] != "hello" {
		t.Errorf("header: %v", outReq.Headers)
	}
	if !strings.Contains(outReq.Body, "test message") {
		t.Errorf("body: %s", outReq.Body)
	}
}

func TestScriptSkip(t *testing.T) {
	s := &Webhook{}
	script := `function onRequest(ctx) { skip(); }`
	_, _, _, skipped, err := s.runScript(script, webhookPayload{}, &reqData{
		URL: "http://localhost", Method: "POST", Headers: map[string]string{},
	}, "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !skipped {
		t.Error("expected skipped=true")
	}
}
