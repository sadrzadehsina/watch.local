import { Clock, Grid2X2, RefreshCw } from "lucide-react";
import { syncVideosAction } from "@/app/actions/sync";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/video/video-card";
import { formatRelativeDate } from "@/lib/date";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VIDEOS_SYNC_TYPE } from "@/lib/sync";

type FeedPageProps = {
  searchParams: Promise<{
    videoSync?: string;
    count?: string;
    errors?: string;
    message?: string;
  }>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const session = await auth();
  const params = await searchParams;
  const videos = session?.user?.id
    ? await prisma.video.findMany({
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
      })
    : [];
  const videoSyncState = session?.user?.id
    ? await prisma.syncState.findUnique({
        where: {
          userId_type: {
            userId: session.user.id,
            type: VIDEOS_SYNC_TYPE,
          },
        },
      })
    : null;
  const lastVideoSync = videoSyncState?.lastSyncedAt
    ? formatRelativeDate(videoSyncState.lastSyncedAt)
    : "not yet";
  const syncMessage =
    params.videoSync === "success"
      ? `Synced ${params.count ?? "0"} videos${
          params.errors && params.errors !== "0" ? ` with ${params.errors} channel errors` : ""
        }.`
      : params.videoSync === "error"
        ? params.message ?? "Video sync failed."
        : null;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Feed"
        description="Recent videos from subscribed channels only."
        actions={
          <form action={syncVideosAction}>
            <input type="hidden" name="returnTo" value="/feed" />
            <Button variant="outline" type="submit">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </form>
        }
      />

      {syncMessage ? (
        <div className="rounded-md border bg-secondary px-3 py-2 text-sm">{syncMessage}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {["All", "Today", "This week", "Saved"].map((filter) => (
          <Button key={filter} variant={filter === "All" ? "secondary" : "ghost"} size="sm">
            {filter}
          </Button>
        ))}
        <Button variant="ghost" size="icon" aria-label="Grid view">
          <Grid2X2 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Last synced: {lastVideoSync}
        </span>
      </div>

      {videos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={{
                ...video,
                saved: video.savedBy.length > 0,
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No synced videos yet"
          description="Refresh after syncing subscriptions to fetch the latest uploads from your subscribed channels."
          action={
            <form action={syncVideosAction}>
              <input type="hidden" name="returnTo" value="/feed" />
              <Button type="submit">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Refresh feed
              </Button>
            </form>
          }
        />
      )}
    </div>
  );
}
