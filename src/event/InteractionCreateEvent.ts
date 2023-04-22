import { GuildMember, Interaction, TextChannel, VoiceBasedChannel, TextBasedChannel, ChatInputCommandInteraction } from "discord.js";

import ClassLogger from "../logging/Logger";
import { StrangerServer, strangerServersMap } from "../fragment/Strangers";
import StrangerBot from "../config/StrangerBot";
import { strangerBot } from "..";

const logger: ClassLogger = new ClassLogger(null as any, __filename);

/* ==== EVENT - interactionCreate =============================================================== */
export default async (_: StrangerBot, interaction: Interaction): Promise<void> => {

    // Only handle button interactions
    if(!interaction.isButton() && !interaction.isChatInputCommand()) return;

    // Command cannot be used by bots
    if(interaction.member?.user.bot) return;

    // Command only valid in normal text chanels
    const textChannel: TextBasedChannel | null = interaction.channel;
    if(!(textChannel instanceof TextChannel)) return;

    // If user is cached, retrieve it directly from the interaction - If it's not, fetch it
    let member: GuildMember | undefined;
    if (interaction.member instanceof GuildMember)  member = interaction.member;
    else                                            member = await interaction.guild?.members.fetch(interaction.member?.user.id as string);

    // Check if user is actually in a voice channel
    const voiceChannel: VoiceBasedChannel = member?.voice.channel as VoiceBasedChannel;
    if(!voiceChannel) return;

    let command: string;
    let language: string;

    if(interaction.isButton()) {
        const args: string[] = interaction.customId.split(/\-/g);
        command = args[0];
        language = args[1];

        interaction.deferUpdate();
    } else {
        // Language only present in "search" and "language" commands
        command = interaction.commandName;
        language = interaction.options.getString("language") as string;
    }

    // Check if a StrangerServer object has already been created for this server
    const guildId: string = textChannel.guildId as string;
    let stranger: StrangerServer = strangerServersMap[guildId];

    const interactionToSend: ChatInputCommandInteraction | null = interaction.isChatInputCommand() ? interaction : null;

    // After retrieving the correct stranger, leave the handling to it
    switch(command) {
        case "search":
            stranger = stranger ?? (strangerServersMap[guildId] = new StrangerServer(language, textChannel));
            stranger.searchCommand(member?.id as string, textChannel, voiceChannel, interactionToSend);
            break;

        case "skip":
            stranger?.skipCommand(member?.id as string, textChannel, voiceChannel, interactionToSend);
            break;

        case "stop":
            stranger?.stopCommand(member?.id as string, interactionToSend);
            break;

        case "language":
            stranger?.languageCommand(language, interactionToSend);
            break;

        case "ping":
            interaction.reply( `I'm alive and well. (${strangerBot.ws.ping}ms)` );
            break;

        case "report":
            logger.warn(interactionToSend?.options.getString("description") as string);
            break;
    }
}