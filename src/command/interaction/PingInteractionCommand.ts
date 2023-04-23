import { ChatInputCommandInteraction, Message } from "discord.js";
import { strangerBot } from "../..";
import ICommand from "../../interface/ICommand";

/* ==== COMMAND ================================================================================= */
const pingInteractionCommand: ICommand = {
    name: "ping",
    fn: (interaction: ChatInputCommandInteraction) => interaction.reply( { content: `Pong! (${strangerBot.ws.ping}ms)`, ephemeral: true } )
}
export default pingInteractionCommand;