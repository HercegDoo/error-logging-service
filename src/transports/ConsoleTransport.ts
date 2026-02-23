import {LogEntry} from "../core/LogEntry";
import {LOG_LEVEL_LABELS, LogLevel} from "../core/LogLevel";
import {Transport, TransportError} from "./Transport";

export interface ConsoleTransportOptions {
    /**
     * Custom formatter — user can fully control the appearance.
     * If not provided, we use the defaultFormatter below.
     *
     * This is again the DI principle — format logic is not hardcoded.
     */
    formatter?: (entry: LogEntry) => string;
}

export class ConsoleTransport implements Transport {
    readonly name = "console";

    private readonly formatter?: (entry: LogEntry) => string;

    constructor(options: ConsoleTransportOptions = {}) {
        this.formatter = options.formatter;
    }

    async send(entry: LogEntry): Promise<void> {
        try {
            const message = this.formatter
                ? this.formatter(entry)
                : this.defaultFormatter(entry);

            const consoleMethod = this.resolveConsoleMethod(entry.level);
            consoleMethod(message);
        } catch (error) {
            throw new TransportError("ConsoleTransport failed to send entry", {cause: error});
        }
    }

    private defaultFormatter(entry: LogEntry): string {
        const label = LOG_LEVEL_LABELS[entry.level];
        const time = entry.timestamp.toISOString();
        const errorPart = entry.error ? ` | ${entry.error.message}` : "";
        return `[${time}] [${label}] ${entry.message}${errorPart}`;
    }

    /**
     * Mapping levels to console methods.
     *
     * Bind is necessary — if you destructure console.error without bind,
     * 'this' context is lost and browser throws TypeError in strict mode.
     */
    private resolveConsoleMethod(
        level: LogLevel
    ): (...args: unknown[]) => void {
        const methods: Record<LogLevel, (...args: unknown[]) => void> = {
            [LogLevel.DEBUG]: console.debug.bind(console),
            [LogLevel.INFO]: console.info.bind(console),
            [LogLevel.WARN]: console.warn.bind(console),
            [LogLevel.ERROR]: console.error.bind(console),
        };

        return methods[level];
    }
}