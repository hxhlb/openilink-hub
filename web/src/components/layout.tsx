import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { api } from "../lib/api";

export function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.me().then(setUser).catch(() => navigate("/login"));
  }, []);

  if (!user) return null;

  async function handleLogout() {
    await api.logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="font-semibold text-sm">OpenILink Hub</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted-foreground)]">{user.username}</span>
          <button onClick={handleLogout} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
