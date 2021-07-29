const Discord = require('discord.js')
const fs = require('fs')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')

module.exports = {
  name: 'watchparty',
  aliases: ['wp'],
	usage: '\nadd [discord username] <anilist username> \nremove <anilist username>',
  description: 'Add or remove members, or show progress of all members of currently set anime.',
  async execute(msg, args) {
    let aliasjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliases = JSON.parse(aliasjson)
    let serversjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
    let allServers = JSON.parse(serversjson)
    const serverId = msg.guild.id

    let aliasIndex = allAliases.findIndex(x => Object.keys(x)[0] === serverId)
    let serverIndex = allServers.findIndex(x => Object.keys(x)[0] === serverId)
    if (serverIndex === -1) {
      const newServer = {}
      newServer[serverId] = {
        'current': 'Attack on Titan',
        'episode': 1,
        'thread': null,
        'episodesToday': null,
        'list': {}
      }
      allServers.push(newServer)
    }
    serverIndex = allServers.findIndex(x => Object.keys(x)[0] === serverId)

    let thisServer = allServers[serverIndex][serverId]
    let list = thisServer['list']
    
    let currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, {search: thisServer['current']})
    let currentId = currentAnime.Media.id
    let animeIndex = list[currentId]
    if (!animeIndex) {
      const newAnime = []
      list[currentId] = newAnime
    }
    
    if (args[0] === 'add') {
      let name
      if (args[1].startsWith('<')) {
        let thisServerAliases = allAliases[aliasIndex][serverId]
        name = thisServerAliases[args[1]]
        list[currentId].push(name)
        if (!name) {
          msg.reply('This user has not been aliased. `$help alias`')
        } else {
          serversjson = JSON.stringify(allServers)
          fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
          msg.reply(`Added ${args[1]} to the watch-party.`)
        }
      } else {
        list[currentId].push(args[1])
        serversjson = JSON.stringify(allServers)
        fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
        msg.reply(`Added ${args[1]} to the watch-party.`)
      }
    } else if (args[0] === 'remove') {
      const indexToRemove = list[currentId].findIndex(x => args[1].toLowerCase() === x.toLowerCase())
      if (indexToRemove > -1) {
        list[currentId].splice(indexToRemove, 1)
        serversjson = JSON.stringify(allServers)
        fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
        msg.reply(`${args[1]} has been removed from the watch-party.`)
      } else {
        msg.reply(`${args[1]} is not in this watch-party.`)
      }
    } else if (args[0] === 'set') {
      if (!args[1]) {
        msg.reply('Usage: `$watchparty set <anime title>`')
      } else {
        const title = args.splice(1, args.length).join(' ')
        thisServer['current'] = title
        currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, {search: thisServer['current']})
        currentId = currentAnime.Media.id
        animeIndex = list[currentId]
        if (!animeIndex) {
          const newAnime = []
          list[currentId] = newAnime
        }
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`The upcoming watch-party will be on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})
            \nReact with a 👍 to enroll in the party.\n`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`Enrollments will end in 60 minutes.`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
          .setTimestamp()
        const prompt = await msg.reply({embeds: [embed]})
        prompt.react('👍')
        const filter = async (reaction, user) => {
          if (!user.bot) {
            const id = `<@!${user.id}>`
            let thisServerAliases = allAliases[aliasIndex][serverId]
            const name = thisServerAliases[id]
            list[currentId].push(name)
            serversjson = JSON.stringify(allServers)
            fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
            user.send(`You've chosen to join the watch-party for ${title}. Follow along in chat for updates on daily episodes/discussion threads!`)
          }
          return reaction.emoji.name === '👍' && !user.bot
        }
        const collector = prompt.createReactionCollector({ filter, time: 3600000 })
      }
      serversjson = JSON.stringify(allServers)
      fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
    } 
    
    else {
      try {
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`Progress on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`requested by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
          .setTimestamp()
        
        list[currentId].forEach(async x => {
          const user = await request('https://graphql.anilist.co', GET_USERINFO, {name: x})
          try {
            const list = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user.User.name, mediaId: currentAnime.Media.id})
            const episodes = list.MediaList.progress
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          } catch {
            const episodes = 0
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          }
        }) 
        
      setTimeout(() => msg.delete(), 1000)
      await setTimeout(() => msg.channel.send({embeds: [embed]}), 500)
      } catch (err) {
        console.error(err)
        msg.reply('Usage: \n`$watchparty\nadd <anilist username> [discord username] \nremove <anilist username> \n<anime title>`')
      }
    } 
  }
}