import { VoiceState } from "discord.js";
import { OpusEncoder } from '@discordjs/opus';

import { strangerBot } from "..";
import ClassLogger from "../logging/Logger";
import { Country, StrangerLanguage, StrangerServer, countries, strangerCloseStreamEmitter } from "../fragment/Strangers";

const logger: ClassLogger = new ClassLogger(null as any, __filename);

/* ==== EVENT - voiceStateUpdate ========================================================================= */
export default (_: any, oldState: VoiceState, newState: VoiceState) => {

    // Bot activity: reject
    if(newState.member?.user.bot) return;

    // Check if we are talking about someone quitting/changing voice channel
    if(oldState.channel && (oldState.channelId != newState.channelId)) {
        const guildId = oldState.guild.id;
        const userId = oldState.member?.id;

        // TODO: trovare modo per determinare country di appartenenza e non cercare ovunque
        for(const language in StrangerLanguage) {
            if(isNaN(Number(language))) {
                const country: Country = countries[language];
                if(country) {
                    const stranger: StrangerServer = country[guildId];
                    if(stranger && stranger.isMatched()) {
                        if(stranger.userId == userId) {
                            logger.debug("Emitted close event from voiceStateUpdate!");
                            strangerCloseStreamEmitter.emit("close", stranger.matchedStranger);
                        }
                    }
                }
            }
        }
    }
}