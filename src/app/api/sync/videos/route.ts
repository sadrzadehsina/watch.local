import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncLatestVideosForUser } from "@/lib/sync";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncLatestVideosForUser(session.user.id);

    return NextResponse.json({
      channelCount: result.channelCount,
      fetchedVideoCount: result.fetchedVideoCount,
      upsertedVideoCount: result.upsertedVideoCount,
      errorCount: result.errorCount,
      syncedAt: result.syncedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Video sync failed.",
      },
      { status: 500 },
    );
  }
}
