"use client";

import { useState } from "react";
import useAppTranslation from "../hooks/useAppTranslation";
import AudioDropzone from "./upload/AudioDropzone";
import CreateJobModal from "./SideBarComponents/CreateJobModal";

export default function ContentBox() {
  const translation = useAppTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [initialFiles, setInitialFiles] = useState<File[]>([]);

  return (
    <>
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-description">{translation("selectJob")}</p>
        <div className="w-full max-w-xl">
          <AudioDropzone
            onFilesAdded={(files) => {
              setInitialFiles(files);
              setCreateOpen(true);
            }}
          />
        </div>
      </div>
      <CreateJobModal
        isOpen={createOpen}
        setOpen={setCreateOpen}
        initialFiles={initialFiles}
        onInitialFilesConsumed={() => setInitialFiles([])}
      />
    </>
  );
}
