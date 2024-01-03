import {
  LinearProgress,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { ChangeEvent, useState } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import useJobs from "../../hooks/useJob";
import { Job } from "../../types/types";

type AuthenticateProps = {
  jobDetail: Job | undefined;
};

/** This function contains the authentication ui */
export default function Authenticate({jobDetail}: AuthenticateProps) {
    const [ showPassword, setShowPassword ] = useState(false)
    const { authenticate } = useJobs()

    const [passwordInput, setPasswordInput] = useState("")

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const inputElement = e.target as HTMLInputElement | HTMLTextAreaElement;
        const value = inputElement.value        
        setPasswordInput(value)
    }

    async function onAuth() {
        if(jobDetail) authenticate(jobDetail, passwordInput);
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
            <Button variant="contained" onClick={onAuth}>
              LogIn
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
}
