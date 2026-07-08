import Link from "next/link";
import { Bookmark, ExternalLink, Radio } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoCard } from "@/components/video/video-card";
import { auth } from "@/lib/auth";
import { formatDisplayDate, formatIsoDuration } from "@/lib/date";
import { prisma } from "@/lib/prisma";

type WatchPageProps = {
  params: Promise<{
    videoId: string;
  }>;
};

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

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
    notFound();
  }

  const sameChannelVideos = await prisma.video.findMany({
    where: {
      channelId: video.channelId,
      id: {
        not: video.id,
      },
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
    take: 6,
  });

  const duration = formatIsoDuration(video.duration);

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title={video.title}
        description={`${video.channel.title} - ${formatDisplayDate(video.publishedAt)}`}
        actions={
          <>
            <Button variant="outline" disabled>
              <Bookmark
                className={
                  video.savedBy.length > 0 ? "mr-2 h-4 w-4 fill-current" : "mr-2 h-4 w-4"
                }
                aria-hidden="true"
              />
              {video.savedBy.length > 0 ? "Saved" : "Save"}
            </Button>
            <Button asChild variant="outline">
              <Link href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                YouTube
              </Link>
            </Button>
          </>
        }
      />
      <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
                    {video.channel.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.channel.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Radio className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{video.channel.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      Published {formatDisplayDate(video.publishedAt)}
                    </p>
                  </div>
                </div>
                {duration ? (
                  <p className="text-sm text-muted-foreground">Duration {duration}</p>
                ) : null}
              </div>
            </div>

            {video.description ? (
              <p className="mt-5 line-clamp-6 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {video.description}
              </p>
            ) : null}
          </Card>
        </section>

        <aside className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">More from this channel</h2>
            <p className="text-sm text-muted-foreground">No global recommendations.</p>
          </div>
          {sameChannelVideos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {sameChannelVideos.map((relatedVideo) => (
                <VideoCard
                  key={relatedVideo.id}
                  video={{
                    ...relatedVideo,
                    saved: relatedVideo.savedBy.length > 0,
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="p-5 text-sm text-muted-foreground">
              No other synced videos from this channel yet.
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
