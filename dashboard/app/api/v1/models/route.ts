import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../lib/auth";
import { listAvailableModels } from "../../../services/models";

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const models = await listAvailableModels();
  return NextResponse.json({ models }, { status: 200 });
};
