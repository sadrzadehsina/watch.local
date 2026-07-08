import { prisma } from "@/lib/prisma";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type YouTubeSubscriptionListResponse = {
  nextPageToken?: string;
  items?: YouTubeSubscriptionItem[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type YouTubeChannelListResponse = {
  items?: YouTubeChannelItem[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type YouTubeChannelItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
};

type YouTubePlaylistItemsResponse = {
  items?: YouTubePlaylistItem[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type YouTubePlaylistItem = {
  snippet?: {
    publishedAt?: string;
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url?: string }>;
    channelId?: string;
    resourceId?: {
      videoId?: string;
    };
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoItem[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type YouTubeVideoItem = {
  id: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
};

type YouTubeSubscriptionItem = {
  id: string;
  snippet?: {
    publishedAt?: string;
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url?: string }>;
    resourceId?: {
      channelId?: string;
    };
  };
};

export type YoutubeSubscription = {
  youtubeSubId: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: Date;
};

export type YoutubeChannelDetails = {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  uploadsPlaylist?: string;
  customUrl?: string;
  publishedAt?: Date;
};

export type YoutubePlaylistVideo = {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: Date;
};

export type YoutubeVideoDetails = {
  id: string;
  channelId?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: Date;
  duration?: string;
  viewCount?: bigint;
  likeCount?: bigint;
};

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

export class YouTubeAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YouTubeAuthError";
  }
}

export async function getYoutubeAccessTokenForUser(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  if (!account?.access_token) {
    throw new YouTubeAuthError("Google account is missing a YouTube access token.");
  }

  const expiresAtMs = account.expires_at ? account.expires_at * 1000 : undefined;
  const hasValidToken = expiresAtMs ? expiresAtMs > Date.now() + 60_000 : true;

  if (hasValidToken) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new YouTubeAuthError("Google access token expired and no refresh token is available.");
  }

  const refreshed = await refreshGoogleAccessToken(account.refresh_token);

  if (!refreshed.access_token) {
    throw new YouTubeAuthError(refreshed.error_description ?? "Unable to refresh Google access token.");
  }

  await prisma.account.update({
    where: {
      id: account.id,
    },
    data: {
      access_token: refreshed.access_token,
      expires_at: refreshed.expires_in
        ? Math.floor(Date.now() / 1000) + refreshed.expires_in
        : account.expires_at,
      refresh_token: refreshed.refresh_token ?? account.refresh_token,
      token_type: refreshed.token_type,
      scope: refreshed.scope,
    },
  });

  return refreshed.access_token;
}

export async function fetchMySubscriptions(userId: string, options?: { maxPages?: number }) {
  const accessToken = await getYoutubeAccessTokenForUser(userId);
  const maxPages = options?.maxPages ?? 20;
  const subscriptions: YoutubeSubscription[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${YOUTUBE_API_BASE}/subscriptions`);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("mine", "true");
    url.searchParams.set("maxResults", "50");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as YouTubeSubscriptionListResponse;

    if (!response.ok) {
      throw new YouTubeApiError(
        payload.error?.message ?? "YouTube subscriptions request failed.",
        response.status,
      );
    }

    for (const item of payload.items ?? []) {
      const channelId = item.snippet?.resourceId?.channelId;

      if (!channelId) {
        continue;
      }

      subscriptions.push({
        youtubeSubId: item.id,
        channelId,
        title: item.snippet?.title ?? "Untitled channel",
        description: item.snippet?.description,
        thumbnailUrl: getBestThumbnailUrl(item.snippet?.thumbnails),
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : undefined,
      });
    }

    pageToken = payload.nextPageToken;

    if (!pageToken) {
      break;
    }
  }

  return subscriptions;
}

export async function fetchChannelDetails(userId: string, channelIds: string[]) {
  const accessToken = await getYoutubeAccessTokenForUser(userId);
  const details: YoutubeChannelDetails[] = [];

  for (const batch of chunk(channelIds, 50)) {
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set("part", "contentDetails,snippet");
    url.searchParams.set("id", batch.join(","));

    const payload = await youtubeGet<YouTubeChannelListResponse>(url, accessToken);

    for (const item of payload.items ?? []) {
      details.push({
        id: item.id,
        title: item.snippet?.title ?? "Untitled channel",
        description: item.snippet?.description,
        thumbnailUrl: getBestThumbnailUrl(item.snippet?.thumbnails),
        uploadsPlaylist: item.contentDetails?.relatedPlaylists?.uploads,
        customUrl: item.snippet?.customUrl,
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : undefined,
      });
    }
  }

  return details;
}

export async function fetchLatestUploadsForChannel(
  userId: string,
  channelId: string,
  uploadsPlaylistId: string,
  options?: { maxResults?: number },
) {
  const accessToken = await getYoutubeAccessTokenForUser(userId);
  const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("playlistId", uploadsPlaylistId);
  url.searchParams.set("maxResults", String(options?.maxResults ?? 10));

  const payload = await youtubeGet<YouTubePlaylistItemsResponse>(url, accessToken);
  const videos: YoutubePlaylistVideo[] = [];

  for (const item of payload.items ?? []) {
    const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;

    if (!videoId) {
      continue;
    }

    videos.push({
      id: videoId,
      channelId: item.snippet?.channelId ?? channelId,
      title: item.snippet?.title ?? "Untitled video",
      description: item.snippet?.description,
      thumbnailUrl: getBestThumbnailUrl(item.snippet?.thumbnails),
      publishedAt: new Date(
        item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? Date.now(),
      ),
    });
  }

  return videos;
}

export async function fetchVideoDetails(userId: string, videoIds: string[]) {
  const accessToken = await getYoutubeAccessTokenForUser(userId);
  const details: YoutubeVideoDetails[] = [];

  for (const batch of chunk(videoIds, 50)) {
    const url = new URL(`${YOUTUBE_API_BASE}/videos`);
    url.searchParams.set("part", "snippet,contentDetails,statistics");
    url.searchParams.set("id", batch.join(","));

    const payload = await youtubeGet<YouTubeVideosResponse>(url, accessToken);

    for (const item of payload.items ?? []) {
      details.push({
        id: item.id,
        channelId: item.snippet?.channelId,
        title: item.snippet?.title,
        description: item.snippet?.description,
        thumbnailUrl: getBestThumbnailUrl(item.snippet?.thumbnails),
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : undefined,
        duration: item.contentDetails?.duration,
        viewCount: parseBigInt(item.statistics?.viewCount),
        likeCount: parseBigInt(item.statistics?.likeCount),
      });
    }
  }

  return details;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  return (await response.json()) as GoogleTokenResponse;
}

async function youtubeGet<T extends { error?: { message?: string } }>(url: URL, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as T;

  if (!response.ok) {
    throw new YouTubeApiError(
      payload.error?.message ?? "YouTube request failed.",
      response.status,
    );
  }

  return payload;
}

function getBestThumbnailUrl(thumbnails?: Record<string, { url?: string }>) {
  return (
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    Object.values(thumbnails ?? {}).find((thumbnail) => thumbnail.url)?.url
  );
}

function parseBigInt(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
