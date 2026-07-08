import { prisma } from "@/lib/prisma";
import {
  fetchChannelDetails,
  fetchLatestUploadsForChannel,
  fetchMySubscriptions,
  fetchVideoDetails,
} from "@/lib/youtube";
import { shouldRunSync, summarizeSyncErrors } from "@/lib/sync-policy";

export const SUBSCRIPTIONS_SYNC_TYPE = "subscriptions";
export const VIDEOS_SYNC_TYPE = "videos";
const VIDEO_SYNC_INTERVAL_MS = 60 * 60 * 1000;

export async function syncSubscriptionsForUser(userId: string) {
  await prisma.syncState.upsert({
    where: {
      userId_type: {
        userId,
        type: SUBSCRIPTIONS_SYNC_TYPE,
      },
    },
    create: {
      userId,
      type: SUBSCRIPTIONS_SYNC_TYPE,
      status: "running",
      error: null,
    },
    update: {
      status: "running",
      error: null,
    },
  });

  try {
    const subscriptions = await fetchMySubscriptions(userId);

    const writes = subscriptions.flatMap((subscription) => [
      prisma.channel.upsert({
        where: {
          id: subscription.channelId,
        },
        create: {
          id: subscription.channelId,
          title: subscription.title,
          description: subscription.description,
          thumbnailUrl: subscription.thumbnailUrl,
          publishedAt: subscription.publishedAt,
        },
        update: {
          title: subscription.title,
          description: subscription.description,
          thumbnailUrl: subscription.thumbnailUrl,
          publishedAt: subscription.publishedAt,
        },
      }),
      prisma.channelSubscription.upsert({
        where: {
          userId_channelId: {
            userId,
            channelId: subscription.channelId,
          },
        },
        create: {
          userId,
          channelId: subscription.channelId,
          youtubeSubId: subscription.youtubeSubId,
        },
        update: {
          youtubeSubId: subscription.youtubeSubId,
        },
      }),
    ]);

    if (writes.length > 0) {
      await prisma.$transaction(writes);
    }

    const syncedAt = new Date();

    await prisma.syncState.update({
      where: {
        userId_type: {
          userId,
          type: SUBSCRIPTIONS_SYNC_TYPE,
        },
      },
      data: {
        lastSyncedAt: syncedAt,
        status: "idle",
        error: null,
      },
    });

    return {
      count: subscriptions.length,
      syncedAt,
    };
  } catch (error) {
    await prisma.syncState.update({
      where: {
        userId_type: {
          userId,
          type: SUBSCRIPTIONS_SYNC_TYPE,
        },
      },
      data: {
        status: "error",
        error: error instanceof Error ? error.message : "Subscription sync failed.",
      },
    });

    throw error;
  }
}

export async function syncLatestVideosForUser(
  userId: string,
  options?: { force?: boolean; videosPerChannel?: number },
) {
  const currentSyncState = await prisma.syncState.findUnique({
    where: {
      userId_type: {
        userId,
        type: VIDEOS_SYNC_TYPE,
      },
    },
  });

  if (
    !shouldRunSync(currentSyncState?.lastSyncedAt, VIDEO_SYNC_INTERVAL_MS, {
      force: options?.force,
    })
  ) {
    return {
      fetchedVideoCount: 0,
      upsertedVideoCount: 0,
      channelCount: 0,
      errorCount: 0,
      skipped: true,
      syncedAt: currentSyncState?.lastSyncedAt ?? new Date(),
    };
  }

  await prisma.syncState.upsert({
    where: {
      userId_type: {
        userId,
        type: VIDEOS_SYNC_TYPE,
      },
    },
    create: {
      userId,
      type: VIDEOS_SYNC_TYPE,
      status: "running",
      error: null,
    },
    update: {
      status: "running",
      error: null,
    },
  });

  try {
    const subscriptions = await prisma.channelSubscription.findMany({
      where: {
        userId,
      },
      include: {
        channel: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const channelsMissingUploadPlaylists = subscriptions
      .map((subscription) => subscription.channel)
      .filter((channel) => !channel.uploadsPlaylist);

    if (channelsMissingUploadPlaylists.length > 0) {
      const channelDetails = await fetchChannelDetails(
        userId,
        channelsMissingUploadPlaylists.map((channel) => channel.id),
      );

      if (channelDetails.length > 0) {
        await prisma.$transaction(
          channelDetails.map((channel) =>
            prisma.channel.update({
              where: {
                id: channel.id,
              },
              data: {
                title: channel.title,
                description: channel.description,
                thumbnailUrl: channel.thumbnailUrl,
                uploadsPlaylist: channel.uploadsPlaylist,
                customUrl: channel.customUrl,
                publishedAt: channel.publishedAt,
              },
            }),
          ),
        );
      }
    }

    const channels = await prisma.channelSubscription.findMany({
      where: {
        userId,
        channel: {
          uploadsPlaylist: {
            not: null,
          },
        },
      },
      include: {
        channel: true,
      },
    });

    const syncErrors: string[] = [];
    let fetchedVideoCount = 0;
    let upsertedVideoCount = 0;

    for (const subscription of channels) {
      const uploadsPlaylist = subscription.channel.uploadsPlaylist;

      if (!uploadsPlaylist) {
        continue;
      }

      try {
        const uploadedVideos = await fetchLatestUploadsForChannel(
          userId,
          subscription.channel.id,
          uploadsPlaylist,
          { maxResults: options?.videosPerChannel ?? 10 },
        );
        fetchedVideoCount += uploadedVideos.length;

        if (uploadedVideos.length === 0) {
          continue;
        }

        const enrichedVideos = await fetchVideoDetails(
          userId,
          uploadedVideos.map((video) => video.id),
        );
        const enrichedById = new Map(enrichedVideos.map((video) => [video.id, video]));

        await prisma.$transaction(
          uploadedVideos.map((video) => {
            const enriched = enrichedById.get(video.id);

            return prisma.video.upsert({
              where: {
                id: video.id,
              },
              create: {
                id: video.id,
                channelId: enriched?.channelId ?? video.channelId,
                title: enriched?.title ?? video.title,
                description: enriched?.description ?? video.description,
                thumbnailUrl: enriched?.thumbnailUrl ?? video.thumbnailUrl,
                publishedAt: enriched?.publishedAt ?? video.publishedAt,
                duration: enriched?.duration,
                viewCount: enriched?.viewCount,
                likeCount: enriched?.likeCount,
              },
              update: {
                channelId: enriched?.channelId ?? video.channelId,
                title: enriched?.title ?? video.title,
                description: enriched?.description ?? video.description,
                thumbnailUrl: enriched?.thumbnailUrl ?? video.thumbnailUrl,
                publishedAt: enriched?.publishedAt ?? video.publishedAt,
                duration: enriched?.duration,
                viewCount: enriched?.viewCount,
                likeCount: enriched?.likeCount,
              },
            });
          }),
        );
        upsertedVideoCount += uploadedVideos.length;
      } catch (error) {
        syncErrors.push(
          `${subscription.channel.title}: ${
            error instanceof Error ? error.message : "video sync failed"
          }`,
        );
      }
    }

    const syncedAt = new Date();

    await prisma.syncState.update({
      where: {
        userId_type: {
          userId,
          type: VIDEOS_SYNC_TYPE,
        },
      },
      data: {
        lastSyncedAt: syncedAt,
        status: syncErrors.length > 0 ? "partial" : "idle",
        error: summarizeSyncErrors(syncErrors),
      },
    });

    return {
      fetchedVideoCount,
      upsertedVideoCount,
      channelCount: channels.length,
      errorCount: syncErrors.length,
      skipped: false,
      syncedAt,
    };
  } catch (error) {
    await prisma.syncState.update({
      where: {
        userId_type: {
          userId,
          type: VIDEOS_SYNC_TYPE,
        },
      },
      data: {
        status: "error",
        error: error instanceof Error ? error.message : "Video sync failed.",
      },
    });

    throw error;
  }
}
