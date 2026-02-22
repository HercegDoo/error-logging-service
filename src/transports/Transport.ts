import { LogEntry } from "../core/LogEntry";

/**
 * Transport is a contract — interface that every transport must fulfill.
 *
 * Strategy Pattern:
 * Logger (Context) holds a reference to Transport (Strategy).
 * At runtime, the user decides which strategy to use —
 * Console, HTTP, File, Sentry, Datadog... Logger doesn't know the difference.
 *
 * This is possible ONLY because all transports implement the same interface.
 */
export interface Transport {
    /**
     * The only obligation of a transport — receive entry, do what you need to do.
     *
     * Why Promise<void>?
     * HTTP transport is async (fetch), Console transport is sync —
     * but we must not make a difference at the interface level.
     * A sync function can always return Promise.resolve(),
     * an async function must be async. The interface unifies this.
     */
    send(entry: LogEntry): Promise<void>;

    /**
     * Unique name of the transport.
     * Useful for debugging — "Which transport failed?"
     * Useful for deregistration — logger.removeTransport("http")
     */
    readonly name: string;
}

/**
 * TransportError — custom error class specific to the transport layer.
 *
 * Why not use generic Error?
 * Because when a transport fails, we want to know:
 * - which transport failed (transportName)
 * - which entry wasn't sent (entry)
 * - the original reason (cause — native JS Error chaining)
 *
 * Error chaining (cause) is an ES2022 feature — it preserves the original stack trace
 * while adding our context. Without it, the original error is lost.
 */
export class TransportError extends Error {
    constructor(
        message: string,
        public readonly transportName: string,
        public readonly entry: LogEntry,
        options?: { cause?: unknown }
    ) {
        super(message, options);
        this.name = "TransportError";
    }
}