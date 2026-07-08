import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type WatchPageProps = {
  params: Promise<{
    videoId: string;
  }>;
};

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId } = await params;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Watch"
        description="Focused viewing without global recommendations."
        actions={
          <Button asChild variant="outline">
            <Link href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              YouTube
            </Link>
          </Button>
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
      <Card className="p-5">
        <h2 className="text-xl font-semibold">Video details placeholder</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Title, channel, publish date, save controls, notes, and same-channel recent videos are added once local video data exists.
        </p>
      </Card>
    </div>
  );
}
