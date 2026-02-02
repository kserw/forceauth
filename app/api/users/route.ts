import { NextResponse } from 'next/server';

// User directory is not available in stateless mode.
// This feature requires a database to store ForceAuth users.

// GET /api/users - List ForceAuth users
export async function GET() {
  return NextResponse.json(
    {
      users: [],
      message: 'User directory not available in stateless mode.'
    }
  );
}
