export {}
const mongoose = require('mongoose')

const partySchema = new mongoose.Schema({
  server: {
    serverId: String,
    current: [
      {
        title: String,
        episode: Number,
        episodesToday: Number,
        thread: String
      }
    ],
    list: [
      {
        animeId: Number,
        members: [String]
      }
    ]
  }
})

module.exports = partySchema
