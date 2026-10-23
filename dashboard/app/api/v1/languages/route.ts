import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../lib/auth";
import { LANGUAGE_OPTIONS } from "../../../utils/languages";

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ languages: LANGUAGE_OPTIONS }, { status: 200 });
};
