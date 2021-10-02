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
        .setDescription('View today\'s assigned episodes for a given WP')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
    )
    .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
      sub
        .setName('next')
        .setDescription('Increment episodes and create a discussion thread for a given WP')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
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
    const title = interaction.options.getString('title')
    const serverId = interaction.guildId
    const query = { 'server.serverId': serverId }
    const countPartyServerDocs: number = await Party.find(query).limit(1).countDocuments()
    const partyServerExists = (countPartyServerDocs > 0)
    const thisServerParty: Parties = await Party.findOne(query)

    if (!partyServerExists || thisServerParty.server.current.length === 0) {
      interaction.reply('There is no current watchparty. `/watchparty suggest`')
    } else {
      const currentAnime: AniMedia = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
      let current = thisServerParty.server.current.find(c => c.title === currentAnime.Media.title.romaji)
      if (current) {
        let currentEpisode = current.episode
        let todayEp = current.episodesToday

        if (sub === 'today') {
          if (!todayEp) {
            interaction.reply('Today\'s episodes have not yet been set. `$episode next <title> <# of episodes>`')
          } else {
            if (todayEp > 1) {
              interaction.reply(`Today's **${current!.title}** episodes are **${currentEpisode - todayEp}-${currentEpisode - 1}**.`)
            } else {
              interaction.reply(`Today's **${current!.title}** episode is **${currentEpisode - 1}**.`)
            }
          }
        } else if (sub === 'next') {
          const channel: TextChannel = interaction.channel as TextChannel
          const startingEp = current.episode
          current.episodesToday = amount
          current.episode = Number(currentEpisode) + Number(amount)
          thisServerParty.save()
          current = thisServerParty.server.current.find(c => c.title === currentAnime.Media.title.romaji)
          todayEp = current!.episodesToday
          currentEpisode = current!.episode
          const replyNum = (todayEp! > 1) ? `episodes to **${startingEp}-${currentEpisode - 1}**` : `episode to **${currentEpisode - 1}**`
          await interaction.reply(`Setting today's **${current!.title}** ${replyNum} and creating discussion thread.`)
          const name = (todayEp! > 1) ? `Episodes ${startingEp}-${currentEpisode - 1}` : `Episode ${currentEpisode - 1}`
          const thread = await channel.threads.create({
            name: `${currentAnime.Media.title.romaji} ${name}`,
            autoArchiveDuration: 1440,
            reason: `Watch-party discussion thread for today's episodes of ${current!.title}`
          })
          if (current!.thread !== null) {
            const threadToRetire = channel.threads.cache.find(x => x.name === current!.thread)
            if (threadToRetire) {
              await threadToRetire.setArchived(true)
            }
          }
          current!.thread = thread.name
          channel.messages.fetch(thread.id).then(x => x.delete())
          thisServerParty.save()
        }
      } else {
        interaction.reply({ content: 'This anime is not currently set, `/wp set`', ephemeral: true })
      }
    }
  }
}
