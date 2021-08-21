// import types
import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { Aliases, AniList, AniMedia, AniUser } from '../types'

const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const { SlashCommandBuilder } = require('@discordjs/builders')
const Discord = require('discord.js')
const wait = require('util').promisify(setTimeout)

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress')
    .setDescription('Returns how many episodes of an anime a user has watched.')
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('all')
        .setDescription('Get progress for all aliased members in the server')
        .addStringOption(opt =>
          opt
            .setName('anime')
            .setDescription('Anime title')
            .setRequired(true)
        )
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('user')
        .setDescription('Get progress for one user')
        .addStringOption(opt =>
          opt
            .setName('user')
            .setDescription('AniList username')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('anime')
            .setDescription('Anime title')
            .setRequired(true)
        )
    ),
  async execute (interaction: CommandInteraction) {
    const serverId = interaction.guildId
    const countServerDocs: number = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
    const serverExists = (countServerDocs > 0)
    const serverAliases: Aliases = await Alias.findOne({ 'server.serverId': serverId })
    const sub = interaction.options.getSubcommand()
    const title = interaction.options.getString('anime')
    const user = interaction.options.getString('user')
    try {
      const animeData: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
      if (sub === 'all') {
        if (serverExists) {
          interaction.deferReply()
          const userList = serverAliases.server.users

          const allEmbed = new Discord.MessageEmbed()
            .setColor(animeData.Media.coverImage.color)
            .setTitle('Progress')
            .setDescription(`Server members' progress on [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
            .setThumbnail(animeData.Media.coverImage.large)
            .setFooter(`requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
            .setTimestamp()

          userList.forEach(async u => {
            const user: AniUser = await request('https://graphql.anilist.co', GET_USERINFO, { name: u.username })
            try {
              const oneList: AniList = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: user.User.name, mediaId: animeData.Media.id })
              const oneEpisodes = oneList.MediaList.progress
              allEmbed.addField(user.User.name, `[${oneEpisodes}/${animeData.Media.episodes}](${user.User.siteUrl})`, true)
            } catch {
              const oneEpisodes = 0
              allEmbed.addField(user.User.name, `[${oneEpisodes}/${animeData.Media.episodes}](${user.User.siteUrl})`, true)
            }
          })

          await wait(1000)
          interaction.editReply({ embeds: [allEmbed] })
        } else {
          interaction.reply('You must alias at least one user first. `/alias add`')
        }
      } else {
        if (user!.startsWith('<')) {
          if (serverExists) {
            const userList = serverAliases.server.users
            const u = userList.find(x => x.userId === user)
            if (u) {
              const anilist = u.username
              const userData: AniUser = await request('https://graphql.anilist.co', GET_USERINFO, { name: anilist })
              try {
                const listData: AniList = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: userData.User.name, mediaId: animeData.Media.id })
                const stat =
                  (listData.MediaList.status === 'CURRENT') ? 'Currently watching'
                    : (listData.MediaList.status === 'COMPLETED') ? 'Completed watching'
                      : (listData.MediaList.status === 'DROPPED') ? 'Dropped watching'
                        : (listData.MediaList.status === 'PAUSED') ? 'Paused watching'
                          : null
                const embed = new Discord.MessageEmbed()
                  .setTitle(userData.User.name)
                  .setColor(animeData.Media.coverImage.color)
                  .setThumbnail(animeData.Media.coverImage.large)
                  .setDescription(`Progress on [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
                  .addField(stat, `${listData.MediaList.progress}/${animeData.Media.episodes}`)
                interaction.reply({ embeds: [embed] })
              } catch {
                interaction.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
              }
            } else {
              interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
            }
          } else {
            interaction.reply('This user has not yet been aliased to an Anilist user. `/alias add`')
          }
        } else {
          const userData: AniUser = await request('https://graphql.anilist.co', GET_USERINFO, { name: user })
          try {
            const listData: AniList = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: userData.User.name, mediaId: animeData.Media.id })
            const stat =
              (listData.MediaList.status === 'CURRENT') ? 'Currently watching'
                : (listData.MediaList.status === 'COMPLETED') ? 'Completed watching'
                  : (listData.MediaList.status === 'DROPPED') ? 'Dropped watching'
                    : (listData.MediaList.status === 'PAUSED') ? 'Paused watching'
                      : null
            const embed = new Discord.MessageEmbed()
              .setTitle(userData.User.name)
              .setColor(animeData.Media.coverImage.color)
              .setThumbnail(animeData.Media.coverImage.large)
              .setDescription(`Progress on [**${animeData.Media.title.romaji}**](${animeData.Media.siteUrl})`)
              .addField(stat, `${listData.MediaList.progress}/${animeData.Media.episodes}`)
            interaction.reply({ embeds: [embed] })
          } catch {
            interaction.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
          }
        }
      }
    } catch (err) {
      console.log('Failed to use /progress... sub: ', sub, ' title: ', title, ' user?: ', user)
      console.error(err)
      interaction.reply('Command failed, check usage.')
    }
  }
}
