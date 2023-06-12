import { ActivityType } from "discord.js";
import { strangerBot } from "..";

/* ==== Events ============================================================================================================================ */
export default (): void => {
    strangerBot.updatePresence();
    strangerBot.logger.info(`========= Bot deployed on version ${process.env.VERSION || "SNAPSHOT"} =========`);
}