import {createLogEntry, LogEntry} from "./LogEntry";
import {LogLevel} from "./LogLevel";
import {Transport} from "../transports/Transport";
import {Plugin} from "../plugins/Plugin";
import {v4 as uuidv4} from "uuid";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoggerConfig {
    /**
     * Minimum level to log.
     * Everything below this level is silently discarded.
     *
     * Production typically: LogLevel.WARN
     * Development typically: LogLevel.DEBUG
     */
    minLevel?: LogLevel;

    /**
     * List of transports that receive log entries.
     * Injected from outside — Logger does not know what they are, only that they implement Transport.
     */
    transports?: Transport[];

    /**
     * List of plugins that process each entry before sending.
     * Executed in order — output of one is input of the next.
     */
    plugins?: Plugin[];

    /**
     * Custom ID generator — DI principle discussed in Segment 1.
     * Default: timestamp + random string
     */
    generateId?: () => string;
}

// Internal — after init all values must be defined
type ResolvedConfig = Required<LoggerConfig>;

// ─── Logger ───────────────────────────────────────────────────────────────────

export class Logger {
    /**
     * Singleton instance.
     * Private static — exists on the class, not on the instance.
     * The only instance in the entire application.
     */
    private static instance: Logger | null = null;

    private config: ResolvedConfig;

    /**
     * Private constructor — prevents `new Logger()` from outside.
     * The only way to get an instance is through `Logger.init()` or `Logger.getInstance()`.
     */
    private constructor(config: LoggerConfig) {
        this.config = this.resolveConfig(config);
    }

    // ─── Singleton API ──────────────────────────────────────────────────────────

    /**
     * Initialization — called ONCE at application startup.
     *
     * Why throw an error if called more than once?
     * Silent re-initialization would be dangerous — imagine init being called
     * a second time with different transports. Logs would be lost without any warning.
     * An explicit error is safer.
     */
    static init(config: LoggerConfig): Logger {
        if (Logger.instance) {
            throw new Error(
                "Logger is already initialized. Call Logger.getInstance() to get the existing instance."
            );
        }

        Logger.instance = new Logger(config);
        return Logger.instance;
    }

    /**
     * Get the existing instance.
     * Throws an error if init has not been called — fail fast principle.
     * An explicit error is better than undefined behaviour.
     */
    static getInstance(): Logger {
        if (!Logger.instance) {
            throw new Error(
                "Logger is not initialized. Call Logger.init(config) first."
            );
        }

        return Logger.instance;
    }

    /**
     * Reset — used EXCLUSIVELY in tests.
     * There is no reason to reset the singleton in production.
     *
     * Why not remove this method from the production build?
     * Tree-shaking can handle that, but for now it is sufficient
     * that it is clearly documented what this is for.
     */
    static reset(): void {
        Logger.instance = null;
    }

    // ─── Public logging API ─────────────────────────────────────────────────────

    debug(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, { context });
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, { context });
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, { context });
    }

    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, { error, context });
    }

    fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log(LogLevel.FATAL, message, { error, context });
    }

    // ─── Plugin management ──────────────────────────────────────────────────────

    /**
     * Add a plugin after initialization.
     * Plugins are executed in the order they are added.
     */
    addPlugin(plugin: Plugin): void {
        this.config.plugins.push(plugin);
    }

    // ─── Transport management ───────────────────────────────────────────────────

    addTransport(transport: Transport): void {
        const exists = this.config.transports.some((t) => t.name === transport.name);

        if (exists) {
            throw new Error(
                `Transport with name "${transport.name}" is already registered.`
            );
        }

        this.config.transports.push(transport);
    }

    removeTransport(name: string): void {
        this.config.transports = this.config.transports.filter(
            (t) => t.name !== name
        );
    }

    // ─── Core ───────────────────────────────────────────────────────────────────

    private async log(
        level: LogLevel,
        message: string,
        extras: { error?: Error; context?: Record<string, unknown> } = {}
    ): Promise<void> {
        if (level < this.config.minLevel) return;

        /**
         * Run the plugin pipeline — entry passes through each plugin in order.
         * If a plugin returns null, we stop the pipeline and send nothing.
         *
         * Why for...of instead of reduce?
         * With reduce we would have to wait for all plugins and then check for null.
         * With for...of we can exit as soon as we get null — early exit, more efficient.
         * Also, async/await is more readable inside for...of than inside a reduce callback.
         */
        let processedEntry: LogEntry | null = createLogEntry({
            level,
            message,
            error: extras.error,
            context: extras.context,
        });

        for (const plugin of this.config.plugins) {
            processedEntry = await plugin(processedEntry);

            if (processedEntry === null) return;
        }

        this.dispatch(processedEntry);
    }

    /**
     * Sends the entry to all registered transports in parallel.
     *
     * Why Promise.allSettled instead of Promise.all?
     * Promise.all — if one transport fails, the others do not execute.
     * Promise.allSettled — all execute, we collect all errors and log them.
     *
     * In the context of a logger this is critical: if the HTTP transport fails,
     * the Console transport must still work.
     */
    private dispatch(entry: LogEntry): void {
        const promises = this.config.transports.map((transport) =>
            transport.send(entry).catch((error) => {
                // Fallback — use console directly to avoid infinite recursion
                console.error(`[Logger] Transport "${transport.name}" failed:`, error);
            })
        );

        Promise.allSettled(promises);
    }

    // ─── Config ─────────────────────────────────────────────────────────────────

    private resolveConfig(config: LoggerConfig): ResolvedConfig {
        return {
            minLevel: config.minLevel ?? LogLevel.DEBUG,
            transports: config.transports ?? [],
            plugins: config.plugins ?? [],
            generateId: config.generateId ?? uuidv4,
        };
    }
}