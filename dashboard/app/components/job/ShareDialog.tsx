"use client";

import { useMemo, useState } from "react";
import { Button, Dialog } from "@helpwave/hightide";
import { Check, Copy, Globe, Lock, Users } from "lucide-react";
import { Job, Visibility } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import useAlert from "../../hooks/useAlert";
import useJobs from "../../hooks/useJob";

type Props = {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (job: Job) => void;
};

const options: Array<{
  value: Visibility;
  icon: typeof Lock;
  titleKey:
    | "visibilityPrivate"
    | "visibilityAuthenticated"
    | "visibilityPublic";
  hintKey:
    | "visibilityPrivateHint"
    | "visibilityAuthenticatedHint"
    | "visibilityPublicHint";
}> = [
  {
    value: "PRIVATE",
    icon: Lock,
    titleKey: "visibilityPrivate",
    hintKey: "visibilityPrivateHint",
  },
  {
    value: "AUTHENTICATED",
    icon: Users,
    titleKey: "visibilityAuthenticated",
    hintKey: "visibilityAuthenticatedHint",
  },
  {
    value: "PUBLIC",
    icon: Globe,
    titleKey: "visibilityPublic",
    hintKey: "visibilityPublicHint",
  },
];

export default function ShareDialog({
  job,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const translation = useAppTranslation();
  const { setAlert } = useAlert();
  const { updateJob } = useJobs();
  const [visibility, setVisibility] = useState<Visibility>(
    job.visibility ?? "PRIVATE"
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    if (typeof window === "undefined") {
      return `/job/${job.publicId}`;
    }
    return `${window.location.origin}/job/${job.publicId}`;
  }, [job.publicId]);

  async function onSave(next: Visibility) {
    setVisibility(next);
    setBusy(true);
    try {
      const updated = await updateJob(job.publicId, { visibility: next });
      onUpdated?.(updated);
      setAlert(translation("alertShareUpdated"), "success");
    } catch {
      setAlert(translation("alertShareFailed"), "error");
      setVisibility(job.visibility ?? "PRIVATE");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setAlert(translation("alertCopied"), "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setAlert(translation("alertShareFailed"), "error");
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      titleElement={translation("shareTitle")}
      description={translation("shareDescription")}
      isModal
      position="center"
      className="max-w-md w-full"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const Icon = option.icon;
            const selected = visibility === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={busy}
                onClick={() => onSave(option.value)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-divider hover:bg-surface-hover"
                }`}
              >
                <Icon size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">
                    {translation(option.titleKey)}
                  </div>
                  <div className="text-xs text-description">
                    {translation(option.hintKey)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            className="min-w-0 flex-1 rounded-lg border border-divider bg-surface px-3 py-2 text-sm"
          />
          <Button color="primary" coloringStyle="outline" onClick={onCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span className="ms-1">{translation("copyLink")}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
