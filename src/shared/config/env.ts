import { z } from "zod";

const serverEnvSchema = z.object({
  DENTY_API_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  DENTY_DEFAULT_CLINIC_ID: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TRANSCRIBE_MODEL: z.string().min(1).default("gpt-4o-mini-transcribe"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_DENTY_REALTIME: z.enum(["true", "false"]).default("false"),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DENTY_API_URL: process.env.DENTY_API_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DENTY_DEFAULT_CLINIC_ID: process.env.DENTY_DEFAULT_CLINIC_ID,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_TRANSCRIBE_MODEL: process.env.OPENAI_TRANSCRIBE_MODEL,
    NODE_ENV: process.env.NODE_ENV,
  });
}

const defaultDemoMode = process.env.NODE_ENV === "production" ? "false" : "true";

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? defaultDemoMode,
  NEXT_PUBLIC_DENTY_REALTIME: process.env.NEXT_PUBLIC_DENTY_REALTIME,
});
