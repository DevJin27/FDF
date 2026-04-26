import { notFound, redirect } from "next/navigation";

import { MatchRoomClient } from "@/components/match-room-client";
import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { MatchRoomResponse } from "@/types/api";

export default async function MatchRoomPage({
  params
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const payload = await apiFetch<MatchRoomResponse>(`/api/matches/${params.id}`).catch(
    () => null
  );

  if (!payload) {
    notFound();
  }

  return <MatchRoomClient room={payload.room} settlement={payload.settlement} userId={session.user.id} />;
}
