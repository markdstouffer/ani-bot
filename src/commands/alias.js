const path = require('path')
const fs = require('fs')

module.exports = {
  name: 'alias',
  async execute(interaction) {
    let aliasjson= fs.readFileSync(path.resolve(__dirname, '../data/alias.json'), 'utf-8')
    let allAliasArray = JSON.parse(aliasjson)
    const server = interaction.guildId
    const sub = interaction.options._subCommand
    const discord = `<@!${interaction.options.getMentionable('discord').user.id}>`
    const anilist = interaction.options.getString('anilist')
    
    let ind = allAliasArray.findIndex((x) => Object.keys(x)[0] === server)
    if (ind === -1) {
      const newServer = {}
      newServer[server] = {}
      allAliasArray.push(newServer)
    }
    ind = allAliasArray.findIndex((x) => Object.keys(x)[0] === server)
    
    let serverAliasArray = allAliasArray[ind][server]
    if (sub === 'add') {
      serverAliasArray[discord] = anilist
      interaction.reply(`Aliased ${discord} to ${anilist}`)
    } else if (sub == 'remove') {
      delete serverAliasArray[discord]
      interaction.reply(`Removed ${discord}'s alias`)
    }
    aliasjson = JSON.stringify(allAliasArray)
    fs.writeFileSync(path.resolve(__dirname, '../data/alias.json'), aliasjson, 'utf-8')
  }
}
