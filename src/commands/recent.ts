// import types
import { ChatInputCommandInteraction, EmbedBuilder, HexColorString, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'
import { Aliases, AniActivity, AniUser } from '../types'

const { request } = require('graphql-request')
const { GET_ACTIVITY, GET_USERINFO } = require('../queries')

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recent')
    .setDescription('Returns a user\'s most recent anime-list activity.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('name')
        .setDescription('AniList username or Discord tag')
        .setRequired(true)
    ),
  async execute (interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name')
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
            const userData: AniUser = await request('https://graphql.anilist.co', GET_USERINFO, { name: anilist })
            const activityData: AniActivity = await request('https://graphql.anilist.co', GET_ACTIVITY, { userId: userData.User.id })
            const activity = activityData.Page.activities[0]
            if (activity) {
              const stat = (activity.progress && activity.progress.includes('-'))
                ? `${activity.status}s`
                : `${activity.status}`
              const statProg = activity.progress
                ? `${stat} ${activity.progress} of`
                : `${stat}`

              const embed = new EmbedBuilder()
                .setTitle(userData.User.name)
                .setColor(activity.media.coverImage.color as HexColorString)
                .setThumbnail(userData.User.avatar.large)
                .addFields({ name: statProg, value: `[**${activity.media.title.romaji}**](${activity.media.siteUrl})` })
              interaction.reply({ embeds: [embed] })
            } else { interaction.reply('This user has no recent activity :(') }
          } else {
            interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
          }
        } else {
          interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
        }
      } else {
        const userData: AniUser = await request('https://graphql.anilist.co', GET_USERINFO, { name })
        const activityData: AniActivity = await request('https://graphql.anilist.co', GET_ACTIVITY, { userId: userData.User.id })
        const activity = activityData.Page.activities[0]
        if (activity) {
          const stat = (activity.progress && activity.progress.includes('-'))
            ? `${activity.status}s`
            : `${activity.status}`
          const statProg = activity.progress
            ? `${stat} ${activity.progress} of`
            : `${stat}`

          const embed = new EmbedBuilder()
            .setTitle(userData.User.name)
            .setColor(activity.media.coverImage.color as HexColorString)
            .setThumbnail(userData.User.avatar.large)
            .addFields({ name: statProg, value: `[**${activity.media.title.romaji}**](${activity.media.siteUrl})` })
          interaction.reply({ embeds: [embed] })
        } else { interaction.reply('This user has no recent activity :(') }
      }
    } catch (err) {
      console.log('User failed to use /recent, name: ', name)
      console.error(err)
      interaction.reply({ content: 'Command failed, check usage', ephemeral: true })
    }
  }
}
