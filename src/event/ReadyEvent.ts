import { ActivityType, Guild } from "discord.js";
import { strangerBot } from "..";

/* ==== Events ============================================================================================================================ */
export default (): void => {
    const guilds = strangerBot.guilds.cache;
    strangerBot.logger.info(`Currently in ${guilds.size} servers`);
    for(const [_, guild] of guilds) strangerBot.logger.debug(`- ${guild.name}`);

    strangerBot.updatePresence();
    strangerBot.logger.info(`========= Bot deployed on version ${process.env.VERSION || "SNAPSHOT"} =========`);
}