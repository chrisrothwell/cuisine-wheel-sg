import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { appRouter } from './routers';
import { sdk } from './_core/sdk';
import type { User } from '../drizzle/schema';
import type { TrpcContext } from './_core/context';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { COOKIE_NAME } from '../shared/const';

type Bindings = {
  GOOGLE_PLACE_API_KEY?: string;
  GOOGLE_PLACE_URL?: string;
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_REDIRECT_URI?: string;
  // Add other env vars as needed
};

const app = new Hono<{ Bindings: Bindings }>();

// Make env available globally for compatibility with existing code
app.use('*', async (c, next) => {
  (globalThis as any).process = {
    env: c.env
  };
  await next();
});

// Workers-compatible context creation
async function createWorkerContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req as any);
  } catch (error) {
    user = null;
  }

  // Create response object that can clear cookies
  const mockRes = {
    clearCookie: (name: string, options?: any) => {
      // Store the instruction to clear cookie - will be handled by middleware
      (opts.req as any).__clearCookie = { name, options };
    },
  };

  return {
    req: opts.req as any,
    res: mockRes as any,
    user,
  };
}

// tRPC routes
app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: createWorkerContext,
    responseMeta() {
      return {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      };
    },
  })
);

// Place photo proxy route
app.get('/api/place-photo', async (c) => {
  const ref = c.req.query('ref');
  if (!ref) {
    return c.text('Missing ref', 400);
  }

  const apiKey = c.env.GOOGLE_PLACE_API_KEY;
  const baseUrl = c.env.GOOGLE_PLACE_URL;
  
  if (!apiKey || !baseUrl) {
    return c.text('Place photo proxy not configured', 503);
  }

  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/v1/maps/proxy/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`;
    const response = await fetch(url, { redirect: 'manual' });
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      if (location) {
        return c.redirect(location, 302);
      }
    }
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return c.body(buffer, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        },
      });
    }
    
    // Use 500 as fallback if status is not a valid HTTP error code
    const statusCode: 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504 = 
      response.status >= 400 && response.status < 600 
        ? (response.status as 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504)
        : 500;
    return c.text('Failed to fetch photo', statusCode);
  } catch (err) {
    console.error('[place-photo]', err);
    return c.text('Failed to fetch photo', 500);
  }
});

// OAuth routes (if you need them)
// You'll need to implement these based on your OAuth flow
app.get('/api/oauth/callback', async (c) => {
  // Implement OAuth callback logic here
  // This is a placeholder
  return c.text('OAuth not yet implemented in Workers', 501);
});

// Handle cookie clearing for logout
app.use('*', async (c, next) => {
  await next();
  
  // Check if any route requested cookie clearing
  const clearCookie = (c.req.raw as any).__clearCookie;
  if (clearCookie) {
    deleteCookie(c, clearCookie.name, clearCookie.options);
  }
});

// Fallback to serve static assets (handled by Workers Assets)
// This is optional - Workers will serve assets automatically from the [assets] config
app.get('*', async (c) => {
  // Assets are served automatically by Cloudflare Workers
  // This route won't be hit for static files
  return c.notFound();
});