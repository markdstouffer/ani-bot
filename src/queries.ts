export {}
const { gql } = require('graphql-request')

module.exports = {
  GET_USERINFO: gql`
  query ($name: String) {
    User (name: $name) {
      siteUrl
      name
      id
      statistics {
        anime {
          minutesWatched
          meanScore
          count
          episodesWatched
        }
      }
      avatar {
        large
        medium
      }
    }
  }
  `,
  GET_ACTIVITY: gql`
  query ($userId: Int) {
    Page (page: 1, perPage: 5) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      activities(userId: $userId, type: ANIME_LIST, sort: ID_DESC) {
        ...on ListActivity {
          id
          status
          progress
          media {
            coverImage {
              color
            }
            siteUrl
            title {
              romaji
            }
          }
        }
      }
    }
  }
  `,
  GET_MEDIALIST: gql`
  query ($userName: String, $mediaId: Int) {
    MediaList(userName: $userName, mediaId: $mediaId) {
      score (format: POINT_10)
      progress
      status
      media {
        siteUrl
        id
        title {
          romaji
        }
        episodes
      }
    }
  }
  `,
  GET_MEDIA: gql`
  query($search: String, $id: Int) {
    Media(search: $search, id: $id, type: ANIME) {
      isAdult
      season
      seasonYear
      format
      streamingEpisodes {
        url
        site
      }
      studios(isMain: true) {
        nodes {
          name
        }
      }
      genres
      status
      averageScore
      description
      siteUrl
      title {
        romaji
      }
      id
      episodes
      bannerImage
      coverImage {
        medium
        large
        extraLarge
        color
      }
    }
  }
  `,
  GET_CHARACTER: gql`
  query($search: String) {
    Character(search: $search) {
      image {
        large
      }
    }
  }
  `,
  GET_VIEWER: gql`
  query {
    Viewer {
      name
      id
    }
  }
  `
}
