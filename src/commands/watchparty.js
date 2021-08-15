const Discord = require('discord.js')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const { SlashCommandBuilder } = require('@discordjs/builders')
const wait = require('util').promisify(setTimeout)

const conn = require('../connections/anidata_conn')
const Alias = conn.models.Alias
const Party = conn.models.Party

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wp')
    .setDescription('Anime watch-parties')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View watch-party progress')
    )
    .addSubcommand(sub =>
      sub
        .setName('suggest')
        .setDescription('Suggest a watch-party subject')
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Anime title')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Set one of the suggested watch-parties as the current one')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a suggested watch-party from the list.')
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all the suggested watch-parties.')
    )
    .addSubcommand(sub =>
      sub
        .setName('join')
        .setDescription('Join a watch-party')
    )
    .addSubcommand(sub =>
      sub
        .setName('leave')
        .setDescription('Leave a watch-party')
    ),
  async execute(interaction) {
    const serverId = interaction.guildId
    const sub = interaction.options.getSubcommand()
    const title = interaction.options.getString('title')
    const query = { 'server.serverId': serverId }

    let countPartyServerDocs = await Party.find(query).limit(1).countDocuments()
    let partyServerExists = (countPartyServerDocs > 0)
    let thisServerParty = await Party.findOne(query)

    let countServerDocs = await Alias.find(query).limit(1).countDocuments()
    let serverExists = (countServerDocs > 0)
    let serverAliases = await Alias.findOne(query)

    if (!partyServerExists) {
      const newServer = new Party({
        server: {
          serverId: serverId,
          current: null,
          episode: 1,
          episodesToday: null,
          thread: null
        }
      })
      await newServer.save()
    } thisServerParty = await Party.findOne(query)

    let currentAnime, currentId, animeIndex
    if (thisServerParty.server.current) {
      currentAnime = await request('https://graphql.anilist.co', GET_MEDIA, { search: thisServerParty.server.current })
      currentId = Number(currentAnime.Media.id)
      animeIndex = thisServerParty.server.list.find(x => x.animeId === currentId)
      if (!animeIndex) {
        const newAnime = {
          animeId: currentId,
          members: []
        }
        thisServerParty.server.list.push(newAnime)
        thisServerParty.save()
      }
    }

    if (sub === 'suggest') {
      const suggestedAnime = await request('https://graphql.anilist.co', GET_MEDIA, { search: title })
      const animeId = suggestedAnime.Media.id
      const found = thisServerParty.server.list.find(x => x.animeId === animeId)

      if (found) {
        interaction.reply({content: 'This anime has already been suggested. Use `/watchparty set` to set this as the current anime.', ephemeral: true})
      } else {
        const newAnime = {
          animeId: animeId,
          members: []
        }
        thisServerParty.server.list.push(newAnime)
        thisServerParty.save()

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

        // ADD THE SUGGESTER TO THE WP BY DEFAULT - if they are aliased.
        if (serverExists) {
          const userList = serverAliases.server.users
          const authorId = `<@!${interaction.user.id}>`
          const user = userList.find(x => x.userId === authorId)
          if (user) {
            const anilist = user.username
            thisServerParty.server.list.find(x => x.animeId === animeId).members.push(anilist)
            thisServerParty.save()
            interaction.user.send(`You've chosen to join the watch-party for ${suggestedAnime.Media.title.romaji}. Follow along in chat for updates on daily episodes/discussion threads!`)
          } else {
            console.log('Unaliased user created a watch-party.')
          }
        } else {
          console.log('Unaliased user created a watch-party.')
        }

        const filter = async (i) => {
          // refresh database in case someone has added an alias after collector was initiated.
          countServerDocs = await Alias.find({ 'server.serverId': serverId }).limit(1).countDocuments()
          serverExists = (countServerDocs > 0)
          serverAliases = await Alias.findOne({ 'server.serverId': serverId })

          if (!serverExists) {
            console.log('failed at !serverExists')
            i.reply({content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true})
          } else {
            const id = `<@!${i.user.id}>`
            const userList = serverAliases.server.users
            const user = userList.find(x => x.userId === id)
            if (!user) {
              console.log('failed at !user')
              i.reply({content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true})
            } else {
              const name = user.username
              if (!thisServerParty.server.list.find(x => x.animeId === animeId).members.includes(name)) {
                thisServerParty.server.list.find(x => x.animeId === animeId).members.push(name)
                thisServerParty.save()
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
      if (thisServerParty.server.list.length === 0) {
        interaction.reply('No suggestions have been entered. Use `/watchparty suggest`')
      } else {
        interaction.deferReply()
        const embed = new Discord.MessageEmbed()
          .setTitle('WP List')
          .setFooter(`Requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
          .setColor('#74E6D6')
          .setTimestamp()
        let titles = []
        thisServerParty.server.list.forEach(async obj => {
          const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
          const addToTitles = (oneAnime.Media.title.romaji === thisServerParty.server.current) ? `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl}) *` : `[${oneAnime.Media.title.romaji}](${oneAnime.Media.siteUrl})`
          titles.push(addToTitles)
        })
        await wait(1000)
        titles = titles.map(entry => ' - **' + entry + '**')
        embed.setDescription(`List of suggested anime: \n\n${titles.join('\n')}`)

        interaction.editReply({ embeds: [embed] })
      }
    }

    else if (sub === 'join') {
      const id = `<@!${interaction.user.id}>`
      if (serverExists) {
        const userList = serverAliases.server.users
        const user = userList.find(x => x.userId === id)
        if (user) {
          if (thisServerParty.server.list.length === 0) {
            interaction.reply({content: 'There are no joinable watch-parties at the moment. `/watchparty suggest`', ephemeral: true})
          } else {
            let titles = []
            thisServerParty.server.list.forEach(async obj => {
              const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
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

            await interaction.reply({ content: 'Select a watch-party to join:', components: [row], ephemeral: true })

            const filter = async i => {
              if (i.user.id === interaction.user.id) {
                const titleToJoin = i.values[0]
                const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToJoin })
                const animeId = anime.Media.id
                const authorAniName = user.username
                if (thisServerParty.server.list.find(x => x.animeId === animeId).members.includes(authorAniName)) {
                  i.reply({content: 'You are already in this watch-party!', ephemeral: true})
                } else {
                  thisServerParty.server.list.find(x => x.animeId === animeId).members.push(authorAniName)
                  thisServerParty.save()
                  i.reply({content: `You have joined the watch-party for **${anime.Media.title.romaji}**`, ephemeral: true})
                }
              }
              return i.user.id === interaction.user.id
            }
            interaction.channel.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
          }
        } else {
          interaction.reply({content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true})
        }
      } else {
        interaction.reply({content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true})
      }
    }


    else if (sub === 'leave') {
      const id = `<@!${interaction.user.id}>`
      if (serverExists) {
        const userList = serverAliases.server.users
        const user = userList.find(x => x.userId === id)
        if (user) {
          if (thisServerParty.server.list.length === 0) {
            interaction.reply({content: 'There are no leaveable watch-parties at the moment.', ephemeral: true})
          } else {
            const authorAniName = user.username
            let titles = []
            thisServerParty.server.list.forEach(async obj => {
              const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
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

            await interaction.reply({ content: 'Select a watch-party to leave:', components: [row], ephemeral: true })

            const filter = async i => {
              if (i.user.id === interaction.user.id) {
                const titleToLeave = i.values[0]
                const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToLeave })
                const animeId = anime.Media.id
                if (thisServerParty.server.list.find(x => x.animeId === animeId).members.includes(authorAniName)) {
                  const authorIndex = thisServerParty.server.list.find(x => x.animeId === animeId).members.findIndex(x => x === id)
                  thisServerParty.server.list.find(x => x.animeId === animeId).members.splice(authorIndex, 1)
                  thisServerParty.save()
                  i.reply({content: `You have left the watch-party for **${titleToLeave}**`, ephemeral: true})
                } else {
                  i.reply({content: 'You are not in this watch-party.', ephemeral: true})
                }
                return i.user.id === interaction.user.id
              }
            }

            interaction.channel.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
          }
        } else {
          interaction.reply({content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true})
        }
      } else {
        interaction.reply({content: 'You have not yet been aliased to an AniList user. `/alias add`', ephemeral: true})
      }
    }

    else if (sub === 'delete') {
      if (thisServerParty.server.list.length === 0) {
        interaction.reply({content: 'There are currently no deletable watch-party suggestions.', ephemeral: true})
      } else {
        const oneId = await request('https://graphql.anilist.co', GET_MEDIA, { id: thisServerParty.server.list[0].animeId })
        const oneTitle = oneId.Media.title.romaji
        const isCurrent = (oneTitle === thisServerParty.server.current)
        if (thisServerParty.server.list.length === 1 && isCurrent) {
          interaction.reply({content: 'There are currently no deletable watch-party suggestions.', ephemeral: true})
        } else {
          let titles = []
          thisServerParty.server.list.forEach(async obj => {
            const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
            const addToTitles = `${oneAnime.Media.title.romaji}`
            if (!(thisServerParty.server.current === addToTitles)) {
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

          await interaction.reply({ content: 'Choose an anime to remove from the queue:', components: [row], ephemeral: true })

          const filter = async i => {
            const titleToDelete = i.values[0]
            const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToDelete })
            const id = anime.Media.id
            const index = thisServerParty.server.list.findIndex(x => x.animeId === id)
            thisServerParty.server.list.splice(index, 1)
            thisServerParty.save()
            i.reply(`${i.user.username} has deleted **${anime.Media.title.romaji}** from the suggested list.`)

            return i.user.id === interaction.user.id
          }

          interaction.channel.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
        }
      }
    }

    else if (sub === 'set') {
      if (thisServerParty.server.list.length === 0) {
        interaction.reply({content: 'There are currently no settable watch-party suggestions.', ephemeral: true})
      } else {
        const oneId = await request('https://graphql.anilist.co', GET_MEDIA, { id: thisServerParty.server.list[0].animeId })
        const oneTitle = oneId.Media.title.romaji
        const isCurrent = (oneTitle === thisServerParty.server.current)
        if (thisServerParty.server.list.length === 1 && isCurrent) {
          interaction.reply({content: 'There are currently no settable watch-party suggestions.', ephemeral: true})
        } else {
          let titles = []
          thisServerParty.server.list.forEach(async obj => {
            const oneAnime = await request('https://graphql.anilist.co', GET_MEDIA, { id: obj.animeId })
            const addToTitles = `${oneAnime.Media.title.romaji}`
            if (!(thisServerParty.server.current === addToTitles)) {
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

          await interaction.reply({ content: 'Select a watch-party to set as current:', components: [row], ephemeral: true })

          const filter = async i => {
            if (i.user.id === interaction.user.id) {
              const titleToSet = i.values[0]
              const anime = await request('https://graphql.anilist.co', GET_MEDIA, { search: titleToSet })
              thisServerParty.server.episode = 1
              thisServerParty.server.episodesToday = null
              thisServerParty.server.thread = null
              thisServerParty.server.current = anime.Media.title.romaji
              currentId = anime.Media.id
              animeIndex = thisServerParty.server.list.find(x => x.animeId === currentId)
              if (!animeIndex) {
                const newAnime = {
                  animeId: currentId,
                  members: []
                }
                thisServerParty.server.list.push(newAnime)
                thisServerParty.save()
              }
              thisServerParty.save()
              const embed = new Discord.MessageEmbed()
                .setColor(anime.Media.coverImage.color)
                .setTitle('Watch Party')
                .setDescription(`The upcoming watch-party will be on [**${anime.Media.title.romaji}**](${anime.Media.siteUrl}).`)
                .setThumbnail(anime.Media.coverImage.large)
                .setFooter(`Set by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
                .setTimestamp()
              i.reply({ embeds: [embed] })
            }
            return i.user.id === interaction.user.id
          }
          interaction.channel.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
        }
      }
    }

    else if (sub === 'view') {
      try {
        interaction.deferReply()
        const embed = new Discord.MessageEmbed()
          .setColor(currentAnime.Media.coverImage.color)
          .setTitle('Watch Party')
          .setDescription(`Progress on [**${currentAnime.Media.title.romaji}**](${currentAnime.Media.siteUrl})`)
          .setThumbnail(currentAnime.Media.coverImage.large)
          .setFooter(`requested by ${interaction.user.username}`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
          .setTimestamp()

        thisServerParty.server.list.find(x => x.animeId === currentId).members.forEach(async x => {
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
        await wait(1000)

        interaction.editReply({ embeds: [embed] })
      } catch (err) {
        console.log('User failed to use /wp, sent usage help.')
        console.error(err)
        interaction.reply('UwU, something\'s gone wrong, please contact markymoOwO to fix it.')
      }
    }
  }
}