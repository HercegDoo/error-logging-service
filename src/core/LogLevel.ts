/**
 * Numeric values matter — they enable filtering by severity.
 * For example, if you set minimum level to WARN, DEBUG and INFO are ignored.
 *
 * Why not a string enum?
 * Because with numeric you can do: level >= LogLevel.WARN
 * With string enum you can't.
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
}

/**
 * Human-readable labels — useful when logging to console or sending to server.
 * This is a lookup table, not logic — that's where it belongs.
 */
export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: "DEBUG",
    [LogLevel.INFO]: "INFO",
    [LogLevel.WARN]: "WARN",
    [LogLevel.ERROR]: "ERROR",
    [LogLevel.FATAL]: "FATAL",
};