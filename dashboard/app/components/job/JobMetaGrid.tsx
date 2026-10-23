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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <div className="text-xs uppercase tracking-wide text-description">
          {translation("model")}
        </div>
        <div>{job.model || "—"}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-description">
          {translation("language")}
        </div>
        <div>{languageLabel(job.language, translation)}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-description">
          {translation("participants")}
        </div>
        <div>{job.participants ? job.participants : translation("auto")}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-description">
          {translation("created")}
        </div>
        <div>{formatDateTime(job.createdAt, locale)}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-description">
          {translation("expires")}
        </div>
        <div>
          {job.expiresAt
            ? formatDateTime(job.expiresAt, locale)
            : translation("neverExpires")}
        </div>
      </div>
      {job.files && job.files.length > 0 ? (
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("files")}
          </div>
          <div>{job.files.length}</div>
        </div>
      ) : null}
    </div>
  );
}
