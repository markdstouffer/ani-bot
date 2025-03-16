// import types
import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandMentionableOption } from 'discord.js'
import { Parties } from '../types'

const conn = require('../connections/anidata_conn')
const Party = conn.models.Party

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Remind a baka to watch the current WP episodes')
    .addMentionableOption((opt: SlashCommandMentionableOption) =>
      opt
        .setName('discord')
        .setDescription('Discord tag')
        .setRequired(true)
    ),
  async execute (interaction: ChatInputCommandInteraction) {
    const serverId = interaction.guildId
    const query = { 'server.serverId': serverId }
    const discord = interaction.options.getMentionable('discord')

    const countPartyServerDocs: number = await Party.find(query).limit(1).countDocuments()
    const partyServerExists = (countPartyServerDocs > 0)
    const thisServerParty: Parties = await Party.findOne(query)

    if (partyServerExists) {
      const currentAnime = thisServerParty.server.current
      if (currentAnime) {
        await interaction.reply({content: `Ummm... ${discord}.. please don't forget to watch today's episodes of **${currentAnime}**, UwU.. Arigato! ^_^`})
      } else {
        await interaction.reply('There is no current watch-party.')
      }
    } else {
      await interaction.reply('There is no current watch-party.')
    }
  }
}
