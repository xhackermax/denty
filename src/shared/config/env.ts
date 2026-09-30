import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_PROJECT_REF: z.string().min(1).optional(),
  SUPABASE_MANAGEMENT_ACCESS_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  AI_GATEWAY_API_KEY: z.string().min(1).optional(),
  AI_GATEWAY_VOICE_MODEL: z.string().min(1).default("anthropic/claude-haiku-4.5"),
  AI_GATEWAY_REALTIME_MODEL: z.string().min(1).default("openai/gpt-realtime-2"),
  VERCEL_OIDC_TOKEN: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_VOICE_MODEL: z.string().min(1).default("claude-haiku-4-5"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID: z.string().min(1).optional(),
  SUMUP_RETURN_URL: z.string().url().optional(),
  OPENAI_TRANSCRIBE_MODEL: z.string().min(1).default("gpt-4o-mini-transcribe"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const publicEnvSchema = z.object({});

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
    SUPABASE_MANAGEMENT_ACCESS_TOKEN: process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    AI_GATEWAY_VOICE_MODEL: process.env.AI_GATEWAY_VOICE_MODEL,
    AI_GATEWAY_REALTIME_MODEL: process.env.AI_GATEWAY_REALTIME_MODEL,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_VOICE_MODEL: process.env.ANTHROPIC_VOICE_MODEL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID: process.env.STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID,
    SUMUP_RETURN_URL: process.env.SUMUP_RETURN_URL,
    OPENAI_TRANSCRIBE_MODEL: process.env.OPENAI_TRANSCRIBE_MODEL,
    NODE_ENV: process.env.NODE_ENV,
  });
}

export const publicEnv = publicEnvSchema.parse({});
