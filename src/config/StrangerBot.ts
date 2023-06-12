import { ActivityType, Client, REST, Routes } from 'discord.js';

import ClassLogger from '../logging/Logger';
import readyEvent from '../event/ReadyEvent';
import voiceStateEvent from '../event/VoiceStateEvent';
import interactionCreateEvent from '../event/InteractionCreateEvent';
import slashCommandBuilders from './slash/SlashCommandBuilders';
import { strangerServersMap } from '../fragment/Strangers';

/* ==== CLASS =================================================================================== */
/** Main class that rapresents the bot itself. On init, logs in the bot into Discord and starts to listen on all the events. */
export default class StrangerBot extends Client {
    public logger: ClassLogger  = new ClassLogger(null as any, __filename);

    private readonly UPDATE_PRESENCE_INTERVAL: number = 60_000;
    private nextUpdate: number = Date.now();
    public updatePresence() {
        // Only update once per minute at most
        const now: number = Date.now();
        if(now < this.nextUpdate) return;
        this.nextUpdate = now + this.UPDATE_PRESENCE_INTERVAL;

        // Count currently matched strangers
        let talkingStrangers: number = 0;
        for(const v of Object.values(strangerServersMap))
            if(v.isMatched() || v.isPending())
                talkingStrangers++;

        // Update bot status (presence)
        this.logger.debug("Talking strangers: " + talkingStrangers);
        this.user?.setPresence({ activities: [{ name: `${talkingStrangers} strangers`, type: ActivityType.Listening }], status: 'idle' });
    }

    public init = () => {
        const isProd: boolean = !!process.env.PROD;
        const token: string = (isProd ? process.env.PROD_TOKEN : process.env.TEST_TOKEN) as string;

        // Bot login
        this.logger.info(`======= Deploy started on enviroment ${isProd ? "PROD" : "TEST"} =======`);
        this.login(token);
        
        // On bot login event, execute only once  
        this.once("ready", readyEvent.bind(null, this));
        this.logger.info("Listening on event 'ready'");


        // Event Listeners
        this.on("interactionCreate", interactionCreateEvent.bind(null, this));
        this.logger.info("Listening on event 'interactionCreate'");

        this.on("voiceStateUpdate", voiceStateEvent.bind(null, this));
        this.logger.info("Listening on event 'voiceStateUpdate'");

        
        /* The put method is used to fully refresh all commands */
        if(isProd) {
            const rest = new REST();

            /*
            rest.get(Routes.applicationCommands( process.env.PROD_APPID as string ))
                .then(data => {
                    const promises = [];
                    for (const command of data) {
                        const deleteUrl = `${Routes.applicationCommands( process.env.PROD_APPID as string )}/${command.id}`;
                        promises.push(rest.delete( deleteUrl ));
                    }
                    return Promise.all(promises);
                });
            */

            rest.setToken(token)
                .put( Routes.applicationCommands( process.env.PROD_APPID as string ), { body: slashCommandBuilders })
                .then( (data: any): void => this.logger.info(`Successfully reloaded ${data.length} application {/} commands.`));
        }
    }
}