const mongoose = require('mongoose')

const aliasSchema = new mongoose.Schema({
  server: {
    serverId: String,
    users: [
      {
        username: String,
        userId: String
      }
    ]
  }
})

module.exports = aliasSchema