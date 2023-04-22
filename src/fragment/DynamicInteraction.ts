import { ChatInputCommandInteraction, Message, TextChannel } from "discord.js";
import ClassLogger from "../logging/Logger";

/* ==== PROPERTIES ============================================================================== */
const logger = new ClassLogger(null as any, __filename);

/* ==== CLASS =================================================================================== */
export default class DynamicInteraction {

    /* ==== PROPERTIES ========================================================================== */
    interaction: ChatInputCommandInteraction | null;    // Latest command the user sent in the chat
    messageContent: any;                                // Message content (Embed & Components)

    /* ==== CORE ================================================================================ */
    async create (): Promise<Message | undefined> {
        // If there is no content, don't send the message (an error would be thrown anyway)
        if(!this.messageContent) return undefined;

        // If a response has already been sent, don't do it again (an error would be thrown)
        if(this.interaction?.replied) return undefined;
        
        // Create the message, save it and return it
        return await this.interaction?.reply(this.messageContent);
    }

    async delete(): Promise<void> {
        try {
            return await this.interaction?.deleteReply();
        } catch(e) {
            logger.error("Delete error: " + e.message);
        }
    }

    async update(): Promise<Message | undefined> {
        try {
            if(!this.interaction?.replied) return await this.interaction?.reply(this.messageContent);
            return await this.interaction?.editReply(this.messageContent);
        } catch(e) {
            logger.error("Update error: " + e.message);
        }
    }

    /* ==== UTILS =============================================================================== */
    updateInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
        return new Promise(async (resolve) => {
            await this.delete();
            this.interaction = interaction;
            await this.create();
            resolve();
        })
    }

    updateContentAndUpdate(messageContent: any): Promise<Message | undefined> {
        this.messageContent = messageContent;
        return this.update();
    }
}