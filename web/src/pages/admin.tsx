import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Users,
  ShieldCheck,
  Settings,
  BarChart3,
  Search,
  Plus,
  MoreVertical,
  Key,
  Lock,
  Trash2,
  Check,
  X,
  Loader2,
  ExternalLink,
  Blocks,
  Globe,
  Database,
  Cpu,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split("/").pop() || "dashboard";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">系统管理</h2>
            <p className="text-muted-foreground">用户、应用和系统配置。</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: string) => navigate(`/dashboard/admin/${v}`)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="gap-2 px-6"><BarChart3 className="h-4 w-4" /> 概览</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 px-6"><Users className="h-4 w-4" /> 用户管理</TabsTrigger>
          <TabsTrigger value="apps" className="gap-2 px-6"><Blocks className="h-4 w-4" /> 应用审核</TabsTrigger>
          <TabsTrigger value="config" className="gap-2 px-6"><Settings className="h-4 w-4" /> 系统配置</TabsTrigger>
        </TabsList>

        <div className="m-0">
          {activeTab === "dashboard" && <AdminDashboardTab />}
          {activeTab === "users" && <AdminUsersTab />}
          {activeTab === "apps" && <AdminAppsTab />}
          {activeTab === "config" && <AdminConfigTab />}
        </div>
      </Tabs>
    </div>
  );
}

// ==================== Admin Dashboard ====================

function AdminDashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "全站用户", value: stats?.total_users || 0, icon: Users, color: "text-blue-500" },
          { label: "微信账号", value: stats?.total_bots || 0, icon: Cpu, color: "text-green-500" },
          { label: "转发规则", value: stats?.total_channels || 0, icon: Globe, color: "text-purple-500" },
          { label: "活跃 App", value: stats?.total_apps || 0, icon: Blocks, color: "text-orange-500" },
        ].map((m, i) => (
          <Card key={i} className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{m.label}</CardTitle>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/30 rounded-[2rem]">
         <CardHeader><CardTitle>系统状态</CardTitle><CardDescription></CardDescription></CardHeader>
         <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
               <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex items-center gap-4">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-xs font-bold uppercase text-muted-foreground">PostgreSQL</p><p className="text-sm font-bold">CONNECTED</p></div>
               </div>
               <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex items-center gap-4">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-xs font-bold uppercase text-muted-foreground">WASM Runtime</p><p className="text-sm font-bold">READY</p></div>
               </div>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}

// ==================== User Management ====================

function AdminUsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try { setUsers((await api.listUsers()) || []); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleUpdateStatus(id: string, status: string) {
    await api.updateUserStatus(id, status);
    toast({ title: "状态已更新" });
    load();
  }

  return (
    <Card className="border-border/50 rounded-3xl overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead>用户名</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>注册时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={5}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell></TableRow>) : users.map(u => (
            <TableRow key={u.id} className="group">
              <TableCell className="font-bold">{u.username}</TableCell>
              <TableCell><Badge variant="secondary" className="uppercase text-[9px] font-black">{u.role}</Badge></TableCell>
              <TableCell><Badge variant={u.status === "active" ? "default" : "outline"} className="h-5">{u.status}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at * 1000).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => handleUpdateStatus(u.id, u.status === "active" ? "disabled" : "active")}>
                      {u.status === "active" ? <X className="h-3.5 w-3.5 mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                      {u.status === "active" ? "禁用账号" : "恢复账号"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={async () => { if(confirm("删除用户？")) { await api.deleteUser(u.id); load(); } }}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> 删除用户
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ==================== System Config ====================

function AdminConfigTab() {
  const [aiConfig, setAIConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api.getAIConfig().then(setAIConfig).catch(() => {});
  }, []);

  async function handleSaveAI() {
    setSaving(true);
    try {
      await api.setAIConfig(aiConfig);
      toast({ title: "全局 AI 配置已保存" });
    } catch(e: any) {
      toast({ variant: "destructive", title: "保存失败", description: e.message });
    }
    setSaving(false);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
       <Card className="border-border/50 bg-card/50 rounded-[2rem]">
          <CardHeader>
            <CardTitle>AI 配置</CardTitle>
            <CardDescription>所有账号的默认 AI 设置。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">Endpoint</label><Input value={aiConfig?.base_url || ""} onChange={e => setAIConfig({...aiConfig, base_url: e.target.value})} className="rounded-xl h-10" /></div>
             <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">Default Model</label><Input value={aiConfig?.model || ""} onChange={e => setAIConfig({...aiConfig, model: e.target.value})} className="rounded-xl h-10" /></div>
             <div className="space-y-1.5"><label className="text-xs font-bold uppercase text-muted-foreground">API Key</label><Input type="password" value={aiConfig?.api_key || ""} onChange={e => setAIConfig({...aiConfig, api_key: e.target.value})} className="rounded-xl h-10" placeholder="••••••••" /></div>
          </CardContent>
          <CardFooter className="bg-muted/30 pt-4 flex justify-end"><Button onClick={handleSaveAI} disabled={saving} className="rounded-full">保存</Button></CardFooter>
       </Card>

       <Card className="border-border/50 bg-muted/10 opacity-60 rounded-[2rem] flex items-center justify-center border-dashed">
          <div className="text-center p-8"><Settings className="h-10 w-10 mx-auto opacity-20 mb-4" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">更多配置开发中</p></div>
       </Card>
    </div>
  );
}

// ==================== Admin Apps (Placeholder for full page replacement) ====================

function AdminAppsTab() {
  const [apps, setApps] = useState<any[]>([]);
  useEffect(() => { api.adminListApps().then(setApps); }, []);

  return (
    <Card className="border-border/50 rounded-3xl overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow><TableHead>应用名称</TableHead><TableHead>Slug</TableHead><TableHead>开发者</TableHead><TableHead>市场状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {apps.map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-bold">{a.name}</TableCell>
              <TableCell className="font-mono text-xs opacity-60">{a.slug}</TableCell>
              <TableCell className="text-xs">{a.owner_username}</TableCell>
              <TableCell><Badge variant={a.listed ? "default" : "secondary"}>{a.listed ? "已上架" : "待上架"}</Badge></TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={async () => { await api.setAppListed(a.id, !a.listed); api.adminListApps().then(setApps); }}>{a.listed ? "下架" : "上架"}</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function SkeletonCard() {
  return <Card className="h-24 animate-pulse bg-muted/20 border-none" />;
}
