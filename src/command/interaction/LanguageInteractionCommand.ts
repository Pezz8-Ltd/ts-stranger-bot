import { ChatInputCommandInteraction } from "discord.js";

import ICommand from "../../interface/ICommand";
import { InteractionData, strangerCommandChannelCheck } from "./SearchInteractionCommand";

/* ==== COMMAND ================================================================================= */
const languageInteractionCommand: ICommand = {
    name: "language",
    fn: async (interaction: ChatInputCommandInteraction, args: { [k: string]: any }) => {

        // Run text and voice channel checks - on fail, "data" will be undefined: exit
        const data: InteractionData | undefined = await strangerCommandChannelCheck(interaction, true);
        if(!data) return;

        data.stranger.languageCommand(data.member?.id as string, args.language, data.interaction);
    }
}
export default languageInteractionCommand;