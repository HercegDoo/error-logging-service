import { LogEntry } from "../core/LogEntry";

/**
 * Plugin is a pure function — takes entry, returns entry or null.
 *
 * Why a function and not an interface with a method?
 * An interface would force the user to create a class or object:
 *   { transform: (entry) => entry }
 * A function is simpler — you pass it directly, without a wrapper.
 *
 * Why null as return?
 * Null is an explicit decision — "this log should not proceed further".
 * Undefined would be ambiguous — did the plugin forget to return or is it intentional?
 * Null is intent, undefined is a bug.
 *
 * Async support:
 * A plugin can be async — for example, it needs to fetch user data from a database.
 * Promise<LogEntry | null> | LogEntry | null covers both cases.
 */
export type Plugin = (
    entry: LogEntry
) => Promise<LogEntry | null> | LogEntry | null;