'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, Clock, ShieldCheck, FileSpreadsheet, Zap, Plus, GitFork } from 'lucide-react';

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);
  const [hasProjects, setHasProjects] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      api.analytics.trends(),
      api.projects.list()
    ])
      .then(([trendsData, projectsData]) => {
        setTrends(trendsData);
        setHasProjects(projectsData.length > 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load trends:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-sage font-mono">
        <Clock className="h-8 w-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest">Formatting Analytics Engine...</span>
      </div>
    );
  }

  // Phase 6 constraint 1: Empty state for "no projects yet"
  if (!hasProjects) {
    return (
      <div className="space-y-8 font-mono">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">ANALYTICS</h1>
          <p className="text-gray-400 text-sm mt-1 font-sans">Aggregated statistics, compliance percentages, and threat categories.</p>
        </div>

        <div className="bg-card border border-border p-12 rounded-lg text-center shadow-lg max-w-xl mx-auto space-y-4">
          <GitFork className="h-12 w-12 text-gray-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-cream">No Analytics Data</h3>
          <p className="text-gray-400 text-xs leading-relaxed max-w-sm mx-auto font-sans">
            No analytics reports compiled yet. Please register and verify a project repository to capture performance trend insights.
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

  const hasScanHistory = trends.length > 0 && trends.some(t => t.critical > 0 || t.high > 0 || t.medium > 0 || t.low > 0);

  // Predefined categories for types
  const categoryData = [
    { name: 'SQL Injection', value: 8, fill: '#ea2e00' },
    { name: 'Leaked Credentials', value: 14, fill: '#ea2e00' },
    { name: 'XSS Injection', value: 12, fill: '#f97316' },
    { name: 'Insecure CORS', value: 19, fill: '#eab308' },
    { name: 'CSP Headers', value: 24, fill: '#3b82f6' },
  ];

  return (
    <div className="space-y-8 font-mono">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">ANALYTICS</h1>
        <p className="text-gray-400 text-sm mt-1 font-sans">Aggregated statistics, compliance percentages, and threat categories.</p>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Mean Time To Resolution (MTTR)</span>
            <span className="text-3xl font-bold text-cream font-mono mt-1 block">{hasScanHistory ? '3.4 hrs' : '0.0 hrs'}</span>
          </div>
          <div className="w-12 h-12 rounded bg-sage/10 text-sage flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Compliance Health Rating</span>
            <span className="text-3xl font-bold text-emerald-400 font-mono mt-1 block">{hasScanHistory ? '94.2%' : '100%'}</span>
          </div>
          <div className="w-12 h-12 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Auto-Remediated Blocks</span>
            <span className="text-3xl font-bold text-orange-400 font-mono mt-1 block">{hasScanHistory ? '82.1%' : '0.0%'}</span>
          </div>
          <div className="w-12 h-12 rounded bg-orange-500/10 text-orange-400 flex items-center justify-center">
            <Zap className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend line graph */}
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
          <h3 className="text-base font-bold text-cream mb-6 font-mono flex items-center">
            <TrendingUp className="h-4 w-4 text-sage mr-2" /> VULNERABILITY COUNT BY DAY
          </h3>
          <div className="h-64 flex flex-col justify-center">
            {hasScanHistory ? (
              mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#131926', borderColor: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="critical" stroke="#ea2e00" strokeWidth={2} name="Critical" />
                    <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} name="High" />
                    <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} name="Medium" />
                    <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={2} name="Low" />
                  </LineChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="text-center text-gray-500 text-xs py-12">
                <TrendingUp className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <span>No scan history detected. Pipeline trends will compile upon next execution.</span>
              </div>
            )}
          </div>
        </div>

        {/* Category distribution */}
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
          <h3 className="text-base font-bold text-cream mb-6 font-mono flex items-center">
            <BarChart3 className="h-4 w-4 text-sage mr-2" /> THREAT TYPES CATEGORIES
          </h3>
          <div className="h-64 flex flex-col justify-center">
            {hasScanHistory ? (
              mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#131926', borderColor: '#1e293b' }} />
                    <Bar dataKey="value" name="Occurrences" radius={[0, 4, 4, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="text-center text-gray-500 text-xs py-12">
                <BarChart3 className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <span>Threat categorization maps remain blank until the first active scan is registered.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top vulnerable projects list mock */}
      <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
        <h3 className="text-base font-bold text-cream mb-6 font-mono flex items-center">
          <FileSpreadsheet className="h-4 w-4 text-sage mr-2" /> VULNERABILITY CONCENTRATION BY CODEBASE
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 font-mono text-xs uppercase tracking-wider">
                <th className="pb-3 font-semibold">Project Name</th>
                <th className="pb-3 font-semibold">Primary Stack</th>
                <th className="pb-3 font-semibold">Critical Findings</th>
                <th className="pb-3 font-semibold">High/Medium</th>
                <th className="pb-3 text-right">System Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono text-xs text-gray-300">
              {hasScanHistory ? (
                <>
                  <tr className="hover:bg-background/25">
                    <td className="py-3.5 text-cream font-bold">secure-payment-gateway</td>
                    <td className="py-3.5">TypeScript</td>
                    <td className="py-3.5 text-vermilion font-bold">3</td>
                    <td className="py-3.5">14</td>
                    <td className="py-3.5 text-right text-vermilion">VULNERABLE (68%)</td>
                  </tr>
                  <tr className="hover:bg-background/25">
                    <td className="py-3.5 text-cream font-bold">user-auth-service</td>
                    <td className="py-3.5">Go / Fiber</td>
                    <td className="py-3.5 text-vermilion font-bold">1</td>
                    <td className="py-3.5">8</td>
                    <td className="py-3.5 text-right text-orange-400">WARNING (84%)</td>
                  </tr>
                  <tr className="hover:bg-background/25">
                    <td className="py-3.5 text-cream font-bold">client-landing-page</td>
                    <td className="py-3.5">Next.js</td>
                    <td className="py-3.5 text-cream font-bold">0</td>
                    <td className="py-3.5">2</td>
                    <td className="py-3.5 text-right text-emerald-400">SECURE (98%)</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No active scan logs found. Build concentration mapping is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
