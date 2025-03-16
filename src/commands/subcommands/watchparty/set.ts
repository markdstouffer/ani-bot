import { ActionRowBuilder, CommandInteraction, ComponentType, EmbedBuilder, HexColorString, StringSelectMenuBuilder } from 'discord.js'
import { AniMedia, Parties } from '../../../types'

const { request } = require('graphql-request')
const wait = require('util').promisify(setTimeout)
const { GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'set'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    if (thisServerParty.server.list.length === 0) {
      await interaction.reply({content: 'There are currently no settable watch-party suggestions.', ephemeral: true})
    } else {
      const oneId: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { id: thisServerParty.server.list[0].animeId })
      const oneTitle = oneId.Media.title.romaji
      const isCurrent = (thisServerParty.server.current.filter(c => c.title === oneTitle).length > 0)
      if (thisServerParty.server.list.length === 1 && isCurrent) {
        await interaction.reply({content: 'There are currently no settable watch-party suggestions.', ephemeral: true})
      } else {
        const titles: string[] = []
        for (const obj of thisServerParty.server.list) {
          const oneAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
          const addToTitles = `${oneAnime.Media.title.romaji}`
          if (!(thisServerParty.server.current.filter(c => c.title === addToTitles).length > 0)) {
            titles.push(addToTitles)
          }
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

        await interaction.reply({ content: 'Select a watch-party to set as watching:', components: [row], ephemeral: true })

        const filter = async (i: any) => {
          if (i.user.id === interaction.user.id) {
            const titleToSet = i.values[0]
            const anime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToSet })
            const newCurrent = {
              title: anime.Media.title.romaji,
              episode: 1,
              episodesToday: null,
              thread: null
            }
            thisServerParty.server.current.push(newCurrent)
            thisServerParty.save()
            const embed = new EmbedBuilder()
              .setColor(anime.Media.coverImage.color as HexColorString)
              .setTitle('Watch Party')
              .setDescription(`An upcoming watch-party will be on [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}).`)
              .setThumbnail(anime.Media.coverImage.large)
              .setFooter({ text: `Set by ${interaction.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
              .setTimestamp()
            i.reply({ embeds: [embed] })
          }
          return i.user.id === interaction.user.id
        }
        interaction.channel!.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 15000 })
      }
    }
  }
}
