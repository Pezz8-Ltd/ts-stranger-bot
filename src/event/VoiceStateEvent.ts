import { VoiceState } from "discord.js";

import ClassLogger from "../logging/Logger";
import { Country, StrangerLanguage, StrangerServer, countries } from "../fragment/Strangers";

const logger: ClassLogger = new ClassLogger(null as any, __filename);

/* ==== EVENT - voiceStateUpdate ========================================================================= */
export default (_: any, oldState: VoiceState, newState: VoiceState) => {

    // Bot activity: reject
    if(newState.member?.user.bot) return;

    // Check if we are talking about someone quitting/changing voice channel
    if(oldState.channel && (oldState.channelId != newState.channelId)) {
        const guildId = oldState.guild.id;
        const userId = oldState.member?.id;
        let country: Country;
        let stranger: StrangerServer;

        // TODO: If the bot leaves the vc, abort connection

        // TODO: find a way to determine the country without looking for the stranger everywhere
        for(const language in StrangerLanguage) {
            if(!isNaN(Number(language))) continue;

            country = countries[language];
            if(!country) continue;

            stranger = country[guildId];
            if(!stranger || !stranger.isMatched() || stranger.userId != userId) continue;

            stranger.debug("VoiceStateUpdate triggered, aborting...");
            stranger.abort();
        }
    }
}