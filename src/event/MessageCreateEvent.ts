import { Message } from "discord.js";

import StrangerBot from "../config/StrangerBot";
import ICommand from "../interface/ICommand";
import IMessageCommandMap from "../interface/IMessageCommandMap";
import ClassLogger from "../logging/Logger";
import { applyAlias } from "../utils/Utils"
import { pingCommand } from "../command/message/PingCommand";
import searchCommand from "../command/message/Search";

/* ==== PROPERTIES ============================================================================== */
const logger = new ClassLogger(null as any, __filename);

/* ==== EVENT - messageCreate =================================================================== */
export default async (_: StrangerBot, msg: Message) => {
    const prefix: string = process.env.PREFIX as string;

    // Bot message: reject
    if(msg.author.bot) return;

    // No prefix: reject
    if (!msg.content.startsWith(prefix)) return;

    // Remove prefix from msg.content
    msg.content = msg.content.substring(prefix.length + (msg.content.charAt(prefix.length) == " " ? 1 : 0));

    // Command arguments without prefix - Prefix only: reject
    const args: string[] = msg.content.split(/[\n ]+/);
    if (!args[0]) return;

    // Retrieve command "name" and search the command fn in the map
    const cmdName: string = (args.shift() as string).toLowerCase();
    logger.info(`${msg.guild?.name} - ${msg.author.username}: ${msg.content}`);
    const cmd: ICommand = messageCommandMap[cmdName];

    // Unknown command: reject
    if(!cmd) return;

    // Call internal command with parameters given directly by users
    // Execution wrapped in try/catch to avoid halt
    try {
        await cmd.fn(msg, ...args);
    } catch(e) {
        logger.error(`Error during the execution of ${cmdName}: ${e.message}`);
        console.error(e);
    }
}

/* ==== COMMANDS MAP ============================================================================ */
const messageCommandMap: IMessageCommandMap = {
    "pang, peng, ping, pong, pung": pingCommand,
    "search": searchCommand
}

/* ==== MULTI-KEY HANDLING ====================================================================== */
applyAlias(messageCommandMap);