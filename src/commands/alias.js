const path = require('path')
const fs = require('fs')

module.exports = {
  name: 'alias',
  usage: '\nadd <discord user> <anilist user>\nedit <discord user> <anilist user>\nremove <discord user>',
  description: 'Alias a discord username to corresponding AniList username',
  async execute(msg, args) {
    let aliasjson= fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliasArray = JSON.parse(aliasjson)
    const server = msg.guild.id
    
    let ind = allAliasArray.findIndex((x) => Object.keys(x)[0] === server)
    if (ind === -1) {
      const newServer = {}
      newServer[server] = {}
      allAliasArray.push(newServer)
    }
    ind = allAliasArray.findIndex((x) => Object.keys(x)[0] === server)
    
    let serverAliasArray = allAliasArray[ind][server]
    if (args[0] == 'add' || args[0] == 'edit') {
      serverAliasArray[args[1]] = args[2]
      msg.reply(`Aliased ${args[1]} to ${args[2]}`)
    } else if (args[0] == 'remove') {
      delete serverAliasArray[args[1]]
      msg.reply(`Removed ${args[1]}'s alias`)
    }
    aliasjson = JSON.stringify(allAliasArray)
    fs.writeFileSync(path.resolve(__dirname, '../data/alias.json'), aliasjson, 'utf-8')
  }
}
