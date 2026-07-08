import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PlaceholderVideo } from "@/lib/placeholders";

type VideoCardProps = {
  video: PlaceholderVideo;
};

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Card className="overflow-hidden">
      <Link href={`/watch/${video.id}`} className="block">
        <div className="relative aspect-video bg-secondary">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Thumbnail
          </div>
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
            {video.duration}
          </span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <Link href={`/watch/${video.id}`} className="line-clamp-2 font-medium hover:underline">
            {video.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            {video.channel} - {video.publishedAt}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" aria-label="Save video" disabled>
            <Bookmark className="h-4 w-4" aria-hidden="true" />
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
