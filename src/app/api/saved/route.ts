import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseTags, saveVideoForUser } from "@/lib/saved";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const savedVideos = await prisma.savedVideo.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
    orderBy: {
      savedAt: "desc",
    },
  });

  return NextResponse.json({
    savedVideos: savedVideos.map((savedVideo) => ({
      id: savedVideo.id,
      note: savedVideo.note,
      tags: savedVideo.tags,
      savedAt: savedVideo.savedAt.toISOString(),
      video: {
        id: savedVideo.video.id,
        title: savedVideo.video.title,
        thumbnailUrl: savedVideo.video.thumbnailUrl,
        publishedAt: savedVideo.video.publishedAt.toISOString(),
        duration: savedVideo.video.duration,
        channel: {
          id: savedVideo.video.channel.id,
          title: savedVideo.video.channel.title,
          thumbnailUrl: savedVideo.video.channel.thumbnailUrl,
        },
      },
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    videoId?: string;
    note?: string | null;
    tags?: string[] | string;
  };

  if (!body.videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  try {
    const savedVideo = await saveVideoForUser(session.user.id, body.videoId, {
      note: body.note,
      tags: parseTags(body.tags),
    });

    return NextResponse.json(
      {
        savedVideo: {
          id: savedVideo.id,
          videoId: savedVideo.videoId,
          note: savedVideo.note,
          tags: savedVideo.tags,
          savedAt: savedVideo.savedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save video" },
      { status: 400 },
    );
  }
}
