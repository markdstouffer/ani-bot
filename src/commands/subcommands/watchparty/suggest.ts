import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, HexColorString, Message, MessageComponentInteraction } from 'discord.js'
import TurndownService from 'turndown'
import { Aliases, AniMedia, Parties } from '../../../types'

const { request } = require('graphql-request')
const { GET_MEDIA } = require('../../../queries')
const Tds = require('turndown')

const conn = require('../../../connections/anidata_conn')
const Alias = conn.models.Alias

module.exports = {
  data: {
    name: 'suggest'
  },
  async execute (interaction: ChatInputCommandInteraction, thisServerParty: Parties, serverAliases: Aliases, serverExists: boolean) {
    const serverId = interaction.guildId
    const title = interaction.options.getString('title')
    const suggestedAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
    const animeId = suggestedAnime.Media.id
    const found = thisServerParty.server.list.find(x => x.animeId === animeId)

    if (found) {
      await interaction.reply({
        content: 'This anime has already been suggested. Use `/watchparty set` to set this as the current anime.',
        ephemeral: true
      })
    } else {
      const newAnime = {
        animeId: animeId,
        members: []
      }
      thisServerParty.server.list.push(newAnime)
      thisServerParty.save()

      const embed = new EmbedBuilder()
        .setColor(suggestedAnime.Media.coverImage.color as HexColorString)
        .setTitle('WP Suggestion')
        .setDescription(`[**${suggestedAnime.Media.title.romaji}**](${suggestedAnime.Media.siteUrl}) has been suggested as a watch-party subject.
            \nClick the button to enroll in the party.`)
        .setThumbnail(suggestedAnime.Media.coverImage.large)
        .setFooter({ text: 'Enrollments will end in 60 minutes.', iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
        .setTimestamp()

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId('join')
            .setLabel(`Join ${suggestedAnime.Media.title.romaji}`),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId('info')
            .setLabel('View description')
        )

      await interaction.reply({ embeds: [embed], components: [row] })
      const prompt: Message = await interaction.fetchReply() as Message

      // ADD THE SUGGESTER TO THE WP BY DEFAULT - if they are aliased.
      if (serverExists) {
        const userList = serverAliases.server.users
        const authorId = `<@${interaction.user.id}>`
        const user = userList.find(x => x.userId === authorId)
        if (user) {
          const anilist = user.username
          thisServerParty.server.list.find(x => x.animeId === animeId)!.members.push(anilist)
          thisServerParty.save()
          await interaction.user.send(`You've chosen to join the watch-party for ${suggestedAnime.Media.title.romaji}. Follow along in chat for updates on daily episodes/discussion threads!`)
        } else {
          console.log('Unaliased user created a watch-party.')
        }
      } else {
        console.log('Unaliased user created a watch-party.')
      }

      const filter = async (i: MessageComponentInteraction) => {
        if (i.customId === 'join') {
          // refresh database in case someone has added an alias after collector was initiated.
          const countServerDocs = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
          serverExists = (countServerDocs > 0)
          serverAliases = await Alias.findOne({ 'server.serverId': serverId })

          if (!serverExists) {
            console.log('failed at !serverExists')
            await i.reply({content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true})
          } else {
            const id = `<@${i.user.id}>`
            const userList = serverAliases.server.users
            const user = userList.find(x => x.userId === id)
            if (!user) {
              console.log('failed at !user')
              await i.reply({
                content: 'You have not yet been aliased to an AniList user. `/alias add`',
                ephemeral: true
              })
            } else {
              const name = user.username
              if (!thisServerParty.server.list.find(x => x.animeId === animeId)!.members.includes(name)) {
                thisServerParty.server.list.find(x => x.animeId === animeId)!.members.push(name)
                thisServerParty.save()
                await i.user.send(`You've chosen to join the watch-party for ${suggestedAnime.Media.title.romaji}. Follow along in chat for updates on daily episodes/discussion threads!`)
              } else {
                await i.reply({ content: 'You\'re already in this watch-party!', ephemeral: true })
              }
            }
          }
        } else if (i.customId === 'info') {
          const td: TurndownService = new Tds()
          const description: string = (td.turndown(suggestedAnime.Media.description))
          await i.reply({content: description, ephemeral: true})
        }
        return true
      }
      prompt.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 3600000 })
    }
  }
}
