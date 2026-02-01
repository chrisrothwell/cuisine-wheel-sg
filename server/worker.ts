import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { appRouter } from './routers';
import { sdk } from './_core/sdk';
import type { User } from '../drizzle/schema';
import type { TrpcContext } from './_core/context';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { COOKIE_NAME } from '../shared/const';
import * as db from './db';
import { ENV } from './_core/env';

type Bindings = {
  // Environment variables used by ENV
  VITE_APP_ID?: string;
  JWT_SECRET?: string;
  DATABASE_URL?: string;
  OAUTH_SERVER_URL?: string;
  OWNER_OPEN_ID?: string;
  NODE_ENV?: string;
  GOOGLE_PLACE_URL?: string;
  GOOGLE_PLACE_API_KEY?: string;
  // Additional bindings
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  VITE_OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
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

  const apiKey = ENV.GOOGLE_PLACE_API_KEY;
  const baseUrl = ENV.GOOGLE_PLACE_URL;
  
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

// OAuth callback
app.get('/api/oauth/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error) {
    return c.redirect(`/?error=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return c.redirect('/?error=missing_code', 302);
  }

  const clientId = ENV.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = ENV.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[OAuth] Missing required configuration:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    return c.redirect('/?error=oauth_not_configured', 302);
  }

  // Build redirect URI dynamically to match what the frontend uses
  const url = new URL(c.req.url);
  const redirectUri = `${url.protocol}//${url.host}/api/oauth/callback`;

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return c.redirect('/?error=token_exchange_failed', 302);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return c.redirect('/?error=user_info_failed', 302);
    }

    const googleUser = await userInfoResponse.json();
    
    // Use Google ID as openId (since your system uses openId)
    const openId = `google_${googleUser.id}`;
    const signedInAt = new Date();

    // Upsert user in database
    await db.upsertUser({
      openId,
      name: googleUser.name || null,
      email: googleUser.email || null,
      loginMethod: 'google',
      lastSignedIn: signedInAt,
    });

    // Create session token using your SDK
    const sessionToken = await sdk.createSessionToken(openId, {
      name: googleUser.name || googleUser.email || 'User',
    });

    // Set session cookie
    setCookie(c, COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year (matches ONE_YEAR_MS)
      path: '/',
    });

    return c.redirect('/', 302);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return c.redirect('/?error=oauth_failed', 302);
  }
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

// Export the fetch handler for Cloudflare Workers
export default {
  fetch: app.fetch,
};