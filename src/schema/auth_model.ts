export {}
const mongoose = require('mongoose')

const authSchema = new mongoose.Schema({
  token: String,
  user: {
    discord: String,
    anilist: String
  }
})

module.exports = authSchema
