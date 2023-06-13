import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import ICommand from "../../interface/ICommand";
import slashCommandBuilders from "../../config/slash/SlashCommandBuilders";

/* ==== COMMAND ================================================================================= */
const helpInteractionCommand: ICommand = {
    name: "help",
    fn: (interaction: ChatInputCommandInteraction) => {

        // Check the additional parameter given
        const cmdName: string | null = interaction.options.getString("command");

        // If no parameter is given, return an embed that lists all the commands
        if(!cmdName) {
            return interaction.reply({embeds: [ new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("StrangerBot Commands")
                .setFooter({ text: "/help <command> for a detailed description\nIf you're having issues or need extra support, join our server!" })
                .addFields({ name: "Slash Commands", value: `\`${slashCommandBuilders.map(b => b.name).join("\`, \`")}\`` })
            ]});
        }

        // If a parameter is given, try to get the corresponding name and description from the list
        const cmd = slashCommandBuilders.find(b => b.name === cmdName);

        // If the command actually doesn't exist, return an error message (should not happen)
        if(!cmd) return interaction.reply( { content: `Command **/${cmdName}** doesn't exist!`, ephemeral: true })

        // Compose command embed
        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`/${cmdName} Command`)
            .setFooter({ text: "If you're having issues or need extra support, join our official server!" })
            .addFields({ name: "Description", value: `*${cmd.description}*` })
    
        // Add command parameters (if any)
        if(cmd.options?.length) {
            embed.addFields({
                name: "Parameters",
                value: `*${cmd.options.map(o => ` **${o.name}** (\`${o.required ? "required" : "optional"}\`): *${o.description}*`).join("\n")}`
            })
        }
    
        // Return complete embed
        return interaction.reply({ embeds: [ embed ] })
    }
}
export default helpInteractionCommand;