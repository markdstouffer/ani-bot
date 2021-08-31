export interface AniUser {
  User: {
    siteUrl: string;
    name: string;
    id: number;
    statistics: {
      anime: {
        minutesWatched: number;
        meanScore: number;
        count: number;
        episodesWatched: number;
      }
    }
    avatar: {
      large: string;
      medium: string;
    }
  }
}

export interface AniActivity {
  Page: {
    pageInfo: {
      total: number;
      currentPage: number;
      lastPage: number;
      hasNextPage: number;
      perPage: number;
    }
    activities: {
      id: number;
      status: string;
      progress: string;
      media: {
        coverImage: {
          color: string;
        }
        siteUrl: string;
        title: {
          romaji: string;
        }
      }
    }[]
  }
}

export interface AniList {
  MediaList: {
    id: number;
    score: number;
    progress: number;
    status: string;
    media: {
      siteUrl: string;
      id: number;
      title: {
        romaji: string;
      }
      episodes: number;
    }
  }
}

export interface AniMedia {
  Media: {
    isAdult: boolean;
    season: string;
    seasonYear: number;
    format: string;
    streamingEpisodes: [{
      url: string;
      site: string;
    }]
    studios: {
      nodes: {
        name: string;
      }[]
    }
    genres: string[];
    status: string;
    averageScore: number;
    description: string;
    siteUrl: string;
    title: {
      romaji: string;
    }
    id: number;
    episodes: number;
    bannerImage: string;
    coverImage: {
      medium: string;
      large: string;
      extraLarge: string;
      color: string;
    }
  }
}

export interface Viewer {
  name: string;
  id: number;
}

export interface Aliases {
  server: {
    serverId: string;
    users: {
      username: string;
      userId: string;
    }[]
  }
  save(): void;
}

export interface Parties {
  server: {
    serverId: string;
    current: string | null;
    episode: number;
    episodesToday: number | null;
    thread: string | null;
    list: {
      animeId: number;
      members: string[];
    }[]
  }
  save(): void;
}

export interface Quote {
  anime: string;
  character: string;
  quote: string
}
