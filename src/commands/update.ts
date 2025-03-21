// import types
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Collection, ComponentType, EmbedBuilder, Message, MessageComponentInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import { getAuthUser, isAuthenticated } from '../requests/anilist'
import { AniList, AniMedia } from '../types'
const { GET_MEDIALIST, GET_MEDIA } = require('../queries')
const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')
const fs = require('fs')
const path = require('path')
const subcommands = new Collection<any, any>()
const subFiles = fs.readdirSync(path.resolve(__dirname, './subcommands/update')).filter((file: string) => file.endsWith('.ts'))

for (const file of subFiles) {
  const command = require(`./subcommands/update/${file}`)
  subcommands.set(command.data.name, command)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Update an AniList entry (MUST BE AUTHENTICATED)')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('anime')
        .setDescription('Anime title')
        .setRequired(true)
    ),
  async execute (interaction: ChatInputCommandInteraction) {
    const discord = interaction.user.id
    const title = interaction.options.getString('anime')
    const anime: AniMedia = await client.request(GET_MEDIA, { search: title })
    const id = anime.Media.id
    if (await isAuthenticated(discord)) {
      const authUser = await getAuthUser(discord)
      const username = authUser.username
      try {
        const listEntry: AniList = await client.request(GET_MEDIALIST, { userName: username, mediaId: id })
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Episode Count')
              .setCustomId('episodes')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setLabel('Rating')
              .setCustomId('rate')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setLabel('Status')
              .setCustomId('status')
              .setStyle(ButtonStyle.Primary)
          )
        const embed = new EmbedBuilder()
          .setTitle(anime.Media.title.romaji)
          .setThumbnail(anime.Media.coverImage.large)
          .setDescription(`Update your AniList entry on [**${anime.Media.title.romaji}**](${anime.Media.siteUrl})`)
          .addFields({ name: 'Progress:', value: `${listEntry.MediaList.progress}/${anime.Media.episodes}`, inline: true })
        if (listEntry.MediaList.status === 'COMPLETED') {
          embed.addFields({ name: 'Rating:', value: `${listEntry.MediaList.score}/10`, inline: true })
        } else {
          embed.addFields({ name: 'Rating:', value: `${listEntry.MediaList.score}/10 (unfinished)`, inline: true })
        }

        await interaction.reply({embeds: [embed], components: [row]})
        const reply = await interaction.fetchReply() as Message

        const filter = async (i: MessageComponentInteraction) => {
          if (i.user.id !== interaction.user.id) {
            await i.reply({content: 'This button is not for you!', ephemeral: true})
          } else {
            await i.deferUpdate()
            await subcommands.get(i.customId).execute(interaction, discord, title, embed, reply)
          }
          return i.user.id === interaction.user.id
        }
        await reply.awaitMessageComponent({filter, componentType: ComponentType.Button, time: 30000})
      } catch {
        await interaction.reply({
          content: `Make sure you have an existing AniList entry for [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}).`,
          ephemeral: true
        })
      }
    } else {
      await interaction.reply({content: 'You are not authenticated! `/link`', ephemeral: true})
    }
  }
}
