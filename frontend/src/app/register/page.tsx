'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Shield, AlertCircle, Loader } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/app/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.auth.register({ name, email, password });
      setAuth(response.user, response.token);
      router.push('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-sage selection:text-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center space-x-2">
          <Shield className="h-10 w-10 text-sage" />
          <span className="font-mono text-2xl font-bold tracking-tight text-cream">
            SECURE<span className="text-sage">WAY</span>
          </span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-cream font-mono">
          CREATE ORGANIZATION
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 border border-border sm:rounded-lg sm:px-10 shadow-2xl relative">
          {/* Subtle decoration line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sage/20 via-sage to-sage/20" />

          {error && (
            <div className="mb-6 bg-vermilion/15 border border-vermilion/30 rounded p-3 flex items-start space-x-2 text-vermilion text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded border border-border bg-background/50 px-3 py-2 text-cream placeholder-gray-500 shadow-sm focus:border-sage focus:ring-1 focus:ring-sage focus:outline-none sm:text-sm font-mono"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                Console Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded border border-border bg-background/50 px-3 py-2 text-cream placeholder-gray-500 shadow-sm focus:border-sage focus:ring-1 focus:ring-sage focus:outline-none sm:text-sm font-mono"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                Credentials Token (Password)
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded border border-border bg-background/50 px-3 py-2 text-cream placeholder-gray-500 shadow-sm focus:border-sage focus:ring-1 focus:ring-sage focus:outline-none sm:text-sm font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded shadow-sm text-sm font-semibold bg-sage hover:bg-sage/80 text-background focus:outline-none transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  'Provision Workspace'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-border/50 pt-6">
            <span className="text-sm text-gray-400">
              Already registered?{' '}
              <Link href="/login" className="font-medium text-sage hover:underline">
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
