const Discord = require('discord.js')
const fs = require('fs')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')

module.exports = {
  name: 'watchparty',
  aliases: ['wp'],
	usage: '\nsuggest <anime title> \nset <anime title> \njoin {anime title} \nleave {anime title} \ndelete <anime title> \nlist',
  description: 'Manage watchparty members and subject.',
  async execute(msg, args) {
    let aliasjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliases = JSON.parse(aliasjson)
    let serversjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
    let allServers = JSON.parse(serversjson)
    const serverId = msg.guild.id

    let aliasIndex = allAliases.findIndex(x => Object.keys(x)[0] === serverId)
    if (aliasIndex === -1) {
      const newServer = {}
      newServer[serverId] = {}
      allAliases.push(newServer)
    }
    let serverIndex = allServers.findIndex(x => Object.keys(x)[0] === serverId)
    if (serverIndex === -1) {
      const newServer = {}
      newServer[serverId] = {
        'current': null,
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
    
    let currentAnime, currentId, animeIndex
    if (thisServer['current']) {
      currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, {search: thisServer['current']})
      currentId = currentAnime.Media.id
      animeIndex = list[currentId]
      if (!animeIndex) {
        const newAnime = []
        list[currentId] = newAnime
      }
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

    } else if (args[0] === 'suggest') {
      if (!args[1]) {
        msg.reply('Usage: `$watchparty suggest <anime title>`')
      } else {
        const title = args.splice(1, args.length).join(' ')
        const suggestedAnime = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
        if (suggestedAnime.Media.id in thisServer['list']) {
          msg.reply(`This anime has already been suggested. Use \`$watchparty set ${suggestedAnime.Media.title.romaji}\` to set this as the current anime.`)
        } else {
          currentId = suggestedAnime.Media.id
          animeIndex = list[currentId]
          if (!animeIndex) {
            const newAnime = []
            list[currentId] = newAnime
          }
          const embed = new Discord.MessageEmbed()
            .setColor(suggestedAnime.Media.coverImage.color)
            .setTitle('WP Suggestion')
            .setDescription(`[**${suggestedAnime.Media.title.romaji}**](${suggestedAnime.Media.siteUrl}) has been suggested as a watch-party subject.
              \nReact with a 👍 to enroll in the party.`)
            .setThumbnail(suggestedAnime.Media.coverImage.large)
            .setFooter(`Enrollments will end in 60 minutes.`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
            .setTimestamp()
          const prompt = await msg.reply({embeds: [embed]})
          let thisServerAliases = allAliases[aliasIndex][serverId]
          const authorId = `<@!${msg.author.id}>`
          const authorName = thisServerAliases[authorId]
          if (!(authorId in thisServerAliases)) {
            msg.reply('You have not yet been aliased to an AniList user. `$alias add <discord user> <anilist user>`')
          } else {
            list[currentId].push(authorName)
            serversjson = JSON.stringify(allServers)
            fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
            msg.author.send(`You've chosen to join the watch-party for ${suggestedAnime.Media.title.romaji}. Follow along in chat for updates on daily episodes/discussion threads!`)  
          }
          
          prompt.react('👍')
          const filter = async (reaction, user) => {
            if (!user.bot) {
              let refreshAlias = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
              let refreshAllAliases = JSON.parse(refreshAlias)

              const id = `<@!${user.id}>`
              let thisServerAliases = refreshAllAliases[aliasIndex][serverId]
              if (!(id in thisServerAliases)) {
                msg.reply('You have not yet been aliased to an AniList user. `$alias add <discord user> <anilist user>`')
              } else {
                const name = thisServerAliases[id] 
                if (!list[currentId].includes(name) && reaction.emoji.name === '👍' && !user.bot) {
                  list[currentId].push(name)
                  serversjson = JSON.stringify(allServers)
                  fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
                  user.send(`You've chosen to join the watch-party for ${suggestedAnime.Media.title.romaji}. Follow along in chat for updates on daily episodes/discussion threads!`)
              } else {
                const warning = await msg.reply(`You're already in this watchparty!`)
                setTimeout(() => warning.delete(), 5000)
              }
              }
            }
            return reaction.emoji.name === '👍' && !user.bot
          }
          const collector = prompt.createReactionCollector({ filter, time: 3600000 })
        }
      }
    } 
    
    else if (args[0] === 'list') {
      if (thisServer['list'] === {}) {
        msg.reply('No suggestions have been entered. Use `$watchparty suggest <anime title>`')
      } else {
        const embed = new Discord.MessageEmbed()
          .setTitle('WP List')
          .setFooter(`Requested by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
          .setColor('#74E6D6')
          .setTimestamp()
        let titles = []
          Object.keys(thisServer['list']).forEach(async (id, index) => {
          const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, {id: id})
          const addToTitles = (oneAnime.Media.title.romaji === thisServer['current']) ? `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl}) *` : `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl})`
          titles.push(addToTitles)
        })
        setTimeout(() => { 
          titles = titles.map(entry => ' - **' + entry + '**')
          embed.setDescription(`List of suggested anime: \n\n${titles.join('\n')}`)
        }, 500)

        msg.channel.sendTyping()
        setTimeout(() => msg.delete(), 1000)
        await setTimeout(() => msg.channel.send({embeds: [embed]}), 1000)
      }
    }

    else if (args[0] === 'join') {
      const id = `<@!${msg.author.id}>`
      let thisServerAliases = allAliases[aliasIndex][serverId]
      console.log('TSA', thisServerAliases)
      console.log('id', id)
      if (!(id in thisServerAliases)) {
        msg.reply('You have not yet been aliased to an AniList user. `$alias add <discord user> <anilist user>`')
      } else if (!args[1]) { // join the CURRENT anime
        if (thisServer['current'] === null) {
          msg.reply('There is no anime currently set. `$wp set <anime title>`')
        } else {
          const animeToJoin = await request('https://graphql.anilist.co', GET_MEDIA, {search: thisServer['current']})
          const animeToJoinId = animeToJoin.Media.id
          const authorAniName = thisServerAliases[id]
          if (list[animeToJoinId].includes(authorAniName)) {
            msg.reply('You are already in this watchparty!')
          } else {
            list[animeToJoinId].push(authorAniName)
            serversjson = JSON.stringify(allServers)
            msg.reply('You have joined the current watchparty.')
            fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
          }
        }
      } else {
        if (thisServer['current'] === null) {
          msg.reply('There is no anime currently set. `$wp set <anime title>`')
        } else {
          const animeToJoinTitle = args.splice(1, args.length).join(' ')
          const animeToJoin = await request('https://graphql.anilist.co', GET_MEDIA, {search: animeToJoinTitle})
          const animeToJoinId = animeToJoin.Media.id
          if (!animeToJoinId in thisServer['list']) {
            msg.reply('This anime has not yet been suggested. `$watchparty suggest <anime title>`')
          } else {
            const authorAniName = thisServerAliases[id]
            if (list[animeToJoinId].includes(authorAniName)) {
              msg.reply('You are already in this watchparty!')
            } else {
              list[animeToJoinId].push(authorAniName)
              serversjson = JSON.stringify(allServers)
              msg.reply(`You have joined the watchparty for **${animeToJoinTitle}**.`)
              fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
            }
          }
        }
      }
    }

    else if (args[0] === 'leave') {
      const id = `<@!${msg.author.id}>`
      let thisServerAliases = allAliases[aliasIndex][serverId]
      if (!id in thisServerAliases) {
        msg.reply('You have not yet been aliased to an AniList user. `$alias add <discord user> <anilist user>`')
      } else if (!args[1]) { // leave the CURRENT anime
        if (thisServer['current'] === null) {
          msg.reply('There is no anime currently set. `$wp set <anime title>`')
        } else {
          const animeToLeave = await request('https://graphql.anilist.co', GET_MEDIA, {search: thisServer['current']})
          const animeToLeaveId = animeToLeave.Media.id
          const authorAniName = thisServerAliases[id]
          if (list[animeToLeaveId].includes(authorAniName)) {
            const authorIndex = list[animeToLeaveId].findIndex(x => x === id)
            list[animeToLeaveId].splice(authorIndex, 1)
            serversjson = JSON.stringify(allServers)
            fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
            msg.reply('You have been removed from the current watchparty.')
          } else {
            msg.reply('You are not in the current watchparty.')
          }
        }
      } else {
        if (thisServer['current'] === null) {
          msg.reply('There is no anime currently set. `$wp set <anime title>`')
        } else {
          const animeToLeaveTitle = args.splice(1, args.length).join(' ')
          const animeToLeave = await request('https://graphql.anilist.co', GET_MEDIA, {search: animeToLeaveTitle})
          const animeToLeaveId = animeToLeave.Media.id
          if (!animeToLeaveId in thisServer['list']) {
            msg.reply('This anime has not yet been suggested. `$watchparty suggest <anime title>`')
          } else {
            const authorAniName = thisServerAliases[id]
            if (list[animeToLeaveId].includes(authorAniName)) {
              const authorIndex = list[animeToLeaveId].findIndex(x => x === id)
              list[animeToLeaveId].splice(authorIndex, 1)
              serversjson = JSON.stringify(allServers)
              fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
              msg.reply(`You have left the watchparty for **${animeToLeaveTitle}**.`)
            } else {
              msg.reply('You are not in this watchparty.')
            }
          }
        }
      }
    }

    else if (args[0] === 'delete') {
      const title = args.splice(1, args.length).join(' ')
      const anime = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
      const id = anime.Media.id
      if (!id in thisServer['list']) {
        msg.reply('This anime is not in the suggested list.')
      } else if (thisServer['current'] === anime.Media.title.romaji) {
        msg.reply('You cannot delete the current anime. Set a new anime first and then delete the desired one.')
      } else {
        console.log('list', list, 'id', id)
        delete list[id]
        serversjson = JSON.stringify(allServers)
        fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
        msg.reply(`${anime.Media.title.romaji} has been deleted from the suggested list.`)
      }
    }
    
    else if (args[0] === 'set') {
      if (!args[1]) {
        msg.reply('Usage: `$watchparty set <anime title>`')
      } else {
        const title = args.splice(1, args.length).join(' ')
        currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
        thisServer['episode'] = 1
        thisServer['episodesToday'] = null
        thisServer['thread'] = null
        thisServer['current'] = currentAnime.Media.title.romaji
        currentId = currentAnime.Media.id
        animeIndex = list[currentId]
        if (!animeIndex) {
          const newAnime = []
          list[currentId] = newAnime
        }
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`The upcoming watch-party will be on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl}).`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`Set by ${msg.author.username}`, `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`)
          .setTimestamp()
        msg.reply({embeds: [embed]})
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
      msg.channel.sendTyping()
      setTimeout(() => msg.delete(), 1000)
      await setTimeout(() => msg.channel.send({embeds: [embed]}), 500)
      } catch (err) {
        console.log('User failed to use $wp, sent usage help.')
        console.error(err)
        msg.reply('Usage: \n`$watchparty\nsuggest <anime title> \nset <anime title> \njoin {anime title} \nleave {anime title} \ndelete <anime title> \nlist`')
      }
    } 
  }
}