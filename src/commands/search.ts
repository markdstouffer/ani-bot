// import types
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, HexColorString, Message, SlashCommandBuilder, SlashCommandStringOption, TextChannel } from 'discord.js'
import TurndownService from 'turndown'
import { AniMedia } from '../types'

const Discord = require('discord.js')
const { request } = require('graphql-request')
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
  async execute (interaction: ChatInputCommandInteraction) {
    const td: TurndownService = new Tds()
    const title: string | null = interaction.options.getString('title')
    const media: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
    const channel: TextChannel = interaction.channel as TextChannel
    if (media.Media.isAdult && !channel.nsfw) {
      interaction.reply({ content: `${media.Media.title.romaji} is an adult-themed anime, and this channel does not support NSFW content!`, ephemeral: true })
    } else {
      const description: string = (td.turndown(media.Media.description))
      const trimmedDesc: string = (description.length > 200) ? `${description.substring(0, 200).trim()}...` : `${description}`

      const generalFields = [
        {
          name: 'Avg. score: ',
          value: `${media.Media.averageScore}%`,
          inline: true
        },
        {
          name: '# of episodes: ',
          value: `${media.Media.episodes}`,
          inline: true
        },
        {
          name: 'Status: ',
          value: `\`${media.Media.status}\``,
          inline: true
        }
      ]

      const embed = new EmbedBuilder()
        .setColor(media.Media.coverImage.color as HexColorString)
        .setDescription(trimmedDesc)
        .setTitle(media.Media.title.romaji)
        .setThumbnail(media.Media.coverImage.large)
        .addFields(generalFields)
      media.Media.studios.nodes[0]
        ? embed.setFooter({ text: `${media.Media.format}, by ${media.Media.studios.nodes[0].name} • ${media.Media.season} ${media.Media.seasonYear}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
        : embed.setFooter({ text: `${media.Media.format} • ${media.Media.season} ${media.Media.seasonYear}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
      media.Media.genres[1]
        ? embed.addFields({ name: 'Genres: ', value: `${media.Media.genres[0]}, ${media.Media.genres[1]}`, inline: true })
        : embed.addFields({ name: 'Genre: ', value: `${media.Media.genres[0]}`, inline: true })
      media.Media.streamingEpisodes[0]
        ? embed.addFields({ name: 'Streaming: ', value: `[${media.Media.streamingEpisodes[0].site}](${media.Media.streamingEpisodes[0].url})`, inline: true })
        : embed.addFields({ name: 'Streaming: ', value: 'Torrent it!', inline: true })

      let full: boolean = false
      const swapDesc = () => {
        if (full) {
          embed.setDescription(trimmedDesc)
          row.components[0].setLabel('Show full description')
          row.setComponents(row.components)
          full = false
        } else {
          embed.setDescription(description)
          row.components[0].setLabel('Shorten description')
          row.setComponents(row.components)
          full = true
        }
      }

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('toggle')
            .setLabel('Show full description')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel(`${media.Media.title.romaji} on AniList`)
            .setURL(`${media.Media.siteUrl}`)
            .setStyle(ButtonStyle.Link)
        )

      interaction.reply({ embeds: [embed], components: [row] })
      setTimeout(() => {
        row.components[0].setDisabled(true)
        interaction.editReply({ components: [row] })
      }, 120000)

      const response: Message = await interaction.fetchReply()

      const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 })
      collector.on('collect', async (i: typeof Discord.Interaction) => {
        swapDesc()
        await i.update({ components: [row] })
        interaction.editReply({ embeds: [embed] })
      })
    }
  }
}
