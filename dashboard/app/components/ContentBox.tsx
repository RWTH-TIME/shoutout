import { Job } from "../types/types";
import JobDetail from "./ContentComponents/JobDetail";
import Authenticate from "./ContentComponents/Authenticate";

type ContentBoxProps = {
  jobDetail: Job | undefined;
};
/** This function contains the logicalContext belonging to a task/job */
export default function ContentBox({ jobDetail }: ContentBoxProps) {
  return (
    <div
      style={{ backgroundColor: "#f2f2f2", padding: "15px", height: "100vh" }}
    >
      {jobDetail?.isProtected && !jobDetail?.isAuth ? (
        <Authenticate jobDetail={jobDetail} />
      ) : (
        <JobDetail jobDetail={jobDetail} />
      )}
    </div>
  );
}
