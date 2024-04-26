import { ActionRowBuilder, CommandInteraction, ComponentType, StringSelectMenuBuilder } from 'discord.js'
import { Aliases, AniMedia, Parties } from '../../../types'

const wait = require('util').promisify(setTimeout)
const { request } = require('graphql-request')
const { GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'leave'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, serverAliases: Aliases, serverExists: boolean) {
    const id = `<@${interaction.user.id}>`
    if (serverExists) {
      const userList = serverAliases.server.users
      const user = userList.find(x => x.userId === id)
      if (user) {
        if (thisServerParty.server.list.length === 0) {
          interaction.reply({ content: 'There are no leaveable watch-parties at the moment.', ephemeral: true })
        } else {
          const authorAniName = user.username
          const titles: string[] = []
          thisServerParty.server.list.forEach(async obj => {
            const oneAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
            const addToTitles = `${oneAnime.Media.title.romaji}`
            titles.push(addToTitles)
          })

          const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('select')
                .setPlaceholder('Nothing selected')
            )
          await wait(1000)

          titles.forEach(title => {
            row.components[0].addOptions({
              value: title,
              label: title
            })
          })

          await interaction.reply({ content: 'Select a watch-party to leave:', components: [row], ephemeral: true })

          const filter = async (i: any) => {
            if (i.user.id === interaction.user.id) {
              const titleToLeave = i.values[0]
              const anime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToLeave })
              const animeId = anime.Media.id
              if (thisServerParty.server.list.find(x => x.animeId === animeId)!.members.includes(authorAniName)) {
                const authorIndex = thisServerParty.server.list.find(x => x.animeId === animeId)!.members.findIndex(x => x === authorAniName)
                thisServerParty.server.list.find(x => x.animeId === animeId)!.members.splice(authorIndex, 1)
                thisServerParty.save()
                i.reply({ content: `You have left the watch-party for **${titleToLeave}**`, ephemeral: true })
              } else {
                i.reply({ content: 'You are not in this watch-party.', ephemeral: true })
              }
              return i.user.id === interaction.user.id
            }
            return i.user.id === interaction.user.id
          }
          interaction.channel!.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 15000 })
        }
      } else {
        interaction.reply({ content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true })
      }
    } else {
      interaction.reply({ content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true })
    }
  }
}
