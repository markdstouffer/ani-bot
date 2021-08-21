//import types
import { CommandInteraction } from 'discord.js'

const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responds with pong.'),
  async execute(interaction: CommandInteraction) {
    await interaction.reply('Pong pong pong!!')
  }
}
