import { Message, TextBasedChannel } from "discord.js";
import ClassLogger from "../logging/Logger";

/* ==== PROPERTIES ============================================================================== */
const logger = new ClassLogger(null as any, __filename);

/* ==== CLASS =================================================================================== */
export default class DynamicMessage {

    /* ==== CONSTRUCTOR ========================================================================= */
    constructor() {
        this.uuid = Date.now();
    }

    /* ==== PROPERTIES ========================================================================== */
    message: Message;               // Reference to the actual message in the Discord text channel
    messageContent: any;            // Content of the message (Embed & Components)
    textChannel: TextBasedChannel;  // Text channel the message is and needs to be sent
    uuid: number;                   // Unique identifier of this DynamicMessage


    /* ==== METHODS ============================================================================= */
    /**
     * Checks whether or not the given uuid is bound to this message.
     * @param uuid the uuid received that needs to be verified
     */
    check(uuid: number): boolean {
        return this.uuid === uuid;
    }
    // check = (UUID?: number): DynamicMessage => (!UUID || this.UUID == UUID) ? this : undefined;
    
    /**
     * Binds a textChannel to the message class, overriding the old one
     * @param textChannel new text channel to bind
     */
    updateTextChannel(textChannel: TextBasedChannel): DynamicMessage {
        this.textChannel = textChannel;
        return this;
    }

    /**
     * Overrides the content of the message with the one given in input.
     * @param messageContent new message content to put in the already existing message
     */
    updateContent(messageContent: any): DynamicMessage {
        this.messageContent = messageContent;
        return this;
    }

    /**
     * Creates and sends the message in the bound text channel.
     */
    async create (): Promise<Message | null> {
        // If there is no content, don't send the message (an error would be thrown anyway)
        if(!this.messageContent) return null;
        
        // Create the message, save it and return it
        this.message = await this.textChannel?.send(this.messageContent);
        return this.message;
    }

    /**
     * Updates the message if exists, creates it otherwise.
     */
    async update(): Promise<Message | null> {
        try {
            // Try editing the current message
            if(this.message?.editable) return await this.message.edit(this.messageContent);
        } catch(e) {
            logger.error("Update error: " + e.message);
        }

        // On new message or on fail, create a new message
        return this.create();
    }

    /**
     * Deletes the message if exists.
     */
    async delete(): Promise<void> {
        try {
            // Try deleting the current message
            if(this.message?.deletable) await this.message.delete(); 
        } catch(e) {
            logger.error("Delete error: " + e.message);
        }
    }

    /**
     * Deletes the old message if exists, then sends a new one.
     */
    async resend(): Promise<Message | null> {
        // Try deleting the current message
        this.delete();

        // Create a new message
        return this.create();
    }
}