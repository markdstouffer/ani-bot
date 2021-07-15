const { request } = require('graphql-request')
const { GET_MEDIA, GET_USERINFO, GET_MEDIALIST } = require('../queries')
const { alias } = require('../aliases')

module.exports = {
  name: 'progress',
  description: 'Returns how many episodes of an anime a user has watched, given a username and an anime title.',
	usage: '[anilist username] [anime title]',
  async execute(msg, args) {
    const title = args.splice(1, args.length).join(' ')
    const idData = await request('https://graphql.anilist.co', GET_MEDIA, {search: title})
    if (args[0].startsWith('<')) {
      const id = args[0].slice(3, args[0].length-1)
      const user = alias.find(x => x.id === id)
      const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: user.username})
      try {
        const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: idData.Media.id})
        msg.reply(`${userData.User.name} has completed ${listData.MediaList.progress} episode(s) of ${listData.MediaList.media.title.romaji}`)
      } catch (error) {
        console.log(error)
        msg.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
      }
    }
    else {
      const userData = await request('https://graphql.anilist.co', GET_USERINFO, {name: args[0]})
      try {
        const listData = await request('https://graphql.anilist.co', GET_MEDIALIST, {userName: userData.User.name, mediaId: idData.Media.id})
        msg.reply(`${userData.User.name} has completed ${listData.MediaList.progress} episode(s) of ${listData.MediaList.media.title.romaji}`)
      } catch (error) {
        console.log(error)
        msg.reply(`${userData.User.name} has not yet watched any episodes of this anime.`)
      }
    }
  }
}