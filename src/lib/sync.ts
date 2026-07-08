import { prisma } from "@/lib/prisma";
import { fetchMySubscriptions } from "@/lib/youtube";

export const SUBSCRIPTIONS_SYNC_TYPE = "subscriptions";

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
