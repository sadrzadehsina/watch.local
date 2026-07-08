import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type VideoRouteProps = {
  params: Promise<{
    videoId: string;
  }>;
};

export async function GET(_request: Request, { params }: VideoRouteProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await params;
  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
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
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      publishedAt: video.publishedAt.toISOString(),
      duration: video.duration,
      viewCount: video.viewCount?.toString(),
      likeCount: video.likeCount?.toString(),
      saved: video.savedBy.length > 0,
      channel: {
        id: video.channel.id,
        title: video.channel.title,
        thumbnailUrl: video.channel.thumbnailUrl,
      },
    },
  });
}
