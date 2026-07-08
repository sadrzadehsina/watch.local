import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videos = await prisma.video.findMany({
    where: {
      channel: {
        subscriptions: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      channel: true,
      savedBy: {
        where: {
          userId: session.user.id,
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 100,
  });

  return NextResponse.json({
    videos: videos.map((video) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      publishedAt: video.publishedAt.toISOString(),
      duration: video.duration,
      channel: {
        id: video.channel.id,
        title: video.channel.title,
        thumbnailUrl: video.channel.thumbnailUrl,
      },
      saved: video.savedBy.length > 0,
    })),
  });
}
