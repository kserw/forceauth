'use client';

import { Copy, Check, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Header } from '../../src/components/Header';

export default function SetupPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback`
    : 'https://forceauth.vercel.app/api/auth/callback';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-2xl font-medium mb-2">// setup_guide</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              create a salesforce external client app for forceauth
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="border border-[hsl(var(--border))] rounded-md p-4 bg-[hsl(var(--card))]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">01</span>
                <span className="text-xs text-[hsl(var(--foreground))]">create_app</span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                in salesforce setup, navigate to:
              </p>
              <div className="bg-[hsl(var(--muted))] rounded px-3 py-2 font-mono text-xs">
                setup → apps → app_manager → <span className="text-[hsl(var(--info))]">new_external_client_app</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border border-[hsl(var(--border))] rounded-md p-4 bg-[hsl(var(--card))]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">02</span>
                <span className="text-xs text-[hsl(var(--foreground))]">basic_info</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">app_name</span>
                  <span className="font-mono">forceauth_dashboard</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">contact_email</span>
                  <span className="font-mono text-[hsl(var(--muted-foreground))]">your_email</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">distribution</span>
                  <span className="font-mono">local</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border border-[hsl(var(--border))] rounded-md p-4 bg-[hsl(var(--card))]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">03</span>
                <span className="text-xs text-[hsl(var(--foreground))]">oauth_settings</span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                click add under oauth settings, then enable oauth:
              </p>
              <div className="space-y-2">
                <div className="bg-[hsl(var(--muted))] rounded px-3 py-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">callback_url</span>
                    <button
                      onClick={() => copyToClipboard(callbackUrl, 'callback')}
                      className="flex items-center gap-1 text-[10px] text-[hsl(var(--info))] hover:underline"
                    >
                      {copiedField === 'callback' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'callback' ? 'copied' : 'copy'}
                    </button>
                  </div>
                  <code className="text-xs text-[hsl(var(--info))] break-all font-mono">{callbackUrl}</code>
                </div>

                <div className="bg-[hsl(var(--muted))] rounded px-3 py-2">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">oauth_scopes</span>
                  <div className="mt-1 text-xs font-mono space-y-0.5">
                    <div>• api</div>
                    <div>• refresh_token, offline_access</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border border-[hsl(var(--border))] rounded-md p-4 bg-[hsl(var(--card))]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">04</span>
                <span className="text-xs text-[hsl(var(--foreground))]">enable_pkce</span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                under client credentials:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm bg-[hsl(var(--success))] flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                  <span>require_pkce</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <div className="w-3 h-3 rounded-sm border border-[hsl(var(--border))]" />
                  <span>require_secret <span className="text-[10px]">(leave unchecked)</span></span>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="border border-[hsl(var(--border))] rounded-md p-4 bg-[hsl(var(--card))]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">05</span>
                <span className="text-xs text-[hsl(var(--foreground))]">get_client_id</span>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1 font-mono">
                <div>→ save the app</div>
                <div>→ wait 2-10 min for propagation</div>
                <div>→ app_manager → view → manage_consumer_details</div>
                <div>→ copy the <span className="text-[hsl(var(--info))]">client_id</span></div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="border border-[hsl(var(--success)/0.3)] rounded-md p-4 bg-[hsl(var(--success)/0.05)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[hsl(var(--success))]">06</span>
                <span className="text-xs text-[hsl(var(--success))]">connect_forceauth</span>
              </div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">org_name</span>
                  <span className="font-mono text-[hsl(var(--muted-foreground))]">any friendly name</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">environment</span>
                  <span className="font-mono">production | sandbox</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">client_id</span>
                  <span className="font-mono text-[hsl(var(--info))]">from salesforce</span>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="border border-[hsl(var(--warning)/0.3)] rounded-md p-4 bg-[hsl(var(--warning)/0.05)]">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-3 h-3 text-[hsl(var(--warning))]" />
                <span className="text-xs text-[hsl(var(--warning))]">troubleshooting</span>
              </div>
              <div className="text-xs space-y-2 font-mono">
                <div>
                  <span className="text-[hsl(var(--destructive))]">redirect_uri_mismatch</span>
                  <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                    → verify callback_url matches exactly
                  </p>
                </div>
                <div>
                  <span className="text-[hsl(var(--destructive))]">invalid_client_id</span>
                  <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                    → use client_id, not client_secret
                  </p>
                </div>
                <div>
                  <span className="text-[hsl(var(--warning))]">changes_not_working</span>
                  <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                    → wait 2-10 min for salesforce propagation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-[hsl(var(--border))]">
        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
          <span>forceauth v0.1.0</span>
          <span>// built for salesforce admins</span>
        </div>
      </footer>
    </div>
  );
}
