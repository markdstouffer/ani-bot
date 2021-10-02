import { CommandInteraction } from 'discord.js'
import { Parties } from '../../../types'

const Discord = require('discord.js')
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
      const embed = new Discord.MessageEmbed()
        .setTitle('Current WPs')
        .setFooter(`Requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
        .setColor('#74E6D6')
        .setTimestamp()
      thisServerParty.server.current.forEach(async c => {
        const assigned = (c.episodesToday) ? `next **${c.episodesToday}**` : '*None*'
        const ep = (c.episodesToday) ? `**${c.episode - c.episodesToday}` : '**0**'
        embed.addField(c.title, `Current Ep: ${ep}\nAssigned: ${assigned}`)
      })
      await wait(1000)
      embed.setDescription('Some information about each the currently set watchparties:')

      interaction.editReply({ embeds: [embed] })
    }
  }
}
