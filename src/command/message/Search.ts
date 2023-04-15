import { InternalDiscordGatewayAdapterCreator, Message, TextChannel, VoiceBasedChannel, VoiceChannel } from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";

import ICommand from "../../interface/ICommand";
import ClassLogger from "../../logging/Logger";
import { Country, StrangerServer, StrangerStatus, countries } from "../../fragment/Strangers";

/* ==== COMMAND ================================================================================= */
const logger: ClassLogger = new ClassLogger(null as any, __filename);
const searchCommand: ICommand = {
    name: "search",
    fn: async (msg: Message, language: string) => {

        // Command cannot be used by bots
        if(msg.member?.user.bot) return;

        // Command only valid in normal text chanels
        if(!(msg.channel instanceof TextChannel)) return;

        // Check if user is actually in a voice channel
        const userVoiceChannel: VoiceBasedChannel = msg.member?.voice.channel as VoiceBasedChannel;
        if(!userVoiceChannel) return;

        const userId: string = msg.member?.id as string;
        const channelId: string = msg.member?.voice.channelId as string;
        const guildId: string = msg.guildId as string;

        // Retrieve server pool of the selected country
        // TODO: retrieve favourite country from DB
        const country: Country = countries[language.toUpperCase()];
        
        // Check if a StrangerServer object has already been created for this server
        const strangerServer: StrangerServer = country[guildId] ?? new StrangerServer();
        country[guildId] = strangerServer;

        // Check if the bot is already being used in this server
        if(strangerServer.status === StrangerStatus.MATCHED) return;

        // Save userId, text and voice channel previously checked
        strangerServer.userId = userId;
        strangerServer.textChannel = msg.channel;
        strangerServer.userVoiceChannel = userVoiceChannel;

        // Check if a voice connection has already been created for this server
        strangerServer.botVoiceConnection = strangerServer.botVoiceConnection ?? joinVoiceChannel({ selfDeaf: false, channelId, guildId, adapterCreator: msg.guild?.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator });
        console.log(strangerServer.botVoiceConnection)

        // Start stranger research
        strangerServer.startSearching(country, userId);
    }
}
export default searchCommand;