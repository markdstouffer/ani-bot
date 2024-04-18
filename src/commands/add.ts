// import types
import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import { getAuthUser, isAuthenticated } from '../requests/anilist'
import { AniMedia } from '../types'
const { GET_MEDIA } = require('../queries')
const { ADD } = require('../mutations')
const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add an anime to your AniList (MUST BE AUTHENTICATED)')
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
      const headers = authUser.headers
      try {
        const anime: AniMedia = await client.request(GET_MEDIA, { search: title })
        const id = anime.Media.id
        await client.request(ADD, { mediaId: id }, headers)
        interaction.reply({ content: `<@${discord}> added [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}) to their anime list.` })
      } catch (err) {
        console.error(err)
        interaction.reply({ content: 'Error - does this anime exist on AniList?', ephemeral: true })
      }
    } else {
      interaction.reply({ content: 'You are not authenticated! `/link`', ephemeral: true })
    }
  }
}
