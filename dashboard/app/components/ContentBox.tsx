import { Job } from "../types/types";
import useJobs from "../hooks/useJob";
import useAlert from "../hooks/useAlert";
import {
  LinearProgress,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  TypographyProps,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { DeleteOutlined, GetApp, } from "@mui/icons-material";
import { useState } from "react";

type ContentBoxProps = {
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
export default function ContentBox({ jobDetail }: ContentBoxProps) {
  const { setAlert } = useAlert();
  const { getStatusColor, LANGUAGE_DATA, downloadFile, deleteJob } = useJobs();
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

  async function delJob() {
    // TODO: unselect the selected job
    const success = await deleteJob(jobDetail)
  }

  if (jobDetail) {
    return (
      <div
        style={{ backgroundColor: "#f2f2f2", padding: "15px", height: "100vh" }}
      >
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
              <Stack direction="row" justifyContent="space-between">
                <div>
                  <Typography {...TYPOGRAPHY_PROPS}>{NAME_HEADER}</Typography>
                  {jobDetail.name}
                </div>
                { jobDetail?.status != "RUNNING" ? 
                  <IconButton aria-label="settings" onClick={delJob}>
                    <DeleteOutlined color="error" sx={{ fontSize: 30 }} />
                  </IconButton> : 
                  <></> 
                }
              </Stack>
              <Typography {...TYPOGRAPHY_PROPS}>
                {PARTICIPANTS_HEADER}
              </Typography>
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
      </div>
    );
  } else {
    return (
      <div
        style={{ backgroundColor: "#f2f2f2", padding: "15px", height: "100vh" }}
      ></div>
    );
  }
}
