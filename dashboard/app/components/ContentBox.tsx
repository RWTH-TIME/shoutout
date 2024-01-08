import { Job } from "../types/types";
import JobDetail from "./ContentComponents/JobDetail";
import Authenticate from "./ContentComponents/Authenticate";
import { useState } from "react";

type ContentBoxProps = {
  jobDetail: Job | undefined;
};

/** This function contains the logicalContext belonging to a task/job */
export default function ContentBox({ jobDetail }: ContentBoxProps) {
  // authenticationArray should contain the names of the authenticated jobs in the "session"
  // TODO: use job uuid in the future (issue#24)
  const [authenticationArray, setAuthenticationArray] = useState<Array<string>>([]) 

  function isAuthenticated() {
    return (
      !jobDetail?.isProtected ||
      (jobDetail.isProtected && authenticationArray.includes(jobDetail.name))
    );
  }


  if(jobDetail) {
    return (
      <div
        style={{ backgroundColor: "#f2f2f2", padding: "15px", height: "100vh" }}
      >
        {!isAuthenticated() ? (
          <Authenticate
            jobDetail={jobDetail}
            setAuthenticationArray={setAuthenticationArray}
          />
        ) : (
          <JobDetail jobDetail={jobDetail} />
        )}
      </div>
    );
  }else {
    return (
      <></>
    )
  }
  
}
