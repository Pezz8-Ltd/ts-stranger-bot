import { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

import ICommand from "../../interface/ICommand";
import { InteractionData, strangerCommandChannelCheck } from "./SearchInteractionCommand";

/* ==== COMMAND ================================================================================= */
const skipInteractionCommand: ICommand = {
    name: "skip",
    fn: async (interaction: ChatInputCommandInteraction | ButtonInteraction) => {

        // Run text and voice channel checks - on fail, "data" will be undefined: exit
        const data: InteractionData | undefined = await strangerCommandChannelCheck(interaction, true);
        if(!data) return;

        data.stranger.skipCommand(data.member?.id as string, data.textChannel, data.voiceChannel, data.interaction, data.dmChannel);
    }
}
export default skipInteractionCommand;