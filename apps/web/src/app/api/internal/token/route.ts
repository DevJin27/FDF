import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createInternalApiToken } from "@/lib/internal-token";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = createInternalApiToken({
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null
  });

  return NextResponse.json({
    token
  });
}
