import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseTags, saveVideoForUser, unsaveVideoForUser } from "@/lib/saved";

type SavedVideoRouteProps = {
  params: Promise<{
    videoId: string;
  }>;
};

export async function DELETE(_request: Request, { params }: SavedVideoRouteProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await params;
  await unsaveVideoForUser(session.user.id, videoId);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: SavedVideoRouteProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await params;
  const body = (await request.json()) as {
    note?: string | null;
    tags?: string[] | string;
  };

  try {
    const savedVideo = await saveVideoForUser(session.user.id, videoId, {
      note: body.note,
      tags: parseTags(body.tags),
    });

    return NextResponse.json({
      savedVideo: {
        id: savedVideo.id,
        videoId: savedVideo.videoId,
        note: savedVideo.note,
        tags: savedVideo.tags,
        savedAt: savedVideo.savedAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update saved video" },
      { status: 400 },
    );
  }
}
