import { ButtonInteraction, ChatInputCommandInteraction, GuildMember, TextBasedChannel, TextChannel, VoiceBasedChannel } from "discord.js";

import ICommand from "../../interface/ICommand";
import { StrangerServer, strangerServersMap } from "../../fragment/Strangers";

/* ==== COMMAND ================================================================================= */
const searchInteractionCommand: ICommand = {
    name: "search",
    fn: async (interaction: ChatInputCommandInteraction | ButtonInteraction, language: string) => {

        // Run text and voice channel checks - on fail, "data" will be undefined: exit
        const data: InteractionData | undefined = await strangerCommandChannelCheck(interaction);
        if(!data) return;

        // If no stranger is found, create one and start the searching process
        const stranger = data.stranger ?? (strangerServersMap[data.guildId] = new StrangerServer(language, data.textChannel));
        stranger.searchCommand(data.member?.id as string, data.textChannel, data.voiceChannel, data.interaction);
    }
}
export default searchInteractionCommand;

/* ==== UTILS =================================================================================== */
export async function strangerCommandChannelCheck(interaction: ButtonInteraction | ChatInputCommandInteraction, assertStranger: boolean = false): Promise<InteractionData | undefined> {
    // Retrieve the interaction only if from a slash command - we don't want to reply to buttons
    const interactionToSend: ChatInputCommandInteraction | null = interaction.isChatInputCommand() ? interaction : null;
    
    // Command only valid in normal text chanels
    const textChannel: TextBasedChannel | null = interaction.channel;
    if(!(textChannel instanceof TextChannel)) {
        interactionToSend?.reply({ content: "You can't use that command here!", ephemeral: true });
        return;
    }

    // If user is cached, retrieve it directly from the interaction - If it's not, fetch it
    let member: GuildMember | undefined;
    if (interaction.member instanceof GuildMember)  member = interaction.member;
    else                                            member = await interaction.guild?.members.fetch(interaction.member?.user.id as string);

    // Check if user is actually in a voice channel
    const voiceChannel: VoiceBasedChannel = member?.voice.channel as VoiceBasedChannel;
    if(!voiceChannel) {
        interactionToSend?.reply({ content: "You have to join a voice channel first!", ephemeral: true });
        return;
    }

    // Check if a StrangerServer object has already been created for this server
    const guildId: string = textChannel.guildId as string;
    let stranger: StrangerServer = strangerServersMap[guildId];

    if(assertStranger && !stranger) {
        interactionToSend?.reply({ content: "Use the */search* command to start a session first!", ephemeral: true });
        return;
    }

    return { guildId, member, stranger, textChannel, voiceChannel, interaction: interactionToSend };
}

export interface InteractionData {
    guildId: string;
    member: GuildMember | undefined;
    stranger: StrangerServer;
    textChannel: TextChannel;
    voiceChannel: VoiceBasedChannel;
    interaction: ChatInputCommandInteraction | null;
}