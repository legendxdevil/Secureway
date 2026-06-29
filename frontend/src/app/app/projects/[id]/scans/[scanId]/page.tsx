'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Vulnerability, ScanJob } from '@/types';
import { 
  ArrowLeft, Shield, ShieldCheck, Sparkles, Loader, RefreshCw
} from 'lucide-react';

export default function ScanDetailPage() {
  const params = useParams();
  const projectID = params.id as string;
  const scanID = params.scanId as string;

  const [scan, setScan] = useState<ScanJob | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchScanDetails = () => {
    setLoading(true);
    Promise.all([
      api.scans.get(scanID),
      api.scans.getVulnerabilities(scanID)
    ])
      .then(([scanData, vulns]) => {
        setScan(scanData);
        setVulnerabilities(vulns);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load scan details:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScanDetails();
  }, [scanID]);

  const handleUpdateStatus = async (vulnId: string, status: string) => {
    setUpdatingId(vulnId);
    try {
      await api.scans.updateVulnerability(vulnId, status);
      const updatedVulns = vulnerabilities.map((v) =>
        v.id === vulnId ? { ...v, status: status as any } : v
      );
      setVulnerabilities(updatedVulns);
    } catch (err: any) {
      alert(err.message || 'Failed to update vulnerability status.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || !scan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-sage">
        <Loader className="h-8 w-8 animate-spin mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest">Parsing Scan Findings...</span>
      </div>
    );
  }

  // Count severities in this scan
  const critCount = vulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
  const medCount = vulnerabilities.filter(v => v.severity === 'medium').length;
  const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

  const filteredVulns = vulnerabilities.filter((v) => {
    const matchesSev = filterSeverity === 'all' || v.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchesSev && matchesStatus;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="bg-vermilion/10 text-vermilion border border-vermilion/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Critical</span>;
      case 'high':
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">High</span>;
      case 'medium':
        return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Medium</span>;
      default:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Resolved</span>;
      case 'ignored':
        return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Ignored</span>;
      case 'false_positive':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">False Positive</span>;
      default:
        return <span className="bg-vermilion/10 text-vermilion border border-vermilion/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Open</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Back Link */}
      <div>
        <Link href={`/app/projects/${projectID}`} className="inline-flex items-center text-xs text-sage hover:text-cream transition-colors font-mono mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> BACK TO PROJECT DETAILS
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">SCAN REPORT</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Scan ID: {scan.id} | Run on: {new Date(scan.started_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center space-x-1.5 bg-card border border-border px-3 py-1.5 rounded text-xs text-cream font-mono">
            <ShieldCheck className="h-4.5 w-4.5 text-sage mr-1" />
            <span>GATE: {critCount + highCount === 0 ? <span className="text-emerald-400 font-bold">PASS</span> : <span className="text-vermilion font-bold">FAIL</span>}</span>
          </div>
        </div>
      </div>

      {/* Severity Count Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 p-4 rounded flex items-center justify-between shadow-lg">
          <span className="text-xs font-mono text-gray-400">CRITICAL</span>
          <span className="text-xl font-bold text-vermilion font-mono">{critCount}</span>
        </div>
        <div className="bg-card border border-border/80 p-4 rounded flex items-center justify-between shadow-lg">
          <span className="text-xs font-mono text-gray-400">HIGH</span>
          <span className="text-xl font-bold text-orange-400 font-mono">{highCount}</span>
        </div>
        <div className="bg-card border border-border/80 p-4 rounded flex items-center justify-between shadow-lg">
          <span className="text-xs font-mono text-gray-400">MEDIUM</span>
          <span className="text-xl font-bold text-yellow-400 font-mono">{medCount}</span>
        </div>
        <div className="bg-card border border-border/80 p-4 rounded flex items-center justify-between shadow-lg">
          <span className="text-xs font-mono text-gray-400">LOW</span>
          <span className="text-xl font-bold text-blue-400 font-mono">{lowCount}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/30 border border-border p-4 rounded">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-xs font-mono text-gray-400">FILTER FINDINGS:</span>
          
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-xs text-cream focus:border-sage focus:outline-none font-mono"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-xs text-cream focus:border-sage focus:outline-none font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open Only</option>
            <option value="resolved">Resolved Only</option>
            <option value="ignored">Ignored Only</option>
            <option value="false_positive">False Positives</option>
          </select>
        </div>
        
        <span className="text-xs font-mono text-gray-400">{filteredVulns.length} vulnerabilities showing</span>
      </div>

      {/* Findings Listing */}
      {filteredVulns.length > 0 ? (
        <div className="space-y-4">
          {filteredVulns.map((vuln) => (
            <div 
              key={vuln.id} 
              className={`bg-card border p-6 rounded-lg shadow-lg relative group transition-all duration-200 ${
                vuln.status !== 'open' ? 'border-border/50 opacity-75' : 'border-border hover:border-sage/40'
              }`}
            >
              {/* Title Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 pb-4 border-b border-border/50">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(vuln.severity)}
                    {getStatusBadge(vuln.status)}
                    <span className="text-xs text-gray-500 font-mono">ID: {vuln.id}</span>
                  </div>
                  <h3 className="text-base font-bold text-cream mt-2 font-mono">{vuln.title}</h3>
                </div>
                
                {/* Status Action Buttons */}
                {vuln.status === 'open' && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleUpdateStatus(vuln.id, 'resolved')}
                      disabled={updatingId === vuln.id}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-background border border-emerald-500/20 px-3 py-1 rounded text-xs font-mono font-bold transition-all"
                    >
                      {updatingId === vuln.id ? 'Updating...' : 'Resolve'}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(vuln.id, 'ignored')}
                      disabled={updatingId === vuln.id}
                      className="bg-gray-500/10 text-gray-400 hover:bg-gray-400 hover:text-background border border-gray-500/25 px-3 py-1 rounded text-xs font-mono font-bold transition-all"
                    >
                      Ignore
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(vuln.id, 'false_positive')}
                      disabled={updatingId === vuln.id}
                      className="bg-blue-500/10 text-blue-400 hover:bg-blue-400 hover:text-background border border-blue-500/25 px-3 py-1 rounded text-xs font-mono font-bold transition-all"
                    >
                      FP
                    </button>
                  </div>
                )}
                {vuln.status !== 'open' && (
                  <button
                    onClick={() => handleUpdateStatus(vuln.id, 'open')}
                    disabled={updatingId === vuln.id}
                    className="text-sage hover:text-cream border border-border px-3 py-1 rounded text-xs font-mono font-bold flex items-center transition-colors"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Reopen
                  </button>
                )}
              </div>

              {/* Body details */}
              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Affected Code Path</span>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="bg-background border border-border px-2 py-1 rounded text-xs font-mono text-sage select-all">
                      {vuln.file_path}:{vuln.line}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Issue Description</span>
                  <p className="text-sm text-gray-300 mt-1 leading-relaxed font-sans">{vuln.description}</p>
                </div>

                <div className="bg-background/40 border border-border/80 p-4 rounded">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold text-cream flex items-center">
                    <Sparkles className="h-3.5 w-3.5 text-sage mr-1" /> SUGGESTED REMEDIATION
                  </span>
                  <p className="text-xs text-sage mt-1.5 leading-relaxed font-mono select-text">{vuln.remediation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-border rounded-lg bg-card/25">
          <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-cream font-mono">No findings matches filter</h3>
          <p className="text-gray-500 text-xs mt-1">Try resetting the severity filters or review resolved status columns.</p>
        </div>
      )}
    </div>
  );
}
