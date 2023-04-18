import { Message, TextChannel, VoiceBasedChannel } from "discord.js";

import ICommand from "../../interface/ICommand";
import { Country, StrangerServer, countries } from "../../fragment/Strangers";

/* ==== COMMAND ================================================================================= */
const stopCommand: ICommand = {
    name: "stop",
    fn: async (msg: Message, language: string) => {

        // Command cannot be used by bots
        if(msg.member?.user.bot) return;

        // Command only valid in normal text chanels
        if(!(msg.channel instanceof TextChannel)) return;

        // Check if user is actually in a voice channel
        const voiceChannel: VoiceBasedChannel = msg.member?.voice.channel as VoiceBasedChannel;
        if(!voiceChannel) return;

        // Retrieve server pool of the selected country
        // TODO: retrieve favourite country from DB
        const country: Country = countries[language.toUpperCase()];
        
        // Check if a StrangerServer object has already been created for this server
        const guildId: string = msg.guildId as string;
        const stranger: StrangerServer = country[guildId];
        if(!stranger) return;

        // After retrieving the correct stranger, leave the handling to it
        stranger.stopCommand(msg.member?.id as string);
    }
}
export default stopCommand;