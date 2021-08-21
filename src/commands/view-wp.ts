//import types
import { CommandInteraction } from 'discord.js'
import { Parties } from '../types'

const Discord = require('discord.js')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const wait = require('util').promisify(setTimeout)

const conn = require('../connections/anidata_conn')
const Party = conn.models.Party

module.exports = {
  data: {
    name: 'view-wp',
    type: 3
  },
  async execute(interaction: CommandInteraction) {
    const serverId = interaction.guildId
    const query = { 'server.serverId': serverId }

    let countPartyServerDocs = await Party.find(query).limit(1).countDocuments()
    let partyServerExists = (countPartyServerDocs > 0)
    let thisServerParty: Parties = await Party.findOne(query)
    let title = thisServerParty.server.current

    if (partyServerExists && title) {
      const currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
      const currentId = Number(currentAnime.Media.id)
      try {
        interaction.deferReply()
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`Progress on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
          .setTimestamp()
  
        thisServerParty.server.list.find(x => x.animeId === currentId)!.members.forEach(async x => {
          const user = await request('https://graphql.anilist.co', GET_USERINFO, { name: x })
          try {
            const list = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: user.User.name, mediaId: currentAnime.Media.id })
            const episodes = list.MediaList.progress
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          } catch {
            const episodes = 0
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          }
        })
        await wait(1000)
  
        interaction.editReply({ embeds: [embed] })
      } catch (err) {
        console.log('User failed to use /wp, sent usage help.')
        console.error(err)
        interaction.reply('UwU, something\'s gone wrong, please contact markymoOwO to fix it.')
      }
    } else {
      interaction.reply({ content: 'There is no current watch-party. `/wp set`', ephemeral: true })
    }
  }
}