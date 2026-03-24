import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Cable,
  Copy,
  Check,
  Plus,
  Trash2,
  RotateCw,
  X,
  Bot as BotIcon,
  Webhook,
  Paperclip,
  QrCode,
  Puzzle,
  MessageSquare,
  Activity,
  Settings,
  Info,
  ChevronRight,
  Zap,
  LayoutDashboard,
  Terminal,
  Cpu,
  Unplug,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import { BotAppsTab } from "./bot-apps-tab";
import { BotTracesTab } from "./bot-traces-tab";

type MessageItem = { type: string; text?: string; file_name?: string };
type Message = {
  id: number;
  bot_id?: string;
  direction: string;
  item_list: MessageItem[];
  media_status?: string;
  media_keys?: Record<string, string>;
  created_at: number;
  _sending?: boolean;
  _error?: string;
};

// --- Message Components kept from previous for functionality ---
function MessageContent({ m }: { m: Message }) {
  const items = m.item_list || [];
  if (items.length === 0) return <span className="text-muted-foreground italic">[Empty]</span>;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <p key={i} className="leading-relaxed whitespace-pre-wrap">{item.text}</p>
      ))}
    </div>
  );
}

export function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [bot, setBot] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs synced with URL
  const activeTab = location.pathname.split("/").pop() || "chat";

  const load = useCallback(async () => {
    try {
      const bots = await api.listBots();
      const target = (bots || []).find((b: any) => b.id === id);
      if (!target) throw new Error("Instance not found");
      setBot(target);
      const chs = await api.listChannels(id!);
      setChannels(chs || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "加载失败", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-20 w-full rounded-3xl" /><Skeleton className="h-96 w-full rounded-3xl" /></div>;
  if (!bot) return <div className="py-20 text-center space-y-4"><Unplug className="h-12 w-12 mx-auto opacity-20" /><p className="font-bold">未找到账号</p><Button variant="link" onClick={() => navigate("/dashboard/accounts")}>返回列表</Button></div>;

  return (
    <div className="flex flex-col gap-8 h-full">
      {/* Entity Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
            <BotIcon className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter">{bot.name}</h1>
              <Badge variant={bot.status === "connected" ? "default" : "destructive"} className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
                {bot.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
               <Cpu className="h-3 w-3" /> {bot.provider}
               <Separator orientation="vertical" className="h-3 mx-1" />
               <span className="font-mono">{bot.id.slice(0, 12)}...</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" size="sm" className="rounded-full px-4 font-bold text-xs" onClick={() => navigate("/dashboard/accounts")}>
             返回列表
           </Button>
           <Button variant="destructive" size="sm" className="rounded-full h-9 w-9 p-0 shadow-lg shadow-destructive/10">
             <Trash2 className="h-4 w-4" />
           </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: string) => navigate(`/dashboard/accounts/${id}/${v}`)} className="flex-1 flex flex-col space-y-6">
        <TabsList className="bg-muted/50 p-1 w-fit rounded-xl border border-border/50">
          <TabsTrigger value="chat" className="gap-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest"><MessageSquare className="h-3.5 w-3.5" /> 消息</TabsTrigger>
          <TabsTrigger value="channels" className="gap-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest"><Cable className="h-3.5 w-3.5" /> 转发规则</TabsTrigger>
          <TabsTrigger value="apps" className="gap-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest"><Zap className="h-3.5 w-3.5" /> 应用</TabsTrigger>
          <TabsTrigger value="traces" className="gap-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest"><Activity className="h-3.5 w-3.5" /> 日志</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 px-6 rounded-lg font-bold text-xs uppercase tracking-widest"><Settings className="h-3.5 w-3.5" /> 设置</TabsTrigger>
        </TabsList>

        <div className="flex-1">
          {activeTab === "chat" && <ChatTab botId={id!} />}
          {activeTab === "channels" && <ChannelsTab botId={id!} channels={channels} onRefresh={load} />}
          {activeTab === "apps" && <BotAppsTab botId={id!} />}
          {activeTab === "traces" && <BotTracesTab botId={id!} />}
          {activeTab === "settings" && <BotSettingsTab bot={bot} onUpdate={load} />}
        </div>
      </Tabs>
    </div>
  );
}

// ... Specific Tabs ---

function ChatTab({ botId }: { botId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await api.messages(botId, 30);
      setMessages((res.messages || []).reverse());
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 5000);
    return () => clearInterval(t);
  }, [botId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] rounded-[2rem] border bg-card/30 overflow-hidden shadow-sm">
       <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
             <Terminal className="h-4 w-4 text-primary" />
             <span className="text-xs font-bold uppercase tracking-widest">Realtime Console</span>
          </div>
          <Badge variant="outline" className="bg-background text-[10px] font-bold">LIVE STREAMING</Badge>
       </div>
       <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-start" : "justify-end"}`}>
               <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium ${m.direction === "inbound" ? "bg-background border border-border/50 text-foreground rounded-bl-none shadow-sm" : "bg-primary text-primary-foreground rounded-br-none shadow-lg shadow-primary/10"}`}>
                  <MessageContent m={m} />
                  <p className={`text-[9px] mt-1.5 font-bold uppercase opacity-40 ${m.direction === "inbound" ? "text-left" : "text-right"}`}>
                    {new Date(m.created_at * 1000).toLocaleTimeString()}
                  </p>
               </div>
            </div>
          ))}
       </div>
       <div className="p-4 bg-muted/20 border-t">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); api.sendMessage(botId, { text: input }); setInput(""); }}>
             <Input value={input} onChange={e => setInput(e.target.value)} placeholder="输入消息..." className="h-11 rounded-xl bg-background border-none shadow-inner" />
             <Button type="submit" className="h-11 rounded-xl px-6 gap-2 font-bold shadow-lg shadow-primary/20">
                发送 <Send className="h-4 w-4" />
             </Button>
          </form>
       </div>
    </div>
  );
}

function ChannelsTab({ botId, channels, onRefresh }: { botId: string; channels: any[]; onRefresh: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
       {channels.map((ch) => (
         <Card key={ch.id} className="group relative border-border/50 bg-card/50 rounded-3xl transition-all hover:shadow-xl hover:border-primary/20 cursor-pointer" onClick={() => navigate(`/dashboard/accounts/${botId}/channel/${ch.id}`)}>
            <CardHeader>
               <div className="flex justify-between items-start">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Cable className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <Badge variant={ch.enabled ? "default" : "secondary"} className="h-5 rounded-full text-[9px] font-black uppercase">{ch.enabled ? "Active" : "Paused"}</Badge>
               </div>
               <CardTitle className="text-lg font-bold mt-4">{ch.name}</CardTitle>
               <CardDescription className="font-mono text-[10px] uppercase">@{ch.handle || "默认"}</CardDescription>
            </CardHeader>
            <CardFooter className="bg-muted/30 pt-3 flex justify-between items-center px-6">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></span>
               <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
            </CardFooter>
         </Card>
       ))}
       <Button variant="outline" className="h-auto border-dashed border-2 rounded-3xl py-10 flex-col gap-3 hover:bg-primary/5 hover:border-primary/20 transition-all" onClick={() => {/* Handle Create */}}>
          <div className="h-10 w-10 rounded-full bg-background border flex items-center justify-center shadow-sm"><Plus className="h-5 w-5" /></div>
          <span className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">添加转发规则</span>
       </Button>
    </div>
  );
}

function BotSettingsTab({ bot, onUpdate }: { bot: any; onUpdate: () => void }) {
  const [hours, setHours] = useState(bot.reminder_hours || 0);
  const { toast } = useToast();

  const handleSave = async () => {
    await api.updateBot(bot.id, { reminder_hours: hours } as any);
    toast({ title: "已保存" });
    onUpdate();
  };

  return (
    <Card className="max-w-2xl border-border/50 bg-card/50 rounded-[2rem]">
       <CardHeader>
          <CardTitle className="text-xl font-bold">设置</CardTitle>
          <CardDescription>调整账号相关配置。</CardDescription>
       </CardHeader>
       <CardContent className="space-y-8">
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                   <p className="text-sm font-bold">自动续期</p>
                   <p className="text-xs text-muted-foreground">微信会话 24 小时不活动会掉线，开启后系统自动保持在线。</p>
                </div>
                <input type="checkbox" checked={hours > 0} onChange={e => setHours(e.target.checked ? 23 : 0)} className="h-5 w-5 accent-primary" />
             </div>
             {hours > 0 && (
               <div className="p-4 rounded-2xl bg-muted/30 border space-y-3 animate-in fade-in zoom-in-95">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">检查间隔（小时）</label>
                  <div className="flex gap-4 items-center">
                    <Input type="number" value={hours} onChange={e => setHours(parseInt(e.target.value))} className="w-24 h-11 rounded-xl font-bold text-center" />
                    <p className="text-xs text-muted-foreground italic leading-snug">建议 23 小时。</p>
                  </div>
               </div>
             )}
          </div>
       </CardContent>
       <CardFooter className="bg-muted/30 pt-4 flex justify-end">
          <Button onClick={handleSave} className="rounded-full px-8 font-bold shadow-lg shadow-primary/20">保存</Button>
       </CardFooter>
    </Card>
  );
}
