import {describe, expect, it} from 'vitest';
import {createLogEntry} from "./LogEntry";
import {LogLevel} from "./LogLevel";

describe("createLogEntry", () => {
    it("should create a log entry with required fields", () => {
        const entry = createLogEntry({
            level: LogLevel.INFO,
            message: "Test log entry",
        });

        expect(entry.level).toBe(LogLevel.INFO);
        expect(entry.message).toBe("Test log entry");
    })

    it("should set timestamp to current date", () => {
        const before = new Date();
        const entry = createLogEntry({
            level: LogLevel.INFO,
            message: "Test log entry",
        });
        const after = new Date();

        expect(entry.timestamp >= before).toBe(true);
        expect(entry.timestamp <= after).toBe(true);
    })

    it("should set error if provided", () => {
        const error = new Error("Something went wrong");
        const entry = createLogEntry({level: LogLevel.ERROR, message: "Test", error});

        expect(entry.error).toBe(error);
    });

    it("should set context if provided", () => {
        const context = {userId: "123", component: "PaymentForm"};
        const entry = createLogEntry({level: LogLevel.ERROR, message: "Test", context});

        expect(entry.context).toEqual(context);
    });

    it("should leave error and context undefined if not provided", () => {
        const entry = createLogEntry({level: LogLevel.INFO, message: "Test"});

        expect(entry.error).toBeUndefined();
        expect(entry.context).toBeUndefined();
    });

    it("should create a new timestamp for each entry", () => {
        const first = createLogEntry({level: LogLevel.INFO, message: "First"});
        const second = createLogEntry({level: LogLevel.INFO, message: "Second"});

        expect(first.timestamp).not.toBe(second.timestamp);
    });
})