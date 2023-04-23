import { ButtonInteraction, ChatInputCommandInteraction, GuildMember, Message, TextBasedChannel, TextChannel, VoiceBasedChannel } from "discord.js";

import ICommand from "../../interface/ICommand";
import { StrangerServer, strangerServersMap } from "../../fragment/Strangers";
import { InteractionData, strangerCommandChannelCheck } from "./SearchInteractionCommand";

/* ==== COMMAND ================================================================================= */
const stopInteractionCommand: ICommand = {
    name: "stop",
    fn: async (interaction: ChatInputCommandInteraction | ButtonInteraction) => {

        // Run text and voice channel checks - on fail, "data" will be undefined: exit
        const data: InteractionData | undefined = await strangerCommandChannelCheck(interaction);
        if(!data) return;

        if(!data.stranger) {
            data.interaction?.reply({ content: "There's no process to stop!", ephemeral: true });
            return;
        }

        data.stranger.stopCommand(data.member?.id as string, data.interaction);
    }
}
export default stopInteractionCommand;