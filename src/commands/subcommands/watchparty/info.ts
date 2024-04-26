import { ActionRowBuilder, CommandInteraction, ComponentType, EmbedBuilder, HexColorString, StringSelectMenuBuilder } from 'discord.js'
import { AniMedia, Parties } from '../../../types'

const wait = require('util').promisify(setTimeout)
const { request } = require('graphql-request')
const { GET_MEDIA } = require('../../../queries')

module.exports = {
  data: {
    name: 'info'
  },
  async execute (interaction: CommandInteraction, thisServerParty: Parties, _serverAliases: undefined, _serverExists: undefined) {
    if (thisServerParty.server.list.length === 0) {
      interaction.reply({ content: 'There are currently no watch-party suggestions. `/wp suggest`', ephemeral: true })
    } else {
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

      await interaction.reply({ content: 'Select a watch-party to view its information:', components: [row], ephemeral: true })

      const filter = async (i: any) => {
        if (i.user.id === interaction.user.id) {
          const titleToView = i.values[0]
          const anime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToView })
          const id = anime.Media.id

          const embed = new EmbedBuilder()
            .setColor(anime.Media.coverImage.color as HexColorString)
            .setTitle(`WP on ${anime.Media.title.romaji}`)
            .setDescription(`Information on the watch-party for [**${anime.Media.title.romaji}**](${anime.Media.siteUrl})`)
            .setThumbnail(anime.Media.coverImage.large)
            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
            .setTimestamp()

          const members = thisServerParty.server.list.find(x => x.animeId === id)!.members
          const joined = (members.length === 0) ? 'None' : members.map(x => '- ' + x + '\n').join('')
          embed.addFields({ name: 'Joined members:', value: joined })

          const currentlySet = (thisServerParty.server.current.filter(c => c.title === titleToView).length > 0) ? 'true' : 'false'
          embed.addFields({ name: 'Currently set?', value: currentlySet })

          i.reply({ embeds: [embed] })
        }
        return i.user.id === interaction.user.id
      }
      interaction.channel!.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 15000 })
    }
  }
}
