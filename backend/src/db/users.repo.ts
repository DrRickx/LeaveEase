import {
    type NewUser,
    type NewUserProfile,
    type User,
    type UserProfile,
    users,
    userProfiles,
} from "./schema";
import { db } from "./index";
import type {PgErrorInfo} from "../types/pg.types";
import {eq} from "drizzle-orm";
import type {UpdateAccountInput, UpdateProfileInput} from "../types/user.types";

const PG_UNIQUE_VIOLATION = "23505";

export type CreateUserInput = Pick<NewUser, "username" | "email" | "password" | "role"> &
    Pick<NewUserProfile, "firstName" | "lastName"> & {
    middleName?: string | null; // optional
    phone?: string | null;      // optional
    imagePath?: string | null;  // optional
    hireDate?: string;          // "YYYY-MM-DD", defaults to today
};

export type UserWithProfile = { user: User; profile: UserProfile };

function pgError(err: unknown): PgErrorInfo {
    const e = err as {
        code?: string | undefined;
        constraint?: string | undefined;
        cause?: { code?: string | undefined; constraint?: string | undefined };
    } | null;

    return {
        code: e?.code ?? e?.cause?.code,
        constraint: e?.constraint ?? e?.cause?.constraint,
    };
}

export class EmailTakenError extends Error {
    constructor() {
        super("Email already in use");
        this.name = "EmailTakenError";
    }
}

export class UsernameTakenError extends Error {
    constructor() {
        super("Username already in use");
        this.name = "UsernameTakenError";
    }
}

// Drops keys whose value is undefined, so exactOptionalPropertyTypes and
// drizzle's .set() never see them. null is kept, so it can clear a column.
function compact<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
}

// Shared by create() and updateAccount()
function rethrowIfTaken(err: unknown): never {
    const { code, constraint } = pgError(err);
    if (code === PG_UNIQUE_VIOLATION) {
        if (constraint?.includes("username")) throw new UsernameTakenError();
        if (constraint?.includes("email")) throw new EmailTakenError();
    }
    throw err;
}


export const UserRepo = {
    async create(input: CreateUserInput): Promise<UserWithProfile> {
        const {
            username, email, password, role,
            firstName, middleName, lastName, phone, imagePath,
            hireDate = new Date().toISOString().slice(0, 10),
        } = input;

        try {
            return await db.transaction(async (tx) => {
                const [user] = await tx
                    .insert(users)
                    .values({ username, email, password, role, hireDate })
                    .returning();
                if (!user) throw new Error("User insert returned no row");

                const [profile] = await tx
                    .insert(userProfiles)
                    .values({
                        id: user.id, // profile PK is the user's id
                        firstName,
                        middleName: middleName ?? null,
                        lastName,
                        phone: phone ?? null,
                        imagePath: imagePath ?? null,
                    })
                    .returning();
                if (!profile) throw new Error("Profile insert returned no row");

                return { user, profile };
            });
        } catch (err) {
            const { code, constraint } = pgError(err);
            if (code === PG_UNIQUE_VIOLATION) {
                if (constraint?.includes("username")) throw new UsernameTakenError();
                throw new EmailTakenError();
            }
            throw err;
        }
    },

    // Find by id
    async findById(id: string): Promise<User | null> {
        const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return user ?? null;
    },

    // Find by Email
    async findByEmail(email: string): Promise<User | null> {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return user ?? null;
    },

    // Find by Username
    async findByUsername(username: string): Promise<User | null> {
        const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        return user ?? null;
    },

    // List the users
    async list(): Promise<User[]>{
        /**
         * TODO:
         * Create a pagination for the list
         */
        return db.select().from(users).limit(100);
    },

    // Update user account ONLY
    async updateAccount(id: string, data: UpdateAccountInput): Promise<User | null>{
        const values = compact(data);

        if (Object.keys(values).length === 0) {
            const [existing] = await db.select().from(users).where(eq(users.id, id));
            return existing ?? null;
        }

        const [update] = await db.update(users).set(values).where(eq(users.id, id)).returning();
        return update ?? null;
    },

    // Update user profile ONLY
    async updateProfile(id: string, data: UpdateProfileInput): Promise<UserProfile | null> {
        const values = compact(data);

        if(Object.keys(values).length === 0) {
            const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
            return existing ?? null;
        }

        const [update] = await db.update(userProfiles).set(values).where(eq(userProfiles.id, id)).returning();
        return update ?? null;
    },

    // Delete User
    async delete(id: string): Promise<boolean> {
      const rows = await db.delete(users).where(eq(users.id, id)).returning({id: users.id});
      return rows.length > 0;
    }
};