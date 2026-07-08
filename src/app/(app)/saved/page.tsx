import { BookmarkCheck, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SavedPage() {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Saved"
        description="Your local reference library for videos worth revisiting."
      />
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search saved videos" disabled />
      </div>
      <EmptyState
        icon={BookmarkCheck}
        title="No saved videos yet"
        description="Save and unsave actions are implemented in Phase 6 after the feed and watch page are backed by local data."
        action={<Button disabled>Save a video</Button>}
      />
    </div>
  );
}
