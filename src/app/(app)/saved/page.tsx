import Link from "next/link";
import { BookmarkCheck, ExternalLink, Save, Search, Trash2 } from "lucide-react";
import {
  removeSavedVideoAction,
  updateSavedVideoAction,
} from "@/app/actions/saved";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/auth";
import { formatIsoDuration, formatRelativeDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";

type SavedPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SavedPage({ searchParams }: SavedPageProps) {
  const session = await auth();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const savedVideos = session?.user?.id
    ? await prisma.savedVideo.findMany({
        where: {
          userId: session.user.id,
          ...(query
            ? {
                OR: [
                  {
                    video: {
                      title: {
                        contains: query,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    video: {
                      channel: {
                        title: {
                          contains: query,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
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
      })
    : [];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Saved"
        description="Your local reference library for videos worth revisiting."
      />
      <form className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" name="q" placeholder="Search saved videos" defaultValue={query} />
      </form>

      {savedVideos.length > 0 ? (
        <div className="grid gap-4">
          {savedVideos.map((savedVideo) => {
            const duration = formatIsoDuration(savedVideo.video.duration);
            const tags = savedVideo.tags.join(", ");

            return (
              <Card key={savedVideo.id} className="overflow-hidden">
                <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
                  <Link
                    href={`/watch/${savedVideo.video.id}`}
                    className="relative block aspect-video overflow-hidden rounded-md bg-secondary"
                  >
                    {savedVideo.video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={savedVideo.video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Thumbnail unavailable
                      </div>
                    )}
                    {duration ? (
                      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
                        {duration}
                      </span>
                    ) : null}
                  </Link>

                  <div className="min-w-0 space-y-4">
                    <div className="space-y-1">
                      <Link
                        href={`/watch/${savedVideo.video.id}`}
                        className="line-clamp-2 font-medium hover:underline"
                      >
                        {savedVideo.video.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {savedVideo.video.channel.title} - saved{" "}
                        {formatRelativeDate(savedVideo.savedAt)}
                      </p>
                    </div>

                    <form action={updateSavedVideoAction} className="space-y-3">
                      <input type="hidden" name="videoId" value={savedVideo.video.id} />
                      <input type="hidden" name="returnTo" value="/saved" />
                      <Textarea
                        name="note"
                        placeholder="Add a local note"
                        defaultValue={savedVideo.note ?? ""}
                      />
                      <Input name="tags" placeholder="tags, separated, by commas" defaultValue={tags} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="submit" variant="outline" size="sm">
                          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                          Save note
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`https://www.youtube.com/watch?v=${savedVideo.video.id}`}
                            target="_blank"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                            YouTube
                          </Link>
                        </Button>
                      </div>
                    </form>

                    <form action={removeSavedVideoAction}>
                      <input type="hidden" name="videoId" value={savedVideo.video.id} />
                      <input type="hidden" name="returnTo" value="/saved" />
                      <Button type="submit" variant="ghost" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookmarkCheck}
          title={query ? "No matching saved videos" : "No saved videos yet"}
          description={
            query
              ? "Try a different title or channel search."
              : "Save videos from the feed or watch page to build a local reference library."
          }
          action={
            <Button asChild>
              <Link href="/feed">Open feed</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
