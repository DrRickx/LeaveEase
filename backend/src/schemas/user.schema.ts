import {z} from "zod";
import {ROLE_VALUES} from "../config/roles";

export const userIdParamSchema = z.object({
    id: z.uuid()
}).strict()

export const updateRoleSchema = z.object({
    role:z.enum(ROLE_VALUES)
}).strict()

export type RoleInput = z.infer<typeof updateRoleSchema>