import { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

import ICommand from "../../interface/ICommand";
import { InteractionData, strangerCommandChannelCheck } from "./SearchInteractionCommand";

/* ==== COMMAND ================================================================================= */
const stopInteractionCommand: ICommand = {
    name: "stop",
    fn: async (interaction: ChatInputCommandInteraction | ButtonInteraction) => {

        // Run text and voice channel checks - on fail, "data" will be undefined: exit
        const data: InteractionData | undefined = await strangerCommandChannelCheck(interaction, true);
        if(!data) return;

        data.stranger.stopCommand(data.member?.id as string, data.interaction);
    }
}
export default stopInteractionCommand;