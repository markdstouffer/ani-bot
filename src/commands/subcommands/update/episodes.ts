import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, Embed, Message, MessageComponentInteraction } from 'discord.js'
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
  async execute (interaction: CommandInteraction, discord: string, title: string, embed: Embed, reply: Message) {
    const anime: AniMedia = await client.request(GET_MEDIA, { search: title })

    const authUser = await getAuthUser(discord)
    const headers = authUser.headers
    const username = authUser.username

    try {
      const listEntry: AniList = await client.request(GET_MEDIALIST, { userName: username, mediaId: anime.Media.id })
      let currentProgress = listEntry.MediaList.progress
      const initialProgress = listEntry.MediaList.progress

      const math = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('-')
            .setCustomId('subtract')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel('+')
            .setCustomId('add')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setLabel('Done!')
            .setCustomId('done')
            .setStyle(ButtonStyle.Secondary)
        )
      await interaction.editReply({embeds: [embed], components: [math]})

      let done: boolean = false
      const filter = async (i: MessageComponentInteraction) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({content: 'This button is not for you!', ephemeral: true})
        } else {
          if (i.customId === 'add') {
            const progToSet = currentProgress + 1
            if (progToSet > listEntry.MediaList.media.episodes) {
              await i.reply({
                content: `You tried to set your ep. count for [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}) to ${progToSet}, but it only has ${listEntry.MediaList.media.episodes} episodes!`,
                ephemeral: true
              })
            } else {
              await client.request(INCREMENT_EP, { mediaId: anime.Media.id, progress: progToSet }, headers)
              // embed.fields[0] = { name: 'Progress:', value: `${progToSet}/${anime.Media.episodes}`, inline: true }
              currentProgress = progToSet
              await i.deferUpdate()
              await interaction.editReply({embeds: [embed]})
            }
          } else if (i.customId === 'subtract') {
            if (currentProgress === 0) {
              await i.reply({content: 'You\'re already at 0!', ephemeral: true})
            } else {
              const progToSet = currentProgress - 1
              await client.request(INCREMENT_EP, { mediaId: anime.Media.id, progress: progToSet }, headers)
              // embed.fields[0] = { name: 'Progress:', value: `${progToSet}/${anime.Media.episodes}`, inline: true }
              currentProgress = progToSet
              await i.deferUpdate()
              await interaction.editReply({embeds: [embed]})
            }
          } else if (i.customId === 'done') {
            done = true
            await interaction.deleteReply()
            if (currentProgress > initialProgress) {
              if ((initialProgress + 1) === currentProgress) {
                await interaction.followUp(`<@${interaction.user.id}> watched episode ${currentProgress} of **${anime.Media.title.romaji}**`)
              } else {
                await interaction.followUp(`<@${interaction.user.id}> watched episodes ${initialProgress + 1}-${currentProgress} of **${anime.Media.title.romaji}**`)
              }
            }
          }
        }
        return i.user.id === interaction.user.id
      }
      setTimeout(() => {
        if (!done) {
          interaction.deleteReply()
          if (currentProgress > initialProgress) {
            if ((initialProgress + 1) === currentProgress) {
              interaction.followUp(`<@${interaction.user.id}> watched episode ${currentProgress} of **${anime.Media.title.romaji}**`)
            } else {
              interaction.followUp(`<@${interaction.user.id}> watched episodes ${initialProgress + 1}-${currentProgress} of **${anime.Media.title.romaji}**`)
            }
          }
        }
      }, 30000)
      reply.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30000 })
    } catch (err) {
      console.error(err)
      console.error(username, 'failed to use /update episodes with query', title)
      await interaction.reply({
        content: `Command failed. Make sure you have an existing list entry for [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}).`,
        ephemeral: true
      })
    }
  }
}
