// Database module - NOT USED in stateless mode
// This file is kept for reference but all persistence is now client-side

export function getSql() {
  throw new Error('Database not available in stateless mode');
}

export async function query() {
  throw new Error('Database not available in stateless mode');
}

export async function initializeDatabase() {
  // No-op in stateless mode
}

export async function cleanupExpiredOAuthStates() {
  return 0;
}

export async function cleanupExpiredSessions() {
  return 0;
}
