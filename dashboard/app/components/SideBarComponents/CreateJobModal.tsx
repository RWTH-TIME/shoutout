import {
  Modal,
  Box,
  Typography,
  Fade,
  InputLabelProps,
  Switch,
  Stack,
  FormControlLabel,
  InputAdornment,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info"
import { Job, BulkJob, ValidationFunction } from "../../types/types";
import useJobs from "../../hooks/useJob";
import useValidation from "../../hooks/useValidation";
import { FormTemplate } from "../../templates/FormTemplate";
import { useState } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 800,
  bgcolor: "background.paper",
  border: "1px solid #000",
  boxShadow: 24,
  p: 4,
};

type ModalProps = {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type Input<T> = {
  name: keyof T;
  type: string;
  label: string;
  required: boolean;
  useFullWidth: boolean;
  validationType?: string | ValidationFunction;
  inputLabelProps?: InputLabelProps;
  selectOptions?: selectOptions[];
  helperText?: string;
  inputProps?: {
    accept?: string;
    endAdornment?: any
  };
};

type selectOptions = {
  name: string;
  value: string | number;
};

const MODAL_TITLE = "Neuen Job hinzufügen:";
const NAME_INPUT_LABEL = "Name";
const AUDIO_FILE_LABEL = "Audio File";
const ZIP_FILE_LABEL = "Zip File";
const PARTICIPANTS_INPUT_LABEL = "Teilnehmer";
const PARTICIPANTS_HELPER_TEXT = "0 wenn Sie es nicht eindeutig sagen können";
const LANGUAGE_INPUT_LABEL = "Sprache";
const PASSWORD_INPUT_LABEL = "Passwort";
const PASSWORD_REPEAT_INPUT_LABEL = "Passwort wiederholen";

/** This function is a Modal for creating a Job, it also makes the API-Call */
export default function CreateJobModal({ isOpen, setOpen }: ModalProps) {
  const handleClose = () => setOpen(false);
  const { createJob, LANGUAGE_DATA } = useJobs();
  const { NUMBERS } = useValidation();
  const [ isSingleInput, setIsSingleInput ] = useState(true)
  const [ showPassword, setShowPassword ] = useState(false)
  const [ showPasswordRepeat, setShowPasswordRepeat ] = useState(false)

  const emptyBulkState: BulkJob = {
    name: "",
    audioFile: undefined,
    password: "",
    password_repeat: "",
    status: "PENDING",
  }

  const emptyState: Job = {
    ...emptyBulkState,
    participants: 0,
    language: "",
  }

  const validateName = (data: string) => {
    if (data.length > 10) {
      return "Es sind maximal 10 Zeichen erlaubt"
    } else {
      return true
    }
  }

  const bulkInputs: Input<BulkJob>[] = [
    {
      name: "name",
      type: "text",
      label: NAME_INPUT_LABEL,
      required: true,
      validationType: validateName,
      useFullWidth: true,
    },
    {
      name: "audioFile",
      type: "file",
      label: isSingleInput ? AUDIO_FILE_LABEL : ZIP_FILE_LABEL,
      required: true,
      inputLabelProps: {
        shrink: true,
      },
      inputProps: {
        accept: isSingleInput ? "audio/*" : ".zip",
        endAdornment: isSingleInput ? undefined: 
          (
            <InputAdornment position="end">
              <Tooltip title={
                <div style={{ fontSize: 15 , lineHeight: 1.2}}>
                  <p>{"Die Dateien in der .zip-Datei müssen das folgende Format haben:"}
                  <Typography color="inherit">{"name_AnzahlTeilnehmer_sprache.typ"}</Typography>
                  </p>
                  <p><b>{"Verfügbare Sprachen:"}</b><i>{ " 'de', 'en' "}</i><br/>
                  {"Beispiel: muster_2_de.mp3"}</p>
                  <p><b>{"Falls unsicher, kann 'auto' als Platzhalter verwendet werden."}</b><br/>
                  {"Beispiel: muster_auto_auto.wav"}</p>
                </div>
                } >
                <InfoIcon />
              </Tooltip>
            </InputAdornment>
          )
      
      },
      useFullWidth: true,
    },
    {
      name: "password",
      type: showPassword ? "text" : "password",
      label: PASSWORD_INPUT_LABEL,
      required: false,
      inputProps: {
          accept: ".zip",
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                style={{padding: 0}}
                size="small"
                disableRipple
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
      },
      useFullWidth: false
    },
    {
      name: "password_repeat",
      type: showPasswordRepeat ? "text" : "password",
      label: PASSWORD_REPEAT_INPUT_LABEL,
      required: false,
      inputProps: {
          accept: ".zip",
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                style={{padding: 0}}
                size="small"
                disableRipple
                onClick={() => setShowPasswordRepeat(!showPasswordRepeat)}
              >
                {showPasswordRepeat ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
      },
      useFullWidth: false
    },
  ]

  const inputs: Input<Job>[] = [
    ...bulkInputs,
    {
      name: "participants",
      type: "text",
      label: PARTICIPANTS_INPUT_LABEL,
      required: false,
      helperText: PARTICIPANTS_HELPER_TEXT,
      validationType: NUMBERS,
      useFullWidth: true
    },
    {
      name: "language",
      type: "select",
      label: LANGUAGE_INPUT_LABEL,
      required: false,
      selectOptions: LANGUAGE_DATA,
      useFullWidth: true
    },
  ];

  return (
    <>
      <Modal open={isOpen}>
        <Fade in={isOpen}>
          <Box sx={style}> 
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Typography id="modal-modal-title" variant="h6" component="h2">
                {MODAL_TITLE}
              </Typography>
              <FormControlLabel control={<Switch />} label="Multiple Files" onChange={() => {setIsSingleInput(!isSingleInput)}} checked={!isSingleInput} />
            </Stack>
            { isSingleInput ? 
            <FormTemplate<Job>
              emptyState={emptyState}
              inputs={inputs}
              addFunction={createJob}
              abortFunction={() => {
                handleClose();
              }}
            ></FormTemplate> : 
            <FormTemplate<BulkJob>
              emptyState={emptyBulkState}
              inputs={bulkInputs}
              addFunction={createJob}
              abortFunction={() => {
                handleClose();
              }}
            ></FormTemplate>
            }           
          </Box>
        </Fade>
      </Modal>
    </>
  );
}
