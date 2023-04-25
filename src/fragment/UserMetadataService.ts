import fs from "fs";
import { XXHash3 } from "xxhash-addon";

import ClassLogger from "../logging/Logger";

/* ==== PROPERTIES ============================================================================== */
const logger: ClassLogger = new ClassLogger(null as any, __filename);

const HASH_SALT: string = process.env.HASH_SECRET as string;
const dbFileName: string = "userMetadata.json";
const userMetadataMap: { [k: string]: UserMetadata } = {};

/* ==== CLASS =================================================================================== */
export class UserMetadata {

    /* ==== CONSTRUCTOR ========================================================================= */
    constructor(userId: string) {
        this.id = userId;
        this.hash = XXHash3.hash( Buffer.from(userId + HASH_SALT) ).toString("hex");
    }

    /* ==== PROPERTIES ========================================================================== */
    id: string;                             // User id
    hash: string;                           // Default nickname, generated from the user id
    nickname: string | undefined;           // Custom nickname

    /* ==== METHODS ============================================================================= */
    /** Gets nickname to display on other user's end */
    getNickname() { return this.nickname || this.hash; }

    /** Saves the new nickname that will be displayed */
    storeNickname(nickname: string): void {
        if(this.nickname === nickname) return;
        
        this.nickname = nickname;
        saveUserNickname(this.id, this.nickname);
    }
}

export function getUserMetadata(userId: string): UserMetadata {
    return userMetadataMap[userId] || (userMetadataMap[userId] = new UserMetadata(userId));
}

export function saveUserNickname(userId: string, nickname: string): void {
    // TODO: save to mongoDB
}