import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Cable, Copy, Check, Plus, Trash2, RotateCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";

type Message = { id: number; direction: string; from_user_id: string; to_user_id: string; content: string; created_at: number };

export function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bot, setBot] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [tab, setTab] = useState<"chat" | "channels">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadBot() {
    const bots = await api.listBots();
    setBot((bots || []).find((b: any) => b.id === id) || null);
  }

  async function loadSubs() {
    const all = await api.listSublevels();
    setSubs((all || []).filter((s: any) => s.bot_db_id === id));
  }

  async function loadMessages() {
    if (!id) return;
    const data = await api.messages(id, 200);
    setMessages((data || []).reverse());
  }

  useEffect(() => { loadBot(); loadSubs(); loadMessages(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !id) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/bots/" + id + "/send", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("context token")) {
          setSendError("请先从微信给 Bot 发一条消息，建立会话后才能回复");
        } else if (msg.includes("not connected")) {
          setSendError("Bot 未连接，请返回重新连接");
        } else {
          setSendError(msg || "发送失败");
        }
      } else {
        setInput("");
        setTimeout(loadMessages, 500);
      }
    } catch {
      setSendError("网络错误");
    }
    setSending(false);
  }

  if (!bot) return <p className="text-sm text-[var(--muted-foreground)] p-8">加载中...</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)] shrink-0">
        <Link to="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm">{bot.name}</h2>
          <p className="text-xs text-[var(--muted-foreground)] font-mono truncate">{bot.bot_id}</p>
        </div>
        <Badge variant={bot.status === "connected" ? "default" : "outline"}>{bot.status}</Badge>
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
          <button className={`px-3 py-1 text-xs cursor-pointer ${tab === "chat" ? "bg-[var(--secondary)]" : "text-[var(--muted-foreground)]"}`} onClick={() => setTab("chat")}>消息</button>
          <button className={`px-3 py-1 text-xs cursor-pointer ${tab === "channels" ? "bg-[var(--secondary)]" : "text-[var(--muted-foreground)]"}`} onClick={() => setTab("channels")}>通道</button>
        </div>
      </div>

      {tab === "chat" ? (
        <div className="flex-1 flex flex-col overflow-hidden mt-3 rounded-xl border border-[var(--border)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.map((m) => {
              const isIn = m.direction === "inbound";
              return (
                <div key={m.id} className={`flex ${isIn ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                    isIn ? "bg-[var(--secondary)] rounded-bl-sm" : "bg-[var(--primary)] text-[var(--primary-foreground)] rounded-br-sm"
                  }`}>
                    {m.content}
                    <div className={`text-[10px] mt-1 ${isIn ? "text-[var(--muted-foreground)]" : "opacity-50"}`}>
                      {new Date(m.created_at * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <p className="text-center text-xs text-[var(--muted-foreground)] py-12">暂无消息</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Send */}
          {sendError && (
            <div className="px-4 py-2 text-xs text-[var(--destructive)] bg-[var(--secondary)] border-t border-[var(--border)]">
              {sendError}
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-[var(--border)] shrink-0">
            <Input
              value={input}
              onChange={(e) => { setInput(e.target.value); setSendError(""); }}
              placeholder="输入消息..."
              className="h-9 text-sm flex-1"
            />
            <Button type="submit" size="sm" disabled={sending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      ) : (
        <ChannelsTab botId={id!} subs={subs} onRefresh={loadSubs} />
      )}
    </div>
  );
}

function ChannelsTab({ botId, subs, onRefresh }: { botId: string; subs: any[]; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [showDocs, setShowDocs] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    await api.createSublevel(botId, name);
    setName("");
    setCreating(false);
    onRefresh();
  }

  return (
    <div className="space-y-3 mt-4">
      {subs.map((sub) => <SubRow key={sub.id} sub={sub} onRefresh={onRefresh} />)}
      {creating ? (
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="通道名称" className="h-8 text-sm" autoFocus />
          <Button type="submit" size="sm">创建</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>取消</Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="w-full">
          <Plus className="w-4 h-4 mr-1" /> 添加通道
        </Button>
      )}

      <button onClick={() => setShowDocs(!showDocs)} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] cursor-pointer">
        {showDocs ? "收起" : "查看"} WebSocket 协议说明
      </button>
      {showDocs && <WsProtocolDocs />}
    </div>
  );
}

function WsProtocolDocs() {
  return (
    <div className="text-xs text-[var(--muted-foreground)] space-y-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <p className="font-medium text-[var(--foreground)]">WebSocket 协议说明</p>
      <p>所有消息均为 JSON 格式，包含 <code className="text-[var(--primary)]">type</code> 字段标识消息类型。</p>

      <div>
        <p className="font-medium text-[var(--foreground)] mt-3 mb-1">连接后自动收到：init</p>
        <pre className="bg-[var(--card)] p-2 rounded overflow-x-auto">{`{
  "type": "init",
  "data": {
    "sublevel_id": "uuid",
    "sublevel_name": "通道名",
    "bot_db_id": "uuid",
    "bot_status": "connected"
  }
}`}</pre>
      </div>

      <div>
        <p className="font-medium text-[var(--foreground)] mt-3 mb-1">收到微信消息：message</p>
        <pre className="bg-[var(--card)] p-2 rounded overflow-x-auto">{`{
  "type": "message",
  "data": {
    "seq_id": 123,
    "message_id": 456,
    "from_user_id": "xxx@im.wechat",
    "timestamp": 1711100000000,
    "items": [
      { "type": "text", "text": "你好" },
      { "type": "image" },
      { "type": "voice", "text": "语音转文字" },
      { "type": "file", "file_name": "doc.pdf" },
      { "type": "video" }
    ]
  }
}`}</pre>
      </div>

      <div>
        <p className="font-medium text-[var(--foreground)] mt-3 mb-1">Bot 状态变化：bot_status</p>
        <pre className="bg-[var(--card)] p-2 rounded overflow-x-auto">{`{
  "type": "bot_status",
  "data": { "bot_id": "uuid", "status": "disconnected" }
}`}</pre>
        <p className="mt-1">status: connected / disconnected / error / session_expired</p>
      </div>

      <div>
        <p className="font-medium text-[var(--foreground)] mt-3 mb-1">发送消息（客户端 → 服务端）</p>
        <pre className="bg-[var(--card)] p-2 rounded overflow-x-auto">{`{
  "type": "send_text",
  "req_id": "自定义请求ID",
  "data": {
    "to_user_id": "xxx@im.wechat",
    "text": "回复内容"
  }
}`}</pre>
      </div>

      <div>
        <p className="font-medium text-[var(--foreground)] mt-3 mb-1">发送确认：send_ack</p>
        <pre className="bg-[var(--card)] p-2 rounded overflow-x-auto">{`{
  "type": "send_ack",
  "data": {
    "req_id": "自定义请求ID",
    "success": true,
    "client_id": "sdk-xxx",
    "error": ""
  }
}`}</pre>
      </div>

      <div>
        <p className="font-medium text-[var(--foreground)] mt-3 mb-1">心跳</p>
        <p>发送 <code className="text-[var(--primary)]">{`{"type":"ping"}`}</code>，收到 <code className="text-[var(--primary)]">{`{"type":"pong"}`}</code></p>
      </div>

      <div>
        <p className="font-medium text-[var(--foreground)] mt-3 mb-1">测试命令</p>
        <pre className="bg-[var(--card)] p-2 rounded overflow-x-auto">node example/ws-test.mjs "ws://host:port/api/ws?key=API_KEY"</pre>
      </div>
    </div>
  );
}

function SubRow({ sub, onRefresh }: { sub: any; onRefresh: () => void }) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWs, setCopiedWs] = useState(false);

  const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProto}//${location.host}/api/ws?key=${sub.api_key}`;

  function copyKey() {
    navigator.clipboard.writeText(sub.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }
  function copyWs() {
    navigator.clipboard.writeText(wsUrl);
    setCopiedWs(true);
    setTimeout(() => setCopiedWs(false), 2000);
  }

  return (
    <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cable className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          <span className="text-sm font-medium">{sub.name}</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={async () => { if (confirm("重新生成 Key？")) { await api.rotateKey(sub.id); onRefresh(); } }}>
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => { if (confirm("删除？")) { await api.deleteSublevel(sub.id); onRefresh(); } }}>
            <Trash2 className="w-3.5 h-3.5 text-[var(--destructive)]" />
          </Button>
        </div>
      </div>

      <CopyRow label="API Key" value={sub.api_key} copied={copiedKey} onCopy={copyKey} />
      <CopyRow label="WebSocket" value={wsUrl} copied={copiedWs} onCopy={copyWs} />
    </div>
  );
}

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--muted-foreground)] w-16 shrink-0">{label}</span>
      <code className="flex-1 text-[10px] text-[var(--muted-foreground)] font-mono bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 truncate select-all">
        {value}
      </code>
      <button onClick={onCopy} className="cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] shrink-0">
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
