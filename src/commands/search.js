const Discord = require('discord.js')
const { request } = require('graphql-request')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { GET_MEDIA } = require('../queries')
const TurndownService = require('turndown')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for an anime')
    .addStringOption(opt =>
      opt
        .setName('title')
        .setDescription('Anime title')
        .setRequired(true)
    ),
  async execute(interaction) {
    const td = new TurndownService()
    const title = interaction.options.getString('title')
    const media = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
    if (media.Media.isAdult && !interaction.channel.nsfw) {
      interaction.reply({ content: `${media.Media.title.romaji} is an adult-themed anime, and this channel does not support NSFW content!`, ephemeral: true })
    } else {
      const description = (td.turndown(media.Media.description))
      const trimmedDesc = (description.length > 200) ? `${description.substring(0, 200).trim()}...` : `${description}`

      const embed = new Discord.MessageEmbed()
        .setColor(media.Media.coverImage.color)
        .setDescription(trimmedDesc)
        .setTitle(media.Media.title.romaji)
        .setThumbnail(media.Media.coverImage.large)
        .addField('Avg. score: ', `${media.Media.averageScore}\%`, true)
        .addField('# of episodes: ', `${media.Media.episodes}`, true)
        .addField('Status: ', `\`${media.Media.status}\``, true)
        .setFooter(`${media.Media.format}, by ${media.Media.studios.nodes[0].name} • ${media.Media.season} ${media.Media.seasonYear}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
      media.Media.genres[1]
        ? embed.addField('Genres: ', `${media.Media.genres[0]}, ${media.Media.genres[1]}`, true)
        : embed.addField('Genre: ', `${media.Media.genres[0]}`, true)
      media.Media.streamingEpisodes[0]
        ? embed.addField('Streaming: ', `[${media.Media.streamingEpisodes[0].site}](${media.Media.streamingEpisodes[0].url})`, true)
        : embed.addField('Streaming: ', `Torrent it!`, true)

      let full = false
      function swapDesc() {
        if (full) {
          embed.setDescription(trimmedDesc)
          row.components[0].setLabel('Show full description')
          full = false
        } else {
          embed.setDescription(description)
          row.components[0].setLabel('Shorten description')
          full = true
        }
      }

      const row = new Discord.MessageActionRow()
        .addComponents(
          new Discord.MessageButton()
            .setCustomId('toggle')
            .setLabel('Show full description')
            .setStyle('PRIMARY'),
          new Discord.MessageButton()
            .setLabel(`${media.Media.title.romaji} on AniList`)
            .setURL(`${media.Media.siteUrl}`)
            .setStyle('LINK')
        )

      interaction.reply({ embeds: [embed], components: [row] })
      setTimeout(() => {
        row.components[0].setDisabled(true)
        interaction.editReply({ components: [row] })
      }, 120000)

      const response = await interaction.fetchReply()

      const collector = response.createMessageComponentCollector({ componentType: 'BUTTON', time: 120000 })
      collector.on('collect', async i => {
        swapDesc()
        await i.update({ components: [row] })
        interaction.editReply({ embeds: [embed] })
      })

    }
  }
}
