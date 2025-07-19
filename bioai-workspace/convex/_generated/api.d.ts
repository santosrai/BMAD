/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiWorkflows from "../aiWorkflows.js";
import type * as apiKeys from "../apiKeys.js";
import type * as apiUsage from "../apiUsage.js";
import type * as chat from "../chat.js";
import type * as example from "../example.js";
import type * as exports from "../exports.js";
import type * as langgraphWorkflow from "../langgraphWorkflow.js";
import type * as molstarPreferences from "../molstarPreferences.js";
import type * as offlineSync from "../offlineSync.js";
import type * as pdb from "../pdb.js";
import type * as sessionSnapshots from "../sessionSnapshots.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";
import type * as viewerSessions from "../viewerSessions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiWorkflows: typeof aiWorkflows;
  apiKeys: typeof apiKeys;
  apiUsage: typeof apiUsage;
  chat: typeof chat;
  example: typeof example;
  exports: typeof exports;
  langgraphWorkflow: typeof langgraphWorkflow;
  molstarPreferences: typeof molstarPreferences;
  offlineSync: typeof offlineSync;
  pdb: typeof pdb;
  sessionSnapshots: typeof sessionSnapshots;
  sessions: typeof sessions;
  users: typeof users;
  viewerSessions: typeof viewerSessions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
