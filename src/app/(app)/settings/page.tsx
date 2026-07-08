import { Database, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, signOut } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth();
  const accountLabel = session?.user?.email ?? session?.user?.name ?? "Signed in";

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
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Subscription sync: not yet</p>
              <p>Video sync: not yet</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Sync subscriptions
              </Button>
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
