import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="max-w-sm space-y-5 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Watch.local</p>
          <h1 className="text-2xl font-semibold">Nothing synced here</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            This page is missing or the video is not in your local subscription feed.
          </p>
        </div>
        <Button asChild>
          <Link href="/feed">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Feed
          </Link>
        </Button>
      </section>
    </main>
  );
}
