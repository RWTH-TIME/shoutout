"use client";

import SideBar from "./components/SideBar";
import ContentBox from "./components/ContentBox";

import { Job } from "./types/types";
import { AlertProvider } from "./context/AlertContext";
import AlertPopup from "./components/utils/Alert";

import { Grid } from "@mui/material";
import { useState } from "react";

/** This function represents the Home-Screen */
export default function Home() {
  const [selectedJob, setSelectedJob] = useState<Job>();
  const [jobList, setJobList] = useState<Job[]>();

  return (
    <div>
      <AlertProvider>
        <AlertPopup />
        <Grid container spacing="0">
          <Grid item xs={2}>
            <SideBar
              setSelectedJob={setSelectedJob}
              jobList={jobList}
              setJobList={setJobList}
            />
          </Grid>
          <Grid item xs={10}>
            <ContentBox
              setSelectedJob={setSelectedJob}
              jobDetail={selectedJob}
            />
          </Grid>
        </Grid>
      </AlertProvider>
    </div>
  );
}
