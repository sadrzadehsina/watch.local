import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Watch.local</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Your YouTube subscriptions without the noise.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Runs locally. Saved videos are stored on your machine.
          </p>
        </div>

        <Button className="w-full" size="lg" disabled>
          <Chrome className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign in with Google
        </Button>

        <p className="text-xs leading-5 text-muted-foreground">
          Google OAuth is wired in Phase 2. This screen is the Phase 1 shell.
        </p>
      </section>
    </main>
  );
}
