"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@helpwave/hightide";
import SettingsSection from "./SettingsSection";
import useAppTranslation from "../../hooks/useAppTranslation";
import useAlert from "../../hooks/useAlert";
import { NotificationSettings } from "../../types/types";

export default function NotificationsSection() {
  const translation = useAppTranslation();
  const { setAlert } = useAlert();
  const [settings, setSettings] = useState<NotificationSettings>({
    notifyEmail: null,
    notifyOnFinish: true,
    notifyOnFail: false,
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/notifications")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed");
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setBusy(true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error("Failed");
      }
      const data = await response.json();
      setSettings(data.settings);
      setAlert(translation("alertSettingsSaved"), "success");
    } catch {
      setAlert(translation("alertSettingsFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection
      title={translation("notificationsSection")}
      description={translation("notificationsSectionDescription")}
    >
      {loading ? (
        <div className="text-sm text-description">{translation("loading")}</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-description">
              {translation("notifyEmail")}
            </div>
            <Input
              value={settings.notifyEmail ?? ""}
              onValueChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  notifyEmail: value || null,
                }))
              }
              placeholder={translation("notifyEmail")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.notifyOnFinish}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  notifyOnFinish: event.target.checked,
                }))
              }
            />
            {translation("notifyOnFinish")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.notifyOnFail}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  notifyOnFail: event.target.checked,
                }))
              }
            />
            {translation("notifyOnFail")}
          </label>
          <div>
            <Button color="primary" isProcessing={busy} onClick={onSave}>
              {translation("save")}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
