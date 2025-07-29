"use client";

import { AppBar, Typography, Avatar, Toolbar, Box } from "@mui/material";
import { useSession } from "next-auth/react";

const APP_TITLE = "Shoutout";

export default function AppBarCustom() {
  const { data: session } = useSession();
  const user = session?.user;

  let issuer: string | undefined;
  if (user) {
    issuer = user.issuer + "/account"
  }

  return (
    <AppBar position="sticky" style={{ padding: "10px 20px" }}>
      <Toolbar style={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6" component="div">
          {APP_TITLE}
        </Typography>

        {user && (
          <Box
            onClick={() => issuer ? window.location.href = `${issuer}` : {}}
            display="flex" alignItems="center" gap={2} sx={{ cursor: "pointer" }}>
            <Typography variant="body1">{user.name}</Typography>
            {user.image && (
              <Box
                sx={{
                  borderRadius: "50%",
                  border: "2px solid white",
                  overflow: "hidden",
                  width: 40,
                  height: 40,
                }}
              >
                <Avatar
                  alt={user.name || "User"}
                  src={user.image}
                  sx={{ width: "100%", height: "100%" }}
                />
              </Box>
            )}
          </Box>
        )}

      </Toolbar>
    </AppBar>
  );
}
