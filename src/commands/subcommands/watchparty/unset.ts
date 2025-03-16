import { ActionRowBuilder, CommandInteraction, ComponentType, StringSelectMenuBuilder } from 'discord.js'
import { AniMedia, Parties } from '../../../types'

const { request } = require('graphql-request')
const wait = require('util').promisify(setTimeout)
const { GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'unset'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    if (thisServerParty.server.current.length === 0) {
      await interaction.reply({content: 'There are currently no unsettable watch-party suggestions.', ephemeral: true})
    } else {
      const titles: string[] = []
      for (const obj of thisServerParty.server.current) {
        const oneAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: obj.title })
        const addToTitles = `${oneAnime.Media.title.romaji}`
        titles.push(addToTitles)
      }

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

      await interaction.reply({ content: 'Select a watch-party to remove as watching:', components: [row], ephemeral: true })

      const filter = async (i: any) => {
        if (i.user.id === interaction.user.id) {
          const titleToSet = i.values[0]
          thisServerParty.server.current = thisServerParty.server.current.filter(x => x.title !== titleToSet)
          thisServerParty.save()
          i.reply({ content: `**${titleToSet}** is no longer a current watch-party.` })
        }
        return i.user.id === interaction.user.id
      }
      interaction.channel!.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 15000 })
    }
  }
}
