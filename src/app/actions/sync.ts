"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { syncSubscriptionsForUser } from "@/lib/sync";

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
