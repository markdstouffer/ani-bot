const { gql } = require('graphql-request')

module.exports = {
  INCREMENT_EP: gql`
  mutation ($mediaId: Int, $progress: Int) {
    SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
      id
      progress
    }
  }
  `,
  RATE: gql`
  mutation ($mediaId: Int, $score: Float) {
    SaveMediaListEntry (mediaId: $mediaId, score: $score) {
      id
      score
    }
  }
  `,
  ADD: gql`
  mutation($mediaId: Int) {
    SaveMediaListEntry (mediaId: $mediaId) {
      id
    }
  }
  `,
  DELETE: gql`
  mutation($id: Int) {
    DeleteMediaListEntry (id: $id) {
      deleted
    }
  }
  `,
  STATUS: gql`
  mutation($mediaId: Int, $status: MediaListStatus) {
    SaveMediaListEntry (mediaId: $mediaId, status: $status) {
      id
      status
    }
  }
  `
}
