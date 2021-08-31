// import types
import { SlashCommandStringOption } from '@discordjs/builders'
import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from 'discord.js'

import { getAuthUser, isAuthenticated } from '../requests/anilist'
import { AniList, AniMedia } from '../types'
const { SlashCommandBuilder } = require('@discordjs/builders')
const { Collection } = require('discord.js')
const { GET_MEDIALIST, GET_MEDIA } = require('../queries')
const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')
const fs = require('fs')
const path = require('path')
const subcommands = new Collection()
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
  async execute (interaction: CommandInteraction) {
    const discord = interaction.user.id
    const title = interaction.options.getString('anime')
    const anime: AniMedia = await client.request(GET_MEDIA, { search: title })
    const id = anime.Media.id
    if (await isAuthenticated(discord)) {
      const authUser = await getAuthUser(discord)
      const username = authUser.username
      try {
        const listEntry: AniList = await client.request(GET_MEDIALIST, { userName: username, mediaId: id })
        const row: MessageActionRow = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setLabel('Episode Count')
              .setCustomId('episodes')
              .setStyle('PRIMARY'),
            new MessageButton()
              .setLabel('Rating')
              .setCustomId('rate')
              .setStyle('PRIMARY'),
            new MessageButton()
              .setLabel('Status')
              .setCustomId('status')
              .setStyle('PRIMARY')
          )
        const embed: MessageEmbed = new MessageEmbed()
          .setTitle(anime.Media.title.romaji)
          .setThumbnail(anime.Media.coverImage.large)
          .setDescription(`Update your AniList entry on [**${anime.Media.title.romaji}**](${anime.Media.siteUrl})`)
          .addField('Progress:', `${listEntry.MediaList.progress}/${anime.Media.episodes}`, true)
        if (listEntry.MediaList.status === 'COMPLETED') {
          embed.addField('Rating:', `${listEntry.MediaList.score}/10`, true)
        } else {
          embed.addField('Rating:', `${listEntry.MediaList.score}/10 (unfinished)`, true)
        }

        interaction.reply({ embeds: [embed], components: [row] })
        const reply = await interaction.fetchReply() as Message

        const filter = async (i: MessageComponentInteraction) => {
          if (i.user.id !== interaction.user.id) {
            i.reply({ content: 'This button is not for you!', ephemeral: true })
          } else {
            i.deferUpdate()
            await subcommands.get(i.customId).execute(interaction, discord, title, embed, reply)
          }
          return i.user.id === interaction.user.id
        }
        reply.awaitMessageComponent({ filter, componentType: 'BUTTON', time: 30000 })
      } catch {
        interaction.reply({ content: `Make sure you have an existing AniList entry for [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}).`, ephemeral: true })
      }
    } else {
      interaction.reply({ content: 'You are not authenticated! `/link`', ephemeral: true })
    }
  }
}
