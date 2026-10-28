import type { Role } from "../config/roles.js";

declare global {
    namespace Express {
        interface Request {
            /** Set by the authenticate middleware. */
            user?: { id: string; email: string; role: Role };
            /** Set by validate(schema, "params"). */
            validated?: { params?: { id: string } };
        }
    }
}

export {};