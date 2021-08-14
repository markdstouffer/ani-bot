const { request } = require('graphql-request')
const { GET_USERINFO } = require('../queries')

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: {
    name: 'url-quick',
    type: 2
  },
  async execute(interaction) {
    const discord = interaction.options.getUser('user')
    const id = `<@!${discord.id}>`
    const serverId = interaction.guildId
    const countServerDocs = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
    let serverExists = (countServerDocs > 0)
    let serverAliases = await Alias.findOne({ 'server.serverId': serverId })

    if (serverExists) {
      const userList = serverAliases.server.users
      const user = userList.find(x => x.userId === id)
      if (user) {
        const anilist = user.username
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: anilist})
        interaction.reply(userData.User.siteUrl)
      } else {
        interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
      }
    } else {
      interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
    }
  }
}