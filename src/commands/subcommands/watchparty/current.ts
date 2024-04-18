import { CommandInteraction, EmbedBuilder } from 'discord.js'
import { Parties, AniMedia } from '../../../types'

const { GET_MEDIA } = require('../../../queries')
const { request } = require('graphql-request')
const wait = require('util').promisify(setTimeout)

module.exports = {
  data: {
    name: 'current'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    if (thisServerParty.server.current.length === 0) {
      interaction.reply('No WPs have been set, `/wp set`')
    } else {
      interaction.deferReply()
      const embed = new EmbedBuilder()
        .setTitle('Current WPs')
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
        .setColor('#74E6D6')
        .setTimestamp()
      thisServerParty.server.current.forEach(async c => {
        const oneAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: c.title })
        const listing = thisServerParty.server.list.find(x => x.animeId === oneAnime.Media.id)
        const joinedMembers = `**${listing!.members.length}**`
        const subRange = (c.episodesToday) ? c.episodesToday : 0
        const range = (c.episodesToday === 1) ? `**${c.episode - 1}**` : `**${c.episode - subRange}** - **${c.episode - 1}**`
        const eps = (c.episodesToday) ? range : `**${c.episode}**`
        embed.addFields({ name: c.title!, value: `Assigned episode(s): ${eps}\n# of participants: ${joinedMembers}` })
      })
      await wait(1000)
      embed.setDescription('Some information about each of the currently set watchparties:')

      interaction.editReply({ embeds: [embed] })
    }
  }
}
