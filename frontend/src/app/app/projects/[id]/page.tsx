'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Project, ScanJob } from '@/types';
import { 
  GitFork, Play, Clock, CheckCircle, ArrowLeft, 
  Terminal, Server, Calendar, Code, ExternalLink, ChevronRight,
  Download, Upload, ShieldAlert, ShieldCheck, RefreshCw, Loader
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectID = params.id as string;

  const { scanProgress, scanLogs } = useStore();
  
  const [project, setProject] = useState<any | null>(null);
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScanID, setActiveScanID] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  // Verification states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [generatedTokenContent, setGeneratedTokenContent] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  const loadProjectDetails = () => {
    api.projects.get(projectID)
      .then((data: any) => {
        setProject(data);
        setScans(data.scans || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load project details:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProjectDetails();
  }, [projectID]);

  // Lockout countdown timer
  useEffect(() => {
    if (project?.locked_until) {
      const lockedUntilDate = new Date(project.locked_until);
      const now = new Date();
      const diffSeconds = Math.max(0, Math.floor((lockedUntilDate.getTime() - now.getTime()) / 1000));
      setLockoutTimeLeft(diffSeconds);
    } else {
      setLockoutTimeLeft(0);
    }
  }, [project]);

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          loadProjectDetails();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  // Auto-scroll terminal console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs, activeScanID]);

  const activeProgress = activeScanID ? scanProgress[activeScanID] : null;
  const activeLogs = activeScanID ? (scanLogs[activeScanID] || []) : [];
  const activeScanJob = scans.find(s => s.id === activeScanID);

  useEffect(() => {
    if (activeProgress?.stage === 'completed' || activeProgress?.stage === 'failed') {
      const t = setTimeout(() => {
        loadProjectDetails();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [activeProgress?.stage]);

  const handleSimulatePush = async () => {
    if (triggering || (activeProgress && activeProgress.stage !== 'completed' && activeProgress.stage !== 'failed')) return;
    setTriggering(true);

    try {
      const scanJob = await api.scans.trigger(projectID, 'mock_push');
      setActiveScanID(scanJob.id);
      setScans(prev => [scanJob, ...prev]);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger scan simulation.');
    } finally {
      setTriggering(false);
    }
  };

  const handleGenerateToken = async () => {
    try {
      const data = await api.projects.generateToken(projectID);
      setGeneratedToken(data.token);
      setGeneratedTokenContent(data.file_content);
      const blob = new Blob([data.file_content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secureway-${project.name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to generate verification token');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.txt')) {
        setSelectedFile(file);
      } else {
        alert('Only .txt files are allowed');
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.txt')) {
        setSelectedFile(file);
      } else {
        alert('Only .txt files are allowed');
      }
    }
  };

  const handleVerifyOwnership = async () => {
    if (!selectedFile) return;
    setVerifying(true);
    try {
      const res = await api.projects.verifyOwnership(projectID, selectedFile);
      setProject(res.project);
      setSelectedFile(null);
      alert(res.message || 'Ownership verified successfully!');
    } catch (err: any) {
      alert(err.message || 'Verification failed');
      loadProjectDetails();
    } finally {
      setVerifying(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-sage">
        <Clock className="h-8 w-8 animate-spin mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest">Loading project workspace...</span>
      </div>
    );
  }

  // Stepper helper colors
  const getStepColor = (stepIndex: number) => {
    if (!activeProgress) return 'border-border text-gray-500 bg-background';
    
    const currentPercent = activeProgress.percent;
    const currentStage = activeProgress.stage;

    // Phase 4: Custom step 5 Gate result check
    if (stepIndex === 4) {
      if (currentStage === 'completed' || (activeScanJob && activeScanJob.status === 'completed')) {
        const passed = activeScanJob ? activeScanJob.gate_passed : true;
        return passed 
          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' 
          : 'border-vermilion text-vermilion bg-vermilion/10';
      }
    }

    if (currentStage === 'completed') return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
    if (currentStage === 'failed') return 'border-vermilion text-vermilion bg-vermilion/10';

    const stepPercents = [5, 20, 60, 90, 100];
    const stepTargetPercent = stepPercents[stepIndex];

    if (currentPercent > stepTargetPercent) {
      return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
    } else if (currentPercent === stepTargetPercent || (stepIndex === 0 && currentPercent === 5) || (stepIndex === 1 && currentStage === 'building') || (stepIndex === 2 && currentStage === 'scanning') || (stepIndex === 3 && currentStage === 'analyzing')) {
      return 'border-sage text-sage bg-sage/10 animate-pulse';
    }
    return 'border-border text-gray-500 bg-background';
  };

  return (
    <div className="space-y-8">
      {/* Header Back Link */}
      <div>
        <Link href="/app/projects" className="inline-flex items-center text-xs text-sage hover:text-cream transition-colors font-mono mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> BACK TO PROJECTS
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-cream font-mono flex items-center">
              <GitFork className="h-7 w-7 text-sage mr-3" />
              {project.name}
              {project.verified ? (
                <span className="ml-3 inline-flex items-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-bold">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </span>
              ) : (
                <span className="ml-3 inline-flex items-center bg-vermilion/10 text-vermilion border border-vermilion/25 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-bold">
                  <ShieldAlert className="h-3 w-3 mr-1" /> Unverified
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1.5 flex items-center">
              <Code className="h-3.5 w-3.5 mr-1 text-sage" /> Primary: {project.language} | {project.repo_url}
              {project.verified_at && (
                <span className="ml-2 text-gray-500">
                  (Verified: {new Date(project.verified_at).toLocaleString()})
                </span>
              )}
            </p>
          </div>
          {project.verified && (
            <button
              onClick={handleSimulatePush}
              disabled={triggering || (activeProgress ? activeProgress.stage !== 'completed' && activeProgress.stage !== 'failed' : false)}
              className="inline-flex items-center space-x-2 bg-vermilion hover:bg-vermilion/85 text-cream font-bold px-5 py-3 rounded shadow-lg transition-colors duration-150 disabled:opacity-50"
            >
              <Play className="h-4 w-4 text-cream" />
              <span>Simulate Git Push (Webhook)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Verification Gate / Stepper Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Verification Widget if not verified */}
          {!project.verified && (
            <div className="bg-card border border-vermilion/30 p-6 rounded-lg shadow-lg space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-vermilion/10 via-vermilion to-vermilion/10" />
              
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-vermilion/10 text-vermilion rounded border border-vermilion/20 shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-cream font-mono">OWNERSHIP VERIFICATION REQUIRED</h3>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    Prove ownership of this repository before executing code security pipelines.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                {/* Step 1: Download */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">STEP 1: DOWNLOAD TOKEN</span>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Generate and download a hex-encoded verification token. You must place this text file in your repository.
                  </p>
                  <button
                    onClick={handleGenerateToken}
                    className="bg-sage/10 text-sage hover:bg-sage/20 border border-sage/20 rounded px-4 py-2 text-xs font-mono font-bold flex items-center transition-all"
                  >
                    <Download className="h-4 w-4 mr-2" /> Generate Verification File
                  </button>

                  {generatedTokenContent && (
                    <div className="mt-3 p-3 bg-black/40 border border-border rounded space-y-2 select-text">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold">Text Preview:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedTokenContent);
                            alert("Copied to clipboard!");
                          }}
                          className="text-[9px] font-mono text-sage hover:text-cream transition-colors cursor-pointer"
                        >
                          Copy Text
                        </button>
                      </div>
                      <pre className="text-[10px] text-sage font-mono whitespace-pre-wrap p-2 bg-black/60 rounded border border-border/30 overflow-x-auto leading-relaxed">
                        {generatedTokenContent}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Step 2: Upload */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">STEP 2: UPLOAD & VERIFY</span>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Upload the token <code className="text-sage font-mono">.txt</code> file to complete verification.
                  </p>
                  
                  {/* Upload Drop Zone */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
                      isDragging ? 'border-sage bg-sage/5' : 'border-border hover:border-sage/40'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      accept=".txt" 
                      className="hidden" 
                    />
                    <Upload className="h-5 w-5 text-gray-500 mx-auto mb-1.5" />
                    <span className="text-[10px] font-mono text-gray-400 block truncate">
                      {selectedFile ? selectedFile.name : 'Drag & drop token file or click to select'}
                    </span>
                  </div>

                  {/* Lockout status / Actions */}
                  {lockoutTimeLeft > 0 ? (
                    <div className="bg-vermilion/15 border border-vermilion/30 text-vermilion p-2.5 rounded text-[10px] font-mono animate-pulse">
                      RATE LIMIT ACTIVE: Retry in {Math.floor(lockoutTimeLeft / 60)}m {lockoutTimeLeft % 60}s
                    </div>
                  ) : (
                    <button
                      onClick={handleVerifyOwnership}
                      disabled={!selectedFile || verifying}
                      className="w-full bg-vermilion hover:bg-vermilion/85 disabled:opacity-50 text-cream px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center justify-center"
                    >
                      {verifying ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirm Ownership ({project.verification_attempts || 0}/5 attempts)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stepper Visualization */}
          {activeScanID && (
            <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-mono text-gray-400">ACTIVE PIPELINE STATUS:</span>
                <span className="text-xs font-mono text-sage font-bold uppercase">{activeProgress?.stage || 'Queued'}</span>
              </div>
              
              {/* Stepper Steps Graphic */}
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-border -z-10" />

                {/* Step 1: Queued */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${getStepColor(0)}`}>
                    01
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 mt-2">Queued</span>
                </div>

                {/* Step 2: Build */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${getStepColor(1)}`}>
                    02
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 mt-2">Build</span>
                </div>

                {/* Step 3: Scan */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${getStepColor(2)}`}>
                    03
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 mt-2">Scan</span>
                </div>

                {/* Step 4: Analyze */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${getStepColor(3)}`}>
                    04
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 mt-2">Analyze</span>
                </div>

                {/* Step 5: Gate Result */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${getStepColor(4)}`}>
                    05
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 mt-2">Gate</span>
                </div>
              </div>
            </div>
          )}

          {/* Log Console Output Terminal */}
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg flex flex-col">
            <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono text-gray-400">
                <Terminal className="h-4 w-4 text-sage" />
                <span>CI/CD PIPELINE LOG CONSOLE</span>
              </div>
              
              {/* Completed Scan -> Inspect findings */}
              {activeProgress?.stage === 'completed' && (
                <Link
                  href={`/app/projects/${projectID}/scans/${activeScanID}`}
                  className="bg-sage/10 text-sage hover:bg-sage/20 border border-sage/20 rounded px-2.5 py-1 text-xs font-mono font-bold flex items-center transition-all"
                >
                  Inspect Scan findings <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              )}

              {/* Failed Scan -> Retry push simulation (Phase 3) */}
              {((activeProgress?.stage === 'failed') || (activeScanJob && activeScanJob.status === 'failed')) && (
                <button
                  onClick={handleSimulatePush}
                  className="bg-vermilion/10 text-vermilion hover:bg-vermilion/20 border border-vermilion/20 rounded px-2.5 py-1 text-xs font-mono font-bold flex items-center transition-all animate-pulse"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Scan
                </button>
              )}
            </div>

            <div className="bg-black/95 font-mono text-xs p-5 text-sage min-h-[300px] max-h-[350px] overflow-y-auto space-y-1.5 select-text">
              {activeScanID ? (
                <>
                  {activeLogs.map((logLine, idx) => {
                    let textClass = 'text-sage';
                    if (logLine.includes('ALERT') || logLine.includes('CRITICAL') || logLine.includes('FATAL') || logLine.includes('violated')) {
                      textClass = 'text-vermilion font-bold';
                    } else if (logLine.includes('WARNING') || logLine.includes('HIGH')) {
                      textClass = 'text-orange-400';
                    } else if (logLine.includes('Scan completed') || logLine.includes('Build complete') || logLine.includes('met: PASSED')) {
                      textClass = 'text-emerald-400';
                    }
                    
                    return (
                      <div key={idx} className={textClass}>
                        {logLine}
                      </div>
                    );
                  })}
                  {activeProgress && activeProgress.stage !== 'completed' && activeProgress.stage !== 'failed' && (
                    <div className="terminal-cursor text-sage">Scanning files</div>
                  )}
                </>
              ) : (
                <div className="text-gray-500 h-full flex items-center justify-center pt-24">
                  <span>Interactive Pipeline Logs: Trigger a Git Push webhook to stream logs live.</span>
                </div>
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>

        {/* Right: Project Stats Summary Info */}
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-cream font-mono pb-4 border-b border-border">INTEGRATION METADATA</h3>
            
            <div className="py-4 space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Environment Node</span>
                <span className="text-cream font-semibold flex items-center">
                  <Server className="h-3.5 w-3.5 text-sage mr-1" /> mock-node-01
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">CI Provider</span>
                <span className="text-cream font-semibold">GitHub (Simulated Webhook)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Added On</span>
                <span className="text-cream font-semibold flex items-center">
                  <Calendar className="h-3.5 w-3.5 text-sage mr-1" /> 
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Pipeline Scans</span>
                <span className="text-cream font-semibold">{scans.length} runs</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border mt-6">
            <h4 className="text-xs font-mono font-bold text-cream uppercase mb-3">Webhook Target URL</h4>
            <div className="bg-background border border-border p-3 rounded text-[10px] font-mono text-gray-400 break-all select-all flex justify-between items-center">
              <span>{`http://localhost:8080/api/projects/${project.id}/trigger`}</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono mt-1.5 block">Trigger push events externally using POST payloads.</span>
          </div>
        </div>
      </div>

      {/* Historical Scans List */}
      <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
        <h3 className="text-base font-bold text-cream mb-6 font-mono">SCAN TRANSACTION HISTORY</h3>

        {scans && scans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-gray-400 font-mono text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Scan Job ID</th>
                  <th className="pb-3 font-semibold">Trigger Mode</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Run Date</th>
                  <th className="pb-3 text-right">Gate Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono text-xs">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-background/25">
                    <td className="py-3 text-cream font-semibold">{scan.id.substring(0, 8)}</td>
                    <td className="py-3 text-gray-400 capitalize">{scan.trigger_type.replace('_', ' ')}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        scan.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          : scan.status === 'failed'
                          ? 'bg-vermilion/10 text-vermilion border border-vermilion/25'
                          : 'bg-sage/10 text-sage border border-sage/25 animate-pulse'
                      }`}>
                        {scan.status}
                      </span>
                      {scan.error_reason && (
                        <span className="text-[10px] text-vermilion ml-2 select-text font-sans">
                          ({scan.error_reason})
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-400">{new Date(scan.started_at).toLocaleString()}</td>
                    <td className="py-3 text-right">
                      {scan.status === 'completed' ? (
                        <div className="inline-flex items-center space-x-3">
                          <span className={`text-[10px] font-bold font-mono tracking-wide ${scan.gate_passed ? 'text-emerald-400' : 'text-vermilion'}`}>
                            {scan.gate_passed ? 'GATE PASS' : 'GATE FAIL'}
                          </span>
                          <Link
                            href={`/app/projects/${projectID}/scans/${scan.id}`}
                            className="inline-flex items-center space-x-1 text-sage hover:text-cream hover:underline"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 font-mono text-xs">
            <span>No historic builds recorded for this workspace.</span>
          </div>
        )}
      </div>
    </div>
  );
}
