import { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

import ICommand from "../../interface/ICommand";
import { InteractionData, strangerCommandChannelCheck } from "./SearchInteractionCommand";

/* ==== COMMAND ================================================================================= */
const languageInteractionCommand: ICommand = {
    name: "language",
    fn: async (interaction: ChatInputCommandInteraction) => {

        // Run text and voice channel checks - on fail, "data" will be undefined: exit
        const data: InteractionData | undefined = await strangerCommandChannelCheck(interaction, true);
        if(!data) return;

        data.stranger.languageCommand(data.member?.id as string, interaction.options.getString("language") as string, data.interaction);
    }
}
export default languageInteractionCommand;