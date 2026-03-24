import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";
import {
  Download,
  Check,
  Trash2,
  BookOpen,
  Puzzle,
  Shield,
  Plus,
  Loader2,
  Clock,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { SubmitForm } from "./plugin-submit";
import { ReviewCard } from "./plugin-review";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const statusMap: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> =
  {
    approved: { label: "已通过", variant: "default" },
    pending: { label: "待审核", variant: "outline" },
    rejected: { label: "已拒绝", variant: "destructive" },
  };

export function PluginsPage({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [myPlugins, setMyPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = location.pathname.split("/").pop() || "marketplace";

  async function load() {
    setLoading(true);
    try {
      if (!user) setUser(await api.me().catch(() => null));
      if (activeTab === "my") setMyPlugins((await api.myPlugins().catch(() => [])) || []);
      else setPlugins((await api.listPlugins(activeTab === "review" ? "pending" : "approved").catch(() => [])) || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [activeTab]);

  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const banner = (
    <Card className="mb-8 border-primary/20 bg-primary/[0.02] overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 p-6 md:p-8 space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">插件</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">安装插件到转发规则中，自动将消息转发到飞书、Slack、钉钉等。</p>
          <div className="flex flex-wrap gap-3 pt-2"><a href="/api/webhook-plugins/skill.md" target="_blank" className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"><BookOpen className="h-4 w-4" /> 开发者文档</a><span className="text-muted-foreground opacity-30 text-xs">|</span><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Shield className="h-4 w-4" /> 安全沙箱隔离</div></div>
        </div>
      </div>
    </Card>
  );

  const content = (
    <div className="space-y-6">
      {!embedded && banner}
      <Tabs value={activeTab} onValueChange={(v: string) => navigate(`/dashboard/plugins/${v}`)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="marketplace" className="px-6">市场</TabsTrigger>
          {isLoggedIn && <TabsTrigger value="my" className="px-6">我的插件</TabsTrigger>}
          {isAdmin && <TabsTrigger value="review" className="px-6">审核</TabsTrigger>}
        </TabsList>

        <TabsContent value="marketplace" className="m-0">
          {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plugins.map((p) => <PluginCard key={p.id} plugin={p} onRefresh={load} isAdmin={isAdmin} isLoggedIn={isLoggedIn} />)}
              {plugins.length === 0 && <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl"><Puzzle className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" /><p className="text-sm font-medium">暂无插件</p></div>}
            </div>
          )}
        </TabsContent>
        <TabsContent value="my" className="m-0"><MyPluginsTab plugins={myPlugins} onRefresh={load} /></TabsContent>
        <TabsContent value="review" className="m-0"><div className="grid gap-6">{plugins.map((p) => <ReviewCard key={p.id} plugin={p} onRefresh={load} />)}</div></TabsContent>
      </Tabs>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur shadow-sm"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><Link to="/" className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Puzzle className="h-4 w-4" /></div><span className="font-bold tracking-tight">OpeniLink 插件</span></Link><div className="flex items-center gap-4"><Link to="/dashboard"><Button variant="ghost" size="sm">控制台</Button></Link>{isLoggedIn ? <Badge variant="secondary">{user.username}</Badge> : <Link to="/login"><Button size="sm">登录</Button></Link>}</div></div></header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{content}</main>
    </div>
  );
}

function PluginCard({ plugin, onRefresh, isAdmin, isLoggedIn }: { plugin: any; onRefresh: () => void; isAdmin: boolean; isLoggedIn: boolean; }) {
  const [detail, setDetail] = useState<any>(null);
  const [showScript, setShowScript] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);

  async function handleInstall() {
    const data = await api.installPlugin(plugin.id);
    await navigator.clipboard.writeText(data.script);
    alert("脚本已复制到剪贴板。");
    onRefresh();
  }

  const s = statusMap[plugin.status || "approved"] || statusMap.approved;
  const grants = (plugin.grant_perms || "").split(",").filter(Boolean);

  return (
    <Card className="flex flex-col border-border/50 hover:shadow-md transition-all overflow-hidden">
      <CardHeader className="pb-3"><div className="flex items-start justify-between gap-4"><div className="h-10 w-10 flex items-center justify-center rounded-xl bg-secondary text-lg">{plugin.icon || "🧩"}</div><div className="text-right"><Badge variant={s.variant} className="text-[9px] h-4 uppercase">{s.label}</Badge><p className="text-[10px] font-mono opacity-50 mt-1">v{plugin.version}</p></div></div><div className="mt-4"><CardTitle className="text-base font-bold truncate">{plugin.name}</CardTitle><CardDescription className="line-clamp-2 h-9 text-xs">{plugin.description}</CardDescription></div></CardHeader>
      <CardContent className="flex-1 space-y-4 pb-4"><div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase"><div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-muted/30"><Clock className="h-2.5 w-2.5" /> {new Date(plugin.created_at * 1000).toLocaleDateString()}</div><div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-muted/30"><Download className="h-2.5 w-2.5" /> {plugin.install_count} 安装</div></div><div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5 text-[11px]"><div className="flex justify-between text-muted-foreground"><span>权限申请</span><span className="text-foreground font-semibold">{grants.length ? grants.join(", ") : "无"}</span></div></div></CardContent>
      <CardFooter className="bg-muted/30 pt-4 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={async () => { if (!showVersions) setVersions(await api.pluginVersions(plugin.id).catch(() => [])); setShowVersions(!showVersions); }}>版本历史</Button>
          {isLoggedIn && <Button size="sm" className="h-8 text-xs" onClick={handleInstall}>获取代码</Button>}
        </div>
        {showVersions && (
          <ScrollArea className="h-24 w-full mt-2 border rounded p-2 bg-background"><div className="space-y-1">{versions.map(v => <div key={v.id} className="flex justify-between text-[10px]"><span>v{v.version}</span><span className="opacity-50">{v.status}</span></div>)}</div></ScrollArea>
        )}
      </CardFooter>
    </Card>
  );
}

function MyPluginsTab({ plugins, onRefresh }: { plugins: any[]; onRefresh: () => void }) {
  if (!plugins.length) return <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl"><Puzzle className="h-12 w-12 opacity-20 mb-4" /><p className="text-sm font-medium">还没有插件</p></div>;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plugins.map((p) => (
        <Card key={p.id} className="border-border/50 hover:shadow-sm transition-all group">
          <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="h-10 w-10 flex items-center justify-center bg-muted rounded-xl text-lg">{p.icon || "🧩"}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><CardTitle className="text-sm font-bold truncate">{p.name}</CardTitle></div><CardDescription className="text-[10px] font-mono">v{p.version}</CardDescription></div></div></CardHeader>
          <CardFooter className="bg-muted/30 pt-3 flex justify-between items-center text-[10px] text-muted-foreground"><span><Download className="h-3 w-3 inline" /> {p.install_count} 安装</span><span className="group-hover:text-primary font-medium">管理配置 <ArrowRight className="h-3 w-3 inline" /></span></CardFooter>
        </Card>
      ))}
    </div>
  );
}
