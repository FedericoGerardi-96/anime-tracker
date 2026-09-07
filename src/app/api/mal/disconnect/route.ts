import { NextRequest, NextResponse } from "next/server";
import { deleteMalConnection } from "@/services/myanimelist-connection";
import { getAuthenticatedUser } from "@/services/supabase";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  try {
    await deleteMalConnection(user.id);
    return NextResponse.redirect(new URL("/profile?mal=disconnected", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/profile?mal=disconnect_error", request.url), 303);
  }
}
