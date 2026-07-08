import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncSubscriptionsForUser } from "@/lib/sync";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncSubscriptionsForUser(session.user.id);

    return NextResponse.json({
      count: result.count,
      syncedAt: result.syncedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Subscription sync failed.",
      },
      { status: 500 },
    );
  }
}
