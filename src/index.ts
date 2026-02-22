// ─── Core ─────────────────────────────────────────────────────────────────────
export { Logger } from "./core/Logger";
export { LogLevel, LOG_LEVEL_LABELS } from "./core/LogLevel";

// ─── Types ────────────────────────────────────────────────────────────────────
// We export only the interface and factory function — not the implementation details
export type { LogEntry } from "./core/LogEntry";
export type { LoggerConfig } from "./core/Logger";

// ─── Plugins ──────────────────────────────────────────────────────────────────
// We export only the type — user writes plugin as a regular function
export type { Plugin } from "./plugins/Plugin";

// ─── Transports ───────────────────────────────────────────────────────────────
export { ConsoleTransport } from "./transports/ConsoleTransport";
export type { ConsoleTransportOptions } from "./transports/ConsoleTransport";

// We export the Transport interface because users must implement
// this contract if they write a custom transport
export type { Transport } from "./transports/Transport";
export { TransportError } from "./transports/Transport";