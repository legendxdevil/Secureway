'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { ScanJob } from '@/types';
import { 
  GitFork, AlertTriangle, Clock, ChevronRight, Terminal, BarChart2, TrendingUp, AlertOctagon, CheckCircle, Plus 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell
} from 'recharts';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Fetch dashboard statistics
    Promise.all([api.analytics.overview(), api.analytics.trends()])
      .then(([overviewData, trendsData]) => {
        setOverview(overviewData);
        setTrends(trendsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-sage font-mono">
        <Clock className="h-8 w-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest">Compiling Dashboard Metrics...</span>
      </div>
    );
  }

  // Phase 6 constraint 1: Empty state for "no projects yet"
  if (overview.total_projects === 0) {
    return (
      <div className="space-y-8 font-mono">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">DASHBOARD</h1>
          <p className="text-gray-400 text-sm mt-1 font-sans">Real-time status overview of organizational repositories and security gates.</p>
        </div>

        <div className="bg-card border border-border p-12 rounded-lg text-center shadow-lg max-w-xl mx-auto space-y-4">
          <GitFork className="h-12 w-12 text-gray-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-cream">No Integrated Projects</h3>
          <p className="text-gray-400 text-xs leading-relaxed max-w-sm mx-auto font-sans">
            It looks like you haven't connected any repositories to SecureWay. Connect a repository and verify ownership to initiate automatic webhook security scans!
          </p>
          <Link
            href="/app/projects"
            className="inline-flex items-center space-x-2 bg-sage hover:bg-sage/80 text-background font-bold px-4 py-2 rounded text-xs transition-all"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Connect First Project</span>
          </Link>
        </div>
      </div>
    );
  }

  // Prep severity chart data
  const severityData = [
    { name: 'Critical', value: overview.severity_count.critical || 0, color: '#ea2e00' },
    { name: 'High', value: overview.severity_count.high || 0, color: '#f97316' },
    { name: 'Medium', value: overview.severity_count.medium || 0, color: '#eab308' },
    { name: 'Low', value: overview.severity_count.low || 0, color: '#3b82f6' },
  ];

  const totalIssues = severityData.reduce((acc, curr) => acc + curr.value, 0);
  const hasScanHistory = trends.length > 0 && trends.some(t => t.critical > 0 || t.high > 0 || t.medium > 0 || t.low > 0);

  return (
    <div className="space-y-8 font-mono">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">DASHBOARD</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time status overview of organizational repositories and security gates.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase">Total Projects</span>
            <GitFork className="h-5 w-5 text-gray-500" />
          </div>
          <div className="text-4xl font-bold text-cream mt-4 font-mono">{overview.total_projects}</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sage/25" />
        </div>

        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase">Active Scans</span>
            <Clock className="h-5 w-5 text-sage animate-pulse" />
          </div>
          <div className="text-4xl font-bold text-sage mt-4 font-mono">{overview.active_scans}</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sage/40" />
        </div>

        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase">Open Vulnerabilities</span>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-4xl font-bold text-orange-500 mt-4 font-mono">{overview.open_vulnerabilities}</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500/20" />
        </div>

        <div className="bg-card border border-border p-6 rounded-lg relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase">Critical Alerts</span>
            <AlertOctagon className="h-5 w-5 text-vermilion" />
          </div>
          <div className="text-4xl font-bold text-vermilion mt-4 font-mono">{overview.critical_alerts}</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-vermilion/45" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Area Chart */}
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg lg:col-span-2">
          <h3 className="text-base font-bold text-cream mb-6 font-mono flex items-center">
            <TrendingUp className="h-4 w-4 text-sage mr-2" /> VULNERABILITY TRENDS (PAST 7 DAYS)
          </h3>
          <div className="h-64 flex flex-col justify-center">
            {hasScanHistory ? (
              mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea2e00" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ea2e00" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#131926', borderColor: '#1e293b', borderRadius: '4px' }}
                      labelStyle={{ color: '#f0e7d6', fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="critical" stroke="#ea2e00" fillOpacity={1} fill="url(#colorCrit)" name="Critical" />
                    <Area type="monotone" dataKey="high" stroke="#f97316" fillOpacity={1} fill="url(#colorHigh)" name="High" />
                  </AreaChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="text-center text-gray-500 text-xs py-12">
                <TrendingUp className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <span>No scan trend data registered. Trigger a project scan webhook to populate.</span>
              </div>
            )}
          </div>
        </div>

        {/* Severity Count Bar Chart */}
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
          <h3 className="text-base font-bold text-cream mb-6 font-mono flex items-center">
            <BarChart2 className="h-4 w-4 text-sage mr-2" /> SEVERITY DISTRIBUTION
          </h3>
          <div className="h-64 flex flex-col justify-between">
            {totalIssues > 0 ? (
              <>
                <div className="h-40">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip
                          cursor={{ fill: '#1e293b', opacity: 0.2 }}
                          contentStyle={{ backgroundColor: '#131926', borderColor: '#1e293b', borderRadius: '4px' }}
                        />
                        <Bar dataKey="value" name="Threats">
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="space-y-1.5 pt-4 border-t border-border/50 text-xs font-mono">
                  {severityData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-400">{item.name}</span>
                      </div>
                      <span className="font-semibold text-cream">{item.value} open</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 font-mono text-xs">
                <CheckCircle className="h-10 w-10 text-emerald-500 mb-2 animate-bounce" />
                <span>Zero threats detected. Workspace clean!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Logs & Scans */}
      <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
        <h3 className="text-base font-bold text-cream mb-6 font-mono flex items-center">
          <Terminal className="h-4 w-4 text-sage mr-2" /> RECENT SCAN PIPELINES
        </h3>
        
        {overview.recent_scans && overview.recent_scans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 font-mono text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Scan ID</th>
                  <th className="pb-3 font-semibold">Repository</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Trigger</th>
                  <th className="pb-3 font-semibold">Execution Time</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono text-xs">
                {overview.recent_scans.map((scan: ScanJob) => {
                  const duration = scan.finished_at && scan.started_at 
                    ? Math.round((new Date(scan.finished_at).getTime() - new Date(scan.started_at).getTime()) / 1000)
                    : 0;

                  return (
                    <tr key={scan.id} className="hover:bg-background/20 group">
                      <td className="py-3.5 text-cream font-semibold">{scan.id.substring(0, 8)}</td>
                      <td className="py-3.5 text-gray-300">{scan.project?.name}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          scan.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : scan.status === 'failed'
                            ? 'bg-vermilion/10 text-vermilion border border-vermilion/25'
                            : 'bg-sage/10 text-sage border border-sage/25 animate-pulse'
                        }`}>
                          {scan.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-gray-400 capitalize">{scan.trigger_type.replace('_', ' ')}</td>
                      <td className="py-3.5 text-gray-400">{duration > 0 ? `${duration}s` : 'Processing...'}</td>
                      <td className="py-3.5 text-right">
                        <Link 
                          href={`/app/projects/${scan.project_id}/scans/${scan.id}`}
                          className="inline-flex items-center text-sage hover:text-cream transition-colors"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 font-mono text-xs">
            <Clock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <span>No scan history found. Connect a project to start auditing.</span>
          </div>
        )}
      </div>
    </div>
  );
}
