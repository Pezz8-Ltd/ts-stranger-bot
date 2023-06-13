import { SlashCommandBuilder } from "discord.js";

export default [
    new SlashCommandBuilder()
        .setName("search")
        .setDescription("Start searching a stranger from your voice channel!")
        .addStringOption(option => option
            .setName("language")
            .setDescription("The language you want to set.")
            .setRequired(true)
            .addChoices(
                { name: "italian", value: "IT" },
                { name: "english", value: "EN" }
            )
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip to the next stranger!")
        .toJSON(),

    new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop searching for strangers and enjoy some time by yourself.")
        .toJSON(),

    new SlashCommandBuilder()
        .setName("language")
        .setDescription("Change it to find strangers who speak your language!")
        .addStringOption(option => option
            .setName("language")
            .setDescription("The language you want to set.")
            .setRequired(true)
            .addChoices(
                { name: "italian", value: "IT" },
                { name: "english", value: "EN" }
            )
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("nickname")
        .setDescription("Change the name displayed to other strangers!")
        .addStringOption(option => option
            .setName("name")
            .setDescription("The new nickname you want to set.")
            .setRequired(true)
            .setMaxLength(32)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Check out more informations about the commands!")
        .addStringOption(option => option
            .setName("command")
            .setDescription("The command you want to know more about.")
            .setRequired(false)
            .addChoices(
                { name: "/search", value: "search" },
                { name: "/skip", value: "skip" },
                { name: "/stop", value: "stop" },
                { name: "/language", value: "language" },
                { name: "/nickname", value: "nickname" },
                { name: "/help", value: "help" },
                { name: "/ping", value: "ping" }
            )
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Fairly useless... Use it to check if the bot is online.")
        .toJSON(),
]