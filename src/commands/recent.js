const { request } = require('graphql-request')
const { GET_ACTIVITY, GET_USERINFO } = require('../queries')
const { users } = require('../members')

module.exports = {
  name: 'recent',
  description: 'Return the most recent activity given a username.',
	usage: '[anilist username]',
  execute(msg, args) {
    if (args[0].startsWith('<')) {
      const id = args[0].slice(3, args[0].length-1)
      const user = users.find(x => x.id === id)
      request('https://graphql.anilist.co', GET_USERINFO, {name: user.username})
        .then(res => {
          request('https://graphql.anilist.co', GET_ACTIVITY, {userId: res.User.id})
            .then(res2 => {
              const activity = res2.Page.activities[0]
              msg.reply(`${res.User.name} - ${activity.status} ${activity.progress} (${activity.media.title.romaji})`)
            })
        })
    }
    else {
      request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
        .then(res => {
          request('https://graphql.anilist.co', GET_ACTIVITY, {userId: res.User.id})
            .then(res2 => {
              const activity = res2.Page.activities[0]
              msg.reply(`${res.User.name} - ${activity.status} ${activity.progress} (${activity.media.title.romaji})`)
            })
        })
    }
  }
}