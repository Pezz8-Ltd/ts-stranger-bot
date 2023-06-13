import { Interaction } from "discord.js";

import ICommand from "../interface/ICommand";
import ClassLogger from "../logging/Logger";
import StrangerBot from "../config/StrangerBot";
import pingInteractionCommand from "../command/interaction/PingInteractionCommand";
import searchInteractionCommand from "../command/interaction/SearchInteractionCommand";
import skipInteractionCommand from "../command/interaction/SkipInteractionCommand";
import stopInteractionCommand from "../command/interaction/StopInteractionCommand";
import nicknameInteractionCommand from "../command/interaction/NicknameInteractionCommand";
import languageInteractionCommand from "../command/interaction/LanguageInteractionCommand";
import { strangerBot } from "..";
import helpInteractionCommand from "../command/interaction/HelpInteractionCommand";

const logger: ClassLogger = new ClassLogger(null as any, __filename);

/* ==== EVENT - interactionCreate =============================================================== */
export default async (_: StrangerBot, interaction: Interaction): Promise<void> => {

    // Command cannot be used by bots
    if(interaction.member?.user.bot) return;

    // Only handle button and command interactions
    let command: string;
    let args: { [k: string]: any } | null = null;

    if(interaction.isButton()) {
        command = interaction.customId;
        interaction.deferUpdate();
    } else if(interaction.isChatInputCommand()) {
        command = interaction.commandName;
        if(interaction.options.data.length) {
            args = {};
            interaction.options.data.map( e => (args as { [k: string]: any })[e.name] = e.value );
        }
    } else return;

    // Update bot status (presence) at most once per minute
    strangerBot.updatePresence();
    logger.info(`[${interaction.guild?.name}] ${interaction.member?.user.username}#${interaction.member?.user.discriminator}: ${command}${args ? " "+JSON.stringify(args) : ""}`);

    // Call internal command with parameters given directly by users
    // Execution wrapped in try/catch to avoid halt
    try {
        await messageCommandMap[command].fn(interaction, args);
    } catch(e) {
        logger.error(`Error during the execution of ${command}: ${e.message}`);
        console.error(e);
    }
}

/* ==== COMMANDS MAP ============================================================================ */
const messageCommandMap: { [k: string]: ICommand } = {
    "ping": pingInteractionCommand,
    "help": helpInteractionCommand,
    "search": searchInteractionCommand,
    "skip": skipInteractionCommand,
    "stop": stopInteractionCommand,
    "language": languageInteractionCommand,
    "nickname": nicknameInteractionCommand
}