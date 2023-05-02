import { VoiceState } from "discord.js";

import ClassLogger from "../logging/Logger";
import { StrangerServer, strangerServersMap } from "../fragment/Strangers";
import { strangerBot } from "..";

const logger: ClassLogger = new ClassLogger(null as any, __filename);

/* ==== EVENT - voiceStateUpdate ========================================================================= */
export default (_: any, oldState: VoiceState, newState: VoiceState): void => {

    // We need to know if someone kicks our bot out of the voice channel during connection
    const isStrangerBot: boolean = oldState.member?.id === strangerBot.user?.id;

    // Others bot activity: reject
    if(!isStrangerBot && newState.member?.user.bot) return;

    // Check if we are talking about someone quitting/changing voice channel
    if(oldState.channel && (oldState.channelId != newState.channelId)) {
        // Check if there's a stranger
        const stranger: StrangerServer = strangerServersMap[oldState.guild.id];
        if(!stranger) return;

        // After retrieving the correct stranger, leave the handling to it
        return stranger.voiceStateUpdate(oldState.member?.id as string, isStrangerBot);
    }
}