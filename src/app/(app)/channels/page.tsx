import { ExternalLink, Radio } from "lucide-react";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function ChannelsPage() {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Channels"
        description="Subscribed channels synced from your YouTube account."
        actions={
          <Button variant="outline" disabled>
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Open YouTube
          </Button>
        }
      />
      <EmptyState
        icon={Radio}
        title="Channels sync starts in Phase 3"
        description="This page will list subscribed channels after Google OAuth and the YouTube subscriptions sync are in place."
      />
    </div>
  );
}
