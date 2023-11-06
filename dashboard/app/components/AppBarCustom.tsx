"use client";
import { AppBar, Typography } from "@mui/material";

const APP_TITLE = "Shoutout";

export default function AppBarCustom() {
  return (
    <AppBar style={{ padding: "15px", display: "block", position: "sticky" }}>
      <Typography variant="h6" component="div">
        {APP_TITLE}
      </Typography>
    </AppBar>
  );
}
