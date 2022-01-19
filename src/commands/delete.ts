// allows users to delete anime from their AniList viewing activity
// requires prior AniList authentication

// import types
import { SlashCommandStringOption } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { getAuthUser, isAuthenticated } from '../requests/anilist'
import { AniList, AniMedia } from '../types'
const { SlashCommandBuilder } = require('@discordjs/builders')
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
  async execute (interaction: CommandInteraction) {
    const title = interaction.options.getString('anime')
    const discord = interaction.user.id
    if (await isAuthenticated(discord)) {
      const authUser = await getAuthUser(discord) // grab token and AniList username from Auth collection
      try {
        const anime: AniMedia = await client.request(GET_MEDIA, { search: title })
        const listEntry: AniList = await client.request(GET_MEDIALIST, { userName: authUser.username, mediaId: anime.Media.id })
        const id = listEntry.MediaList.id
        await client.request(DELETE, { id: id }, authUser.headers) // mutation - delete from AniList viewing activity
        interaction.reply({ content: `${anime.Media.title.romaji} has been removed from your anime list.`, ephemeral: true })
      } catch {
        interaction.reply({ content: 'This anime is not currently in your anime list.', ephemeral: true })
      }
    } else {
      interaction.reply({ content: 'You are not authenticated. `/link`', ephemeral: true })
    }
  }
}
