import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { HomePage } from "./pages/home";
import { LoginPage } from "./pages/login";
import { Layout } from "./components/layout";
import { BotsPage } from "./pages/bots";
import { BotDetailPage } from "./pages/bot-detail";
import { SettingsPage } from "./pages/settings";
import { PluginsPage } from "./pages/plugins";
import { ChannelDetailPage } from "./pages/channel-detail";
import { AdminPage } from "./pages/admin";
import { AppsPage } from "./pages/apps";
import { AppDetailPage } from "./pages/app-detail";
import { DashboardOverviewPage } from "./pages/dashboard-overview";
import { ThemeProvider } from "./lib/theme";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Entry */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Main Application Shell */}
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<Navigate to="overview" replace />} />
              
              {/* Domain 1: Workspace */}
              <Route path="overview" element={<DashboardOverviewPage />} />
              <Route path="accounts" element={<BotsPage />} />
              <Route path="accounts/:id" element={<BotDetailPage />}>
                <Route index element={<Navigate to="chat" replace />} />
                <Route path="chat" element={null} />
                <Route path="channels" element={null} />
                <Route path="apps" element={null} />
                <Route path="traces" element={null} />
                <Route path="settings" element={null} />
              </Route>
              <Route path="accounts/:id/channel/:cid" element={<ChannelDetailPage />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={null} />
                <Route path="webhook" element={null} />
                <Route path="ai" element={null} />
                <Route path="filter" element={null} />
                <Route path="logs" element={null} />
              </Route>

              {/* Apps & Plugins */}
              <Route path="apps" element={<AppsPage />}>
                <Route index element={<Navigate to="my" replace />} />
                <Route path="my" element={null} />
                <Route path="marketplace" element={null} />
              </Route>
              <Route path="apps/:id" element={<AppDetailPage />} />
              <Route path="plugins" element={<PluginsPage embedded />}>
                <Route index element={<Navigate to="marketplace" replace />} />
                <Route path="marketplace" element={null} />
                <Route path="my" element={null} />
              </Route>

              {/* Domain 4: Management & Ops */}
              <Route path="admin" element={<AdminPage />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={null} />
                <Route path="users" element={null} />
                <Route path="config" element={null} />
                <Route path="apps" element={null} />
              </Route>
              <Route path="settings" element={<SettingsPage />}>
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="profile" element={null} />
                <Route path="security" element={null} />
                <Route path="appearance" element={null} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
