"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@helpwave/hightide";
import { formatDateTime } from "../utils/date";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ApiKeysModal({ isOpen, onClose }: Props) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("automation");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadKeys() {
    const response = await fetch("/api/keys");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setKeys(data.keys ?? []);
  }

  useEffect(() => {
    if (isOpen) {
      void loadKeys();
      setCreatedToken(null);
    }
  }, [isOpen]);

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      titleElement="API keys"
      description="Use the same bearer token for REST and MCP. The secret is shown only once."
      isModal
      position="center"
      containerClassName="max-w-2xl w-full"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onValueChange={setName}
            placeholder="Key name"
          />
          <Button color="primary" isProcessing={busy} onClick={createKey}>
            Create
          </Button>
        </div>

        {createdToken ? (
          <div className="rounded-lg border border-positive/40 bg-positive/10 p-3 text-sm break-all">
            {createdToken}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{key.name}</div>
                <div className="text-xs opacity-70">
                  so_{key.prefix}_… · created {formatDateTime(key.createdAt)}
                </div>
              </div>
              <Button
                color="negative"
                coloringStyle="text"
                onClick={() => revokeKey(key.id)}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
