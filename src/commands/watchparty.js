const Discord = require('discord.js')
const fs = require('fs')
const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const path = require('path')

module.exports = {
  name: 'watchparty',
  aliases: ['wp'],
	usage: '\nadd <anilist username> [discord username] \nremove <anilist username> \n<anime title>',
  description: 'Add or remove members, or show progress of all members on given anime.',
  async execute(msg, args) {
    const title = args.slice().splice(0, args.length).join(' ')
    console.log('args', args)

    if (args[0] === 'add') {
      let usersjson = fs.readFileSync(path.resolve(__dirname, '../members.json'), 'utf-8')
      let usersArray = JSON.parse(usersjson)
      const userToAdd = (!args[2]) ? { "username": args[1] } : { "id": args[2].substring(3, args[2].length-1), "username": args[1]}
      console.log('usersArray', usersArray)
      usersArray.push(userToAdd)
      usersjson = JSON.stringify(usersArray)
      fs.writeFileSync(path.resolve(__dirname, '../members.json'), usersjson, 'utf-8')
      msg.reply(`Added ${args[1]} to the watch-party.`)

    } else if (args[0] === 'remove') {
      let usersjson = fs.readFileSync(path.resolve(__dirname, '../members.json'), 'utf-8')
      let usersArray = JSON.parse(usersjson)
      const index = usersArray.findIndex(x => x.username.toLowerCase() === args[1].toLowerCase())
      console.log(index)
      if (index > -1) {
        usersArray.splice(index, 1)
        console.log('after splice', usersArray)
      }
      usersjson = JSON.stringify(usersArray)
      fs.writeFileSync(path.resolve(__dirname, '../members.json'), usersjson, 'utf-8')
      msg.reply(`${args[1]} has been removed from the watch-party.`)

    } else {
      try {
        let usersjson = fs.readFileSync(path.resolve(__dirname, '../members.json'), 'utf-8')
        let usersArray = JSON.parse(usersjson)
        const idData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
        const embed = new Discord.MessageEmbed()
        .setTitle('Watch Party')
        .setDescription(`Progress on ${idData.Media.title.romaji}`)
        .setThumbnail(idData.Media.coverImage.large)
      
      for (i = 0; i < usersArray.length; i++) {
        const user = await request('https://graphql.anilist.co', GET_USERINFO, {name: usersArray[i].username})
        try {
          const list = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: user.User.name, mediaId: idData.Media.id})
          const episodes = list.MediaList.progress
          embed.addField(user.User.name, `${episodes}/${idData.Media.episodes}`, true)
        } catch {
          const episodes = 0
          embed.addField(user.User.name, `${episodes}/${idData.Media.episodes}`, true)
        }
      }
      msg.reply(embed)
      } catch {
        msg.reply(`${title} not found.`)
      }
    } 
  }
}