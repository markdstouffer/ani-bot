import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, Embed, Message, MessageComponentInteraction } from 'discord.js'
import { getAuthUser } from '../../../requests/anilist'
import { AniMedia } from '../../../types'
const { GET_MEDIA } = require('../../../queries')
const { STATUS } = require('../../../mutations')
const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')

module.exports = {
  data: {
    name: 'status'
  },
  async execute (interaction: CommandInteraction, discord: string, title: string, _embed: Embed, reply: Message) {
    const anime: AniMedia = await client.request(GET_MEDIA, { search: title })
    const id = anime.Media.id
    const authUser = await getAuthUser(discord)
    const statusButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('WATCHING')
          .setCustomId('current')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setLabel('PAUSED')
          .setCustomId('paused')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('DROPPED')
          .setCustomId('dropped')
          .setStyle(ButtonStyle.Danger)
      )
    await interaction.editReply({components: [statusButtons]})
    const exited = (status: string) => {
      interaction.deleteReply()
      interaction.followUp({ content: `<@${discord}> set **${anime.Media.title.romaji}** to *${status}*.` })
    }

    let clicked: boolean = false
    const filter = async (i: MessageComponentInteraction) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({content: 'This button is not for you!', ephemeral: true})
      } else {
        if (i.customId === 'current') {
          await client.request(STATUS, { mediaId: id, status: 'CURRENT' }, authUser.headers)
          clicked = true
          await i.deferUpdate()
          await exited('WATCHING')
        } else if (i.customId === 'paused') {
          await client.request(STATUS, { mediaId: id, status: 'PAUSED' }, authUser.headers)
          clicked = true
          await i.deferUpdate()
          await exited('PAUSED')
        } else if (i.customId === 'dropped') {
          await client.request(STATUS, { mediaId: id, status: 'DROPPED' }, authUser.headers)
          clicked = true
          await i.deferUpdate()
          await exited('DROPPED')
        }
      }
      return i.user.id === interaction.user.id
    }
    setTimeout(() => {
      if (!clicked) {
        interaction.deleteReply()
        interaction.followUp({ content: 'You didn\'t select a status in time!', ephemeral: true })
      }
    }, 30000)
    reply.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30000 })
  }
}
