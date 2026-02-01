// Helper function to get environment variables from either Cloudflare Workers bindings or Node.js process.env
function getEnvVar(key: string): string {
  // In Cloudflare Workers, bindings are set via globalThis.process.env by middleware
  // In Node.js, use process.env directly
  const env = (globalThis as any).process?.env ?? (typeof process !== "undefined" ? process.env : {});
  return env[key] ?? "";
}

function getNodeEnv(): string {
  const env = (globalThis as any).process?.env ?? (typeof process !== "undefined" ? process.env : {});
  return env.NODE_ENV ?? "";
}

// ENV object that dynamically reads from environment variables
// Compatible with both Cloudflare Workers (via bindings) and Node.js (via process.env)
export const ENV = {
  get appId() {
    return getEnvVar("VITE_APP_ID");
  },
  get cookieSecret() {
    return getEnvVar("JWT_SECRET");
  },
  get databaseUrl() {
    return getEnvVar("DATABASE_URL");
  },
  get oAuthServerUrl() {
    return getEnvVar("OAUTH_SERVER_URL");
  },
  get ownerOpenId() {
    return getEnvVar("OWNER_OPEN_ID");
  },
  get isProduction() {
    return getNodeEnv() === "production";
  },
  get GOOGLE_PLACE_URL() {
    return getEnvVar("GOOGLE_PLACE_URL");
  },
  get GOOGLE_PLACE_API_KEY() {
    return getEnvVar("GOOGLE_PLACE_API_KEY");
  },
};
