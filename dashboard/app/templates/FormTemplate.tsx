import {
  Button,
  InputLabelProps,
  Stack,
  TextField,
  MenuItem,
  TextFieldVariants,
} from "@mui/material";
import { ChangeEvent } from "react";
import { useState } from "react";
import useValidation from "../hooks/useValidation";
import useAlert from "../hooks/useAlert";

type Input<T> = {
  name: keyof T;
  type: string;
  label: string;
  required: boolean;
  validationType?: string;
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

type FormTemplateProps<T> = {
  inputs: Input<T>[];
  emptyState: T;
  addFunction: (obj: T) => Promise<boolean>;
  abortFunction: () => void;
};

type ValidationErrors<T> = {
  [K in keyof T]?: string | undefined;
};

const TEXT_FIELD_PROPS = {
  id: "outlined-basic",
  variant: "outlined" as TextFieldVariants,
  margin: "dense" as const,
};

const SUBMIT_BUTTON_TEXT = "Hinzufügen";
const ABORT_BUTTON_TEXT = "Abbrechen";

/** This function is a Template for creating Forms, for creating objects, to define a form just have a look on the inputs type 
  Be careful to use material ui texfield types and pass the right object type to the component
**/
export function FormTemplate<T>({
  inputs,
  emptyState,
  addFunction,
  abortFunction,
}: FormTemplateProps<T>) {
  const [formData, setFormData] = useState<T>(emptyState);
  const { validateInput, validateAll, NUMBERS } = useValidation();
  const [validationError, setValidationError] = useState<ValidationErrors<T>>(
    {}
  );
  const { setAlert } = useAlert();

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    validationType: string | undefined,
    required: boolean | undefined
  ) => {
    const inputElement = e.target as HTMLInputElement | HTMLTextAreaElement;
    const { name } = inputElement;
    let value: string | File | undefined = undefined;

    if (
      inputElement instanceof HTMLInputElement &&
      inputElement.type === "file"
    )
      value = inputElement.files?.[0];
    else value = inputElement.value;

    if (validationType) {
      // If validationType is set, validate Input
      const inputStr = value instanceof File ? value.name : value;
      const error = validateInput(validationType, inputStr, required);
      if (error !== undefined) {
        setValidationError((prevState) => ({
          ...prevState,
          [name]: error,
        }));
      } else {
        // If the error disappears, delete the key from validationError Obj
        const cleanedObj = { ...validationError };
        delete (cleanedObj as any)[name];
        setValidationError(cleanedObj);
      }
    }

    setFormData((prevState) => ({
      ...prevState,
      [name]: validationType === NUMBERS ? parseInt(value as string) : value,
    }));
  };

  async function submitForm() {
    // Check if all fields are valid
    setValidationError(validateAll<T>(inputs, formData));
    if (
      Object.keys(validateAll<T>(inputs, formData)).length === 0 &&
      Object.keys(validationError).length === 0
    ) {
      const success = await addFunction(formData);

      if (success) {
        abortFunction();
        setAlert("Der Eintrag wurde erfolgreich hinzugefügt!", "success");
      } else {
        setAlert("Beim Hinzufügen ist etwas schiefgelaufen!", "error");
      }
    } else {
      setAlert("Überprüfen Sie ihre Eingaben", "error");
    }
  }

  const abortForm = () => {
    abortFunction();
  };

  return (
    <div>
      <Stack direction="column">
        {inputs.map((input, idx) => {
          const commonProps = {
            ...TEXT_FIELD_PROPS,
            name: input.name as string,
            type: input.type,
            label: input.label,
            required: input.required,
            InputLabelProps: input.inputLabelProps,
            onChange: (
              e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => {
              handleChange(e, input.validationType, input.required);
            },
            helperText: validationError[input.name],
            error: !!validationError[input.name],
          };

          if (input.type === "file") {
            return (
              <TextField
                key={idx}
                inputProps={input.inputProps}
                {...commonProps}
              ></TextField>
            );
          } else {
            return (
              <TextField
                key={idx}
                select={input.type === "select"}
                value={formData[input.name] === 0 ? "" : formData[input.name]}
                {...commonProps}
              >
                {input.selectOptions?.map((opt, idx) => (
                  <MenuItem key={idx} value={opt.value}>
                    {opt.name}
                  </MenuItem>
                ))}
              </TextField>
            );
          }
        })}
      </Stack>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 1 }}
        justifyContent="space-around"
      >
        <Button
          fullWidth
          variant="contained"
          color="success"
          onClick={submitForm}
        >
          {SUBMIT_BUTTON_TEXT}
        </Button>
        <Button fullWidth variant="contained" color="error" onClick={abortForm}>
          {ABORT_BUTTON_TEXT}
        </Button>
      </Stack>
    </div>
  );
}
