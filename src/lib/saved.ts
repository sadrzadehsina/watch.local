import { prisma } from "@/lib/prisma";

export async function getAccessibleVideo(userId: string, videoId: string) {
  return prisma.video.findFirst({
    where: {
      id: videoId,
      channel: {
        subscriptions: {
          some: {
            userId,
          },
        },
      },
    },
  });
}

export async function saveVideoForUser(
  userId: string,
  videoId: string,
  options?: { note?: string | null; tags?: string[] },
) {
  const video = await getAccessibleVideo(userId, videoId);

  if (!video) {
    throw new Error("Video is not available in your local subscription feed.");
  }

  return prisma.savedVideo.upsert({
    where: {
      userId_videoId: {
        userId,
        videoId,
      },
    },
    create: {
      userId,
      videoId,
      note: options?.note,
      tags: options?.tags ?? [],
    },
    update: {
      note: options?.note,
      tags: options?.tags,
    },
  });
}

export async function unsaveVideoForUser(userId: string, videoId: string) {
  await prisma.savedVideo.deleteMany({
    where: {
      userId,
      videoId,
    },
  });
}

export async function toggleSavedVideoForUser(userId: string, videoId: string) {
  const savedVideo = await prisma.savedVideo.findUnique({
    where: {
      userId_videoId: {
        userId,
        videoId,
      },
    },
  });

  if (savedVideo) {
    await unsaveVideoForUser(userId, videoId);
    return { saved: false };
  }

  await saveVideoForUser(userId, videoId);
  return { saved: true };
}

export function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map(cleanTag)
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map(cleanTag)
    .filter(Boolean);
}

function cleanTag(tag: string) {
  return tag.trim().toLowerCase();
}
