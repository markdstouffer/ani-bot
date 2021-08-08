const Discord = require('discord.js')
const fs = require('fs')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')
const wait = require('util').promisify(setTimeout)

module.exports = {
  name: 'wp',
  async execute(interaction) {
    let aliasjson = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliases = JSON.parse(aliasjson)
    let serversjson = fs.readFileSync(path.resolve(__dirname, '../data/party.json'), 'utf-8')
    let allServers = JSON.parse(serversjson)
    const serverId = interaction.guildId
    const sub = interaction.options.getSubcommand()
    const title = interaction.options.getString('title')

    let aliasIndex = allAliases.findIndex(x => Object.keys(x)[0] === serverId)
    if (aliasIndex === -1) {
      const newServer = {}
      newServer[serverId] = {}
      allAliases.push(newServer)
    }
    aliasIndex = allAliases.findIndex(x => Object.keys(x)[0] === serverId)

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
      currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, { search: thisServer['current'] })
      currentId = currentAnime.Media.id
      animeIndex = list[currentId]
      if (!animeIndex) {
        const newAnime = []
        list[currentId] = newAnime
      }
    }

    if (sub === 'suggest') {
      console.log('title', title)
      const suggestedAnime = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
      console.log('suggestedAnime', suggestedAnime.Media.title)
      if (suggestedAnime.Media.id in thisServer['list']) {
        interaction.reply('This anime has already been suggested. Use `/watchparty set` to set this as the current anime.')
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
              \nClick the button to enroll in the party.`)
          .setThumbnail(suggestedAnime.Media.coverImage.large)
          .setFooter(`Enrollments will end in 60 minutes.`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
          .setTimestamp()

        const row = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageButton()
              .setStyle('PRIMARY')
              .setCustomId('primary')
              .setLabel(`Join ${suggestedAnime.Media.title.romaji}`)
          )

        await interaction.reply({ embeds: [embed], components: [row] })
        const prompt = await interaction.fetchReply()
        let thisServerAliases = allAliases[aliasIndex][serverId]
        const authorId = `<@!${interaction.user.id}>`
        const authorName = thisServerAliases[authorId]
        if (!(authorId in thisServerAliases)) {
          interaction.reply('You have not yet been aliased to an AniList user. `/alias add`')
        } else {
          list[currentId].push(authorName)
          serversjson = JSON.stringify(allServers)
          fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
          interaction.user.send(`You've chosen to join the watch-party for ${suggestedAnime.Media.title.romaji}. Follow along in chat for updates on daily episodes/discussion threads!`)
        }

        const filter = async (i) => {
          let refreshAlias = fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
          let refreshAllAliases = JSON.parse(refreshAlias)

          let refreshAliasIndex = refreshAllAliases.findIndex(x => Object.keys(x)[0] === serverId)

          if (refreshAliasIndex === -1) {
            i.reply('You have not yet been aliased to an AniList user. `/alias add`')
          } else {
            const id = `<@!${i.user.id}>`
            let thisServerAliases = refreshAllAliases[refreshAliasIndex][serverId]
            if (!thisServerAliases) {
              i.reply('You have not yet been aliased to an AniList user. `/alias add`')
            }
            else if (!(id in thisServerAliases)) {
              i.reply('You have not yet been aliased to an AniList user. `/alias add`')
            } else {
              const name = thisServerAliases[id]
              if (!list[currentId].includes(name)) {
                list[currentId].push(name)
                serversjson = JSON.stringify(allServers)
                fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
                i.user.send(`You've chosen to join the watch-party for ${suggestedAnime.Media.title.romaji}. Follow along in chat for updates on daily episodes/discussion threads!`)
              } else {
                await i.reply({ content: `You're already in this watch-party!`, ephemeral: true })
              }
            }
          }
          return i
        }

        const collector = prompt.createMessageComponentCollector({ filter, componentType: 'BUTTON', time: 3600000 })
      }

    }

    else if (sub === 'list') {
      if (thisServer['list'] === {}) {
        interaction.reply('No suggestions have been entered. Use `/watchparty suggest`')
      } else {
        const embed = new Discord.MessageEmbed()
          .setTitle('WP List')
          .setFooter(`Requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
          .setColor('#74E6D6')
          .setTimestamp()
        let titles = []
        Object.keys(thisServer['list']).forEach(async (id, index) => {
          const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: id })
          const addToTitles = (oneAnime.Media.title.romaji === thisServer['current']) ? `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl}) *` : `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl})`
          titles.push(addToTitles)
        })
        setTimeout(() => {
          titles = titles.map(entry => ' - **' + entry + '**')
          embed.setDescription(`List of suggested anime: \n\n${titles.join('\n')}`)
        }, 500)

        // msg.channel.sendTyping()
        // setTimeout(() => msg.delete(), 1000)
        await setTimeout(() => interaction.reply({ embeds: [embed] }), 1000)
      }
    }

    else if (sub === 'join') {
      const id = `<@!${interaction.user.id}>`
      let thisServerAliases = allAliases[aliasIndex][serverId]
      if (!(id in thisServerAliases)) {
        interaction.reply('You have not yet been aliased to an AniList user. `/alias add`')
      } else if (Object.keys(thisServer['list']).length === 0) {
        interaction.reply('There are no joinable watch-parties at the moment. `/watchparty suggest`')
      } else {
        let titles = []
        Object.keys(thisServer['list']).forEach(async id => {
          const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: id })
          const addToTitles = `${oneAnime.Media.title.romaji}`
          titles.push(addToTitles)
        })

        const row = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageSelectMenu()
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

        await interaction.reply({ content: 'Select a watch-party to join:', components: [row] })
        const response = await interaction.fetchReply()

        const filter = async i => {
          if (i.user.id === interaction.user.id) {
            const titleToJoin = i.values[0]
            const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToJoin })
            const animeId = anime.Media.id
            const authorAniName = thisServerAliases[id]
            if (list[animeId].includes(authorAniName)) {
              i.reply('You are already in this watch-party!')
            } else {
              list[animeId].push(authorAniName)
              i.reply(`You have joined the watch-party for **${anime.Media.title.romaji}**`)
              serversjson = JSON.stringify(allServers)
              fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
            }
          }
          return i.user.id === interaction.user.id
        }

        response.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
      }
    }


    else if (sub === 'leave') {
      const id = `<@!${interaction.user.id}>`
      let thisServerAliases = allAliases[aliasIndex][serverId]
      const authorAniName = thisServerAliases[id]
      if (!(id in thisServerAliases)) {
        interaction.reply('You have not yet been aliased to an AniList user. `/alias add`')
      } else if (Object.keys(thisServer['list']).length === 0) {
        interaction.reply('There are no leaveable watch-parties at the moment.')
      } else {
        let titles = []
        Object.keys(thisServer['list']).forEach(async id => {
          const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: id })
          const addToTitles = `${oneAnime.Media.title.romaji}`
          titles.push(addToTitles)
        })

        const row = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageSelectMenu()
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

        await interaction.reply({ content: 'Select a watch-party to leave:', components: [row] })
        const response = await interaction.fetchReply()

        const filter = async i => {
          if (i.user.id === interaction.user.id) {
            const titleToLeave = i.values[0]
            const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToLeave })
            const animeId = anime.Media.id
            if (list[animeId].includes(authorAniName)) {
              const authorIndex = list[animeId].findIndex(x => x === id)
              list[animeId].splice(authorIndex, 1)
              serversjson = JSON.stringify(allServers)
              fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
              i.reply(`You have left the watch-party for **${titleToLeave}**`)
            } else {
              i.reply('You are not in this watch-party.')
            }
            return i.user.id === interaction.user.id
          }
        }

        response.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000})
      }
    }

    else if (sub === 'delete') {
      const oneId = await request('https://graphql.anilist.co', GET_MEDIA, { id: Object.keys(thisServer['list'])[0] })
      const oneTitle = oneId.Media.title.romaji
      const isCurrent = (oneTitle === thisServer['current'])
      if (Object.keys(thisServer['list']).length === 0) {
        interaction.reply('There are currently no deletable watch-party suggestions.')
      } else if (Object.keys(thisServer['list']).length === 1 && isCurrent) {
        interaction.reply('There are currently no deletable watch-party suggestions.')
      }
      else {
        let titles = []
        Object.keys(thisServer['list']).forEach(async id => {
          const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: id })
          const addToTitles = `${oneAnime.Media.title.romaji}`
          if (!(thisServer['current'] === addToTitles)) {
            titles.push(addToTitles)
          }
        })

        const row = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageSelectMenu()
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

        await interaction.reply({ content: 'Click something please', components: [row] })

        const response = await interaction.fetchReply()
        const filter = async i => {
          const titleToDelete = i.values[0]
          const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToDelete })
          const id = anime.Media.id
          delete list[id]
          serversjson = JSON.stringify(allServers)
          fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
          i.reply(`${anime.Media.title.romaji} has been deleted from the suggested list.`)

          return i.user.id === interaction.user.id
        }

        response.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
      }
    }

    else if (sub === 'set') {
      const oneId = await request('https://graphql.anilist.co', GET_MEDIA, { id: Object.keys(thisServer['list'])[0] })
      const oneTitle = oneId.Media.title.romaji
      const isCurrent = (oneTitle === thisServer['current'])
      if (Object.keys(thisServer['list']).length === 0) {
        interaction.reply('There are no suggested watch-parties. `/watchparty suggest`')
      } else if (Object.keys(thisServer['list']).length === 1 && isCurrent) {
        interaction.reply('There are no settable suggested watch-parties. `/watchparty suggest`')
      } else {
        let titles = []
        Object.keys(thisServer['list']).forEach(async id => {
          const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: id })
          const addToTitles = `${oneAnime.Media.title.romaji}`
          if (!(thisServer['current'] === addToTitles)) {
            titles.push(addToTitles)
          }
        })

        const row = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageSelectMenu()
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

        await interaction.reply({ content: 'Select a watch-party to set as current:', components: [row] })
        const response = await interaction.fetchReply()

        const filter = async i => {
          if (i.user.id === interaction.user.id) {
            const titleToSet = i.values[0]
            const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToSet })
            thisServer['episode'] = 1
            thisServer['episodesToday'] = null
            thisServer['thread'] = null
            thisServer['current'] = anime.Media.title.romaji
            currentId = anime.Media.id
            animeIndex = list[currentId]
            if (!animeIndex) {
              const newAnime = []
              list[currentId] = newAnime
            }
            const embed = new Discord.MessageEmbed()
              .setColor(anime.Media.coverImage.color)
              .setTitle('Watch Party')
              .setDescription(`The upcoming watch-party will be on [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}).`)
              .setThumbnail(anime.Media.coverImage.large)
              .setFooter(`Set by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
              .setTimestamp()
            i.reply({ embeds: [embed] })
            serversjson = JSON.stringify(allServers)
            fs.writeFileSync(path.resolve(__dirname, '../data/party.json'), serversjson, 'utf-8')
          }
          return i.user.id === interaction.user.id
        }
        response.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000})
      }
    }

    else if (sub === 'view') {
      try {
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`Progress on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
          .setTimestamp()

        list[currentId].forEach(async x => {
          const user = await request('https://graphql.anilist.co', GET_USERINFO, { name: x })
          try {
            const list = await request('https://graphql.anilist.co', GET_MEDIALIST, { userName: user.User.name, mediaId: currentAnime.Media.id })
            const episodes = list.MediaList.progress
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          } catch {
            const episodes = 0
            embed.addField(user.User.name, `[${episodes}/${currentAnime.Media.episodes}](${user.User.siteUrl})`, true)
          }
        })
        // msg.channel.sendTyping()
        // setTimeout(() => msg.delete(), 1000)
        await setTimeout(() => interaction.reply({ embeds: [embed] }), 500)
      } catch (err) {
        console.log('User failed to use /wp, sent usage help.')
        console.error(err)
        interaction.reply('UwU, something\'s gone wrong, please contact markymoOwO to fix it.')
      }
    }
  }
}