const fs = require('fs')
const { request } = require('graphql-request')
const { GET_MEDIA } = require('../queries')
const path = require('path')

module.exports = {
  name: 'ep',
  async execute(interaction) {
    let serversjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
    let allServers = JSON.parse(serversjson)
    const serverId = interaction.guildId
    let serverIndex = allServers.findIndex(x => Object.keys(x)[0] === serverId)
    let thisServer = allServers[serverIndex][serverId]
    let list = thisServer['list']
    let currentEpisode = thisServer['episode']
    let todayEp = thisServer['episodesToday']
    const currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, { search: thisServer['current'] })
    const sub = interaction.options.getSubcommand()
    const amount = interaction.options.getInteger('amount')

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
      const startingEp = thisServer['episode']
      thisServer['episodesToday'] = amount
      todayEp = thisServer['episodesToday']
      thisServer['episode'] = Number(currentEpisode) + Number(thisServer['episodesToday'])
      currentEpisode = thisServer['episode']
      const replyNum = (todayEp > 1) ? `episodes to **${startingEp}-${currentEpisode - 1}**` : `episode to **${currentEpisode - 1}**`
      await interaction.reply(`Setting today's ${replyNum} and creating discussion thread.`)
      const name = (todayEp > 1) ? `Episodes ${startingEp}-${currentEpisode - 1}` : `Episode ${currentEpisode - 1}`
      const thread = await interaction.channel.threads.create({
        name: `${currentAnime.Media.title.romaji} ${name}`,
        autoArchiveDuration: 1440,
        reason: 'Watch-party discussion thread for today\'s episodes'
      })
      if (thisServer['thread'] !== null) {
        const threadToRetire = interaction.channel.threads.cache.find(x => x.name === thisServer['thread'])
        await threadToRetire.setArchived(true)
      }
      thisServer['thread'] = thread.name
      interaction.channel.messages.fetch(thread.id).then(x => x.delete())
      serversjson = JSON.stringify(allServers)
      fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
    }
  }
}