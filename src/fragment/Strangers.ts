import { TextChannel, VoiceBasedChannel } from "discord.js";
import { AudioPlayer, AudioReceiveStream, EndBehaviorType, StreamType, VoiceConnection, createAudioPlayer, createAudioResource } from "@discordjs/voice";

import ClassLogger from "../logging/Logger";
import { sleep, sleepBool } from "../utils/Utils";
import { EventEmitter } from "events";

/* ==== ENUMS =================================================================================== */
// Possibili "server" selezionabili
export enum StrangerLanguage {
    IT,
    EN
}

// Possibili stati 
export enum StrangerStatus {
    PENDING,
    MATCHED,
    ABORTED
}

/* ==== PROPERTIES ============================================================================== */
const POLLING_WAIT_MS = 1000;

const logger: ClassLogger = new ClassLogger(null as any, __filename);

// Inizializzo ogni country con una mappa di server vuota
export const countries: Countries = {};

for(const language in StrangerLanguage) {
    if(isNaN(Number(language))) {
        logger.debug(`Initializing ${language} country`);
        countries[language] = {};
    }
}

export const strangerCloseStreamEmitter: EventEmitter = new EventEmitter();

// To avoid locks on while loops on N threads, I just create another stream every time one closes
// A "close" event con the strangerEmitter is emitted every time a stream closes
strangerCloseStreamEmitter.on("close", (stranger: StrangerServer): void => {
    stranger.debug("Close event received!!");
    if(stranger.isMatched()) stranger.listenToStranger(stranger.matchedStranger);
});

/* ==== CLASS =================================================================================== */
export class StrangerServer {
    constructor() {
        this.botAudioPlayer = createAudioPlayer();

        // this.botAudioPlayer.on("stateChange", (_, newState) => this.debug("AudioPlayer state changed: " + newState.status));
        this.botAudioPlayer.on("error", err => this.debug("Someone quit the vc and triggered manual destroy! AudioPlayer error: " + err.message));
    }

    matchedStranger?: StrangerServer;                    // ServerId of the other "stranger"

    botAudioPlayer: AudioPlayer;
    botVoiceConnection: VoiceConnection;
    userInputStream: AudioReceiveStream;

    userId: string;
    userVoiceChannel?: VoiceBasedChannel;
    textChannel: TextChannel;
    status?: StrangerStatus;
    // ? user inputStream
    // TODO: user info

    isPending = (): boolean => this.status === StrangerStatus.PENDING;
    isMatched = (): boolean => this.status === StrangerStatus.MATCHED;

    checkVoicePresence = (userId: string): boolean => !!this.userVoiceChannel?.members.has(userId);

    // TODO: Define MASTER - SLAVE behaviour
    //! IMPLEMENTING MASTER BEHAVIOUR, ADD SLAVE BEHAVIOUR IF ARRAY IS EMPTY
    async startSearching(country: Country, callerUserId: string): Promise<void> {
        // Since I'm starting now the research, set status to PENDING
        this.status = StrangerStatus.PENDING;

        // Start polling
        do {
            // Check if the user actually is in the voice channel
            if(!this.checkVoicePresence(callerUserId)) {
                this.status = StrangerStatus.ABORTED;
                this.debug("User quit voice channel, aborting...");
                break;
            }

            // Retrieve all the country strangers and remove this and all the non-searching
            const strangers: [string, StrangerServer][] = Object.entries(country)
                .filter( (e: [string, StrangerServer]): boolean => e[1].isPending() && e[0] !== this.textChannel.guildId );

            // If there are no other servers searching, skip and try again
            if(!strangers.length) {
                this.debug("No stranger found, continue searching...");
                continue;
            }

            // Select a random stranger from the filtered list and update the status
            const strangerIndex: number = Math.floor( Math.random() * strangers.length );
            this.debug(`${strangers.length} strangers found, matching with number ${strangerIndex}...`);
            const matchedStranger: StrangerServer = strangers[strangerIndex][1];

            // Check again if status is PENDING to assert we're not getting matched elsewhere
            if(!this.isPending) {
                this.debug("Status no longer PENDING after selection, quitting AS-IS...");
                break;
            }

            //! Master behaviour: the code below won't run for the matchedStranger
            //! In the end both will result connected to each other, no differences
            Promise.all([
                this.init(matchedStranger),
                matchedStranger.init(this)
            ]);
            break;  // Break to avoid waiting POLLING_WAIT_MS to exit the loop

        // Wait between each poolling and check if the status is still PENDING
        } while(await sleepBool(POLLING_WAIT_MS) && this.isPending());
    }

    async init(matchedStranger: StrangerServer) {
        // Update properties to properly exchange informations
        this.matchedStranger = matchedStranger;
        this.status = StrangerStatus.MATCHED;

        // "Exchange" audio streams - now the strangers are talking to each other!
        this.listenToStranger(matchedStranger);
    }

    listenToStranger(stranger: StrangerServer): void {
        // Retrieve stranger voice as a stream of opus packets - to end the stream, .destroy()
        // Check if the stranger is in the voice channel - if not, abort the connection
        //! Master behaviour: only the first stranger to reach this code will activate it
        if(!stranger.checkVoicePresence(stranger.userId)) {
            stranger.status = StrangerStatus.ABORTED;
            stranger.matchedStranger = undefined;
            stranger.userInputStream?.destroy();
            this.status = StrangerStatus.ABORTED;
            this.matchedStranger = undefined;            
            this.userInputStream?.destroy();
            this.debug("MatchedStranger quit voice channel, aborting...");
            return;
        }

        stranger.userInputStream = stranger.botVoiceConnection.receiver.subscribe(stranger.userId, { end: { behavior: EndBehaviorType.AfterInactivity, duration: 200 } });

        // Once the stream has been closed, start the next one
        stranger.userInputStream.once("close", () => {
            this.debug("Input stream closed");
            strangerCloseStreamEmitter.emit("close", this); // Emits itself on close
        });

        // "pipe" the stranger audio stream to te current bot connection as Discord resource
        const resource = createAudioResource(stranger.userInputStream, { inlineVolume: true, inputType: StreamType.Opus });
        this.botAudioPlayer.play(resource);
        this.botVoiceConnection.subscribe(this.botAudioPlayer);
        this.debug("Resource from stranger voice created, playing to connection");
    }

    getMetadataPrefix = () => `[${this.textChannel.guildId}/${this.userId}] `
    debug = (s: string): void => logger.debug(this.getMetadataPrefix() + s);
}


/* ==== INTERFACES ============================================================================== */
export interface Countries {
    [k: string]: Country;
}

export interface Country {
    [k: string]: StrangerServer;
}