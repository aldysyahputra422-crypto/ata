// Server-side environment access. Never import this from client components.

/** Demo paths (demo login, fixed OTP, demo plan activation) exist only when this is exactly "true" (DEMO-06). */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function hasSupabaseEnv(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
