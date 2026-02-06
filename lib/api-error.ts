import { NextResponse } from 'next/server';
import { SalesforceAuthError } from './salesforce';

export function handleApiError(error: unknown, context: string) {
  console.error(`[Salesforce] ${context}:`, error);

  if (error instanceof SalesforceAuthError) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  return NextResponse.json(
    { error: `Failed to ${context}` },
    { status: 500 }
  );
}
