// Users module - NOT USED in stateless mode
// In stateless mode, user info comes from Salesforce OAuth
// User data is stored in the encrypted session cookie

export interface User {
  id: string;
  salesforceUserId: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export async function findOrCreateUser(): Promise<User> {
  throw new Error('Database not available in stateless mode');
}

export async function getUserById(): Promise<User | null> {
  throw new Error('Database not available in stateless mode');
}

export async function listUsers(): Promise<User[]> {
  throw new Error('Database not available in stateless mode');
}
