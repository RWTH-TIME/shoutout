import {
  LinearProgress,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { ChangeEvent, useState } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import useJobs from "../../hooks/useJob";
import { Job } from "../../types/types";
import useAlert from "../../hooks/useAlert";

type AuthenticateProps = {
  jobDetail: Job | undefined;
  setAuthenticationArray: React.Dispatch<React.SetStateAction<Array<string>>>;
};

const SUBMIT_BUTTON_TEXT = "LogIn";

/** This function contains the authentication ui */
export default function Authenticate({jobDetail, setAuthenticationArray}: AuthenticateProps) {
    const { authenticate } = useJobs();
    const { setAlert } = useAlert();
  
    const [showPassword, setShowPassword] = useState(false)
    const [passwordInput, setPasswordInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const inputElement = e.target as HTMLInputElement | HTMLTextAreaElement;
        const value = inputElement.value        
        setPasswordInput(value)
    }

    async function onAuth() {
      setIsLoading(true);
      if(!jobDetail) return
      const success = await authenticate(jobDetail, passwordInput);
      if (success) setAuthenticationArray((old) => [...old, jobDetail.name]);
      else setAlert("Falsches Passwort!", "error")
      setIsLoading(false);
    }

    return (
      <Card variant="outlined">
        <LinearProgress color={"error"} variant="determinate" value={100} />
        <CardContent>
          <Stack
            spacing={{ xs: 1, sm: 2, md: 2 }}
            alignContent="center"
            justifyContent="center"
          >
            {jobDetail?.name}
            <br />
            <TextField
              type={showPassword ? "text" : "Password"}
              label="passwort"
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      style={{ padding: 0 }}
                      size="small"
                      disableRipple
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" onClick={onAuth} disabled={isLoading}>
              {isLoading ? <CircularProgress size={25} /> : SUBMIT_BUTTON_TEXT}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
}
