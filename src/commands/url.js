const { request } = require('graphql-request')
const { GET_USERINFO } = require('../queries')
const { users } = require('../members')

module.exports = {
  name: 'url',
  aliases: ['user', 'u'],
	usage: '[anilist username]',
  description: 'Return the url of an anilist user, given their username.',
  execute(msg, args) {
    if (args[0].startsWith('<')) {
      const id = args[0].slice(3, args[0].length-1)
      const user = users.find(x => x.id === id)
      request('https://graphql.anilist.co', GET_USERINFO, {name: user.username})
        .then(res => {
          msg.reply(res.User.siteUrl)
        })
    }
    else {
      request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        .then(res => {
          msg.reply(res.User.siteUrl)
        })
    }
  }
}