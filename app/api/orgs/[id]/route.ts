import { NextResponse } from 'next/server';

// Org management is not available in stateless mode.
// In stateless mode, credentials are stored client-side in localStorage.

// GET /api/orgs/[id] - Get a specific org
export async function GET() {
  return NextResponse.json(
    {
      error: 'Org management not available in stateless mode. Credentials are stored locally in your browser.',
      hint: 'Use localStorage to retrieve your Salesforce Connected App credentials.'
    },
    { status: 501 }
  );
}

// DELETE /api/orgs/[id] - Delete an org
export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Org management not available in stateless mode. Credentials are stored locally in your browser.',
      hint: 'Clear credentials from localStorage directly.'
    },
    { status: 501 }
  );
}
