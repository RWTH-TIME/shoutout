import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  ListItemIcon,
} from "@mui/material";

import { Job } from "../../types/types";
import useJobs from "../../hooks/useJob";

type JobListProps = {
  jobs: Job[] | undefined;
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | undefined>>;
};

/** In this Function all Jobs will be listed */
export default function JobList({ jobs, setSelectedJob }: JobListProps) {
  const { getStatusColor } = useJobs();

  const sortedJobs = [...(jobs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <List>
      {sortedJobs?.map((job, idx) => (
        <div key={idx}>
          <ListItem
            disablePadding
            onClick={(e) => {
              console.log(e);
              setSelectedJob(job);
            }}
          >
            <ListItemButton style={{ padding: "15px" }}>
              <ListItemText primary={job.name}></ListItemText>
              <ListItemIcon>
                <Chip label={job.status} color={getStatusColor(job.status)} />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
          <Divider />
        </div>
      ))}
    </List>
  );
}
