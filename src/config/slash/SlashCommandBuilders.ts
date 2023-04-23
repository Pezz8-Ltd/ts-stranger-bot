import { SlashCommandBuilder } from "discord.js";

export default [
    new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Fairly useless... Use it to check if the bot is online.")
        .toJSON(),

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
        .toJSON()
]