import {
  Modal,
  Box,
  Typography,
  Fade,
  InputLabelProps,
  Switch,
  Stack,
  FormControlLabel,
} from "@mui/material";
import { Job, BulkJob, ValidationFunction } from "../../types/types";
import useJobs from "../../hooks/useJob";
import useValidation from "../../hooks/useValidation";
import { FormTemplate } from "../../templates/FormTemplate";
import { useState } from "react";

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
  validationType?: string | ValidationFunction;
  inputLabelProps?: InputLabelProps;
  selectOptions?: selectOptions[];
  helperText?: string;
  inputProps?: {
    accept: string;
  };
};

type selectOptions = {
  name: string;
  value: string | number;
};

const MODAL_TITLE = "Neuen Job hinzufügen:";
const NAME_INPUT_LABEL = "Name";
const AUDIO_FILE_LABEL = "Audio File";
const PARTICIPANTS_INPUT_LABEL = "Teilnehmer";
const PARTICIPANTS_HELPER_TEXT = "0 wenn Sie es nicht eindeutig sagen können";
const LANGUAGE_INPUT_LABEL = "Sprache";

/** This function is a Modal for creating a Job, it also makes the API-Call */
export default function CreateJobModal({ isOpen, setOpen }: ModalProps) {
  const handleClose = () => setOpen(false);
  const { createJob, createBulkJob, LANGUAGE_DATA } = useJobs();
  const { NUMBERS } = useValidation();
  const [ isSingleInput, setIsSingleInput ] = useState(true)

  const emptyState: Job = {
    name: "",
    audioFile: undefined,
    participants: 0,
    language: "",
    status: "PENDING",
  };

  const emptyBulkState: BulkJob = {
    name: "",
    files: undefined,
  }

  const validateName = (data: string) => {
    if (data.length > 10) {
      return "Es sind maximal 10 Zeichen erlaubt"
    } else {
      return true
    }
  }

  const inputs: Input<Job>[] = [
    {
      name: "name",
      type: "text",
      label: NAME_INPUT_LABEL,
      required: true,
      validationType: validateName,
    },
    {
      name: "audioFile",
      type: "file",
      label: AUDIO_FILE_LABEL,
      required: true,
      inputLabelProps: {
        shrink: true,
      },
      inputProps: {
        accept: "audio/*",
      },
    },
    {
      name: "participants",
      type: "text",
      label: PARTICIPANTS_INPUT_LABEL,
      required: false,
      helperText: PARTICIPANTS_HELPER_TEXT,
      validationType: NUMBERS,
    },
    {
      name: "language",
      type: "select",
      label: LANGUAGE_INPUT_LABEL,
      required: false,
      selectOptions: LANGUAGE_DATA,
    },
  ];

  const bulkInputs: Input<BulkJob>[] = [
    {
      name: "name",
      type: "text",
      label: NAME_INPUT_LABEL,
      required: true,
      validationType: validateName,
    },
    {
      name: "files",
      type: "file",
      label: AUDIO_FILE_LABEL,
      required: true,
      inputLabelProps: {
        shrink: true,
      },
      inputProps: {
        accept: "audio/*",
      },
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
              <FormControlLabel control={<Switch />} label="Multiple Files" onChange={() => {setIsSingleInput(!isSingleInput)}} />
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
              addFunction={ createBulkJob }
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
