import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolCallLabel unit tests ---

test("getToolCallLabel: str_replace_editor create", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/src/Card.jsx" })).toBe("Editing Card.jsx");
});

test("getToolCallLabel: str_replace_editor insert", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/index.js" })).toBe("Editing index.js");
});

test("getToolCallLabel: str_replace_editor view", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/utils.ts" })).toBe("Reading utils.ts");
});

test("getToolCallLabel: str_replace_editor unknown command falls back to Editing", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolCallLabel: file_manager rename", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming old.jsx to new.jsx");
});

test("getToolCallLabel: file_manager delete", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "/Button.jsx" })).toBe("Deleting Button.jsx");
});

test("getToolCallLabel: unknown tool returns toolName as-is", () => {
  expect(getToolCallLabel("some_other_tool", {})).toBe("some_other_tool");
});

// --- ToolCallBadge rendering tests ---

test("ToolCallBadge shows label for create command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallBadge shows label for str_replace command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/Card.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

test("ToolCallBadge shows spinner when not done", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows green dot when result is present", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="ok"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows spinner when state is result but result is null", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result={null}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge renders file_manager rename label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/old.jsx", new_path: "/new.jsx" }}
      state="result"
      result="ok"
    />
  );
  expect(screen.getByText("Renaming old.jsx to new.jsx")).toBeDefined();
});

test("ToolCallBadge renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/Unused.jsx" }}
      state="result"
      result="ok"
    />
  );
  expect(screen.getByText("Deleting Unused.jsx")).toBeDefined();
});
