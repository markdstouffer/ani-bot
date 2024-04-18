import { ChatInputCommandInteraction, Collection, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from 'discord.js'
const fs = require('fs')
const path = require('path')
const subcommands = new Collection<any, any>()
const subFiles = fs.readdirSync(path.resolve(__dirname, './subcommands/quote')).filter((file: string) => file.endsWith('.ts'))

for (const file of subFiles) {
  const command = require(`./subcommands/quote/${file}`)
  subcommands.set(command.data.name, command)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Returns an anime quote')
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('random')
        .setDescription('Returns a random anime quote')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('anime')
        .setDescription('Returns a quote from a specified anime')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('character')
        .setDescription('Returns a quote from a specified character')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('name')
            .setDescription('Character name')
            .setRequired(true)
        )
    ),
  async execute (interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand()
    const name = interaction.options.getString('name')
    const title = interaction.options.getString('title')
    await subcommands.get(sub).execute(interaction, name, title)
  }
}
