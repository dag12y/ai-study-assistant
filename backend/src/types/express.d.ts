import type { InferSelectModel } from "drizzle-orm";

import type { users } from "../database/schema.js";

type User = InferSelectModel<typeof users>;

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "role">;
    }
  }
}

export {};
