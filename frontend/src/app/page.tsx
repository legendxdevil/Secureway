import Link from 'next/link';
import { Shield, Cpu, Terminal, GitBranch, ArrowRight, Activity, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-sage selection:text-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-7 w-7 text-sage" />
            <span className="font-mono text-xl font-bold tracking-tight text-cream">
              SECURE<span className="text-sage">WAY</span>
            </span>
          </div>
          <nav className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-400 hover:text-cream transition-colors px-3 py-2 rounded-md"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-sage hover:bg-sage/80 text-background px-4 py-2 rounded font-semibold transition-colors duration-200"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="relative overflow-hidden py-24 sm:py-32">
          {/* Decorative glowing gradient */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sage/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-vermilion/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-sage/10 border border-sage/20 rounded-full px-3 py-1 text-xs text-sage font-mono mb-6">
                <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
                <span>Next-Gen DevSecOps Platform Simulation</span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-cream mb-6">
                Protect Your Pipelines <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sage to-emerald-400">
                  Before Deployment
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 mb-10 leading-relaxed">
                SecureWay automatically intercept commits, scans code packages, and flags configurations for potential security leaks in real time. Experience simulated CI/CD pipelines protecting enterprise application environments.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-sage hover:bg-sage/90 text-background font-semibold px-6 py-3 rounded transition-colors duration-200"
                >
                  <span>Launch Simulation Console</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 border border-border bg-card/30 hover:bg-card/75 text-cream px-6 py-3 rounded transition-colors duration-200"
                >
                  <span>Sign In to Account</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-20 bg-card/20 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-cream mb-4 font-mono">
                ENGINE CAPABILITIES
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Explore a simulated DevSecOps workspace modeled on leading security audit methodologies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-card border border-border p-8 rounded-lg relative group hover:border-sage/40 transition-colors duration-300">
                <div className="w-12 h-12 bg-sage/10 text-sage rounded flex items-center justify-center mb-6">
                  <Terminal className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-cream mb-3 font-mono">Simulated Scan Engine</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Triggers realistic multi-stage log builds (preparation, package audits, secret scanning, code checks) with real-time output streams.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card border border-border p-8 rounded-lg relative group hover:border-sage/40 transition-colors duration-300">
                <div className="w-12 h-12 bg-vermilion/10 text-vermilion rounded flex items-center justify-center mb-6">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-cream mb-3 font-mono">Real-time WebSockets</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Watch live pipelines execute step-by-step. Get instant desktop-grade push warnings when vulnerabilities bypass active security barriers.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card border border-border p-8 rounded-lg relative group hover:border-sage/40 transition-colors duration-300">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded flex items-center justify-center mb-6">
                  <Cpu className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-cream mb-3 font-mono">Interactive Remediation</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Review complete lists of open vulnerabilities, view affected lines, read details, and tag issues as Resolved or Ignored to update dashboard metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Simulation Mock */}
        <section className="py-20 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-card border border-border rounded-xl p-4 sm:p-8 relative overflow-hidden shadow-2xl">
              {/* Fake UI Header */}
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-vermilion" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-400 font-mono pl-4">SECUREWAY-CONSOLE-MOCK-v1.0</span>
                </div>
                <div className="flex items-center space-x-1 bg-background/50 border border-border px-3 py-1 rounded text-xs text-sage font-mono">
                  <Activity className="h-3.5 w-3.5 text-sage animate-pulse mr-1" />
                  <span>CONNECTED</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-background/40 border border-border p-5 rounded">
                  <span className="text-xs text-gray-400 font-mono">OPEN SECURITY THREATS</span>
                  <div className="text-4xl font-bold text-vermilion mt-2 font-mono">14</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">+3 detected in last 24h</div>
                </div>
                <div className="bg-background/40 border border-border p-5 rounded">
                  <span className="text-xs text-gray-400 font-mono">CONNECTED PROJECTS</span>
                  <div className="text-4xl font-bold text-cream mt-2 font-mono">8</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">All repositories synced</div>
                </div>
                <div className="bg-background/40 border border-border p-5 rounded">
                  <span className="text-xs text-gray-400 font-mono">ACTIVE SCAN PIPELINES</span>
                  <div className="text-4xl font-bold text-sage mt-2 font-mono">1</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">Stage: scanning (60%)</div>
                </div>
                <div className="bg-background/40 border border-border p-5 rounded">
                  <span className="text-xs text-gray-400 font-mono">SECURITY GATES PASSED</span>
                  <div className="text-4xl font-bold text-emerald-400 mt-2 font-mono">92.4%</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">Compliance rating</div>
                </div>
              </div>
              
              {/* Terminal scan logs mockup */}
              <div className="mt-6 bg-background/90 font-mono text-xs p-4 rounded border border-border text-sage overflow-hidden h-40 flex flex-col justify-end space-y-1 select-none">
                <div className="text-gray-600">[2026-06-29 19:15:22] SECUREWAY PIPELINE RUNNING FOR: secure-app-api</div>
                <div className="text-gray-500">[2026-06-29 19:15:23] [SAST] Running static rule analysis matchers...</div>
                <div className="text-gray-500">[2026-06-29 19:15:23] [SCA] Auditing package dependency logs against CVE database...</div>
                <div className="text-vermilion font-bold">[2026-06-29 19:15:24] [ALERT] CRITICAL: Plaintext database credentials found in app.config.js:L23</div>
                <div className="text-yellow-500 font-bold">[2026-06-29 19:15:24] [WARNING] HIGH: Path Traversal in file downloader in src/pages/api/download.ts:L34</div>
                <div className="text-sage terminal-cursor font-bold">[2026-06-29 19:15:25] Analyzing findings...</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-gray-500 text-sm font-mono">
            <span>© 2026 SecureWay Simulation. Built for paired review audits.</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-400">
            <a href="#" className="hover:text-cream transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-cream transition-colors">Terms of Service</a>
            <a href="https://github.com" className="hover:text-cream transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
