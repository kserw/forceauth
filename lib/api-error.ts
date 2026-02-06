import { NextResponse } from 'next/server';

function isSalesforceAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    // Check by name (survives instanceof failures from module duplication)
    if (error.name === 'SalesforceAuthError') return true;
    // Also catch Salesforce auth messages from network-level errors
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid_session_id') || msg.includes('session expired')) return true;
  }
  return false;
}

export function handleApiError(error: unknown, context: string) {
  console.error(`[Salesforce] ${context}:`, error);

  if (isSalesforceAuthError(error)) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    { error: `Failed to ${context}`, detail: message },
    { status: 500 }
  );
}
