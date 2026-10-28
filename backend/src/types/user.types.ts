import type {NewUser, NewUserProfile} from "../db/schema";

export type UpdateAccountInput = Partial<
    Pick<NewUser, "username" | "email" | "password" | "department" | "hireDate">
>;

export type UpdateProfileInput = Partial<
    Pick<NewUserProfile, "firstName" | "middleName" | "lastName" | "phone" | "imagePath">
>;