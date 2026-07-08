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

function getBestThumbnailUrl(thumbnails?: Record<string, { url?: string }>) {
  return (
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    Object.values(thumbnails ?? {}).find((thumbnail) => thumbnail.url)?.url
  );
}
