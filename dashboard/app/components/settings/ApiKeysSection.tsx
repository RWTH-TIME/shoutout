"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  CopyToClipboardWrapper,
  Input,
  useLocalization,
} from "@helpwave/hightide";
import { formatDateTime } from "../../utils/date";
import useAppTranslation from "../../hooks/useAppTranslation";
import SettingsSection from "./SettingsSection";
import CodeSnippet from "./CodeSnippet";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
};

export default function ApiKeysSection() {
  const translation = useAppTranslation();
  const { locale } = useLocalization();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const mcpUrl = origin ? `${origin}/api/mcp` : "/api/mcp";
  const baseUrl = origin || "https://shoutout.example.com";

  const mcpConfig = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            shoutout: {
              url: mcpUrl,
              headers: {
                Authorization: "Bearer ${SHOUTOUT_KEY}",
              },
            },
          },
        },
        null,
        2
      ),
    [mcpUrl]
  );

  const curlExamples = useMemo(
    () =>
      [
        `export SHOUTOUT_KEY="so_xxx_yyy"`,
        `export SHOUTOUT_URL="${baseUrl}"`,
        ``,
        `curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" \\`,
        `  "$SHOUTOUT_URL/api/v1/models"`,
        ``,
        `curl -s -X POST "$SHOUTOUT_URL/api/v1/jobs" \\`,
        `  -H "Authorization: Bearer $SHOUTOUT_KEY" \\`,
        `  -F "file=@meeting.mp3" -F "name=weekly-standup" \\`,
        `  -F "model=large-v3" -F "participants=3" -F "language=en"`,
        ``,
        `curl -s -H "Authorization: Bearer $SHOUTOUT_KEY" \\`,
        `  "$SHOUTOUT_URL/api/v1/jobs/weekly-standup"`,
        ``,
        `curl -L -H "Authorization: Bearer $SHOUTOUT_KEY" \\`,
        `  "$SHOUTOUT_URL/api/v1/jobs/weekly-standup/result" \\`,
        `  -o weekly-standup.zip`,
      ].join("\n"),
    [baseUrl]
  );

  async function loadKeys() {
    const response = await fetch("/api/keys");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setKeys(data.keys ?? []);
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  async function createKey() {
    setBusy(true);
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setCreatedToken(data.token);
      await loadKeys();
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    await loadKeys();
  }

  return (
    <SettingsSection
      title={translation("apiKeysSection")}
      description={translation("apiKeysSectionDescription")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={name}
            onValueChange={setName}
            placeholder={translation("keyName")}
            autoComplete="off"
          />
          <Button
            color="primary"
            isProcessing={busy}
            disabled={!name.trim() || busy}
            onClick={createKey}
          >
            {translation("createKey")}
          </Button>
        </div>

        {createdToken ? (
          <div className="flex flex-col gap-2 rounded-lg border border-positive/40 bg-positive/10 p-3 text-sm">
            <p className="text-description">{translation("tokenShownOnce")}</p>
            <div className="flex items-start gap-2">
              <code className="min-w-0 flex-1 break-all">{createdToken}</code>
              <CopyToClipboardWrapper textToCopy={createdToken}>
                <Button coloringStyle="tonal" size="sm">
                  {translation("copyToken")}
                </Button>
              </CopyToClipboardWrapper>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-divider px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{key.name}</div>
                <div className="text-xs text-description">
                  so_{key.prefix}_… ·{" "}
                  {translation("keyCreated", {
                    date: formatDateTime(key.createdAt, locale),
                  })}
                </div>
              </div>
              <Button
                color="negative"
                coloringStyle="text"
                onClick={() => revokeKey(key.id)}
              >
                {translation("revoke")}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-divider pt-4">
          <h3 className="font-medium">{translation("apiUsageTitle")}</h3>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {translation("apiMcpEndpoint")}
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-divider bg-surface-variant px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-sm">{mcpUrl}</code>
              <CopyToClipboardWrapper textToCopy={mcpUrl}>
                <Button coloringStyle="text" size="xs">
                  {translation("copyToken")}
                </Button>
              </CopyToClipboardWrapper>
            </div>
            <p className="text-xs text-description">
              {translation("apiMcpTools")}
            </p>
          </div>

          <CodeSnippet
            label={translation("apiMcpConfig")}
            code={mcpConfig}
          />
          <CodeSnippet
            label={translation("apiCurlExamples")}
            code={curlExamples}
          />
        </div>
      </div>
    </SettingsSection>
  );
}
