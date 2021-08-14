const { SlashCommandBuilder } = require('@discordjs/builders')
const conn = require('../connections/anidata_conn')
const Party = conn.models.Party

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Remind a baka to watch the current WP episodes')
    .addMentionableOption(opt =>
      opt
        .setName('discord')
        .setDescription('Discord tag')
        .setRequired(true)
      ),
  async execute(interaction) {
    const serverId = interaction.guildId
    const query = { 'server.serverId': serverId }
    const discord = interaction.options.getMentionable('discord')

    let countPartyServerDocs = await Party.find(query).limit(1).countDocuments()
    let partyServerExists = (countPartyServerDocs > 0)
    let thisServerParty = await Party.findOne(query)

    if (partyServerExists) {
      const currentAnime = thisServerParty.server.current
      if (currentAnime) {
        interaction.reply({ content: `Ummm... ${discord}.. please don't forget to watch today's episodes of **${currentAnime}**, UwU.. Arigato! ^_^`})
      } else {
        interaction.reply('There is no current watch-party.')
      }
    } else {
      interaction.reply('There is no current watch-party.')
    }
  }
}