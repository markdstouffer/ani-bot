import { ActionRowBuilder, CommandInteraction, ComponentType, Embed, Message, StringSelectMenuBuilder } from 'discord.js'
import { getAuthUser } from '../../../requests/anilist'
import { AniMedia } from '../../../types'
const { GET_MEDIA } = require('../../../queries')
const { RATE } = require('../../../mutations')
const { GraphQLClient } = require('graphql-request')
const client = new GraphQLClient('https://graphql.anilist.co')

module.exports = {
  data: {
    name: 'rate'
  },
  async execute (interaction: CommandInteraction, discord: string, title: string, embed: Embed, _reply: Message) {
    const anime: AniMedia = await client.request(GET_MEDIA, { search: title })

    const authUser = await getAuthUser(discord)
    const headers = authUser.headers
    let curScore: number = 0
    const ratings = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select')
          .setPlaceholder('Nothing selected')
          .addOptions([
            {
              label: '0',
              value: '0'
            },
            {
              label: '1',
              value: '1'
            },
            {
              label: '2',
              value: '2'
            },
            {
              label: '3',
              value: '3'
            },
            {
              label: '4',
              value: '4'
            },
            {
              label: '5',
              value: '5'
            },
            {
              label: '6',
              value: '6'
            },
            {
              label: '7',
              value: '7'
            },
            {
              label: '8',
              value: '8'
            },
            {
              label: '9',
              value: '9'
            },
            {
              label: '10',
              value: '10'
            }
          ])
      )
    await interaction.editReply({components: []})
    const menu = await interaction.followUp({ content: 'Select a rating', components: [ratings] }) as Message

    const filter = async (i: any) => {
      if (i.user.id !== interaction.user.id) {
        i.reply({ content: 'This menu is not for you!', ephemeral: true })
      } else {
        const score = Number(i.values[0])
        curScore = score
        await client.request(RATE, { mediaId: anime.Media.id, score: score }, headers)
        // embed.fields[1] = { name: 'Rating', value: `${score}/10`, inline: true }
        i.deferUpdate()
        await menu.delete()
        // interaction.editReply({ embeds: [embed] })
        setTimeout(() => {
          interaction.deleteReply()
          interaction.followUp(`<@${interaction.user.id}> gave **${anime.Media.title.romaji}** a ${curScore}/10.`)
        }, 5000)
      }
      return i.user.id === interaction.user.id
    }
    await menu.awaitMessageComponent({filter, componentType: ComponentType.StringSelect, time: 30000})
  }
}
