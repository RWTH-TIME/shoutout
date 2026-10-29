import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../../lib/auth";
import config from "../../../lib/config";
import {
  getUserSettings,
  upsertUserSettings,
} from "../../../services/userSettingsService";

const putSchema = z.object({
  notifyEmail: z.string().email().nullable().optional().or(z.literal("")),
  notifyOnFinish: z.boolean().optional(),
  notifyOnFail: z.boolean().optional(),
});

export const GET = async (request: NextRequest) => {
  if (!config.MAIL_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await authenticate(request, { allowApiKey: false });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserSettings(auth.owner);
  return NextResponse.json(
    {
      settings: {
        ...settings,
        notifyEmail: settings.notifyEmail || auth.email || null,
      },
    },
    { status: 200 }
  );
};

export const PUT = async (request: NextRequest) => {
  if (!config.MAIL_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await authenticate(request, { allowApiKey: false });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = putSchema.parse(await request.json());
  const settings = await upsertUserSettings(auth.owner, {
    notifyEmail:
      body.notifyEmail === "" || body.notifyEmail === undefined
        ? null
        : body.notifyEmail,
    notifyOnFinish: body.notifyOnFinish,
    notifyOnFail: body.notifyOnFail,
  });

  return NextResponse.json({ settings }, { status: 200 });
};
