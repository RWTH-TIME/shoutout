import { createContext, useState, ReactNode } from "react";

type initialStateType = {
  text: string;
  type: string;
};

const ALERT_TIME = 5000;
const initialState: initialStateType = {
  text: "",
  type: "",
};

const AlertContext = createContext<{
  text: string;
  type: string;
  setAlert: (text: string, type: string) => void;
}>({
  ...initialState,
  setAlert: () => {
    console.log("empty setAlert");
  },
});

export const AlertProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [text, setText] = useState("");
  const [type, setType] = useState("");

  const setAlert = (text: string, type: string) => {
    setText(text);
    setType(type);
    setTimeout(() => {
      setText("");
      setType("");
    }, ALERT_TIME);
  };

  return (
    <AlertContext.Provider
      value={{
        text,
        type,
        setAlert,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export default AlertContext;
