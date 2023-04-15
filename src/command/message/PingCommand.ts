import { Message } from "discord.js";
import { strangerBot } from "../..";
import ICommand from "../../interface/ICommand";

/* ==== COMMAND ================================================================================= */
export const pingCommand: ICommand = {
    name: "ping",
    fn: (msg: Message) => msg.reply( `Pxng! (${strangerBot.ws.ping}ms)` )
}