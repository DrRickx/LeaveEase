import {z} from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const registerSchema = z.object({
    username: z.string().trim().min(3, "Username must be at least 3 characters").max(30, "Username must at most 30 characters")
        .regex(
            /^[a-zA-Z0-9_.]+$/,
            "Username can only contain letters, numbers, underscores, and periods",
        ),
    email: email,
    password: z.string().min(8, "Password must be at least 8 characters").max(256),
    first_name: z.string().trim().min(1, "First name is required"),
    middle_name: z.string().trim().optional(),
    last_name: z.string().trim().min(1, "Last name is required"),
    phone: z.string().trim().min(11, "Phone number is required"),
    image_path: z.string().trim().optional()
}).strict();

export const loginSchema = z
    .object({
        email,
        password: z.string().min(1).max(128),
    })
    .strict();

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>