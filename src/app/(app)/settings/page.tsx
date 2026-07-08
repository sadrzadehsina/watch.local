import { Database, RefreshCw } from "lucide-react";
import { syncSubscriptionsAction } from "@/app/actions/sync";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, signOut } from "@/lib/auth";
import { SUBSCRIPTIONS_SYNC_TYPE } from "@/lib/sync";
import { prisma } from "@/lib/prisma";

type SettingsPageProps = {
  searchParams: Promise<{
    subscriptionSync?: string;
    count?: string;
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

  const lastSubscriptionSync = subscriptionSyncState?.lastSyncedAt
    ? subscriptionSyncState.lastSyncedAt.toLocaleString()
    : "not yet";
  const syncMessage =
    params.subscriptionSync === "success"
      ? `Synced ${params.count ?? "0"} subscribed channels.`
      : params.subscriptionSync === "error"
        ? params.message ?? "Subscription sync failed."
        : null;

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
              <p>Video sync: not yet</p>
              {subscriptionSyncState?.error ? (
                <p className="text-destructive">{subscriptionSyncState.error}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={syncSubscriptionsAction}>
                <Button variant="outline" type="submit">
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sync subscriptions
                </Button>
              </form>
              <Button variant="outline" disabled>
                <Database className="mr-2 h-4 w-4" aria-hidden="true" />
                Sync videos
              </Button>
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
