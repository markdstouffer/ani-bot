const { request } = require('graphql-request')
const { GET_MEDIA } = require('../queries')
const { SlashCommandBuilder } = require('@discordjs/builders')

const conn = require('../connections/anidata_conn')
const Party = conn.models.Party

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ep')
    .setDescription('Check or set current watch-party assigned episodes')
    .addSubcommand(subcommand =>
      subcommand
        .setName('today')
        .setDescription('View today\'s assigned episodes')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('next')
        .setDescription('Increment episodes and create a discussion thread')
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Amount of episodes to assign')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand()
    const amount = interaction.options.getInteger('amount')
    const serverId = interaction.guildId
    const query = { 'server.serverId': serverId }
    let countPartyServerDocs = await Party.find(query).limit(1).countDocuments()
    let partyServerExists = (countPartyServerDocs > 0)
    let thisServerParty = await Party.findOne(query)

    if (!partyServerExists) {
      interaction.reply('There is no current watchparty. `/watchparty suggest`')
    } else {
      const currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, { search: thisServerParty.server.current })
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
        const startingEp = thisServerParty.server.episode
        thisServerParty.server.episodesToday = amount
        thisServerParty.server.episode = Number(currentEpisode) + Number(amount)
        thisServerParty.save()
        todayEp = thisServerParty.server.episodesToday
        currentEpisode = thisServerParty.server.episode
        const replyNum = (todayEp > 1) ? `episodes to **${startingEp}-${currentEpisode - 1}**` : `episode to **${currentEpisode - 1}**`
        await interaction.reply(`Setting today's ${replyNum} and creating discussion thread.`)
        const name = (todayEp > 1) ? `Episodes ${startingEp}-${currentEpisode - 1}` : `Episode ${currentEpisode - 1}`
        const thread = await interaction.channel.threads.create({
          name: `${currentAnime.Media.title.romaji} ${name}`,
          autoArchiveDuration: 1440,
          reason: 'Watch-party discussion thread for today\'s episodes'
        })
        if (thisServerParty.server.thread !== null) {
          const threadToRetire = interaction.channel.threads.cache.find(x => x.name === thisServerParty.server.thread)
          await threadToRetire.setArchived(true)
        }
        thisServerParty.server.thread = thread.name
        interaction.channel.messages.fetch(thread.id).then(x => x.delete())
        thisServerParty.save()
      }
    }
  }
}