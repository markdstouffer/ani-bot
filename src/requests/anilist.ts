// handles authentication requests with the AniList API

const { GET_VIEWER } = require('../queries')
const axios = require('axios')
const crypto = require('crypto-js')

const conn = require('../connections/anidata_conn')
const Auth = conn.models.Auth

// receives a token and discord username, returns a Viewer (currently authenticated user)
// saves the user's encrypted token to the database
export const authenticate = async (token: string, discord: string) => {
  const encrypted = crypto.AES.encrypt(token, process.env.CRY_SECRET).toString()

  const res = await axios({
    method: 'post',
    url: `https://graphql.anilist.co?query=${GET_VIEWER}`,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })
  const query = { 'user.discord': discord }
  const existing = await Auth.find(query)
  const count: number = await Auth.find(query).limit(1).countDocuments()

  if (count > 0) {
    existing[0].token = encrypted
    existing[0].user.anilist = res.data.data.Viewer.name
  } else {
    const newUser = new Auth({
      token: encrypted,
      user: {
        discord: discord,
        anilist: res.data.data.Viewer.name
      }
    })
    await newUser.save()
  }
  return res.data.data.Viewer
}

// deletes users authentication details from database
export const removeAuthentication = async (discord: string) => {
  const query = { 'user.discord': discord }
  await Auth.deleteOne(query)
}

// checks whether a user with given discord name has authentication details in database
export const isAuthenticated = async (discord: string) => {
  const query = { 'user.discord': discord }
  const count: number = await Auth.find(query).limit(1).countDocuments()
  return (count > 0)
}

// returns a user's token and anilist username from Auth collection
export const getAuthUser = async (discord: string) => {
  const query = { 'user.discord': discord }
  const authDoc = await Auth.find(query)

  const encrypted = authDoc[0].token
  const token = crypto.AES.decrypt(encrypted, process.env.CRY_SECRET).toString(crypto.enc.Utf8)

  const headers = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }

  const username = authDoc[0].user.anilist

  return { headers, username }
}
