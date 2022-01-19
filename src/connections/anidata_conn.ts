// handles connections to the MongoDB database
// sets up models for Alias, Party, and Auth, and exports a connection object for use

const mongoose = require('mongoose')

const conn = mongoose.createConnection(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
conn.model('Alias', require('../schema/alias_model'))
conn.model('Party', require('../schema/party_model'))
conn.model('Auth', require('../schema/auth_model'))

module.exports = conn
