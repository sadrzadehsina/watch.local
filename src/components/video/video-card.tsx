import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatIsoDuration, formatRelativeDate } from "@/lib/date";

type VideoCardProps = {
  video: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    publishedAt: Date;
    duration?: string | null;
    saved?: boolean;
    channel: {
      title: string;
    };
  };
};

export function VideoCard({ video }: VideoCardProps) {
  const duration = formatIsoDuration(video.duration);

  return (
    <Card className="overflow-hidden">
      <Link href={`/watch/${video.id}`} className="block">
        <div className="relative aspect-video bg-secondary">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
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
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <Link href={`/watch/${video.id}`} className="line-clamp-2 font-medium hover:underline">
            {video.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            {video.channel.title} - {formatRelativeDate(video.publishedAt)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" aria-label="Save video" disabled>
            <Bookmark
              className={video.saved ? "h-4 w-4 fill-current" : "h-4 w-4"}
              aria-hidden="true"
            />
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Open on YouTube">
            <Link href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
