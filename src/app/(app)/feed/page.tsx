import { Clock, Grid2X2, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/video/video-card";
import { sampleVideos } from "@/lib/placeholders";

export default function FeedPage() {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Feed"
        description="Recent videos from subscribed channels only."
        actions={
          <Button variant="outline" disabled>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

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
          Last synced: not yet
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sampleVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      <EmptyState
        title="Real subscription videos arrive in Phase 4"
        description="Phase 1 keeps the dashboard navigable while auth, sync, and persistence are added in later phases."
      />
    </div>
  );
}
