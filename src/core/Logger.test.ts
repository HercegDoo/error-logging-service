import {beforeEach, describe, expect, it, vi} from "vitest";
import {Logger} from "./Logger";
import {LogLevel} from "./LogLevel";
import {Transport} from "../transports/Transport";
import {LogEntry} from "./LogEntry";
import {Plugin} from "../plugins/Plugin";

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a mock transport that captures all entries sent to it.
 * This allows us to assert what was sent without needing a real transport.
 */
function createMockTransport(name = "mock"): Transport & { entries: LogEntry[] } {
    const entries: LogEntry[] = [];

    return {
        name,
        entries,
        send: vi.fn(async (entry: LogEntry) => {
            entries.push(entry);
        }),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Logger", () => {
    beforeEach(() => {
        Logger.reset();
    });

    // ─── Singleton ──────────────────────────────────────────────────────────────

    describe("Singleton", () => {
        it("should return the same instance on every getInstance() call", () => {
            Logger.init({});
            const a = Logger.getInstance();
            const b = Logger.getInstance();

            expect(a).toBe(b);
        });

        it("should throw if init is called more than once", () => {
            Logger.init({});

            expect(() => Logger.init({})).toThrow("Logger is already initialized");
        });

        it("should throw if getInstance is called before init", () => {
            expect(() => Logger.getInstance()).toThrow("Logger is not initialized");
        });

        it("should allow re-initialization after reset", () => {
            Logger.init({});
            Logger.reset();

            expect(() => Logger.init({})).not.toThrow();
        });
    });

    // ─── Transport ──────────────────────────────────────────────────────────────

    describe("transports", () => {
        it("should send entry to registered transport", async () => {
            const transport = createMockTransport();
            Logger.init({transports: [transport]});

            Logger.getInstance().error("Test error", new Error("Oops"));

            // dispatch is fire-and-forget — we need to wait for microtasks to settle
            await vi.waitFor(() => expect(transport.entries).toHaveLength(1));
        });

        it("should send entry to all registered transports", async () => {
            const first = createMockTransport("first");
            const second = createMockTransport("second");
            Logger.init({transports: [first, second]});

            Logger.getInstance().error("Test");

            await vi.waitFor(() => {
                expect(first.entries).toHaveLength(1);
                expect(second.entries).toHaveLength(1);
            });
        });

        it("should throw if transport with same name is added twice", () => {
            const transport = createMockTransport("http");
            Logger.init({transports: [transport]});

            expect(() =>
                Logger.getInstance().addTransport(createMockTransport("http"))
            ).toThrow('Transport with name "http" is already registered');
        });

        it("should not send to removed transport", async () => {
            const transport = createMockTransport();
            Logger.init({transports: [transport]});

            Logger.getInstance().removeTransport("mock");
            Logger.getInstance().error("Test");

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(transport.entries).toHaveLength(0);
        });

        it("should continue sending to other transports if one fails", async () => {
            const failing = {
                name: "failing",
                send: vi.fn().mockRejectedValue(new Error("Network error")),
            };
            const working = createMockTransport("working");

            Logger.init({transports: [failing, working]});
            Logger.getInstance().error("Test");

            await vi.waitFor(() => expect(working.entries).toHaveLength(1));
        });
    });

    // ─── Plugins ────────────────────────────────────────────────────────────────

    describe("plugins", () => {
        it("should run plugin before sending to transport", async () => {
            const transport = createMockTransport();
            const plugin: Plugin = (entry) => ({
                ...entry,
                context: {enriched: true},
            });

            Logger.init({transports: [transport], plugins: [plugin]});
            Logger.getInstance().error("Test");

            await vi.waitFor(() => {
                expect(transport.entries[0]?.context).toEqual({enriched: true});
            });
        });

        it("should run plugins in order", async () => {
            const transport = createMockTransport();
            const order: number[] = [];

            const first: Plugin = (entry) => {
                order.push(1);
                return entry;
            };
            const second: Plugin = (entry) => {
                order.push(2);
                return entry;
            };
            const third: Plugin = (entry) => {
                order.push(3);
                return entry;
            };

            Logger.init({transports: [transport], plugins: [first, second, third]});
            Logger.getInstance().error("Test");

            await vi.waitFor(() => expect(order).toEqual([1, 2, 3]));
        });

        it("should not send entry if plugin returns null", async () => {
            const transport = createMockTransport();
            const blockAll: Plugin = () => null;

            Logger.init({transports: [transport], plugins: [blockAll]});
            Logger.getInstance().error("Test");

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(transport.entries).toHaveLength(0);
        });

        it("should not run subsequent plugins after one returns null", async () => {
            const transport = createMockTransport();
            const secondPlugin = vi.fn((entry: LogEntry) => entry);

            const blockAll: Plugin = () => null;

            Logger.init({transports: [transport], plugins: [blockAll, secondPlugin]});
            Logger.getInstance().error("Test");

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(secondPlugin).not.toHaveBeenCalled();
        });
    });

    // ─── addTransport ───────────────────────────────────────────────────────────

    describe("addTransport", () => {
        it("should send to transport added after init", async () => {
            Logger.init({});
            const transport = createMockTransport();

            Logger.getInstance().addTransport(transport);
            Logger.getInstance().error("Test");

            await vi.waitFor(() => expect(transport.entries).toHaveLength(1));
        });

        it("should throw if transport with same name already exists", () => {
            Logger.init({transports: [createMockTransport("http")]});

            expect(() =>
                Logger.getInstance().addTransport(createMockTransport("http"))
            ).toThrow('Transport with name "http" is already registered');
        });
    });

    // ─── addPlugin ──────────────────────────────────────────────────────────────

    describe("addPlugin", () => {
        it("should run plugin added after init", async () => {
            const transport = createMockTransport();
            Logger.init({transports: [transport]});

            const plugin: Plugin = (entry) => ({
                ...entry,
                context: {addedAfterInit: true},
            });

            Logger.getInstance().addPlugin(plugin);
            Logger.getInstance().error("Test");

            await vi.waitFor(() => {
                expect(transport.entries[0]?.context).toEqual({addedAfterInit: true});
            });
        });

        it("should run plugins added after init after existing plugins", async () => {
            const transport = createMockTransport();
            const order: number[] = [];

            const first: Plugin = (entry) => {
                order.push(1);
                return entry;
            };
            const second: Plugin = (entry) => {
                order.push(2);
                return entry;
            };

            Logger.init({transports: [transport], plugins: [first]});
            Logger.getInstance().addPlugin(second);
            Logger.getInstance().error("Test");

            await vi.waitFor(() => expect(order).toEqual([1, 2]));
        });
    });

    // ─── Log methods ────────────────────────────────────────────────────────────

    describe("log methods", () => {
        it("should send correct level for each method", async () => {
            const transport = createMockTransport();
            Logger.init({transports: [transport]});

            const logger = Logger.getInstance();
            logger.debug("d");
            logger.info("i");
            logger.warn("w");
            logger.error("e");

            await vi.waitFor(() => expect(transport.entries).toHaveLength(4));

            expect(transport.entries[0]?.level).toBe(LogLevel.DEBUG);
            expect(transport.entries[1]?.level).toBe(LogLevel.INFO);
            expect(transport.entries[2]?.level).toBe(LogLevel.WARN);
            expect(transport.entries[3]?.level).toBe(LogLevel.ERROR);
        });

        it("should attach error to entry", async () => {
            const transport = createMockTransport();
            Logger.init({transports: [transport]});

            const error = new Error("Something broke");
            Logger.getInstance().error("Test", error);

            await vi.waitFor(() => {
                expect(transport.entries[0]?.error).toBe(error);
            });
        });

        it("should attach context to entry", async () => {
            const transport = createMockTransport();
            Logger.init({transports: [transport]});

            Logger.getInstance().error("Test", undefined, {userId: "123"});

            await vi.waitFor(() => {
                expect(transport.entries[0]?.context).toEqual({userId: "123"});
            });
        });
    });
});