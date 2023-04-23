import { Interaction } from "discord.js";

import ClassLogger from "../logging/Logger";
import StrangerBot from "../config/StrangerBot";
import pingInteractionCommand from "../command/interaction/PingInteractionCommand";
import searchInteractionCommand from "../command/interaction/SearchInteractionCommand";
import skipInteractionCommand from "../command/interaction/SkipInteractionCommand";
import stopInteractionCommand from "../command/interaction/StopInteractionCommand";
import ICommand from "../interface/ICommand";

const logger: ClassLogger = new ClassLogger(null as any, __filename);

/* ==== EVENT - interactionCreate =============================================================== */
export default async (_: StrangerBot, interaction: Interaction): Promise<void> => {

    // Command cannot be used by bots
    if(interaction.member?.user.bot) return;

    // Only handle button and command interactions
    let command: string;
    let language: string;

    if(interaction.isButton()) {
        const args: string[] = interaction.customId.split(/\-/g);
        command = args[0];
        language = args[1];

        interaction.deferUpdate();
    } else if(interaction.isChatInputCommand()) {
        // Language only present in "search" and "language" commands
        command = interaction.commandName;
        language = interaction.options.getString("language") as string;
    } else return;

    // Call internal command with parameters given directly by users
    // Execution wrapped in try/catch to avoid halt
    try {
        await messageCommandMap[command].fn(interaction, language);
    } catch(e) {
        logger.error(`Error during the execution of ${command}: ${e.message}`);
        console.error(e);
    }
}

/* ==== COMMANDS MAP ============================================================================ */
const messageCommandMap: { [k: string]: ICommand } = {
    "ping": pingInteractionCommand,
    "search": searchInteractionCommand,
    "skip": skipInteractionCommand,
    "stop": stopInteractionCommand
}