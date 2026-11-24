/**
 * Environment access. Values are read lazily so the project can build and run
 * before a Supabase project is provisioned.
 */
export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const isSupabaseConfigured = Boolean(
  supabaseEnv.url && supabaseEnv.anonKey,
);

function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and add your Supabase project values.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", supabaseEnv.url);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseEnv.anonKey);
  },
};
