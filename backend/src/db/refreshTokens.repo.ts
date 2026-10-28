import {type NewRefreshToken, type RefreshToken, refreshTokens} from "./schema";
import {db} from "./index";

export const refreshTokensRepo = {
    async save(record: Pick<NewRefreshToken, "jti" | "familyId" | "userId"| "tokenHash" | "expiresAt">): Promise<void> {
        await db.insert(refreshTokens).values(record);
    },
}