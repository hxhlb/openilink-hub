import { useEffect, useState } from "react";
import { KeyRound, Shield, User, Lock, ArrowRight, Loader2, Github, Check, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

import { Button } from "../components/ui/button";
import { HexagonBackground } from "../components/ui/hexagon-background";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";
import { Separator } from "../components/ui/separator";

const providerLabels: Record<string, { label: string, icon: any }> = {
  github: { label: "GitHub", icon: Github },
  linuxdo: { label: "LinuxDo", icon: Shield },
};

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);

  useEffect(() => {
    api
      .oauthProviders()
      .then((data) => setOauthProviders(data.providers || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await api.register(username, password);
      } else {
        await api.login(username, password);
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  // Helper functions for Passkey (kept from original)
  function base64urlToBuffer(b64: string): ArrayBuffer {
    const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const bin = atob(base64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function bufferToBase64url(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  async function handlePasskeyLogin() {
    setError(""); setLoading(true);
    try {
      const options = await fetch("/api/auth/passkey/login/begin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      options.publicKey.challenge = base64urlToBuffer(options.publicKey.challenge);
      if (options.publicKey.allowCredentials) {
        options.publicKey.allowCredentials = options.publicKey.allowCredentials.map(
          (credential: any) => ({ ...credential, id: base64urlToBuffer(credential.id) }),
        );
      }
      const credential = (await navigator.credentials.get(options)) as PublicKeyCredential;
      if (!credential) throw new Error("cancelled");
      const response = credential.response as AuthenticatorAssertionResponse;
      const body = JSON.stringify({
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: bufferToBase64url(response.authenticatorData),
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
          signature: bufferToBase64url(response.signature),
          userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : "",
        },
      });

      const res = await fetch("/api/auth/passkey/login/finish", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "login failed");
      }
      navigate("/dashboard");
    } catch (err: any) {
      if (err.name !== "NotAllowedError") setError(err.message || "Passkey 登录失败");
    }
    setLoading(false);
  }

  const supportsPasskey = typeof window !== "undefined" && "PublicKeyCredential" in window;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <HexagonBackground className="opacity-20" hexagonSize={60} hexagonMargin={4} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)]" />

      <div className="relative z-10 w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-8 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">OpeniLink Hub</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">
            {mode === "login" ? "登录中心" : "注册新账号"}
          </p>
        </div>

        <Card className="border-border/50 shadow-2xl backdrop-blur-md bg-card/80">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-xl">
              {mode === "login" ? "欢迎回来" : "开始体验"}
            </CardTitle>
            <CardDescription>
              {mode === "login" ? "请输入您的凭据以进入控制台" : "请填写基本信息以完成注册"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {oauthProviders.length > 0 && (
              <div className="space-y-3">
                {oauthProviders.map((provider) => {
                   const config = providerLabels[provider] || { label: provider, icon: Shield };
                   return (
                    <Button
                      key={provider}
                      variant="outline"
                      className="w-full h-10 gap-2 font-semibold"
                      onClick={() => (window.location.href = `/api/auth/oauth/${provider}`)}
                      disabled={loading}
                    >
                      <config.icon className="h-4 w-4" />
                      使用 {config.label} 继续
                    </Button>
                   );
                })}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-transparent">
                    <span className="bg-card px-2">或者</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="用户名"
                    className="pl-10 h-10 bg-muted/20"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="登录密码"
                    className="pl-10 h-10 bg-muted/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 animate-in shake-in">
                  <X className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-10 font-bold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {mode === "login" ? "立即登录" : "确认注册"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            {supportsPasskey && mode === "login" && (
              <div className="space-y-3">
                 <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator /></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground"><span className="bg-card px-2">免密登录</span></div>
                 </div>
                 <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-10 gap-2 font-semibold"
                    onClick={handlePasskeyLogin}
                    disabled={loading}
                 >
                    <KeyRound className="h-4 w-4 text-primary" />
                    使用 Passkey 快速登录
                 </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t bg-muted/30 pt-4 pb-6 rounded-b-xl">
             <div className="text-center text-xs text-muted-foreground">
               {mode === "login" ? "还没有账号？" : "已经有账号了？"}
               <button
                 type="button"
                 className="ml-1 font-bold text-primary hover:underline"
                 onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
               >
                 {mode === "login" ? "立即注册" : "点击登录"}
               </button>
             </div>
             <p className="text-[10px] text-center text-muted-foreground/60 leading-relaxed px-6">
               登录即代表您同意我们的 <Link to="#" className="underline">服务条款</Link> 和 <Link to="#" className="underline">隐私政策</Link>。
             </p>
          </CardFooter>
        </Card>

        <footer className="mt-8 text-center text-[11px] text-muted-foreground/50 font-medium">
           &copy; 2026 OpeniLink Hub Project. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
