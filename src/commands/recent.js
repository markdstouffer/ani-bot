const { request } = require('graphql-request')
const { GET_ACTIVITY, GET_USERINFO } = require('../queries')

module.exports = {
  name: 'recent',
  description: 'Return the most recent activity given a username.',
	usage: '[username]',
  execute(msg, args) {
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