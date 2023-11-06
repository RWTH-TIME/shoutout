import { Alert, AlertClassKey, AlertColor, Snackbar } from "@mui/material";
import useAlert from "../../hooks/useAlert";

const AlertPopup = () => {
  const { text, type } = useAlert();
  const vertical = "bottom";
  const horizontal = "center";
  if (text && type) {
    return (
      <div
        style={{
          position: "fixed",
          zIndex: 5000,
        }}
      >
        <Snackbar
          anchorOrigin={{ vertical, horizontal }}
          open={true}
          message={text}
        >
          <Alert severity={type as AlertColor}>{text}</Alert>
        </Snackbar>
      </div>
    );
  } else {
    return <></>;
  }
};

export default AlertPopup;
