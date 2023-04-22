import { Message, TextChannel, VoiceBasedChannel } from "discord.js";

import ICommand from "../../interface/ICommand";
import { StrangerServer, strangerServersMap } from "../../fragment/Strangers";

/* ==== COMMAND ================================================================================= */
const searchCommand: ICommand = {
    name: "search",
    fn: async (msg: Message, language: string) => {

        // Command cannot be used by bots
        if(msg.member?.user.bot) return;

        // Command only valid in normal text chanels
        if(!(msg.channel instanceof TextChannel)) return;

        // Check if user is actually in a voice channel
        const voiceChannel: VoiceBasedChannel = msg.member?.voice.channel as VoiceBasedChannel;
        if(!voiceChannel) return;
        
        // Check if a StrangerServer object has already been created for this server
        const guildId: string = msg.guildId as string;
        const stranger: StrangerServer = strangerServersMap[guildId] ?? (strangerServersMap[guildId] = new StrangerServer(language.toUpperCase(), msg.channel));

        // After retrieving the correct stranger, leave the handling to it
        stranger.searchCommand(msg.member?.id as string, msg.channel, voiceChannel, null);
    }
}
export default searchCommand;