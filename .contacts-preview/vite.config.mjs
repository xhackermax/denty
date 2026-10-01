import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({plugins:[react()],resolve:{alias:{"@":resolve("src")}},define:{"process.env.NODE_ENV":JSON.stringify("development")}});
