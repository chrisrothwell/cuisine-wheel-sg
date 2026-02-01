import { Hono, type Context } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { appRouter } from './routers';
import { sdk } from './_core/sdk';
import type { User } from '../drizzle/schema';
import type { TrpcContext } from './_core/context';

const app = new Hono();

// Workers-compatible context creation
async function createWorkerContext(
  opts: FetchCreateContextFnOptions,
  c: Context
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // SDK's authenticateRequest works with Fetch Request (it only needs headers.cookie)
    user = await sdk.authenticateRequest(opts.req as any);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Create a minimal response-like object for operations that need it (e.g., logout)
  const mockRes = {
    clearCookie: () => {
      // In Workers, cookie clearing is handled via response headers
      // This is a no-op as Hono handles cookies differently
    },
  };

  return {
    req: opts.req as any, // Cast to Express Request type for compatibility
    res: mockRes as any, // Cast to Express Response type for compatibility
    user,
  };
}

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: createWorkerContext,
  })
);

export default app;