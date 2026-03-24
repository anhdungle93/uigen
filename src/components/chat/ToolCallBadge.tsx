"use client";

import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "partial-call" | "call" | "result";
  result?: unknown;
}

function getFilename(path: unknown): string {
  if (typeof path !== "string" || !path) return "";
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function getToolCallLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  if (toolName === "str_replace_editor") {
    const command = args.command as string;
    const filename = getFilename(args.path);

    switch (command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename}`;
      case "view":
        return `Reading ${filename}`;
      default:
        return filename ? `Editing ${filename}` : "Editing file";
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string;
    const filename = getFilename(args.path);
    const newFilename = getFilename(args.new_path);

    switch (command) {
      case "rename":
        return `Renaming ${filename} to ${newFilename}`;
      case "delete":
        return `Deleting ${filename}`;
      default:
        return filename ? `Managing ${filename}` : "Managing file";
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolName, args, state, result }: ToolCallBadgeProps) {
  const label = getToolCallLabel(toolName, args);
  const isDone = state === "result" && result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
