import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from 'discord.js'
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
  async execute (interaction: CommandInteraction, discord: string, title: string, _embed: MessageEmbed, reply: Message) {
    const anime: AniMedia = await client.request(GET_MEDIA, { search: title })
    const id = anime.Media.id
    const authUser = await getAuthUser(discord)
    const statusButtons: MessageActionRow = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setLabel('WATCHING')
          .setCustomId('current')
          .setStyle('SUCCESS'),
        new MessageButton()
          .setLabel('PAUSED')
          .setCustomId('paused')
          .setStyle('SECONDARY'),
        new MessageButton()
          .setLabel('DROPPED')
          .setCustomId('dropped')
          .setStyle('DANGER')
      )
    interaction.editReply({ components: [statusButtons] })
    const exited = (status: string) => {
      interaction.deleteReply()
      interaction.followUp({ content: `<@${discord}> set **${anime.Media.title.romaji}** to *${status}*.` })
    }

    let clicked: boolean = false
    const filter = async (i: MessageComponentInteraction) => {
      if (i.user.id !== interaction.user.id) {
        i.reply({ content: 'This button is not for you!', ephemeral: true })
      } else {
        if (i.customId === 'current') {
          await client.request(STATUS, { mediaId: id, status: 'CURRENT' }, authUser.headers)
          clicked = true
          i.deferUpdate()
          await exited('WATCHING')
        } else if (i.customId === 'paused') {
          await client.request(STATUS, { mediaId: id, status: 'PAUSED' }, authUser.headers)
          clicked = true
          i.deferUpdate()
          await exited('PAUSED')
        } else if (i.customId === 'dropped') {
          await client.request(STATUS, { mediaId: id, status: 'DROPPED' }, authUser.headers)
          clicked = true
          i.deferUpdate()
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
    reply.createMessageComponentCollector({ filter, componentType: 'BUTTON', time: 30000 })
  }
}
