const conn = require('../connections/anidata_conn')
const Party = conn.models.Party

module.exports = {
  data: {
    name: 'remind-quick',
    type: 2,
  },
  async execute(interaction) {
    const discord = interaction.options.getUser('user')
    const id = `<@!${discord.id}>`
    const serverId = interaction.guildId
    const query = { 'server.serverId': serverId }

    let countPartyServerDocs = await Party.find(query).limit(1).countDocuments()
    let partyServerExists = (countPartyServerDocs > 0)
    let thisServerParty = await Party.findOne(query)
    let title = thisServerParty.server.current

    if (partyServerExists && title) {
      interaction.reply({ content: `Ummm... ${id}.. please don't forget to watch today's episodes of **${title}**, UwU.. Arigato! ^_^`})
    } else {
      interaction.reply({ content: 'There is no current watch-party. `/wp set`', ephemeral: true })
    }
  }
}