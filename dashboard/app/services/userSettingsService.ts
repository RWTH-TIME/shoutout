import { prisma } from "../lib/prisma";

export type NotificationSettings = {
  notifyEmail: string | null;
  notifyOnFinish: boolean;
  notifyOnFail: boolean;
};

const defaults: NotificationSettings = {
  notifyEmail: null,
  notifyOnFinish: true,
  notifyOnFail: false,
};

export async function getUserSettings(
  owner: string
): Promise<NotificationSettings> {
  const settings = await prisma.userSettings.findUnique({ where: { owner } });
  if (!settings) {
    return { ...defaults };
  }
  return {
    notifyEmail: settings.notifyEmail,
    notifyOnFinish: settings.notifyOnFinish,
    notifyOnFail: settings.notifyOnFail,
  };
}

export async function upsertUserSettings(
  owner: string,
  input: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const settings = await prisma.userSettings.upsert({
    where: { owner },
    create: {
      owner,
      notifyEmail: input.notifyEmail ?? null,
      notifyOnFinish: input.notifyOnFinish ?? true,
      notifyOnFail: input.notifyOnFail ?? false,
    },
    update: {
      ...(input.notifyEmail !== undefined
        ? { notifyEmail: input.notifyEmail }
        : {}),
      ...(input.notifyOnFinish !== undefined
        ? { notifyOnFinish: input.notifyOnFinish }
        : {}),
      ...(input.notifyOnFail !== undefined
        ? { notifyOnFail: input.notifyOnFail }
        : {}),
    },
  });
  return {
    notifyEmail: settings.notifyEmail,
    notifyOnFinish: settings.notifyOnFinish,
    notifyOnFail: settings.notifyOnFail,
  };
}
