import { VoiceState } from "discord.js";

import ClassLogger from "../logging/Logger";
import { Country, StrangerLanguage, StrangerServer, countries } from "../fragment/Strangers";
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
        const guildId = oldState.guild.id;
        let country: Country;
        let stranger: StrangerServer;

        // TODO: find a way to determine the country without looking for the stranger everywhere
        for(const language in StrangerLanguage) {
            // Only consider enum actual NAMES ('EN', 'IT'...), not VALUES (0, 1...)
            if(!isNaN(Number(language))) continue;

            // Check if the country exists
            country = countries[language];
            if(!country) continue;

            // Check if there's a stranger in this country
            stranger = country[guildId];
            if(!stranger) return;

            // After retrieving the correct stranger, leave the handling to it
            return stranger.voiceStateUpdate(oldState.member?.id as string, isStrangerBot);
        }
    }
}