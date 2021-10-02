import { CommandInteraction } from 'discord.js'
import { AniMedia, Parties } from '../../../types'

const Discord = require('discord.js')
const wait = require('util').promisify(setTimeout)
const { request } = require('graphql-request')
const { GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'list'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    if (thisServerParty.server.list.length === 0) {
      interaction.reply('No suggestions have been entered. Use `/watchparty suggest`')
    } else {
      interaction.deferReply()
      const embed = new Discord.MessageEmbed()
        .setTitle('WP List')
        .setFooter(`Requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
        .setColor('#74E6D6')
        .setTimestamp()
      let titles: string[] = []
      thisServerParty.server.list.forEach(async obj => {
        const oneAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
        const addToTitles = (thisServerParty.server.current.filter(c => c.title === oneAnime.Media.title.romaji).length > 0)
          ? `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl}) *`
          : `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl})`
        titles.push(addToTitles)
      })
      await wait(1000)
      titles = titles.map(entry => ' - **' + entry + '**')
      embed.setDescription(`List of suggested anime: \n\n${titles.join('\n')}`)

      interaction.editReply({ embeds: [embed] })
    }
  }
}
