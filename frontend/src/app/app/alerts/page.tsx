'use client';

import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Bell, ShieldAlert, Check, Link2 } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
  const { alerts, markAlertReadInStore } = useStore();

  const handleMarkRead = async (id: string) => {
    try {
      await api.alerts.read(id);
      markAlertReadInStore(id);
    } catch (err: any) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">ALERTS CENTER</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time threat feeds matching scan criteria across all connected codebases.</p>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className={`bg-card border p-5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-150 ${
                alert.read ? 'border-border opacity-60' : 'border-vermilion/30 shadow-md shadow-vermilion/5'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                  alert.severity === 'critical' 
                    ? 'bg-vermilion/15 text-vermilion' 
                    : 'bg-orange-500/10 text-orange-400'
                }`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      alert.severity === 'critical' ? 'bg-vermilion/15 text-vermilion' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {alert.severity}
                    </span>
                    {!alert.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-vermilion animate-ping" />
                    )}
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-cream mt-2 leading-relaxed">{alert.message}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center font-mono">
                <Link
                  href={`/app/projects/${alert.project_id}/scans/${alert.scan_id}`}
                  className="bg-background border border-border hover:border-sage/40 text-sage hover:text-cream text-xs px-3 py-1.5 rounded flex items-center transition-all"
                >
                  <Link2 className="h-3.5 w-3.5 mr-1" /> View scan
                </Link>
                
                {!alert.read && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="bg-sage text-background text-xs font-semibold px-3 py-1.5 rounded flex items-center hover:bg-sage/80 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-border rounded-lg bg-card/25">
          <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-cream font-mono">Inbox Clean</h3>
          <p className="text-gray-500 text-xs mt-1">No security warning triggers have been dispatched to this organization feed.</p>
        </div>
      )}
    </div>
  );
}
