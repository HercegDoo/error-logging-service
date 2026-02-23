import {LogLevel} from "./LogLevel";

/**
 * LogEntry is an IMMUTABLE data transfer object.
 * Once created — it doesn't change.
 *
 * Why readonly?
 * Plugins and transports may READ the entry, but must not MUTATE it.
 * If a plugin needs to add data, it returns a NEW entry (immutability pattern).
 * This prevents side-effects between plugins that share the same entry.
 */
export interface LogEntry {
    readonly level: LogLevel;
    readonly message: string;
    readonly timestamp: Date;

    /**
     * Error object if it exists — we store the original, not just the message string.
     * On the server we can parse the stack trace.
     */
    readonly error?: Error;

    /**
     * Free-form context that the user sends — userId, requestId, component, etc.
     * unknown instead of any — TypeScript forces us to check the type before using it.
     */
    readonly context?: Record<string, unknown>;
}

/**
 * Factory function for creating LogEntry.
 *
 * Why a factory function instead of a class constructor or direct object?
 *
 * 1. Central place for default values (timestamp, id)
 * 2. Logger doesn't need to know how ID is generated — that's an implementation detail
 * 3. Easier to test — we can mock generateId if needed
 * 4. If we change ID strategy tomorrow (uuid v4 → nanoid), we only change HERE
 */
export function createLogEntry(
    params: Pick<LogEntry, "level" | "message"> & {
        error?: Error;
        context?: Record<string, unknown>;
    }
): LogEntry {
    return {
        timestamp: new Date(),
        level: params.level,
        message: params.message,
        error: params.error,
        context: params.context,
    };
}