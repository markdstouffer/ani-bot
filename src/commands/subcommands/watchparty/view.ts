import { CommandInteraction } from 'discord.js'
import { AniList, AniMedia, AniUser, Parties } from '../../../types'

const { request } = require('graphql-request')
const Discord = require('discord.js')
const wait = require('util').promisify(setTimeout)
const { GET_USERINFO, GET_MEDIALIST, GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'view'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    try {
      const currentTitle = thisServerParty.server.current
      const currentAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: currentTitle })
      const currentId = currentAnime.Media.id
      if (!currentAnime) {
        interaction.reply({ content: 'There is no currently set anime. `/wp set`', ephemeral: true })
      } else {
        interaction.deferReply()
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`Progress on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
          .setTimestamp()

        thisServerParty.server.list.find(x => x.animeId === currentId)!.members.forEach(async x => {
          const user: AniUser = await request('https://graphql.anilist.co', GET_USERINFO, { name: x })
          try {
            const list: AniList = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: user.User.name, mediaId: currentAnime!.Media.id })
            const episodes = list.MediaList.progress
            embed.addField(user.User.name, `[${episodes}/${currentAnime!.Media.episodes}](${user.User.siteUrl})`, true)
          } catch {
            const episodes = 0
            embed.addField(user.User.name, `[${episodes}/${currentAnime!.Media.episodes}](${user.User.siteUrl})`, true)
          }
        })
        await wait(1000)

        interaction.editReply({ embeds: [embed] })
      }
    } catch (err) {
      console.log('Failed to use /wp view')
      console.error(err)
      interaction.reply({ content: 'Command failed, check usage', ephemeral: true })
    }
  }
}
