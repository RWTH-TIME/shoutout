'use client';

import { useState } from "react";
import { Box } from "@mui/material";
import AlertPopup from "./utils/Alert";
import ContentBox from "./ContentBox";
import SideBar from "./SideBar";
import { Job } from "../types/types";
import { AlertProvider } from "../context/AlertContext";

export default function HomeClient() {
  const [selectedJob, setSelectedJob] = useState<Job>();
  const [jobList, setJobList] = useState<Job[] | undefined>([]);

  return (
    <AlertProvider>
      <AlertPopup />
      <Box display="flex">
        <Box width={{ xs: "100%", md: "300px" }} flexShrink={0}>
          <SideBar
            setSelectedJob={setSelectedJob}
            jobList={jobList}
            setJobList={setJobList}
          />
        </Box>
        <Box flexGrow={1}>
          <ContentBox
            setSelectedJob={setSelectedJob}
            jobDetail={selectedJob}
          />
        </Box>
      </Box>
    </AlertProvider>
  );
}
