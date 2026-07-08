import { Chrome } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/feed");
  }

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

        <form
          action={async () => {
            "use server";

            await signIn("google", { redirectTo: "/feed" });
          }}
        >
          <Button className="w-full" size="lg" type="submit">
            <Chrome className="mr-2 h-4 w-4" aria-hidden="true" />
            Sign in with Google
          </Button>
        </form>

        <p className="text-xs leading-5 text-muted-foreground">
          Uses read-only YouTube access. Tokens stay on the server.
        </p>
      </section>
    </main>
  );
}
