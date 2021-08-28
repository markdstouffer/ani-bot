import { CommandInteraction, MessageActionRow } from 'discord.js'
import { Quote } from '../../../types'
const fetch = require('node-fetch')
const Discord = require('discord.js')
const { GET_CHARACTER, GET_MEDIA } = require('../../../queries')
const { request } = require('graphql-request')

module.exports = {
  data: {
    name: 'random'
  },
  async execute (interaction: CommandInteraction, _name: undefined, _title: undefined) {
    const embed = new Discord.MessageEmbed()
    fetch('https://animechan.vercel.app/api/random')
      .then((res: { json: () => any }) => res.json())
      .then(async (quote: Quote) => {
        const char = await request('https://graphql.anilist.co', GET_CHARACTER, { search: quote.character.normalize('NFD').replace(/[\u0300-\u036f]/g, '') })
        const media = await request('https://graphql.anilist.co', GET_MEDIA, { search: quote.anime.normalize('NFD').replace(/[\u0300-\u036f]/g, '') })
        embed
          .setColor('#55E3F1')
          .setTitle(`${quote.character} - `)
          .setDescription(`*${quote.quote}*`)
          .setThumbnail(char.Character.image.large)
        const row: MessageActionRow = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageButton()
              .setLabel(`${media.Media.title.romaji} on AniList`)
              .setURL(`${media.Media.siteUrl}`)
              .setStyle('LINK')
          )
        interaction.reply({ embeds: [embed], components: [row] })
      })
  }
}
