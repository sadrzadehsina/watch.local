"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { syncLatestVideosForUser, syncSubscriptionsForUser } from "@/lib/sync";

export async function syncSubscriptionsAction(formData?: FormData) {
  const session = await auth();
  const returnTo = formData?.get("returnTo") === "/channels" ? "/channels" : "/settings";

  if (!session?.user?.id) {
    redirect("/login");
  }

  let count = 0;

  try {
    const result = await syncSubscriptionsForUser(session.user.id);
    count = result.count;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscription sync failed.";

    redirect(`/settings?subscriptionSync=error&message=${encodeURIComponent(message)}`);
  }

  revalidatePath("/channels");
  revalidatePath("/settings");
  redirect(`${returnTo}?subscriptionSync=success&count=${count}`);
}

export async function syncVideosAction(formData?: FormData) {
  const session = await auth();
  const returnTo = formData?.get("returnTo") === "/feed" ? "/feed" : "/settings";

  if (!session?.user?.id) {
    redirect("/login");
  }

  let count = 0;
  let errors = 0;

  try {
    const result = await syncLatestVideosForUser(session.user.id);
    count = result.upsertedVideoCount;
    errors = result.errorCount;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video sync failed.";

    redirect(`${returnTo}?videoSync=error&message=${encodeURIComponent(message)}`);
  }

  revalidatePath("/feed");
  revalidatePath("/channels");
  revalidatePath("/settings");
  redirect(`${returnTo}?videoSync=success&count=${count}&errors=${errors}`);
}
