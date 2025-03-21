// import types
import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import { getAuthUser, isAuthenticated } from '../requests/anilist'
import { AniList, AniMedia } from '../types'
const { GET_MEDIA, GET_MEDIALIST } = require('../queries')
const { DELETE } = require('../mutations')
const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete an anime from your AniList (MUST BE AUTHENTICATED)')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('anime')
        .setDescription('Anime title')
        .setRequired(true)
    ),
  async execute (interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString('anime')
    const discord = interaction.user.id
    if (await isAuthenticated(discord)) {
      const authUser = await getAuthUser(discord)
      try {
        const anime: AniMedia = await client.request(GET_MEDIA, { search: title })
        const listEntry: AniList = await client.request(GET_MEDIALIST, { userName: authUser.username, mediaId: anime.Media.id })
        const id = listEntry.MediaList.id
        await client.request(DELETE, { id: id }, authUser.headers)
        await interaction.reply({
          content: `${anime.Media.title.romaji} has been removed from your anime list.`,
          ephemeral: true
        })
      } catch {
        await interaction.reply({content: 'This anime is not currently in your anime list.', ephemeral: true})
      }
    } else {
      await interaction.reply({content: 'You are not authenticated. `/link`', ephemeral: true})
    }
  }
}
