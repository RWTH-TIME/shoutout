import { Job } from "../../types/types";
import useJobs from "../../hooks/useJob";
import useAlert from "../../hooks/useAlert";
import {
  LinearProgress,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  TypographyProps,
  CircularProgress,
} from "@mui/material";
import { GetApp } from "@mui/icons-material";
import { useState } from "react";

type JobDetailProps = {
  jobDetail: Job | undefined;
};
const DEFAULT = "Automatisch";
const NAME_HEADER = "Name";
const PARTICIPANTS_HEADER = "Number of Participants";
const LANG_HEADER = "Sprache";
const DOWNLOAD_HEADER = "Download";
const TYPOGRAPHY_PROPS: TypographyProps = {
  variant: "body2",
  color: "text.secondary",
  sx: {
    fontSize: 16,
  },
};

/** This function contains the logicalContext belonging to a task/job */
export default function JobDetail({ jobDetail }: JobDetailProps) {
  const { getStatusColor, LANGUAGE_DATA, downloadFile } = useJobs();
  const { setAlert } = useAlert();
  
  const [downloadLoading, setDownloadLoading] = useState(false);

  async function onDownload() {
    if (jobDetail?.status != "FINISHED") {
      return;
    }

    try {
      setDownloadLoading(true);
      const link = document.createElement("a");
      link.href = await downloadFile(jobDetail);
      link.click();
    } catch (error) {
      setAlert("Beim Download ist etwas schiefgelaufen!", "error");
    } finally {
      setDownloadLoading(false);
    }
  }

  function getLanguage(): string {
    const langObj = LANGUAGE_DATA.find(
      (lang) => lang.value === jobDetail?.language
    );

    if (langObj) return langObj.name;
    else return DEFAULT;
  }

  if (jobDetail) {
    return(
        <Card variant="outlined">
            <LinearProgress
                color={
                getStatusColor(jobDetail.status) === "default"
                    ? "info"
                    : (getStatusColor(jobDetail.status) as "success" | "error")
                }
                variant="determinate"
                value={100}
            />
            <CardContent>
                <Stack spacing={{ xs: 1, sm: 2, md: 2 }}>
                <Typography {...TYPOGRAPHY_PROPS}>{NAME_HEADER}</Typography>
                {jobDetail.name}
                <Typography {...TYPOGRAPHY_PROPS}>{PARTICIPANTS_HEADER}</Typography>
                {jobDetail.participants ? jobDetail.participants : DEFAULT}
                <Typography {...TYPOGRAPHY_PROPS}>{LANG_HEADER}</Typography>
                {getLanguage()}
                <Button
                    variant="contained"
                    size="large"
                    startIcon={downloadLoading ? <></> : <GetApp />}
                    disabled={jobDetail?.status !== "FINISHED"}
                    onClick={onDownload}
                >
                    {downloadLoading ? (
                    <CircularProgress size={26} color="inherit" />
                    ) : (
                    DOWNLOAD_HEADER
                    )}
                </Button>
                </Stack>
            </CardContent>
        </Card>
    )
  }else{
    return(
        <></>
    )
  }
}
