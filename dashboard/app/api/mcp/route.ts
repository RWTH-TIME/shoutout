import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { Status } from "@prisma/client";
import { authenticate } from "../../lib/auth";
import { LANGUAGE_OPTIONS } from "../../utils/languages";
import { listAvailableModels } from "../../services/models";
import {
  createJob,
  deleteJobForOwner,
  getDownloadUrlForJob,
  getJobByName,
  listJobsByOwner,
} from "../../services/jobService";
import { presignUpload } from "../../lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function buildServer(owner: string, email?: string | null) {
  const server = new McpServer({
    name: "shoutout",
    version: "0.2.0",
  });

  server.tool("list_languages", "List supported transcription languages", {}, async () => ({
    content: [{ type: "text", text: JSON.stringify(LANGUAGE_OPTIONS) }],
  }));

  server.tool(
    "list_models",
    "List Whisper models currently offered by attached workers",
    {},
    async () => ({
      content: [
        { type: "text", text: JSON.stringify(await listAvailableModels()) },
      ],
    })
  );

  server.tool(
    "request_upload",
    "Create a presigned upload URL and uploadRef for Garage",
    {
      fileName: z.string(),
      contentType: z.string().optional(),
    },
    async ({ fileName }) => {
      const extension = fileName.includes(".")
        ? fileName.slice(fileName.lastIndexOf("."))
        : "";
      const uploadRef = `${crypto.randomUUID()}${extension}`;
      const url = await presignUpload(uploadRef);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ uploadRef, presignedUrl: url }),
          },
        ],
      };
    }
  );

  const fileInputSchema = z.object({
    uploadRef: z.string(),
    originalName: z.string().optional(),
    participants: z.number().int().nonnegative().optional(),
    language: z.string().optional(),
  });

  server.tool(
    "create_job",
    "Create a transcription job from one or more uploaded file references",
    {
      name: z.string(),
      model: z.string(),
      participants: z.number().int().nonnegative().optional(),
      language: z.string().optional(),
      notifyEmail: z.string().email().optional(),
      notifyEnabled: z.boolean().optional(),
      uploadRef: z.string().optional(),
      uploadRefs: z.array(fileInputSchema).optional(),
    },
    async (args) => {
      const files =
        args.uploadRefs && args.uploadRefs.length > 0
          ? args.uploadRefs.map((item) => ({
              audioFile: item.uploadRef,
              originalName: item.originalName || item.uploadRef,
              participants: item.participants,
              language: item.language,
            }))
          : args.uploadRef
            ? [
                {
                  audioFile: args.uploadRef,
                  originalName: args.name,
                  participants: args.participants,
                  language: args.language,
                },
              ]
            : [];
      if (files.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "uploadRef or uploadRefs required" }),
            },
          ],
          isError: true,
        };
      }
      const job = await createJob({
        name: args.name,
        model: args.model,
        participants: args.participants,
        language: args.language,
        notifyEmail: args.notifyEmail || email || undefined,
        notifyEnabled: args.notifyEnabled,
        owner,
        files,
      });
      return { content: [{ type: "text", text: JSON.stringify(job) }] };
    }
  );

  server.tool(
    "create_jobs_bulk",
    "Create multiple separate transcription jobs",
    {
      jobs: z.array(
        z.object({
          uploadRef: z.string(),
          name: z.string(),
          model: z.string(),
          participants: z.number().int().nonnegative().optional(),
          language: z.string().optional(),
          notifyEmail: z.string().email().optional(),
        })
      ),
    },
    async ({ jobs }) => {
      const created = [];
      const errors = [];
      for (const item of jobs) {
        try {
          created.push(
            await createJob({
              name: item.name,
              model: item.model,
              participants: item.participants,
              language: item.language,
              notifyEmail: item.notifyEmail || email || undefined,
              owner,
              files: [
                {
                  audioFile: item.uploadRef,
                  originalName: item.name,
                  participants: item.participants,
                  language: item.language,
                },
              ],
            })
          );
        } catch (error) {
          errors.push({
            name: item.name,
            error: error instanceof Error ? error.message : "Failed",
          });
        }
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ created, errors }) }],
      };
    }
  );

  server.tool(
    "list_jobs",
    "List jobs for the authenticated user",
    {
      status: z.enum(["PENDING", "RUNNING", "FINISHED", "FAILED"]).optional(),
    },
    async ({ status }) => {
      const jobs = await listJobsByOwner(
        owner,
        status as Status | undefined
      );
      return { content: [{ type: "text", text: JSON.stringify(jobs) }] };
    }
  );

  server.tool(
    "get_job",
    "Get a job by name",
    { name: z.string() },
    async ({ name }) => {
      const job = await getJobByName(name);
      if (!job || job.owner !== owner) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Not found" }) }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(job) }] };
    }
  );

  server.tool(
    "delete_job",
    "Delete a job by name",
    { name: z.string() },
    async ({ name }) => {
      const deleted = await deleteJobForOwner(name, owner);
      return { content: [{ type: "text", text: JSON.stringify(deleted) }] };
    }
  );

  server.tool(
    "download_job_result",
    "Get a presigned download URL for a finished job",
    { name: z.string() },
    async ({ name }) => {
      const url = await getDownloadUrlForJob(name, owner);
      return {
        content: [{ type: "text", text: JSON.stringify({ presignedUrl: url }) }],
      };
    }
  );

  return server;
}

async function handleMcp(request: NextRequest): Promise<Response> {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = await buildServer(auth.owner, auth.email);
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
