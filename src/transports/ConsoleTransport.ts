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

    private readonly options: Required<
        Omit<ConsoleTransportOptions, "formatter">
    > & {
        formatter?: ConsoleTransportOptions["formatter"];
    };

    constructor(options: ConsoleTransportOptions = {}) {
        this.options = {
            formatter: options.formatter,
        };
    }

    async send(entry: LogEntry): Promise<void> {
        try {
            const message = this.options.formatter
                ? this.options.formatter(entry)
                : this.defaultFormatter(entry);

            /**
             * We use the appropriate console method per level —
             * browser DevTools can then filter by type (Errors, Warnings...).
             * Everything through console.log would lose that information.
             */
            const consoleMethod = this.resolveConsoleMethod(entry.level);
            consoleMethod(message);
        } catch (error) {
            throw new TransportError(
                "ConsoleTransport failed to send entry",
                this.name,
                entry,
                {cause: error}
            );
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