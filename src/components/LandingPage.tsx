'use client';

import { useState, useEffect } from 'react';
import { Shield, Activity, Users, Globe, Lock, Terminal, ChevronRight } from 'lucide-react';
import { Header } from './Header';
import { getStoredOrgCredentials } from '../services/api';
import Link from 'next/link';

export function LandingPage() {
  const [hasOrg, setHasOrg] = useState(false);

  useEffect(() => {
    setHasOrg(!!getStoredOrgCredentials());
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <Header />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-6">
        <div className="max-w-2xl w-full space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              salesforce security monitoring
            </div>

            <h1 className="text-4xl font-semibold text-[hsl(var(--foreground))]">
              // security_dashboard
            </h1>

            <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              real-time visibility into your salesforce org's security posture, user activity, and configuration health.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Shield, label: 'security_health', desc: 'config audits' },
              { icon: Activity, label: 'login_activity', desc: 'real-time tracking' },
              { icon: Users, label: 'user_permissions', desc: 'risk analysis' },
              { icon: Globe, label: 'geo_tracking', desc: 'location insights' },
              { icon: Lock, label: 'mfa_coverage', desc: 'compliance checks' },
              { icon: Terminal, label: 'audit_trail', desc: 'change history' },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border-hover))] transition-colors"
              >
                <Icon className="w-4 h-4 text-[hsl(var(--muted-foreground))] mb-2" />
                <div className="text-xs text-[hsl(var(--foreground))] font-medium">{label}</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{desc}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {hasOrg ? 'go_to_dashboard' : 'connect_org'}
              <ChevronRight className="w-4 h-4" />
            </Link>
            {!hasOrg && (
              <>
                <p className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">
                  requires a salesforce external client app with oauth credentials
                </p>
                <Link
                  href="/setup"
                  className="mt-2 inline-block text-xs text-[hsl(var(--info))] hover:underline"
                >
                  setup_guide
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-[hsl(var(--border))]">
        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
          <span>forceauth v0.1.0</span>
          <span>// built for salesforce admins</span>
        </div>
      </footer>
    </div>
  );
}
