import { Message, TextChannel } from "discord.js";
import ClassLogger from "../logging/Logger";

/* ==== PROPERTIES ============================================================================== */
const logger = new ClassLogger(null as any, __filename);

/* ==== CLASS =================================================================================== */
export default class DynamicMessage {

    /* ==== CONSTRUCTOR ========================================================================= */
    constructor(textChannel: TextChannel) {
        this.textChannel = textChannel;
        this.guildId = textChannel.guildId;
    }

    /* ==== PROPERTIES ========================================================================== */
    message: Message;               // Reference to the actual message in the Discord text channel
    messageContent: any;            // Content of the message (Embed & Components)
    textChannel: TextChannel;       // Text channel the message is and needs to be sent
    guildId: string;

    /* ==== CORE ================================================================================ */
    async create (): Promise<Message | null> {
        // If there is no content, don't send the message (an error would be thrown anyway)
        if(!this.messageContent) return null;
        
        // Create the message, save it and return it
        this.message = await this.textChannel?.send(this.messageContent);
        return this.message;
    }

    async delete(): Promise<void> {
        try {
            if(this.message?.deletable) await this.message.delete(); 
        } catch(e) {
            logger.error("Delete error: " + e.message);
        }
    }

    async update(): Promise<Message | null> {
        try {
            if(this.message?.editable) return await this.message.edit(this.messageContent);
        } catch(e) {
            logger.error("Update error: " + e.message);
        }

        // On new message or on fail, create a new message
        return this.create();
    }

    async resend(): Promise<Message | null> {
        this.delete();
        return this.create();
    }

    /* ==== UTILS =============================================================================== */
    updateTextChannel(textChannel: TextChannel): void {
        if(this.textChannel?.id !== textChannel.id) {
            this.textChannel = textChannel;
            this.resend();
        }
    }

    updateContentAndUpdate(messageContent: any): Promise<Message | null> {
        this.messageContent = messageContent;
        return this.update();
    }

    updateContentAndResend(messageContent: any): Promise<Message | null> {
        this.messageContent = messageContent;
        return this.resend();
    }

    updateContentAndUpdateOrResend(messageContent: any): Promise<Message | null> {
        if(this.textChannel.lastMessageId != this.message?.id)   return this.updateContentAndResend(messageContent);
        else                                                    return this.updateContentAndUpdate(messageContent);
    }
}