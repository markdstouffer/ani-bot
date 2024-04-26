// import types
import { CommandInteraction, SlashCommandBuilder } from 'discord.js'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responds with pong.'),
  async execute (interaction: CommandInteraction) {
    await interaction.reply('Pong pong pong!!')
  }
}
