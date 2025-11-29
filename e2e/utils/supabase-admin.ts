/**
 * Supabase admin client for direct database access in E2E tests
 * Uses service role key for bypassing RLS
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Get or create Supabase admin client with service role
 */
export function getAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required for E2E tests'
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

/**
 * Reset the admin client (useful for test isolation)
 */
export function resetAdminClient(): void {
  adminClient = null;
}

/**
 * Get user ID from email (for seeding test data with correct user_id)
 */
export async function getUserIdFromEmail(email: string): Promise<string> {
  const client = getAdminClient();
  
  // First, check auth.users
  const { data: authData, error: authError } = await client.auth.admin.listUsers();
  
  if (authError) {
    throw new Error(`Failed to list users: ${authError.message}`);
  }
  
  const user = authData.users.find(u => u.email === email);
  if (!user) {
    throw new Error(`User with email ${email} not found in auth.users`);
  }
  
  return user.id;
}

