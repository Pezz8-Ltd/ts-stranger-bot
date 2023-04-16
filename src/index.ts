import * as dotenv from "dotenv";    // Configure process.env globally
dotenv.config();

import { GatewayIntentBits, Options } from 'discord.js';

import StrangerBot from "./config/StrangerBot";

/* ==== Core ==================================================================================== */
export const strangerBot: StrangerBot = new StrangerBot({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent
    ],
    makeCache: Options.cacheWithLimits({
        MessageManager: 0,
        GuildBanManager: 0,
        BaseGuildEmojiManager: 0,
        GuildEmojiManager: 0,
        GuildInviteManager: 0,
        GuildStickerManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        ApplicationCommandManager: 0,
        PresenceManager: 0,
        StageInstanceManager: 0
    })
});
strangerBot.init();