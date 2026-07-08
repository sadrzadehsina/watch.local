"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  parseTags,
  saveVideoForUser,
  toggleSavedVideoForUser,
  unsaveVideoForUser,
} from "@/lib/saved";

export async function toggleSavedVideoAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const videoId = String(formData.get("videoId") ?? "");
  const returnTo = sanitizeReturnTo(formData.get("returnTo"));

  if (videoId) {
    await toggleSavedVideoForUser(session.user.id, videoId);
  }

  revalidateSavedPaths(videoId, returnTo);
  redirect(returnTo);
}

export async function removeSavedVideoAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const videoId = String(formData.get("videoId") ?? "");
  const returnTo = sanitizeReturnTo(formData.get("returnTo"));

  if (videoId) {
    await unsaveVideoForUser(session.user.id, videoId);
  }

  revalidateSavedPaths(videoId, returnTo);
  redirect(returnTo);
}

export async function updateSavedVideoAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const videoId = String(formData.get("videoId") ?? "");
  const returnTo = sanitizeReturnTo(formData.get("returnTo"));
  const note = String(formData.get("note") ?? "").trim();
  const tags = parseTags(formData.get("tags"));

  if (videoId) {
    await saveVideoForUser(session.user.id, videoId, {
      note: note || null,
      tags,
    });
  }

  revalidateSavedPaths(videoId, returnTo);
  redirect(returnTo);
}

function revalidateSavedPaths(videoId: string, returnTo: string) {
  revalidatePath("/feed");
  revalidatePath("/saved");

  if (videoId) {
    revalidatePath(`/watch/${videoId}`);
  }

  if (returnTo.startsWith("/watch/")) {
    revalidatePath(returnTo);
  }
}

function sanitizeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "/saved";
  }

  if (value === "/feed" || value === "/saved" || value.startsWith("/watch/")) {
    return value;
  }

  return "/saved";
}
