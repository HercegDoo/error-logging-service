import {beforeEach, describe, expect, it, vi} from "vitest";
import {ConsoleTransport} from "./ConsoleTransport";
import {createLogEntry} from "../core/LogEntry";
import {LogLevel} from "../core/LogLevel";

describe("ConsoleTransport", () => {
    beforeEach(() => {
        // Reset all spies before each test — previous test calls don't leak into next test
        vi.restoreAllMocks();
    });

    describe("console method per level", () => {
        it("should call console.debug for DEBUG level", async () => {
            const spy = vi.spyOn(console, "debug").mockImplementation(() => {
            });
            const transport = new ConsoleTransport();
            const entry = createLogEntry({level: LogLevel.DEBUG, message: "Test"});

            await transport.send(entry);

            expect(spy).toHaveBeenCalledOnce();
        });

        it("should call console.info for INFO level", async () => {
            const spy = vi.spyOn(console, "info").mockImplementation(() => {
            });
            const transport = new ConsoleTransport();
            const entry = createLogEntry({level: LogLevel.INFO, message: "Test"});

            await transport.send(entry);

            expect(spy).toHaveBeenCalledOnce();
        });

        it("should call console.warn for WARN level", async () => {
            const spy = vi.spyOn(console, "warn").mockImplementation(() => {
            });
            const transport = new ConsoleTransport();
            const entry = createLogEntry({level: LogLevel.WARN, message: "Test"});

            await transport.send(entry);

            expect(spy).toHaveBeenCalledOnce();
        });

        it("should call console.error for ERROR level", async () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {
            });
            const transport = new ConsoleTransport();
            const entry = createLogEntry({level: LogLevel.ERROR, message: "Test"});

            await transport.send(entry);

            expect(spy).toHaveBeenCalledOnce();
        });
    });

    describe("default formatter", () => {
        it("should include message in output", async () => {
            const spy = vi.spyOn(console, "info").mockImplementation(() => {
            });
            const transport = new ConsoleTransport();
            const entry = createLogEntry({level: LogLevel.INFO, message: "Payment failed"});

            await transport.send(entry);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining("Payment failed"));
        });

        it("should include level label in output", async () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {
            });
            const transport = new ConsoleTransport();
            const entry = createLogEntry({level: LogLevel.ERROR, message: "Test"});

            await transport.send(entry);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining("ERROR"));
        });

        it("should include error message in output if error is provided", async () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {
            });
            const transport = new ConsoleTransport();
            const entry = createLogEntry({
                level: LogLevel.ERROR,
                message: "Test",
                error: new Error("Card declined"),
            });

            await transport.send(entry);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining("Card declined"));
        });
    });

    describe("custom formatter", () => {
        it("should use custom formatter if provided", async () => {
            const spy = vi.spyOn(console, "info").mockImplementation(() => {
            });
            const transport = new ConsoleTransport({
                formatter: () => "CUSTOM FORMAT",
            });
            const entry = createLogEntry({level: LogLevel.INFO, message: "Test"});

            await transport.send(entry);

            expect(spy).toHaveBeenCalledWith("CUSTOM FORMAT");
        });

        it("should pass the entry to custom formatter", async () => {
            vi.spyOn(console, "info").mockImplementation(() => {
            });
            const formatter = vi.fn(() => "formatted");
            const transport = new ConsoleTransport({formatter});
            const entry = createLogEntry({level: LogLevel.INFO, message: "Test"});

            await transport.send(entry);

            expect(formatter).toHaveBeenCalledWith(entry);
        });
    });
});