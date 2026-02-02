'use client';

import { ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2">Connected App Setup</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          Follow these steps to create a Salesforce Connected App for ForceAuth.
        </p>

        <div className="space-y-8">
          {/* Step 1 */}
          <div className="border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--info))] text-white font-bold text-sm">1</span>
              <h2 className="text-xl font-semibold">Open App Manager</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              In your Salesforce org, navigate to:
            </p>
            <div className="bg-[hsl(var(--muted))] rounded-lg p-4 font-mono text-sm">
              Setup → Apps → App Manager → <span className="text-[hsl(var(--info))]">New Connected App</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--info))] text-white font-bold text-sm">2</span>
              <h2 className="text-xl font-semibold">Basic Information</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Fill in the basic details:
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-[hsl(var(--muted))] rounded-lg p-3">
                <span className="text-sm font-medium">Connected App Name</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">ForceAuth Dashboard</span>
              </div>
              <div className="flex justify-between items-center bg-[hsl(var(--muted))] rounded-lg p-3">
                <span className="text-sm font-medium">API Name</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">ForceAuth_Dashboard</span>
              </div>
              <div className="flex justify-between items-center bg-[hsl(var(--muted))] rounded-lg p-3">
                <span className="text-sm font-medium">Contact Email</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Your email address</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--info))] text-white font-bold text-sm">3</span>
              <h2 className="text-xl font-semibold">Enable OAuth Settings</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Check <strong>"Enable OAuth Settings"</strong> and configure:
            </p>
            <div className="space-y-3">
              <div className="bg-[hsl(var(--muted))] rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Callback URL</span>
                  <button
                    onClick={() => copyToClipboard(callbackUrl, 'callback')}
                    className="flex items-center gap-1 text-xs text-[hsl(var(--info))] hover:underline"
                  >
                    {copiedField === 'callback' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedField === 'callback' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="text-sm text-[hsl(var(--info))] break-all">{callbackUrl}</code>
              </div>

              <div className="bg-[hsl(var(--muted))] rounded-lg p-3">
                <span className="text-sm font-medium">Selected OAuth Scopes</span>
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">• Access and manage your data (api)</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">• Perform requests at any time (refresh_token, offline_access)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--info))] text-white font-bold text-sm">4</span>
              <h2 className="text-xl font-semibold">Enable PKCE</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Under OAuth settings, check these options:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-lg p-3">
                <Check className="w-4 h-4" />
                <span className="text-sm">Require Proof Key for Code Exchange (PKCE)</span>
              </div>
              <div className="flex items-center gap-2 bg-[hsl(var(--muted))] rounded-lg p-3">
                <div className="w-4 h-4 border-2 border-[hsl(var(--muted-foreground))] rounded" />
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Require Secret for Web Server Flow <span className="text-xs">(leave unchecked)</span></span>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--info))] text-white font-bold text-sm">5</span>
              <h2 className="text-xl font-semibold">Save and Get Consumer Key</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-[hsl(var(--muted-foreground))]">
              <li>Click <strong>Save</strong> at the bottom of the page</li>
              <li>Click <strong>Continue</strong> on the confirmation dialog</li>
              <li>Wait 2-10 minutes for changes to propagate</li>
              <li>Go to <strong>App Manager</strong> → find your app → click dropdown → <strong>View</strong></li>
              <li>Under "API (Enable OAuth Settings)", click <strong>Manage Consumer Details</strong></li>
              <li>Verify your identity, then copy the <strong>Consumer Key</strong></li>
            </ol>
          </div>

          {/* Step 6 */}
          <div className="border border-[hsl(var(--border))] rounded-lg p-6 bg-[hsl(var(--success)/0.05)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--success))] text-white font-bold text-sm">6</span>
              <h2 className="text-xl font-semibold">Configure ForceAuth</h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Return to ForceAuth and enter:
            </p>
            <div className="space-y-2">
              <div className="bg-[hsl(var(--background))] rounded-lg p-3 border border-[hsl(var(--border))]">
                <span className="text-sm"><strong>Org Name:</strong> Any friendly name for your org</span>
              </div>
              <div className="bg-[hsl(var(--background))] rounded-lg p-3 border border-[hsl(var(--border))]">
                <span className="text-sm"><strong>Environment:</strong> Production or Sandbox (match your org)</span>
              </div>
              <div className="bg-[hsl(var(--background))] rounded-lg p-3 border border-[hsl(var(--border))]">
                <span className="text-sm"><strong>Consumer Key:</strong> The key you copied from Salesforce</span>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="border border-[hsl(var(--warning)/0.3)] rounded-lg p-6 bg-[hsl(var(--warning)/0.05)]">
            <h2 className="text-lg font-semibold mb-4 text-[hsl(var(--warning))]">Troubleshooting</h2>
            <div className="space-y-3 text-sm">
              <div>
                <strong>redirect_uri_mismatch error:</strong>
                <p className="text-[hsl(var(--muted-foreground))]">
                  Make sure the Callback URL in Salesforce exactly matches: <code className="text-[hsl(var(--info))]">{callbackUrl}</code>
                </p>
              </div>
              <div>
                <strong>Changes not taking effect:</strong>
                <p className="text-[hsl(var(--muted-foreground))]">
                  Salesforce OAuth changes can take 2-10 minutes to propagate. Wait and try again.
                </p>
              </div>
              <div>
                <strong>Invalid client_id:</strong>
                <p className="text-[hsl(var(--muted-foreground))]">
                  Double-check you copied the Consumer Key (not the Consumer Secret).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[hsl(var(--border))] text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--info))] text-white rounded-lg hover:opacity-90"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
