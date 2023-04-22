import { Client, REST, Routes } from 'discord.js';

import ClassLogger from '../logging/Logger';
import readyEvent from '../event/ReadyEvent';
import voiceStateEvent from '../event/VoiceStateEvent';
import interactionCreateEvent from '../event/InteractionCreateEvent';
import slashCommandBuilders from './slash/SlashCommandBuilders';

/* ==== CLASS =================================================================================== */
/** Main class that rapresents the bot itself. On init, logs in the bot into Discord and starts to listen on all the events. */
export default class StrangerBot extends Client {
    public logger: ClassLogger  = new ClassLogger(null as any, __filename);

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

        // Messages are deprecated, only application commands are available
        // this.on("messageCreate", messageCreateEvent.bind(null, this));
        // this.logger.info("Listening on event 'messageCreate'");

        // The put method is used to fully refresh all commands
        if(isProd) {
            new REST()
                .setToken(token)
                .put( Routes.applicationCommands( process.env.PROD_APPID as string ), { body: slashCommandBuilders })
                .then( (data: any): void => this.logger.info(`Successfully reloaded ${data.length} application {/} commands.`))
        }
    }
}