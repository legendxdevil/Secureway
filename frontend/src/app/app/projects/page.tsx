'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { GitFork, Plus, Search, Trash2, Clock, CheckCircle, AlertTriangle, Code, ArrowRight, Loader } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [language, setLanguage] = useState('TypeScript');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchProjects = () => {
    setLoading(true);
    api.projects.list()
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load projects:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      await api.projects.create({ name, repo_url: repoUrl, language });
      setShowModal(false);
      setName('');
      setRepoUrl('');
      setLanguage('TypeScript');
      fetchProjects();
    } catch (err: any) {
      setModalError(err.message || 'Failed to connect repository.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this project? This will erase all scan history and alerts.')) return;

    try {
      await api.projects.delete(id);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project.');
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cream font-mono">PROJECTS</h1>
          <p className="text-gray-400 text-sm mt-1">Manage connected code repositories and invoke CI/CD scans.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 bg-sage hover:bg-sage/80 text-background font-semibold px-4 py-2.5 rounded transition-colors duration-150"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Filter by name or language..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded pl-10 pr-4 py-2.5 text-cream placeholder-gray-500 focus:border-sage focus:outline-none font-mono text-sm"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-sage">
          <Clock className="h-8 w-8 animate-spin mb-4" />
          <span className="font-mono text-xs uppercase tracking-widest">Loading connected projects...</span>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className="bg-card border border-border p-6 rounded-lg shadow-lg hover:border-sage/40 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-cream font-bold font-mono group-hover:text-sage transition-colors">
                    <GitFork className="h-4 w-4 text-sage" />
                    <span className="truncate max-w-[180px]">{project.name}</span>
                  </div>
                  <span className="bg-background border border-border px-2 py-0.5 rounded text-[10px] text-gray-400 font-mono flex items-center">
                    <Code className="h-3 w-3 mr-1 text-sage" />
                    {project.language}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 font-mono mt-3 truncate">{project.repo_url}</p>

                <div className="mt-6 flex items-center space-x-2 text-xs font-mono text-gray-400">
                  {project.last_scan_id ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>Last scan: {new Date(project.last_scan_at).toLocaleDateString()}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>No scans performed</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-sage group-hover:underline flex items-center">
                  Open Console <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </span>
                <button
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  className="text-gray-500 hover:text-vermilion p-1.5 rounded hover:bg-vermilion/10 transition-colors"
                  title="Remove Project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-border rounded-lg bg-card/25">
          <GitFork className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-cream font-mono">No projects connected</h3>
          <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">Connect a manual code repository to start simulating automated webhook push events.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 bg-sage hover:bg-sage/80 text-background font-semibold px-4 py-2 rounded text-sm transition-colors duration-150"
          >
            Connect First Project
          </button>
        </div>
      )}

      {/* Connection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-sage" />
            
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-cream font-mono">CONNECT REPOSITORY</h3>
              <p className="text-xs text-gray-400 mt-1">Specify repository metadata to hook webhook handlers.</p>
            </div>

            {modalError && (
              <div className="m-6 mb-0 bg-vermilion/15 border border-vermilion/30 rounded p-3 flex items-start space-x-2 text-vermilion text-xs">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-cream placeholder-gray-500 focus:border-sage focus:outline-none font-mono text-sm"
                  placeholder="secure-payment-gateway"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">
                  Repository Git URL
                </label>
                <input
                  type="url"
                  required
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-cream placeholder-gray-500 focus:border-sage focus:outline-none font-mono text-sm"
                  placeholder="https://github.com/org/secure-gateway.git"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">
                  Primary Code Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-cream focus:border-sage focus:outline-none font-mono text-sm"
                >
                  <option value="TypeScript">TypeScript / Node.js</option>
                  <option value="Go">Go / Golang</option>
                  <option value="Python">Python</option>
                  <option value="Rust">Rust</option>
                  <option value="Java">Java / JVM</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border rounded text-xs font-mono text-gray-400 hover:text-cream transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sage hover:bg-sage/80 text-background rounded font-semibold text-xs flex items-center justify-center min-w-[80px]"
                >
                  {submitting ? <Loader className="h-4 w-4 animate-spin" /> : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
