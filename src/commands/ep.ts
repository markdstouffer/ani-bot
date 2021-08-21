// import types
import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { CommandInteraction, TextChannel } from 'discord.js'
import { AniMedia, Parties } from '../types'

const { request } = require('graphql-request')
const { GET_MEDIA } = require('../queries')
const { SlashCommandBuilder } = require('@discordjs/builders')

const conn = require('../connections/anidata_conn')
const Party = conn.models.Party

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ep')
    .setDescription('Check or set current watch-party assigned episodes')
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('today')
        .setDescription('View today\'s assigned episodes')
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('next')
        .setDescription('Increment episodes and create a discussion thread')
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Amount of episodes to assign')
            .setRequired(true)
        )
    ),
  async execute (interaction: CommandInteraction) {
    const sub = interaction.options.getSubcommand()
    const amount = interaction.options.getInteger('amount')
    const serverId = interaction.guildId
    const query = { 'server.serverId': serverId }
    const countPartyServerDocs: number = await Party.find(query).limit(1).countDocuments()
    const partyServerExists = (countPartyServerDocs > 0)
    const thisServerParty: Parties = await Party.findOne(query)

    if (!partyServerExists) {
      interaction.reply('There is no current watchparty. `/watchparty suggest`')
    } else {
      const currentAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: thisServerParty.server.current })
      let currentEpisode = thisServerParty.server.episode
      let todayEp = thisServerParty.server.episodesToday

      if (sub === 'today') {
        if (!todayEp) {
          interaction.reply('Today\'s episodes have not yet been set. `$episode next <# of episodes>`')
        } else {
          if (todayEp > 1) {
            interaction.reply(`Today's episodes are **${currentEpisode - todayEp}-${currentEpisode - 1}**.`)
          } else {
            interaction.reply(`Today's episode is **${currentEpisode - 1}**.`)
          }
        }
      } else if (sub === 'next') {
        if (thisServerParty.server.current) {
          const channel: TextChannel = interaction.channel as TextChannel
          const startingEp = thisServerParty.server.episode
          thisServerParty.server.episodesToday = amount
          thisServerParty.server.episode = Number(currentEpisode) + Number(amount)
          thisServerParty.save()
          todayEp = thisServerParty.server.episodesToday
          currentEpisode = thisServerParty.server.episode
          const replyNum = (todayEp! > 1) ? `episodes to **${startingEp}-${currentEpisode - 1}**` : `episode to **${currentEpisode - 1}**`
          await interaction.reply(`Setting today's ${replyNum} and creating discussion thread.`)
          const name = (todayEp! > 1) ? `Episodes ${startingEp}-${currentEpisode - 1}` : `Episode ${currentEpisode - 1}`
          const thread = await channel.threads.create({
            name: `${currentAnime.Media.title.romaji} ${name}`,
            autoArchiveDuration: 1440,
            reason: 'Watch-party discussion thread for today\'s episodes'
          })
          if (thisServerParty.server.thread !== null) {
            const threadToRetire = channel.threads.cache.find(x => x.name === thisServerParty.server.thread)
            if (threadToRetire) {
              await threadToRetire.setArchived(true)
            }
          }
          thisServerParty.server.thread = thread.name
          channel.messages.fetch(thread.id).then(x => x.delete())
          thisServerParty.save()
        } else {
          interaction.reply({ content: 'There is no watch-party currently set. `/wp set`', ephemeral: true })
        }
      }
    }
  }
}
