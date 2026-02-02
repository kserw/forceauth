import { NextResponse } from 'next/server';

// Org sharing is not available in stateless mode.
// In stateless mode, credentials are stored client-side in localStorage.

// PATCH /api/orgs/[id]/share - Toggle sharing
export async function PATCH() {
  return NextResponse.json(
    {
      error: 'Org sharing not available in stateless mode. Credentials are stored locally in your browser.',
      hint: 'Sharing requires a database to store shared credentials across users.'
    },
    { status: 501 }
  );
}
