// import types
import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'
import { Aliases } from '../types'

const { request } = require('graphql-request')
const { GET_USERINFO } = require('../queries')
const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('url')
    .setDescription('Return the url of an AniList user')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('user')
        .setDescription('AniList username or Discord tag')
        .setRequired(true)
    ),
  async execute (interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('user')
    const serverId = interaction.guildId
    const countServerDocs: number = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
    const serverExists = (countServerDocs > 0)
    const serverAliases: Aliases = await Alias.findOne({ 'server.serverId': serverId })

    try {
      if (name!.startsWith('<')) {
        if (serverExists) {
          const userList = serverAliases.server.users
          const user = userList.find(x => x.userId === name)
          if (user) {
            const anilist = user.username
            const userData = await request('https://graphql.anilist.co', GET_USERINFO, { name: anilist })
            await interaction.reply(userData.User.siteUrl)
          } else {
            await interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
          }
        } else {
          await interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
        }
      } else {
        const userData = await request('https://graphql.anilist.co', GET_USERINFO, { name })
        await interaction.reply(userData.User.siteUrl)
      }
    } catch (err) {
      console.error(err)
      await interaction.reply({
        content: 'Command failed, check that the user is aliased or you spelled it right. `/alias add`',
        ephemeral: true
      })
    }
  }
}
