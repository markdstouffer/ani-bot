import { CommandInteraction, SelectMenuInteraction } from 'discord.js'
import { AniMedia, Parties } from '../../../types'

const Discord = require('discord.js')
const wait = require('util').promisify(setTimeout)
const { request } = require('graphql-request')
const { GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'delete'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    if (thisServerParty.server.list.length === 0) {
      interaction.reply({ content: 'There are currently no deletable watch-party suggestions.', ephemeral: true })
    } else {
      const oneId: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { id: thisServerParty.server.list[0].animeId })
      const oneTitle = oneId.Media.title.romaji
      const isCurrent = (thisServerParty.server.current.filter(c => c.title === oneTitle).length > 0)
      if (thisServerParty.server.list.length === 1 && isCurrent) {
        interaction.reply({ content: 'There are currently no deletable watch-party suggestions.', ephemeral: true })
      } else {
        const titles: string[] = []
        thisServerParty.server.list.forEach(async obj => {
          const oneAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
          const addToTitles = `${oneAnime.Media.title.romaji}`
          if (!(thisServerParty.server.current.filter(c => c.title === addToTitles).length > 0)) {
            titles.push(addToTitles)
          }
        })

        const row = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageSelectMenu()
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

        await interaction.reply({ content: 'Choose an anime to remove from the queue:', components: [row], ephemeral: true })

        const filter = async (i: SelectMenuInteraction) => {
          const titleToDelete = i.values[0]
          const anime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToDelete })
          const id = anime.Media.id
          const index = thisServerParty.server.list.findIndex(x => x.animeId === id)
          thisServerParty.server.list.splice(index, 1)
          thisServerParty.save()
          i.reply(`${i.user.username} has deleted **${anime.Media.title.romaji}** from the suggested list.`)

          return i.user.id === interaction.user.id
        }
        interaction.channel!.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
      }
    }
  }
}
