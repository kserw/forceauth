import { NextResponse } from 'next/server';

// Integration tracking is not available in stateless mode.
// This feature requires a database to store tracked integrations.

// GET /api/tracked-integrations - List integrations
export async function GET() {
  return NextResponse.json(
    {
      integrations: [],
      message: 'Integration tracking not available in stateless mode.'
    }
  );
}

// POST /api/tracked-integrations - Create integration
export async function POST() {
  return NextResponse.json(
    { error: 'Integration tracking not available in stateless mode.' },
    { status: 501 }
  );
}
