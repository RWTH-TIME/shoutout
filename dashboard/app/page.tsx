"use client"

import ContentBox from "./components/ContentBox";
import { Job } from "./types/types";
import { AlertProvider } from "./context/AlertContext";
import AlertPopup from "./components/utils/Alert";

import { Box } from "@mui/material";
import { useState } from "react";
import SideBar from "./components/SideBar"; // Assuming this exists

/** This function represents the Home-Screen */
export default function Home() {
  const [selectedJob, setSelectedJob] = useState<Job>();
  const [jobList, setJobList] = useState<Job[]>();

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
        <Box flexGrow={1} >
          <ContentBox
            setSelectedJob={setSelectedJob}
            jobDetail={selectedJob}
          />
        </Box>
      </Box>
    </AlertProvider>
  );
}

