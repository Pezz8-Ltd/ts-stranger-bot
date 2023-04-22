import { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, InternalDiscordGatewayAdapterCreator, TextChannel, VoiceBasedChannel } from "discord.js";
import { AudioPlayer, AudioReceiveStream, EndBehaviorType, StreamType, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } from "@discordjs/voice";
import { EventEmitter } from "events";
import { XXHash3 } from "xxhash-addon";

import ClassLogger from "../logging/Logger";
import { sleepBool } from "../utils/Utils";
import { ColorResolvable } from "discord.js";
import { ButtonBuilder } from "discord.js";
import { ButtonStyle } from "discord.js";
import DynamicInteraction from "./DynamicInteraction";


/* ==== ENUMS =================================================================================== */
/**
 * StrangetServer possible statuses:
 * @PENDING: searching for a stranger
 * @MATCHED: talking with a stranger
 * @ABORTED: stopped talking with a stranger
 */
export enum StrangerStatus { PENDING, MATCHED, ABORTED }

/* ==== PROPERTIES ============================================================================== */
const logger: ClassLogger = new ClassLogger(null as any, __filename);

const HASH_SALT: string = process.env.HASH_SECRET as string;
const EMBED_COLOR: ColorResolvable = "DarkVividPink";
const POLLING_WAIT_MS = 1000;
const POLLING_MAX_RETRIES = 60; // Stop searching after one minute

const MS_PER_SECOND: number = 1000;
const MS_PER_MINUTE: number = MS_PER_SECOND * 60;
const MS_PER_HOUR: number = MS_PER_MINUTE * 60;

// Inizializzo mappa di strangers con una mappa di server vuota
export const strangerServersMap: { [k: string]: StrangerServer; } = {};

/* ==== EVENT EMITTER / LISTENER ================================================================ */
export const strangerStreamEmitter: EventEmitter = new EventEmitter();

// To avoid locks on while loops on N threads, I just create another stream every time one closes
// A "close" event con the strangerEmitter is emitted every time a stream closes
strangerStreamEmitter.on("close", (stranger: StrangerServer): void => {
    stranger.debug("Close event received!!");
    if(stranger.isMatched()) stranger.listenToStranger();
});

/* ==== CLASSES ================================================================================= */
export class UserMetadata {

    /* ==== CONSTRUCTOR ========================================================================= */
    constructor(userId: string) {
        this.id = userId;
        this.hash = XXHash3.hash( Buffer.from(userId + HASH_SALT) ).toString("hex");
    }

    /* ==== PROPERTIES ========================================================================== */
    id: string;                                     // User id
    private hash: string;                           // Default nickname, generated from the user id
    private nickname: string | undefined;           // Custom nickname

    getNickname = () => this.nickname || this.hash; // Gets nickname to display on other user's end
}

export class StrangerServer {

    /* ==== CONSTRUCTOR ========================================================================= */
    constructor(language: string, textChannel: TextChannel) {
        // Create AudioPlayer for this server - it will be the same for the lifetime of the stranger
        this.botAudioPlayer = createAudioPlayer();
        this.botAudioPlayer.on("error", err => this.error("AudioPlayer error: " + err.message));
        // this.botAudioPlayer.on("stateChange", (_, newState) => this.debug("AudioPlayer state changed: " + newState.status));

        // Create dynamicMessage for user interface
        this.dynamicInteraction = new DynamicInteraction();
        this.language = language;
        this.guildId = textChannel.guildId;
    }

    /* ==== PROPERTIES ========================================================================== */
    // Self reference utils
    language: string;

    // Bot connections
    botAudioPlayer: AudioPlayer;
    botVoiceConnection: VoiceConnection;
    startTimestamp: number;

    // stranger info and connections
    userMetadata: UserMetadata;
    dynamicInteraction: DynamicInteraction;
    voiceChannel?: VoiceBasedChannel;
    status?: StrangerStatus;
    textChannel: TextChannel;
    guildId: string;

    // matchedStranger info and connections
    lastMatchedStranger?: string;
    matchedStranger?: StrangerServer;
    userInputStream?: AudioReceiveStream;

    /* ==== LOGIC UTILS ========================================================================= */
    getMetadataPrefix = (): string => `[${this.guildId}/${this.userMetadata.id}] `;
    debug = (s: string): void => logger.debug(this.getMetadataPrefix() + s);
    info = (s: string): void => logger.info(this.getMetadataPrefix() + s);
    warn = (s: string): void => logger.warn(this.getMetadataPrefix() + s);
    error = (s: string): void => logger.error(this.getMetadataPrefix() + s);

    isPending = (): boolean => this.status === StrangerStatus.PENDING;
    isMatched = (): boolean => this.status === StrangerStatus.MATCHED;

    isStreamOpen = (): boolean => !!this.userInputStream && !this.userInputStream.closed;
    isDisconnected = (): boolean => !this.botVoiceConnection || this.botVoiceConnection.state.status === VoiceConnectionStatus.Disconnected
    checkVoicePresence = (userId: string): boolean => !!this.voiceChannel?.members.has(userId);

    /* ==== INTERFACE UTILS ===================================================================== */
    updateInteraction = (interaction: ChatInputCommandInteraction | null): void => { if(interaction) this.dynamicInteraction.updateInteraction(interaction); }

    getMatchContent(): { embeds: EmbedBuilder[], components: ActionRowBuilder[] } {
        // TODO: add image/description from user saved metadata (DB $$$)
        const embed: EmbedBuilder = new EmbedBuilder().setColor(EMBED_COLOR)
            .setTitle(`You are connected to **${this.matchedStranger?.userMetadata.getNickname()}**!`);
        const stopButton: ButtonBuilder = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Stop").setCustomId(`stop-${this.language}`);
        const skipButton: ButtonBuilder = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel("Skip").setCustomId(`skip-${this.language}`);
        return { embeds: [ embed ], components: [ new ActionRowBuilder().addComponents(stopButton, skipButton) ]};
    }

    getSearchContent(): { embeds: EmbedBuilder[], components: ActionRowBuilder[] } {
        const embed: EmbedBuilder = new EmbedBuilder().setColor(EMBED_COLOR)
            .setTitle("Currently looking for another stranger...").setDescription(`Other strangers will see you as **${this.userMetadata.getNickname()}**`);
        const stopButton: ButtonBuilder = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Stop").setCustomId(`stop-${this.language}`);
        return { embeds: [ embed ], components: [ new ActionRowBuilder().addComponents(stopButton) ]};
    }

    getAbortContent(): { embeds: EmbedBuilder[], components: ActionRowBuilder[] } {
        const embed: EmbedBuilder = new EmbedBuilder().setColor(EMBED_COLOR)
            .setTitle("Currently looking for another stranger...").setDescription(`The connection to **${this.matchedStranger?.userMetadata.getNickname()}** has been closed.`);
        const stopButton: ButtonBuilder = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Stop").setCustomId(`stop-${this.language}`);
        return { embeds: [ embed ], components: [ new ActionRowBuilder().addComponents(stopButton) ]};
    }

    getStopContent(): { embeds: EmbedBuilder[], components: ActionRowBuilder[] } {
        const embed: EmbedBuilder = new EmbedBuilder().setColor(EMBED_COLOR)
            .setTitle(`You are no longer a **stranger**. See you next time!`);
        const searchButton: ButtonBuilder = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel("Search").setCustomId(`search-${this.language}`);
        return { embeds: [ embed ], components: [ new ActionRowBuilder().addComponents(searchButton) ]};
    }

    getLanguageContent(language: string): { embeds: EmbedBuilder[] } {
        const embed: EmbedBuilder = new EmbedBuilder().setColor("Grey")
            .setDescription(`Your language has been updated to ${language}!`);
        return { embeds: [ embed ] };
    }

    getSummary() {
        const durationMs: number = Date.now() - this.startTimestamp;
        const embed: EmbedBuilder = new EmbedBuilder().setColor("Grey")
            .setDescription(`Your had a nice talk with **${this.matchedStranger?.userMetadata.getNickname()}** that lasted for ${StrangerServer.getDurationFromMs(durationMs)}.`);
        return { embeds: [ embed ] };
    }

    static getDurationFromMs(durationMs: number): string {
        const hh: number = Math.floor(durationMs / MS_PER_HOUR);
        durationMs %= MS_PER_HOUR;
        const mm: number = Math.floor(durationMs / MS_PER_MINUTE);
        durationMs %= MS_PER_MINUTE;
        const ss: number = Math.floor(durationMs / MS_PER_SECOND);

        return StrangerServer.getDurationFromHHmmss(hh, mm, ss);
    }

    static getDurationFromHHmmss(hh: number, m: number, ss: number): string {
        let mm: number | string = m;
        if(hh) {
            if(m < 10) mm = "0"+m;
            mm = hh + ":" + mm;
        }
        return `${mm}:${ss < 10 ? ("0"+ss) : ss}`;
    }

    /* ==== COMMANDS & EVENTS =================================================================== */
    /**
     * Changes the language of the server. This won't affect any ongoing connection, but will affect
     * future matching since the stranger server filter uses it.
     * @param language language the user want to set for the server
     * @param interaction slash command interaction received
     */
    languageCommand(language: string, interaction: ChatInputCommandInteraction | null) {
        this.language = language;
        if(interaction) interaction.reply( this.getLanguageContent(language) );
    }

    /**
     * Before initiating the searching process, some checks are made to assert we can go ahead.
     * If the user is actually already using the bot (status MATCHED), behave like a skip command is
     * sent. If not, update all the user related properties and create the voice connection.
     * The setup is ready, the actual searching process starts.
     * @param callerUserId id of the user that sent the command
     * @param textChannel text channel the user sent the message from
     * @param voiceChannel voice channel where the user is
     * @param interaction slash command interaction received
     */
    async searchCommand(callerUserId: string, textChannel: TextChannel, voiceChannel: VoiceBasedChannel, interaction: ChatInputCommandInteraction | null): Promise<void> {
        // If the search is already ongoing, stop
        if(this.isPending()) return;
        
        // Check if the bot is already being used - If it is, act just like a skip command
        if(this.isMatched()) return this.skipCommand(callerUserId, textChannel, voiceChannel, interaction);

        // Save userId, text and voice channel previously checked
        this.userMetadata = new UserMetadata(callerUserId);
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;

        // Check if a voice connection has already been created for this server
        if(this.isDisconnected()) this.botVoiceConnection = joinVoiceChannel({ selfDeaf: false, channelId: voiceChannel.id, guildId: this.guildId, adapterCreator: textChannel.guild?.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator });

        // Update interaction attached to the embed
        if(interaction) await this.dynamicInteraction.updateInteraction(interaction);

        // Start stranger research
        this.dynamicInteraction.updateContentAndUpdate( this.getSearchContent() )
            .then( () => this.startSearching(callerUserId));
    }

    /**
     * Basically the same logic as the search command, but is asserted that a connection is ongoing
     * and that the user invoking the command is bound to the stranger.
     * ! MASTER behaviour: Before startin the searching process, the previous connection is aborted.
     * @param callerUserId id of the user that sent the command
     * @param textChannel text channel the user sent the message from
     * @param voiceChannel voice channel where the user is
     * @param interaction slash command interaction received
     */
    skipCommand(callerUserId: string, textChannel: TextChannel, voiceChannel: VoiceBasedChannel, interaction: ChatInputCommandInteraction | null): void {
        // Check if the stranger is bound to this user and if it's actually matched
        if(!this.isMatched() || this.userMetadata?.id !== callerUserId) return;

        // Save userId, text and voice channel previously checked
        this.userMetadata = new UserMetadata(callerUserId);
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;

        // Check if a voice connection has already been created for this server
        // Since it was MATCHED, I expect it to be already connected
        if(this.isDisconnected()) this.botVoiceConnection = joinVoiceChannel({ selfDeaf: false, channelId: voiceChannel.id, guildId: this.guildId, adapterCreator: textChannel.guild?.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator });

        // Update interaction attached to the embed
        if(interaction) this.dynamicInteraction.updateInteraction(interaction);

        // ! MASTER behaviour: the stranger will abort the connection for both ends
        // Since we're skipping, we don't want the bot to quit the voice channel
        this.debug("Skip triggered, aborting...");
        this.abort(false);

        // After aborting the connection, start looking for another stranger
        this.startSearching(callerUserId);
    }

    /**
     * ! MASTER behaviour: the stranger will abort the connection, the SLAVE will continue searching
     * @param callerUserId id of the user that sent the command
     * @param interaction slash command interaction received
     */
    stopCommand(callerUserId: string, interaction: ChatInputCommandInteraction | null) {
        // Check if the stranger is bound to this user and if it's actually matched
        if(this.userMetadata?.id !== callerUserId) return;

        // Update interaction attached to the embed
        if(interaction) this.dynamicInteraction.updateInteraction(interaction);

        // ! MASTER behaviour: the stranger will abort the connection for both ends (if any)
        // Since we're stopping, we want the bot to quit the voice channel
        this.debug("Stop triggered, aborting...");
        this.abort(true, true);
    }

    /**
     * Method activated when a user quits the voice channel.
     * ! MASTER behaviour: the quitting stranger aborts the ongoing connections for both ends.
     * @param callerUserId id of the user that triggered the event
     * @param isStrangerBot whether the user quitting the channel is the bot itself
     */
    voiceStateUpdate(callerUserId: string, isStrangerBot: boolean): void {
        // If the stranger is not matched and is not pending, do nothing
        // If the user is not the bot itself and is not bound to this stranger, do nothing
        if((!this.isMatched() && !this.isPending()) || (this.userMetadata.id != callerUserId && !isStrangerBot) ) return;

        if(isStrangerBot) this.warn("The bot has been kicked with an ongoing connection!");

        // ! MASTER behaviour: the stranger aborts the connection for both ends
        // If the user abandoned the voice chat, disconnect the bot from the channel
        this.debug("VoiceStateUpdate triggered, aborting...");
        this.abort(true);
    }


    /* ==== CORE ================================================================================ */
    /**
     * Start searching for another stranger and connect to it.
     * 
     * The status of the current stranger is set to PENDING, so that other polling stranger can find
     * it and connect. Once every POLLING_WAIT_MS milliseconds, a check on the current state of the
     * users connected to the bot is made: if one or more PENDING strangers are found, one of them
     * is picked randomly to initiate a connection. While both stranger are in this loop, only one
     * will activate the "initiation".
     * 
     * ! The initiator is considered "MASTER", the other one is considered "SLAVE".
     * This definition is only valid during initialization and destruction.
     * Once both stranger are initialized, two parallel and equal processes are started (one each)
     * 
     * The other one will find himself MATCHED and
     * will break the loop when the status check is made.
     * @param callerUserId userId of the user calling the method
     */
    async startSearching(callerUserId: string): Promise<void> {
        // Set status to PENDING so that the stranger can be visible from the others
        this.status = StrangerStatus.PENDING;
        let retries = 0;

        do {
            // Check if the user is in the voice channel or if he gave up
            // If not, rollback status and quit the loop
            if(!this.checkVoicePresence(callerUserId)) {
                this.warn("User quit voice channel during search, aborting...");
                this.abort(true);
                return;
            }

            // Retrieve all the country strangers and remove this and all the non-searching
            // Remove all the strangers from different countries and the last matched
            const strangers: [string, StrangerServer][] = Object.entries(strangerServersMap)
                .filter( (e: [string, StrangerServer]): boolean =>
                    e[1].isPending() &&
                    e[0] !== this.guildId &&
                    e[1].language === this.language &&
                    e[1].userMetadata?.id !== this.lastMatchedStranger );

            // If there are no other servers searching, try again
            if(!strangers.length) {
                if(retries >= POLLING_MAX_RETRIES) {
                    this.info(`No stranger found, max retries (${POLLING_MAX_RETRIES}) exceeded. Aborting...`);
                    this.abort(true);
                    return;
                }
                this.debug(`No stranger found, checking again... (${++retries})`);
                continue;
            }

            
            // ! SLAVE behaviour: if the status is no longer PENDING, a MASTER had a match with us
            if(!this.isPending()) {
                this.warn("Status changed to ${} during search process! Quitting...");
                return;
            }

            // ! MASTER behaviour: the first stranger to find the other will initiate the connection
            // ! Select a random stranger - it will be our SLAVE for the initialization
            // TODO: add "priority" index to avoid repeating matches or handle priority queues ($$$)
            const strangerIndex: number = Math.floor( Math.random() * strangers.length );
            const matchedStranger: StrangerServer = strangers[strangerIndex][1];

            // When the skip command is used, the actual stream closing is asyncronous
            // The code below is reached before the acutal destructio of the stream, causing
            // unintented behaviours (infinite event loop): assert that the stream is closed first
            if( this.isStreamOpen() || matchedStranger.isStreamOpen() ) {
                this.warn("Found an open stream, checking again...");
                continue;
            }

            this.info(`${strangers.length} strangers found, matching with number ${strangerIndex}...`);

            // Start parallel audio exchange process: set MATCHED status and start event chain
            Promise.all([
                this.bind(matchedStranger),
                matchedStranger.bind(this)
            ]);
            return;  // Break to avoid waiting POLLING_WAIT_MS to exit the loop

        // Wait between each poolling and check if the status is still PENDING
        } while(await sleepBool(POLLING_WAIT_MS) && this.isPending());
    }

    /**
     * Methods used to bind two strangers to each other - it must be called for both strangers.
     * Each stranger will bind to the other, update their status and start listening to each other's
     * audio stream in parallel with the listenToStranger function.
     * @param matchedStranger the stranger "this" needs to bind and connect to
     */
    async bind(matchedStranger: StrangerServer) {
        // Update properties to properly exchange informations
        this.matchedStranger = matchedStranger;
        this.status = StrangerStatus.MATCHED;
        this.startTimestamp = Date.now();

        this.dynamicInteraction.updateContentAndUpdate( this.getMatchContent() );

        // Start audio streams event chain - the bot will now play whatever the stranger says
        this.listenToStranger();
    }

    /**
     * Core method that keeps the audio exchange running. It's invoked for the first time during
     * stranger match initialization, creating an AudioReceiveStream from the stranger voice.
     * This stream is sent to the current stranger bot connection for the stranger to listen.
     * When the stream is closed (the user stops talking), a custom event is emitted: this event
     * will be captured by the strangerStreamEmitter, that will receive the stranger that sent the
     * event and will use it to call this method again, creating another AudioReceiveStream. This
     * way, there will be no delays between streams, the end user will hear the other stranger
     * smoothly. This method avoids using a "lock" on a while loop or recursions (and possible
     * overflows with that, since a LOT of streams are created one after the other).
     * 
     * Before creating a stream, stranger presence in the voice channel is checked to avoid dead
     * streams, even though users "quitting" their vc are already handled by another method.
     * This is just a double check to avoid unexpected behaviours.
     * 
     * ! On check fail, the stranger becomes "MASTER" for the destruction and aborts the connection.
     * 
     * Before sending the aforementioned event, a check on the status of the stranger is made, so
     * that no further steps are made if the connection is aborted.
     * This event chain is processed by each stranger individually, so it's important to keep
     * polling for status changes from the counterpart.
     * 
     * ! On check fail, the stranger is "SLAVE", since a "MASTER" aborted the connection.
     */
    listenToStranger(): void {
        let stranger: StrangerServer | undefined = this.matchedStranger;    // Just an alias
        if(!stranger) return;

        /*
        //! MASTER behaviour: abort connection if the user is not connected before creating stream
        // It should never be the case, since the "voiceStateUpdate" event already handles this
        // This check is here just as a double check and to be sure no unexpected behaviour occurs
        if(!stranger || !stranger.checkVoicePresence(stranger.userMetadata.id)) {
            this.warn("Check failed during listening process, voiceStateUpdate not triggered!");
            return this.abort(true);
        }
        */

        // Retrieve new AudioReceiveStream from the stranger voice connection
        // TODO (once everything works): try to merge all the user streams on the stranger's channel
        stranger.userInputStream = stranger.botVoiceConnection.receiver.subscribe(stranger.userMetadata.id, { end: { behavior: EndBehaviorType.AfterInactivity, duration: 200 } });

        // Define stream behaviour on close: emit a custom event to trigger this method again
        stranger.userInputStream.once("close", () => {
            this.debug("userInputStream closed!");

            //! SLAVE behaviour: if isMatched is FALSE, someone (the MASTER) aborted the connection
            if(this.isMatched()) strangerStreamEmitter.emit("close", this); // Emits itself on close
        });

        // Pipe the collected Opus audio stream to the current bot connection as a Discord resource
        const resource = createAudioResource(stranger.userInputStream, { inlineVolume: true, inputType: StreamType.Opus });
        this.botAudioPlayer.play(resource);
        this.botVoiceConnection.subscribe(this.botAudioPlayer);
        this.debug("Resource from stranger voice created, playing to connection");
    }

    /**
     * ! MASTER behaviour: calls the method to abort connections and update properties.
     * Triggered directly by voiceStateUpdate or specific commands.
     * The bot will automatically start searching again if someone leaves while MATCHED.
     * While the MASTER is set to ABORTED, the SLAVE is set to PENDING, since he didn't want to quit
     * @param quitVoiceChannel whether the bot has to disconnect from the voice channel or not
     */
    abort(quitVoiceChannel: boolean = false, stop: boolean = false): void {
        //! Since we're the MASTER, the SLAVE may want to continue talking: start searching again!
        // this.matchedStranger?._disconnect(); - OLD BEHAVIOUR: disconnect on MASTER's abort
        if(this.matchedStranger) {
            this.matchedStranger._abort();
            this.matchedStranger.startSearching(this.matchedStranger.userMetadata.id);
        }

        // Abort our voice connection
        if(quitVoiceChannel) this._disconnect();
        this._abort(stop);
    }

    /**
     * Method called internally by the abort() method for both strangers (itself and the matched)
     */
    private _abort(stop: boolean = false): void {
        const isMatched: boolean = this.isMatched();
        this.status = StrangerStatus.ABORTED;
        this.userInputStream?.push(null);   // destroy() sends and error event, null push is the way

        // If we're quitting an ongoing connection, send a small summary of the call
        // Save the user id of the last matched stranger so that they won't be matched again soon
        if(this.matchedStranger) {
            this.textChannel.send( this.getSummary() );
            this.lastMatchedStranger = this.matchedStranger.userMetadata.id;
        }

        // If there was no other stranger talking, don't even mention the connection
        // If we're stopping, don't display the abort content, but the stop one
        if(isMatched && !stop)  this.dynamicInteraction.updateContentAndUpdate( this.getAbortContent() );
        else                    this.dynamicInteraction.updateContentAndUpdate( this.getStopContent() );
    
        // Remove matched stranger from metadata
        this.matchedStranger = undefined;
        this.debug("Connection aborted!");
    }

    /**
     * Method called internally by the _abort() method to quit the voice channel
     */
    private _disconnect(): boolean {
        const r: boolean = this.botVoiceConnection?.disconnect();
        if(r) this.debug("Disconnecting from voiceChannel...");
        return r;
    }
}