"use client";

import { useEffect, useState } from "react";
import { Button, Input, LabelledCheckbox } from "@helpwave/hightide";
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
          <LabelledCheckbox
            checkPosition="left"
            size="md"
            label={translation("notifyOnFinish")}
            value={settings.notifyOnFinish}
            onValueChange={(notifyOnFinish) =>
              setSettings((current) => ({
                ...current,
                notifyOnFinish,
              }))
            }
          />
          <LabelledCheckbox
            checkPosition="left"
            size="md"
            label={translation("notifyOnFail")}
            value={settings.notifyOnFail}
            onValueChange={(notifyOnFail) =>
              setSettings((current) => ({
                ...current,
                notifyOnFail,
              }))
            }
          />
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
