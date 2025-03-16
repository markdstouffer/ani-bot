import { CommandInteraction, EmbedBuilder } from 'discord.js'
import { AniMedia, Parties } from '../../../types'

const wait = require('util').promisify(setTimeout)
const { request } = require('graphql-request')
const { GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'list'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    if (thisServerParty.server.list.length === 0) {
      await interaction.reply('No suggestions have been entered. Use `/watchparty suggest`')
    } else {
      await interaction.deferReply()
      const embed = new EmbedBuilder()
        .setTitle('WP List')
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
        .setColor('#74E6D6')
        .setTimestamp()
      let titles: string[] = []
      for (const obj of thisServerParty.server.list) {
        const oneAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
        const addToTitles = (thisServerParty.server.current.filter(c => c.title === oneAnime.Media.title.romaji).length > 0)
          ? `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl}) *`
          : `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl})`
        titles.push(addToTitles)
      }
      await wait(1000)
      titles = titles.map(entry => ' - **' + entry + '**')
      embed.setDescription(`List of suggested anime: \n\n${titles.join('\n')}`)

      await interaction.editReply({embeds: [embed]})
    }
  }
}
