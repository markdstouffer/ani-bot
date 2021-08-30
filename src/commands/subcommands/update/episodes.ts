import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from 'discord.js'
import { getAuthUser } from '../../../requests/anilist'
import { AniList, AniMedia } from '../../../types'
const { GET_MEDIALIST, GET_MEDIA } = require('../../../queries')
const { INCREMENT_EP } = require('../../../mutations')
const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')

module.exports = {
  data: {
    name: 'episodes'
  },
  async execute (interaction: CommandInteraction, discord: string, title: string, embed: MessageEmbed, reply: Message) {
    const anime: AniMedia = await client.request(GET_MEDIA, { search: title })

    const authUser = await getAuthUser(discord)
    const headers = authUser.headers
    const username = authUser.username

    try {
      const listEntry: AniList = await client.request(GET_MEDIALIST, { userName: username, mediaId: anime.Media.id })
      let currentProgress = listEntry.MediaList.progress
      const initialProgress = listEntry.MediaList.progress

      const math: MessageActionRow = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setLabel('-')
            .setCustomId('subtract')
            .setStyle('DANGER'),
          new MessageButton()
            .setLabel('+')
            .setCustomId('add')
            .setStyle('SUCCESS')
        )
      interaction.editReply({ embeds: [embed], components: [math] })

      const filter = async (i: MessageComponentInteraction) => {
        if (i.user.id !== interaction.user.id) {
          i.reply({ content: 'This button is not for you!', ephemeral: true })
        } else {
          if (i.customId === 'add') {
            const progToSet = currentProgress + 1
            if (progToSet > listEntry.MediaList.media.episodes) {
              i.reply({
                content: `You tried to set your ep. count for [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}) to ${progToSet}, but it only has ${listEntry.MediaList.media.episodes} episodes!`,
                ephemeral: true
              })
            } else {
              await client.request(INCREMENT_EP, { mediaId: anime.Media.id, progress: progToSet }, headers)
              embed.spliceFields(0, 1, { name: 'Progress:', value: `${progToSet}/${anime.Media.episodes}`, inline: true })
              currentProgress = progToSet
              i.deferUpdate()
              interaction.editReply({ embeds: [embed] })
            }
          } else if (i.customId === 'subtract') {
            if (currentProgress === 0) {
              i.reply({ content: 'You\'re already at 0!', ephemeral: true })
            } else {
              const progToSet = currentProgress - 1
              await client.request(INCREMENT_EP, { mediaId: anime.Media.id, progress: progToSet }, headers)
              embed.spliceFields(0, 1, { name: 'Progress:', value: `${progToSet}/${anime.Media.episodes}`, inline: true })
              currentProgress = progToSet
              i.deferUpdate()
              interaction.editReply({ embeds: [embed] })
            }
          }
        }
        return i.user.id === interaction.user.id
      }
      setTimeout(() => {
        interaction.deleteReply()
        if (currentProgress > initialProgress) {
          if ((initialProgress + 1) === currentProgress) {
            interaction.followUp(`<@${interaction.user.id}> watched episode ${currentProgress} of **${anime.Media.title.romaji}**`)
          } else {
            interaction.followUp(`<@${interaction.user.id}> watched episodes ${initialProgress + 1}-${currentProgress} of **${anime.Media.title.romaji}**`)
          }
        }
      }, 30000)
      reply.createMessageComponentCollector({ filter, componentType: 'BUTTON', time: 30000 })
    } catch (err) {
      console.error(err)
      console.error(username, 'failed to use /update episodes with query', title)
      interaction.reply({ content: `Command failed. Make sure you have an existing list entry for [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}).`, ephemeral: true })
    }
  }
}
