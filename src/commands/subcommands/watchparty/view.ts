import { ChatInputCommandInteraction, EmbedBuilder, HexColorString } from 'discord.js'
import { AniList, AniMedia, AniUser, Parties } from '../../../types'

const { request } = require('graphql-request')
const wait = require('util').promisify(setTimeout)
const { GET_USERINFO, GET_MEDIALIST, GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'view'
  },
  async execute (interaction: ChatInputCommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    const title = interaction.options.getString('title')
    try {
      if (thisServerParty.server.current.length === 0) {
        interaction.reply({ content: 'There are no currently set anime. `/wp set`', ephemeral: true })
      } else {
        const currentAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
        if (thisServerParty.server.current.filter(c => c.title === currentAnime.Media.title.romaji).length > 0) {
          const currentId = currentAnime.Media.id
          interaction.deferReply()
          const embed = new EmbedBuilder()
            .setColor(currentAnime.Media.coverImage.color as HexColorString)
            .setTitle('Watch Party')
            .setDescription(`Progress on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})`)
            .setThumbnail(currentAnime.Media.coverImage.large)
            .setFooter({ text: `requested by ${interaction.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
            .setTimestamp()

          thisServerParty.server.list.find(x => x.animeId === currentId)!.members.forEach(async x => {
            const user: AniUser = await request('https://graphql.anilist.co', GET_USERINFO, { name: x })
            try {
              const list: AniList = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: user.User.name, mediaId: currentAnime!.Media.id })
              const episodes = list.MediaList.progress
              embed.addFields({ name: user.User.name, value: `[${episodes}/${currentAnime!.Media.episodes}](${user.User.siteUrl})`, inline: true })
            } catch {
              const episodes = 0
              embed.addFields({ name: user.User.name, value: `[${episodes}/${currentAnime!.Media.episodes}](${user.User.siteUrl})`, inline: true })
            }
          })
          await wait(1000)

          interaction.editReply({ embeds: [embed] })
        } else {
          interaction.reply({ content: `*${title}* is not currently set as a WP, \`/wp set\``, ephemeral: true })
        }
      }
    } catch (err) {
      console.log('Failed to use /wp view')
      console.error(err)
      interaction.reply({ content: 'Command failed, check usage', ephemeral: true })
    }
  }
}
