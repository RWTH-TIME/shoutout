import { InputLabelProps } from "@mui/material";
import { ValidationFunction } from "../types/types";

type validationPattern = {
  type: string;
  pattern: RegExp;
  error: string;
};

type InputConfig<T> = {
  name: keyof T;
  type: string;
  label: string;
  required: boolean;
  validationType?: string | ValidationFunction;
  inputLabelProps?: InputLabelProps;
  selectOptions?: selectOptions[];
  helperText?: string;
  inputProps?: {
    accept?: string;
  };
};

type selectOptions = {
  name: string;
  value: string | number;
};

type ValidationErrors<T> = {
  [K in keyof T]?: string | undefined;
};

/* This hook is to provide validationFunction across components */
export default function useValidation() {
  const NUMBERS = "numbers";

  const validationPatterns: validationPattern[] = [
    {
      type: NUMBERS,
      pattern: /[a-zA-Z]/,
      error: "Die Eingabe muss eine Zahl sein",
    },
  ];

  // test the regex pattern and returns error message or undefined
  function validateInput(
    type: string | ValidationFunction | undefined,
    input: string | undefined,
    required: boolean | undefined
  ) {
    const validationObj = validationPatterns.find((o) => o.type === type);
    if (typeof type === "function") {
      if (type(input) !== true) return type(input) as string
    } else {
      if (validationObj?.pattern && input !== undefined) {
        if (validationObj.pattern.test(input)) {
          return validationObj.error;
        }
      }
    }


    if (required === true && input === undefined)
      return "Bitte wählen Sie eine Audiofile aus";
    else if (required === true && input === "")
      return "Bitte füllen Sie dieses Feld aus";

    return undefined;
  }

  function validateAll<T>(
    inputs: InputConfig<T>[],
    formData: T
  ): ValidationErrors<T> {
    /**This function checks if all inputs are valid, can be used for final checking
          It returns all errors inside a obj
        */
    const errors: ValidationErrors<T> = {};
    
    // Validate Password 
    if(formData["password" as keyof T] !== formData["password_repeat" as keyof T]) errors["password" as keyof T] = "Die Passwörter stimmen nicht überein!"

    inputs.map((obj) => {
      const errMessage = validateInput(
        obj.validationType,
        obj.type === "file"
          ? (formData[obj.name] as File)?.name
          : (formData[obj.name] as string),
        obj.required
      );

      if (errMessage !== undefined) {
        errors[obj.name] = errMessage;
      }
    });

    return errors;
  }

  return {
    validateInput: validateInput,
    validateAll: validateAll,
    NUMBERS,
  };
}
