'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { disconnectWebSocket } from '@/lib/ws';
import { Shield, LayoutDashboard, GitFork, Bell, BarChart3, Settings, LogOut, Loader, User } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, alerts, setAlerts, isAuthenticated, clearAuth, wsConnected, wsReconnecting } = useStore();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated || !token) {
      router.push('/login');
      return;
    }

    // Fetch initial alerts
    api.alerts.list()
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch alerts:', err);
        setLoading(false);
      });
  }, [mounted, isAuthenticated, token, router, setAlerts]);

  const handleLogout = () => {
    clearAuth();
    disconnectWebSocket();
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/app/projects', icon: GitFork },
    { name: 'Alerts', href: '/app/alerts', icon: Bell, badge: alerts.filter(a => !a.read).length },
    { name: 'Analytics', href: '/app/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/app/settings', icon: Settings },
  ];

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-sage">
        <Loader className="h-10 w-10 animate-spin mb-4" />
        <span className="font-mono text-sm tracking-widest uppercase">Initializing SecureWay Console...</span>
      </div>
    );
  }

  const orgName = user ? user.name + "'s Org" : "SecureWay Org";

  return (
    <div className="min-h-screen bg-background flex text-foreground selection:bg-sage selection:text-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/app/dashboard" className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-sage" />
              <span className="font-mono text-lg font-bold tracking-tight text-cream">
                SECURE<span className="text-sage">WAY</span>
              </span>
            </Link>
          </div>

          {/* Org Selector Info */}
          <div className="px-6 py-4 border-b border-border bg-background/20">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">WORKSPACE</span>
            <span className="font-semibold text-cream text-sm truncate block mt-0.5">{orgName}</span>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-2.5 rounded text-sm transition-colors duration-150 ${
                    isActive
                       ? 'bg-sage/10 text-sage border-l-2 border-sage font-medium'
                       : 'text-gray-400 hover:text-cream hover:bg-card/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="bg-vermilion text-cream text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-border bg-background/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-sage/15 border border-sage/20 flex items-center justify-center text-sage shrink-0">
                <User className="h-4.5 w-4.5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-cream truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize truncate">{user?.role}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-vermilion p-2 rounded transition-colors duration-150"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-grow flex flex-col min-w-0">
        {!wsConnected && (
          <div className="bg-vermilion text-cream px-4 py-2 text-center text-xs font-mono font-bold tracking-wide animate-pulse flex items-center justify-center space-x-2 shrink-0">
            <Loader className="h-3.5 w-3.5 animate-spin" />
            <span>Connection dropped. Reconnecting to SecureWay real-time engine...</span>
          </div>
        )}
        <main className="flex-grow overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
