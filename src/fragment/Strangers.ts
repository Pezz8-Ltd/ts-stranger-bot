import { TextChannel, VoiceBasedChannel } from "discord.js";
import { AudioPlayer, AudioReceiveStream, EndBehaviorType, StreamType, VoiceConnection, createAudioPlayer, createAudioResource } from "@discordjs/voice";

import ClassLogger from "../logging/Logger";
import { sleepBool } from "../utils/Utils";
import { EventEmitter } from "events";

/* ==== INTERFACES ============================================================================== */
export interface Countries { [k: string]: Country; }
export interface Country { [k: string]: StrangerServer; }

/* ==== ENUMS =================================================================================== */
// Country pool
export enum StrangerLanguage { IT, EN }

/**
 * StrangetServer possible statuses:
 * @PENDING: searching for a stranger
 * @MATCHED: talking with a stranger
 * @ABORTED: stopped talking with a stranger
 */
export enum StrangerStatus { PENDING, MATCHED, ABORTED }

/* ==== PROPERTIES ============================================================================== */
const logger: ClassLogger = new ClassLogger(null as any, __filename);
const POLLING_WAIT_MS = 1000;
const POLLING_MAX_RETRIES = 10;

// Inizializzo ogni country con una mappa di server vuota
export const countries: Countries = {};

for(const language in StrangerLanguage) {
    if(isNaN(Number(language))) {
        logger.debug(`Initializing ${language} country`);
        countries[language] = {};
    }
}

/* ==== EVENT EMITTER / LISTENER ================================================================ */
export const strangerStreamEmitter: EventEmitter = new EventEmitter();

// To avoid locks on while loops on N threads, I just create another stream every time one closes
// A "close" event con the strangerEmitter is emitted every time a stream closes
strangerStreamEmitter.on("close", (stranger: StrangerServer): void => {
    stranger.debug("Close event received!!");
    if(stranger.isMatched()) stranger.listenToStranger();
});

/* ==== CLASS =================================================================================== */
export class StrangerServer {
    constructor() {
        this.botAudioPlayer = createAudioPlayer();

        // this.botAudioPlayer.on("stateChange", (_, newState) => this.debug("AudioPlayer state changed: " + newState.status));
        this.botAudioPlayer.on("error", err => this.error("AudioPlayer error: " + err.message));
    }

    /* ==== PROPERTIES ========================================================================== */
    // Bot connections
    botAudioPlayer: AudioPlayer;
    botVoiceConnection: VoiceConnection;

    // matchedStranger info and connections
    matchedStranger?: StrangerServer;
    userInputStream?: AudioReceiveStream;

    // This stranger info and connections
    userId: string;
    userVoiceChannel?: VoiceBasedChannel;
    textChannel: TextChannel;
    status?: StrangerStatus;

    /* ==== UTILS =============================================================================== */
    getMetadataPrefix = (): string => `[${this.textChannel.guildId}/${this.userId}] `;
    debug = (s: string): void => logger.debug(this.getMetadataPrefix() + s);
    info = (s: string): void => logger.info(this.getMetadataPrefix() + s);
    warn = (s: string): void => logger.warn(this.getMetadataPrefix() + s);
    error = (s: string): void => logger.error(this.getMetadataPrefix() + s);

    isPending = (): boolean => this.status === StrangerStatus.PENDING;
    isMatched = (): boolean => this.status === StrangerStatus.MATCHED;
    checkVoicePresence = (userId: string): boolean => !!this.userVoiceChannel?.members.has(userId);

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
     * @param country string from StrangerLanguage enum, used to retrieve that specific country
     * @param callerUserId userId of the user calling the method
     */
    async startSearching(country: Country, callerUserId: string): Promise<void> {
        // Set status to PENDING so that the stranger can be visible from the others
        this.status = StrangerStatus.PENDING;
        let retries = 0;

        do {
            // Check if the user is in the voice channel or if he gave up
            // If not, rollback status and quit the loop
            if(!this.checkVoicePresence(callerUserId)) {
                this.status = StrangerStatus.ABORTED;
                this.debug("User quit voice channel during search, aborting...");
                return;
            }

            // Retrieve all the country strangers and remove this and all the non-searching
            const strangers: [string, StrangerServer][] = Object.entries(country)
                .filter( (e: [string, StrangerServer]): boolean => e[1].isPending() && e[0] !== this.textChannel.guildId );

            // If there are no other servers searching, try again
            if(!strangers.length) {
                if(retries >= POLLING_MAX_RETRIES) {
                    this.warn(`No stranger found, max retries (${POLLING_MAX_RETRIES}) exceeded. Aborting...`);
                    this.status = StrangerStatus.ABORTED;
                    return;
                }
                this.debug(`No stranger found, checking again... (${++retries})`);
                continue;
            }

            // Check again if status is PENDING to assert we're not already getting matched
            if(!this.isPending()) {
                this.warn("Status changed to ${} during search process! Quitting...");
                return;
            }

            // ! MASTER behaviour: the first stranger to find the other will initiate the connection
            // ! Select a random stranger - it will be our SLAVE for the initialization
            // TODO: add "priority" index to avoid repeating matches or handle priority queues ($$$)
            const strangerIndex: number = Math.floor( Math.random() * strangers.length );
            this.debug(`${strangers.length} strangers found, matching with number ${strangerIndex}...`);
            const matchedStranger: StrangerServer = strangers[strangerIndex][1];

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

        //! MASTER behaviour: abort connection if the user is not connected before creating stream
        // It should never be the case, since the "voiceStateUpdate" event already handles this
        // This check is here just as a double check and to be sure no unexpected behaviour occurs
        if(!stranger || !stranger.checkVoicePresence(stranger.userId)) {
            this.warn("Check failed during listening process, voiceStateUpdate not triggered!");
            return this.abort();
        }

        // Retrieve new AudioReceiveStream from the stranger voice connection
        // TODO (once everything works): try to merge all the user streams on the stranger's channel
        stranger.userInputStream = stranger.botVoiceConnection.receiver.subscribe(stranger.userId, { end: { behavior: EndBehaviorType.AfterInactivity, duration: 200 } });

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
     * ! Method the MASTER for the destruction calls to abort connections and update properties.
     * Triggered directly by voiceStateUpdate event OR listenToStranger (it shouldn't).
     */
    abort() {
        this.matchedStranger?._abort();
        this._abort();
        this.debug("Connections aborted!");
    }

    /**
     * Method called internally by the abort() method for both strangers (itself and the matched)
     */
    private _abort() {
        this.status = StrangerStatus.ABORTED;
        this.userInputStream?.push(null);   // .destroy() sends and error event, null push is the way
        this.matchedStranger = undefined;
    }
}