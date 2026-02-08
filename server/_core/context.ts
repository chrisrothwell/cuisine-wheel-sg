import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: Request;
  res: { clearCookie: (name: string, options?: Record<string, unknown>) => void };
  user: User | null;
};
