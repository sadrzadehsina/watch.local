import Link from "next/link";
import { ExternalLink, Radio, RefreshCw } from "lucide-react";
import { syncSubscriptionsAction } from "@/app/actions/sync";
import { EmptyState } from "@/components/empty-states/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ChannelsPageProps = {
  searchParams: Promise<{
    subscriptionSync?: string;
    count?: string;
  }>;
};

export default async function ChannelsPage({ searchParams }: ChannelsPageProps) {
  const session = await auth();
  const params = await searchParams;
  const subscriptions = session?.user?.id
    ? await prisma.channelSubscription.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          channel: {
            include: {
              _count: {
                select: {
                  videos: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];
  const syncMessage =
    params.subscriptionSync === "success"
      ? `Synced ${params.count ?? "0"} subscribed channels.`
      : null;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader
        title="Channels"
        description="Subscribed channels synced from your YouTube account."
        actions={
          <form action={syncSubscriptionsAction}>
            <input type="hidden" name="returnTo" value="/channels" />
            <Button variant="outline" type="submit">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Sync
            </Button>
          </form>
        }
      />

      {syncMessage ? (
        <div className="rounded-md border bg-secondary px-3 py-2 text-sm">{syncMessage}</div>
      ) : null}

      {subscriptions.length > 0 ? (
        <div className="grid gap-3">
          {subscriptions.map(({ channel }) => (
            <Card key={channel.id} className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
                {channel.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={channel.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Radio className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium">{channel.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {channel._count.videos} locally synced videos
                </p>
              </div>
              <Button asChild variant="ghost" size="icon" aria-label="Open channel on YouTube">
                <Link href={`https://www.youtube.com/channel/${channel.id}`} target="_blank">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Radio}
          title="No synced channels yet"
          description="Use Sync to fetch your YouTube subscriptions into the local database."
          action={
            <form action={syncSubscriptionsAction}>
              <input type="hidden" name="returnTo" value="/channels" />
              <Button type="submit">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Sync subscriptions
              </Button>
            </form>
          }
        />
      )}
    </div>
  );
}
