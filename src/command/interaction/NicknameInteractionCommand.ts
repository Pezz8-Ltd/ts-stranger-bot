import { ChatInputCommandInteraction } from "discord.js";
import ICommand from "../../interface/ICommand";
import { StrangerServer, strangerServersMap } from "../../fragment/Strangers";
import { TextBasedChannel } from "discord.js";
import { TextChannel } from "discord.js";
import { UserMetadata, saveUserNickname } from "../../fragment/UserMetadataService";
import { GuildMember } from "discord.js";

/* ==== COMMAND ================================================================================= */
const nicknameInteractionCommand: ICommand = {
    name: "nickname",
    fn: async (interaction: ChatInputCommandInteraction, args: { [k: string]: any }) => {
        
        // Command only valid in normal text chanels
        const textChannel: TextBasedChannel | null = interaction.channel;
        if(!(textChannel instanceof TextChannel)) {
            interaction?.reply({ content: "You can't use that command here!", ephemeral: true });
            return;
        }

        const userId: string = interaction.member?.user.id as string;

        // If user is cached, retrieve it directly from the interaction - If it's not, fetch it
        let member: GuildMember | undefined;
        if (interaction.member instanceof GuildMember)  member = interaction.member;
        else                                            member = await interaction.guild?.members.fetch(userId);

        // Retrieve the strangerServer if exists
        const guildId: string = textChannel.guildId;
        const stranger: StrangerServer | null = strangerServersMap[guildId];
        const nickname: string = args.name;

        // If it does, change current nickname and save it to database - if not, just save it
        if(stranger)    stranger.nicknameCommand(nickname);
        else            saveUserNickname(userId, nickname);

        interaction.reply( { content: `Nickname successfully changed to **${nickname}**`, ephemeral: true } )
    }
}
export default nicknameInteractionCommand;