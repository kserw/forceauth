import { NextResponse } from 'next/server';

// Org management is not available in stateless mode.
// In stateless mode, credentials are stored client-side in localStorage.

// GET /api/orgs - List registered orgs
export async function GET() {
  return NextResponse.json(
    {
      error: 'Org management not available in stateless mode. Credentials are stored locally in your browser.',
      hint: 'Use localStorage to manage your Salesforce Connected App credentials.'
    },
    { status: 501 }
  );
}

// POST /api/orgs - Register a new org
export async function POST() {
  return NextResponse.json(
    {
      error: 'Org management not available in stateless mode. Credentials are stored locally in your browser.',
      hint: 'Store your Connected App credentials in localStorage and pass them during login.'
    },
    { status: 501 }
  );
}
