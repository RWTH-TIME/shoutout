import { useState, useEffect } from "react";
import useJobs from "../hooks/useJob";

import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import JobList from "./SideBarComponents/JobList";
import CreateJobModal from "./SideBarComponents/CreateJobModal";
import AddIcon from "@mui/icons-material/Add";
import { Job } from "../types/types";

const ADD_JOB_TEXT = "Job hinzufügen";

type SideBarProps = {
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | undefined>>;
};

/** This function is the SideBar, it contains the job/task list */
export default function SideBar({ setSelectedJob }: SideBarProps) {
  //Get all Jobs
  const { jobs } = useJobs();
  const [jobList, setJobList] = useState<Job[]>();
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setJobList(jobs);
  }, [jobs]);

  return (
    <div
      style={{ backgroundColor: "#f5f5f5", padding: "10px", height: "100vh" }}
    >
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => {
            setModalOpen(true);
          }}
        >
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary={ADD_JOB_TEXT} />
        </ListItemButton>
      </ListItem>
      <JobList jobs={jobList} setSelectedJob={setSelectedJob} />
      <CreateJobModal isOpen={modalOpen} setOpen={setModalOpen} />
    </div>
  );
}
