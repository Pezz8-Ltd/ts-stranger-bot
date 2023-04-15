import { ActivityType } from "discord.js";
import { strangerBot } from "..";

/* ==== Events ============================================================================================================================ */
export default (): void => {
    strangerBot.user?.setPresence({ activities: [{ name: "your voice", type: ActivityType.Listening }], status: 'idle' });
    strangerBot.logger.info(`========= Bot deployed on version ${process.env.VERSION} =========`);
}