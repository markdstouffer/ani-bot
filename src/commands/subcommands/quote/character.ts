import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js'
import { Quote } from '../../../types'
const fetch = require('node-fetch')
const { GET_CHARACTER, GET_MEDIA } = require('../../../queries')
const { request } = require('graphql-request')

module.exports = {
  data: {
    name: 'character'
  },
  async execute (interaction: CommandInteraction, name: string, _title: undefined) {
    const embed = new EmbedBuilder()
    fetch(`https://animechan.vercel.app/api/quotes/character?name=${name}`)
      .then((res: { json: () => any }) => res.json())
      .then(async (quotes: Quote[]) => {
        const oneToMax = Math.floor(Math.random() * (Math.floor(quotes.length) - Math.ceil(1) + 1) + Math.ceil(1))
        const quoteToSend = quotes[oneToMax]
        const char = await request('https://graphql.anilist.co', GET_CHARACTER, { search: quoteToSend.character.normalize('NFD').replace(/[\u0300-\u036f]/g, '') })
        const media = await request('https://graphql.anilist.co', GET_MEDIA, { search: quoteToSend.anime.normalize('NFD').replace(/[\u0300-\u036f]/g, '') })
        embed
          .setColor('#55E3F1')
          .setTitle(`${quoteToSend.character} - `)
          .setDescription(`*${quoteToSend.quote}*`)
          .setThumbnail(char.Character.image.large)
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel(`${media.Media.title.romaji} on AniList`)
              .setURL(`${media.Media.siteUrl}`)
              .setStyle(ButtonStyle.Link)
          )
        await interaction.reply({embeds: [embed], components: [row]})
      })
      .catch((err: any) => {
        console.log(err)
        interaction.reply({ content: 'This character might not have any quotes listed yet! >_<', ephemeral: true })
      })
  }
}
