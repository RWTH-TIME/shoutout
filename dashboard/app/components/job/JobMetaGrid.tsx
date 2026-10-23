"use client";

import { useLocalization } from "@helpwave/hightide";
import { Job } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import { languageLabel } from "../../utils/languages";
import { formatDateTime } from "../../utils/date";

type Props = {
  job: Job;
};

export default function JobMetaGrid({ job }: Props) {
  const translation = useAppTranslation();
  const { locale } = useLocalization();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-semibold">{translation("details")}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("model")}
          </div>
          <div className="mt-1">{job.model || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("language")}
          </div>
          <div className="mt-1">{languageLabel(job.language, translation)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("participants")}
          </div>
          <div className="mt-1">
            {job.participants ? job.participants : translation("auto")}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("created")}
          </div>
          <div className="mt-1">{formatDateTime(job.createdAt, locale)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("expires")}
          </div>
          <div className="mt-1">
            {job.expiresAt
              ? formatDateTime(job.expiresAt, locale)
              : translation("neverExpires")}
          </div>
        </div>
      </div>
    </div>
  );
}
