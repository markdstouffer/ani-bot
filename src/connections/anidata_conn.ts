const mongoose = require('mongoose')

const conn = mongoose.createConnection(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
conn.model('Alias', require('../schema/alias_model'))
conn.model('Party', require('../schema/party_model'))

module.exports = conn
