import type { Tool } from "../tool";
import { getAlgorithmTool } from "./get-algorithm";
import { listAlgorithmsTool } from "./list-algorithms";
import { makeLinkTool } from "./make-link";
import { profileInputTool } from "./profile-input";
import { runAlgorithmTool } from "./run-algorithm";

/** Tools that work. Every consumer (MCP server, Advisor, LangGraph) registers exactly this list. */
export const tools: Tool[] = [runAlgorithmTool, makeLinkTool];

/** Tools with a schema and a description but no body yet. Move one up when it is built. */
export const planned: Tool[] = [listAlgorithmsTool, getAlgorithmTool, profileInputTool];

export function findTool(name: string): Tool | undefined {
  return [...tools, ...planned].find((tool) => tool.name === name);
}

export { getAlgorithmTool, listAlgorithmsTool, makeLinkTool, profileInputTool, runAlgorithmTool };
