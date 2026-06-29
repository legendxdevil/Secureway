'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { ArrowLeft, Clock, Loader, ChevronLeft, ChevronRight, Eye, Code } from 'lucide-react';

export default function AuditLogPage() {
  const { user } = useStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);

  // Inspector modal
  const [activeMeta, setActiveMeta] = useState<string | null>(null);

  const fetchLogs = (p: number) => {
    setLoading(true);
    api.audit.list(p, limit)
      .then(res => {
        setLogs(res.entries || []);
        setTotal(res.total || 0);
        setPage(res.page || 1);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load audit logs:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'auth_denied':
        return <span className="bg-vermilion/10 text-vermilion border border-vermilion/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Access Denied</span>;
      case 'user_login':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">User Auth</span>;
      case 'scan_triggered':
        return <span className="bg-sage/10 text-sage border border-sage/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Scan Trigger</span>;
      case 'vulnerability_status_changed':
        return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Vuln Update</span>;
      case 'project_verified':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Project Verified</span>;
      default:
        return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">{action.replace('_', ' ')}</span>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-vermilion">
        <ShieldAlert className="h-8 w-8 mb-4 animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-widest font-bold">ACCESS RESTRICTED — ADMINISTRATORS ONLY</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono relative">
      {/* Header */}
      <div>
        <Link href="/app/settings" className="inline-flex items-center text-xs text-sage hover:text-cream transition-colors font-mono mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> BACK TO SETTINGS
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">SYSTEM AUDIT TRAIL</h1>
        <p className="text-gray-400 text-sm mt-1 font-sans">Immutable history of security policies, scan activities, role changes, and authorization failures.</p>
      </div>

      {/* Main Table logs container */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg flex flex-col">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-sage">
            <Loader className="h-8 w-8 animate-spin mb-4" />
            <span className="text-xs uppercase tracking-widest">Retrieving Log Registers...</span>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/55 text-gray-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold">Action Event</th>
                    <th className="p-4 font-semibold">Operator ID</th>
                    <th className="p-4 font-semibold">Target Entity ID</th>
                    <th className="p-4 text-right">Properties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-background/20 transition-colors">
                      <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-4">{getActionBadge(log.action)}</td>
                      <td className="p-4 text-cream font-semibold truncate max-w-[120px]" title={log.actor_id}>
                        {log.actor_id.substring(0, 8)}...
                      </td>
                      <td className="p-4 text-gray-400 truncate max-w-[120px]" title={log.target_id}>
                        {log.target_id ? `${log.target_id.substring(0, 8)}...` : '—'}
                      </td>
                      <td className="p-4 text-right">
                        {log.metadata ? (
                          <button
                            onClick={() => setActiveMeta(log.metadata)}
                            className="bg-sage/10 text-sage hover:bg-sage/20 border border-sage/20 rounded px-2.5 py-1 text-[10px] font-bold flex items-center inline-flex ml-auto transition-all"
                          >
                            <Eye className="h-3 w-3 mr-1" /> Inspect
                          </button>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-background/40 border-t border-border px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                </span>
                
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    className="p-1 text-sage hover:text-cream disabled:opacity-30 transition-opacity"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-[10px] text-cream font-mono">PAGE {page} OF {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 text-sage hover:text-cream disabled:opacity-30 transition-opacity"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center text-gray-500 text-xs">
            No audit records registered in this workspace yet.
          </div>
        )}
      </div>

      {/* JSON Metadata Viewer Modal overlay */}
      {activeMeta && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border max-w-xl w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 flex items-center">
                <Code className="h-4 w-4 text-sage mr-2" /> AUDIT METADATA PROPERTIES
              </span>
              <button 
                onClick={() => setActiveMeta(null)}
                className="text-xs font-mono text-gray-500 hover:text-cream"
              >
                [CLOSE]
              </button>
            </div>
            <div className="p-5 overflow-auto bg-black/95 font-mono text-[11px] text-sage">
              <pre className="select-text whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(JSON.parse(activeMeta), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stub fallback icon in case ShieldAlert doesn't import
function ShieldAlert(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}
