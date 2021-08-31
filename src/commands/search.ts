// import types
import { SlashCommandStringOption } from '@discordjs/builders'
import { CommandInteraction, Message, MessageActionRow, MessageEmbed, TextChannel } from 'discord.js'
import TurndownService from 'turndown'
import { AniMedia } from '../types'

const Discord = require('discord.js')
const { request } = require('graphql-request')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { GET_MEDIA } = require('../queries')
const Tds = require('turndown')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for an anime')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('title')
        .setDescription('Anime title')
        .setRequired(true)
    ),
  async execute (interaction: CommandInteraction) {
    const td: TurndownService = new Tds()
    const title: string | null = interaction.options.getString('title')
    const media: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
    const channel: TextChannel = interaction.channel as TextChannel
    if (media.Media.isAdult && !channel.nsfw) {
      interaction.reply({ content: `${media.Media.title.romaji} is an adult-themed anime, and this channel does not support NSFW content!`, ephemeral: true })
    } else {
      const description: string = (td.turndown(media.Media.description))
      const trimmedDesc: string = (description.length > 200) ? `${description.substring(0, 200).trim()}...` : `${description}`

      const embed: MessageEmbed = new Discord.MessageEmbed()
        .setColor(media.Media.coverImage.color)
        .setDescription(trimmedDesc)
        .setTitle(media.Media.title.romaji)
        .setThumbnail(media.Media.coverImage.large)
        .addField('Avg. score: ', `${media.Media.averageScore}%`, true)
        .addField('# of episodes: ', `${media.Media.episodes}`, true)
        .addField('Status: ', `\`${media.Media.status}\``, true)
      media.Media.studios.nodes[0]
        ? embed.setFooter(`${media.Media.format}, by ${media.Media.studios.nodes[0].name} • ${media.Media.season} ${media.Media.seasonYear}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
        : embed.setFooter(`${media.Media.format} • ${media.Media.season} ${media.Media.seasonYear}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
      media.Media.genres[1]
        ? embed.addField('Genres: ', `${media.Media.genres[0]}, ${media.Media.genres[1]}`, true)
        : embed.addField('Genre: ', `${media.Media.genres[0]}`, true)
      media.Media.streamingEpisodes[0]
        ? embed.addField('Streaming: ', `[${media.Media.streamingEpisodes[0].site}](${media.Media.streamingEpisodes[0].url})`, true)
        : embed.addField('Streaming: ', 'Torrent it!', true)

      let full: boolean = false
      function swapDesc () {
        if (full) {
          embed.setDescription(trimmedDesc)
          row.spliceComponents(0, 1, [
            new Discord.MessageButton()
              .setCustomId('toggle')
              .setLabel('Show full description')
              .setStyle('PRIMARY')
          ])
          full = false
        } else {
          embed.setDescription(description)
          row.spliceComponents(0, 1, [
            new Discord.MessageButton()
              .setCustomId('toggle')
              .setLabel('Shorten description')
              .setStyle('PRIMARY')
          ])
          full = true
        }
      }

      const row: MessageActionRow = new Discord.MessageActionRow()
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

      const response: Message = await interaction.fetchReply() as Message

      const collector = response.createMessageComponentCollector({ componentType: 'BUTTON', time: 120000 })
      collector.on('collect', async (i: typeof Discord.Interaction) => {
        swapDesc()
        await i.update({ components: [row] })
        interaction.editReply({ embeds: [embed] })
      })
    }
  }
}
