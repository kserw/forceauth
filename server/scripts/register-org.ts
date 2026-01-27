#!/usr/bin/env tsx
/**
 * Script to register a Salesforce org's External Client App credentials
 *
 * Usage:
 *   npx tsx scripts/register-org.ts
 *
 * Or with arguments:
 *   npx tsx scripts/register-org.ts --name "My Sandbox" --env sandbox --clientId "3MVG9..." --clientSecret "ABC..."
 */

import readline from 'readline';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n🔐 Register Salesforce Org Credentials\n');
  console.log('This will register your External Client App credentials.');
  console.log('You can find these in Salesforce under:');
  console.log('  Setup → External Client Apps → [Your App] → View\n');

  // Parse command line args
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const orgName = getArg('name') || await prompt('Org Name (e.g., "My Company Sandbox"): ');
  const environment = getArg('env') || await prompt('Environment (sandbox/production) [sandbox]: ') || 'sandbox';
  const clientId = getArg('clientId') || await prompt('Consumer Key (Client ID): ');
  const clientSecret = getArg('clientSecret') || await prompt('Consumer Secret: ');

  if (!orgName || !clientId || !clientSecret) {
    console.error('\n❌ Error: All fields are required');
    process.exit(1);
  }

  if (environment !== 'sandbox' && environment !== 'production') {
    console.error('\n❌ Error: Environment must be "sandbox" or "production"');
    process.exit(1);
  }

  console.log('\nRegistering org...');

  try {
    const response = await fetch(`${API_BASE}/api/orgs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName,
        environment,
        clientId,
        clientSecret,
        redirectUri: `${API_BASE}/api/auth/callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register org');
    }

    const result = await response.json();

    console.log('\n✅ Org registered successfully!\n');
    console.log('Org ID:', result.id);
    console.log('Name:', result.orgName);
    console.log('Environment:', result.environment);
    console.log('\nTo test login, open:');
    console.log(`  http://localhost:5173/api/auth/login?orgId=${result.id}&popup=true`);
    console.log('\nOr use the frontend and select this org.\n');

  } catch (err) {
    console.error('\n❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
