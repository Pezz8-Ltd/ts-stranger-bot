import { XXHash3 } from "xxhash-addon";

import ClassLogger from "../logging/Logger";
import { IUserMetadata } from "../model/UserMetadataModel";
import UserMetadataModel from "../model/UserMetadataModel";
import { stateless } from "../config/database/mongoose";
import { DMChannel, Message } from "discord.js";

/* ==== PROPERTIES ============================================================================== */
const logger: ClassLogger = new ClassLogger(null as any, __filename);

const HASH_SALT: string = process.env.HASH_SECRET as string;
const userMetadataMap: { [k: string]: UserMetadata } = {};

/* ==== CLASS =================================================================================== */
export class UserMetadata {

    /* ==== CONSTRUCTOR ========================================================================= */
    constructor(userId: string, dmChannel: DMChannel | null) {
        this.id = userId;
        this.dmChannel = dmChannel;
        this.hash = XXHash3.hash( Buffer.from(userId + HASH_SALT) ).toString("hex");
    }

    /* ==== PROPERTIES ========================================================================== */
    id: string;                             // User id
    hash: string;                           // Default nickname, generated from the user id
    nickname: string | undefined;           // Custom nickname
    dmChannel: DMChannel | null;            // TextChannel for direct messages

    /* ==== METHODS ============================================================================= */
    /** Gets nickname to display on other user's end */
    getNickname() { return this.nickname || this.hash; }

    setNickname(nickname: string) {
        if(this.nickname === nickname) return;
        this.nickname = nickname;
    }

    /** Uses the channel of the user to send a private message (used for summaries) */
    // TODO: add PREMIUM check first
    sendDM(content: any): Promise<Message<boolean>> | undefined {
        try {
            return this.dmChannel?.send(content);
        } catch (e) {
            logger.error(e.message);
        }
    }

    /** Saves the new nickname that will be displayed */
    storeNickname(nickname: string): void {
        this.setNickname(nickname);
        saveUserNickname(this.id, nickname).catch(e => logger.error(e.message));
    }

    /* ==== UTILS =============================================================================== */
    /**
     * Retrieves the current metadata of the user.
     * If the user is not cached, retrieve his metadata from the database and save it.
     */
    static async init(userId: string, dmChannel: DMChannel | null): Promise<UserMetadata> {
        let metadata: UserMetadata = userMetadataMap[userId];
        if(!metadata) {
            metadata = new UserMetadata(userId, dmChannel);
            metadata.nickname = await getUserNickname(userId);
            userMetadataMap[userId] = metadata;
        }
        return metadata;
    }
}

/* ==== MONGO =================================================================================== */
async function getUserMetadata(userId: string): Promise<IUserMetadata | null> {
    // If DB connection failed, do not retrieve the user
    if(stateless) return null;

    // Retrieves user from database
    return await UserMetadataModel.findById(userId);
}

export async function getUserNickname(userId: string): Promise<string | undefined> {
    return (await getUserMetadata(userId))?.nickname;
}

export async function saveUserNickname(userId: string, nickname: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        if(stateless) return resolve(false);

        try {
            // Retrieve metadata from db - create a new model if none is found
            let metadata: IUserMetadata | null = await getUserMetadata(userId);
            if (!metadata) metadata = new UserMetadataModel({ _id: userId });

            // Update user nickname and save to database
            metadata.nickname = nickname;
            await metadata.save();

            // Se presente in cache, ne aggiorno il nickname in modo da allineare il bot
            userMetadataMap[userId]?.setNickname(nickname);

            resolve(true);
        } catch (e) {
            logger.error(e.message);
            reject(e.message);
        }
    })
}