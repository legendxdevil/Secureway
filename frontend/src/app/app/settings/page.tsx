'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Project } from '@/types';
import { 
  Settings, User, Shield, Plus, ToggleLeft, ToggleRight, Loader, 
  Trash2, FileText, Check, AlertTriangle 
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useStore();

  const [slackNotify, setSlackNotify] = useState(true);
  const [emailNotify, setEmailNotify] = useState(false);
  
  // Workspace Members
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Gate Policy states
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectID, setSelectedProjectID] = useState<string>('');
  const [gatePolicy, setGatePolicy] = useState<{
    block_on_critical: boolean;
    block_on_high: boolean;
    max_allowed_medium: number;
  } | null>(null);
  
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  useEffect(() => {
    // Load members
    api.org.members()
      .then(setMembers)
      .catch(err => console.error('Failed to load members:', err))
      .finally(() => setLoadingMembers(false));

    // Load projects for policy select
    api.projects.list()
      .then(data => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectID(data[0].id);
          loadGatePolicy(data[0].id);
        }
      })
      .catch(err => console.error('Failed to load projects:', err));
  }, []);

  const loadGatePolicy = async (projID: string) => {
    setLoadingPolicy(true);
    try {
      const policy = await api.projects.getGatePolicy(projID);
      setGatePolicy(policy);
    } catch (err) {
      console.error('Failed to load gate policy:', err);
    } finally {
      setLoadingPolicy(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projID = e.target.value;
    setSelectedProjectID(projID);
    loadGatePolicy(projID);
  };

  const handleRoleChange = async (memberID: string, newRole: string) => {
    try {
      await api.org.updateRole(memberID, newRole);
      setMembers(prev => prev.map(m => m.id === memberID ? { ...m, role: newRole } : m));
      alert('Operator role updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update operator role');
    }
  };

  const handleDeleteMember = async (memberID: string) => {
    if (!confirm('Are you sure you want to remove this operator from the organization workspace?')) return;
    try {
      await api.org.deleteMember(memberID);
      setMembers(prev => prev.filter(m => m.id !== memberID));
      alert('Operator removed successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to remove operator');
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectID || !gatePolicy) return;
    setSavingPolicy(true);
    try {
      await api.projects.updateGatePolicy(selectedProjectID, {
        block_on_critical: gatePolicy.block_on_critical,
        block_on_high: gatePolicy.block_on_high,
        max_allowed_medium: Number(gatePolicy.max_allowed_medium),
      });
      alert('Compliance gate policy saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update gate policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">SETTINGS</h1>
          <p className="text-gray-400 text-xs mt-1 font-sans">Configure workspace variables, profiles, notifications, and team access.</p>
        </div>
        {isAdmin && (
          <Link
            href="/app/settings/audit-log"
            className="inline-flex items-center space-x-2 bg-sage/10 text-sage hover:bg-sage/20 border border-sage/20 rounded px-4 py-2.5 text-xs font-mono font-bold transition-all"
          >
            <FileText className="h-4 w-4" />
            <span>View Workspace Audit Log</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
            <h3 className="text-sm font-bold text-cream pb-3 border-b border-border mb-5 flex items-center">
              <User className="h-4.5 w-4.5 text-sage mr-2" /> PERSONAL PROFILE
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Operator Name</span>
                  <span className="text-xs text-cream font-semibold mt-1 block bg-background/50 border border-border px-3 py-2 rounded">
                    {user?.name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Access Email</span>
                  <span className="text-xs text-cream font-semibold mt-1 block bg-background/50 border border-border px-3 py-2 rounded">
                    {user?.email}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Authorization Level (Role)</span>
                <span className="inline-flex items-center mt-1 bg-sage/10 text-sage border border-sage/20 px-2.5 py-1 rounded text-xs font-bold capitalize">
                  <Shield className="h-3.5 w-3.5 mr-1" /> {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Gate Policy Settings Panel (Phase 4) */}
          <div className="bg-card border border-border p-6 rounded-lg shadow-lg">
            <h3 className="text-sm font-bold text-cream pb-3 border-b border-border mb-5 flex items-center">
              <Shield className="h-4.5 w-4.5 text-sage mr-2" /> CI/CD COMPLIANCE GATE POLICIES
            </h3>

            {projects.length > 0 ? (
              <form onSubmit={handleSavePolicy} className="space-y-6">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Select Project</label>
                  <select
                    value={selectedProjectID}
                    onChange={handleProjectChange}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-cream focus:border-sage focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {loadingPolicy || !gatePolicy ? (
                  <div className="py-6 flex items-center justify-center space-x-2 text-sage text-xs">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Loading Policy Configurations...</span>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-cream">Block Deployments on Critical Finding</span>
                        <p className="text-[10px] text-gray-400 font-sans mt-0.5">Fail build gate instantly if any critical severity threat is found.</p>
                      </div>
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => setGatePolicy(prev => prev ? { ...prev, block_on_critical: !prev.block_on_critical } : null)}
                        className="text-sage disabled:opacity-50"
                      >
                        {gatePolicy.block_on_critical ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-gray-600" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-cream">Block Deployments on High Finding</span>
                        <p className="text-[10px] text-gray-400 font-sans mt-0.5">Fail build gate if high severity issues are detected.</p>
                      </div>
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => setGatePolicy(prev => prev ? { ...prev, block_on_high: !prev.block_on_high } : null)}
                        className="text-sage disabled:opacity-50"
                      >
                        {gatePolicy.block_on_high ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-gray-600" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-grow mr-4">
                        <span className="text-xs font-bold text-cream">Maximum Allowed Medium Findings</span>
                        <p className="text-[10px] text-gray-400 font-sans mt-0.5">Fail gate if counts exceed this limit. Enter -1 for unlimited.</p>
                      </div>
                      <input
                        type="number"
                        disabled={!isAdmin}
                        min="-1"
                        value={gatePolicy.max_allowed_medium}
                        onChange={(e) => setGatePolicy(prev => prev ? { ...prev, max_allowed_medium: parseInt(e.target.value) || -1 } : null)}
                        className="w-20 bg-background border border-border rounded px-2.5 py-1 text-center text-xs text-cream focus:border-sage focus:outline-none disabled:opacity-50"
                      />
                    </div>

                    {isAdmin ? (
                      <button
                        type="submit"
                        disabled={savingPolicy}
                        className="bg-vermilion hover:bg-vermilion/90 text-cream px-4 py-2 rounded text-xs font-bold transition-all flex items-center"
                      >
                        {savingPolicy ? <Loader className="h-3.5 w-3.5 animate-spin mr-2" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                        Save Gate Policy
                      </button>
                    ) : (
                      <div className="bg-sage/5 border border-sage/20 text-sage/80 p-3 rounded text-[10px] flex items-center font-sans leading-relaxed">
                        <AlertTriangle className="h-4 w-4 mr-2 text-sage shrink-0" />
                        <span>View only access: Modifying gate policies requires Administrator privileges.</span>
                      </div>
                    )}
                  </div>
                )}
              </form>
            ) : (
              <div className="py-8 text-center text-gray-500 text-xs">
                No active projects connected to configure gate policies.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Team Management (Phase 1 Safeguards) */}
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg flex flex-col justify-between h-fit">
          <div>
            <h3 className="text-sm font-bold text-cream pb-3 border-b border-border mb-5 flex items-center">
              <Plus className="h-4.5 w-4.5 text-sage mr-2" /> WORKSPACE OPERATORS
            </h3>
            
            <div className="bg-sage/5 border border-sage/20 text-sage p-3 rounded text-[10px] mb-6 font-sans leading-relaxed">
              <span>To add new team members, invite them to register at <code className="text-cream">/register</code> using your company email domain. They will auto-join this organization!</span>
            </div>

            {loadingMembers ? (
              <div className="py-12 flex items-center justify-center space-x-2 text-sage text-xs">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Loading team directory...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => {
                  const isSelf = member.id === user?.id;
                  return (
                    <div key={member.id} className="flex flex-col bg-background/30 border border-border/80 p-3 rounded space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-cream truncate">{member.name} {isSelf && '(You)'}</p>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{member.email}</p>
                        </div>
                        <span className="bg-sage/10 text-sage border border-sage/20 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                          {member.role}
                        </span>
                      </div>
                      
                      {/* Admin controls */}
                      {isAdmin && !isSelf && (
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="bg-background border border-border rounded px-2 py-0.5 text-[10px] text-cream focus:border-sage focus:outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="developer">Developer</option>
                            <option value="viewer">Viewer</option>
                          </select>

                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-gray-500 hover:text-vermilion transition-colors p-1"
                            title="Remove operator"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
