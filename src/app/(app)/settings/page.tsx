import { Database, RefreshCw } from "lucide-react";
import { syncSubscriptionsAction, syncVideosAction } from "@/app/actions/sync";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, signOut } from "@/lib/auth";
import { SUBSCRIPTIONS_SYNC_TYPE, VIDEOS_SYNC_TYPE } from "@/lib/sync";
import { prisma } from "@/lib/prisma";

type SettingsPageProps = {
  searchParams: Promise<{
    subscriptionSync?: string;
    count?: string;
    videoSync?: string;
    errors?: string;
    message?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await auth();
  const params = await searchParams;
  const accountLabel = session?.user?.email ?? session?.user?.name ?? "Signed in";
  const subscriptionSyncState = session?.user?.id
    ? await prisma.syncState.findUnique({
        where: {
          userId_type: {
            userId: session.user.id,
            type: SUBSCRIPTIONS_SYNC_TYPE,
          },
        },
      })
    : null;
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

  const lastSubscriptionSync = subscriptionSyncState?.lastSyncedAt
    ? subscriptionSyncState.lastSyncedAt.toLocaleString()
    : "not yet";
  const lastVideoSync = videoSyncState?.lastSyncedAt
    ? videoSyncState.lastSyncedAt.toLocaleString()
    : "not yet";
  let syncMessage: string | null = null;

  if (params.subscriptionSync === "success") {
    syncMessage = `Synced ${params.count ?? "0"} subscribed channels.`;
  }

  if (params.subscriptionSync === "error") {
    syncMessage = params.message ?? "Subscription sync failed.";
  }

  if (params.videoSync === "success") {
    const errorMessage =
      params.errors && params.errors !== "0" ? ` with ${params.errors} channel errors` : "";
    syncMessage = `Synced ${params.count ?? "0"} videos${errorMessage}.`;
  }

  if (params.videoSync === "error") {
    syncMessage = params.message ?? "Video sync failed.";
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader title="Settings" description="Account, sync, and local app preferences." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{accountLabel}</p>
            <form
              action={async () => {
                "use server";

                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncMessage ? (
              <div className="rounded-md border bg-secondary px-3 py-2 text-sm">
                {syncMessage}
              </div>
            ) : null}
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Subscription sync: {lastSubscriptionSync}</p>
              <p>Video sync: {lastVideoSync}</p>
              {subscriptionSyncState?.error ? (
                <p className="text-destructive">{subscriptionSyncState.error}</p>
              ) : null}
              {videoSyncState?.error ? (
                <p className="whitespace-pre-line text-destructive">{videoSyncState.error}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={syncSubscriptionsAction}>
                <Button variant="outline" type="submit">
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sync subscriptions
                </Button>
              </form>
              <form action={syncVideosAction}>
                <Button variant="outline" type="submit">
                  <Database className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sync videos
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Theme</p>
            <ThemeToggle />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
