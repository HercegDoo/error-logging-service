# error-logging-service

A lightweight, framework-agnostic JavaScript/TypeScript logging library built around clean architecture principles.
Initialize once, use anywhere — with full control over how logs are transported and enriched.

---

## Features

- **Framework agnostic** — works in React, Vue, Angular, Node.js, or any JS environment
- **Transport pattern** — define exactly how and where logs are sent
- **Plugin pipeline** — enrich, filter, or transform log entries before they are sent
- **Singleton** — initialize once at app startup, access anywhere
- **TypeScript first** — fully typed with strict mode support
- **Minimal footprint** — zero runtime dependencies

---

## Installation

```bash
npm install error-logging-service
```

---

## Quick Start

```typescript
import {Logger, LogLevel, ConsoleTransport} from 'error-logging-service'

// Initialize once at app startup
Logger.init({
    transports: [new ConsoleTransport()],
})

// Use anywhere in your application
const logger = Logger.getInstance()

logger.debug('App started')
logger.info('User logged in', {userId: '123'})
logger.warn('Deprecated API called')
logger.error('Payment failed', new Error('Card declined'), {orderId: 'ord-456'})
```

---

## Log Levels

| Level   | Value | Use case                                |
|---------|-------|-----------------------------------------|
| `DEBUG` | 0     | Detailed information during development |
| `INFO`  | 1     | General application events              |
| `WARN`  | 2     | Something unexpected, but not breaking  |
| `ERROR` | 3     | A failure that affects functionality    |

---

## Transports

A transport defines **how** a log entry is sent. Implement the `Transport` interface to create your own.

### Built-in: ConsoleTransport

```typescript
import {ConsoleTransport} from 'error-logging-service'

new ConsoleTransport({
    formatter: (entry) => `[${entry.level}] ${entry.message}` // custom format
})
```

### Custom Transport

Implement the `Transport` interface to send logs anywhere — your own API, Sentry, Datadog, or any other service.

```typescript
import {Transport, LogEntry} from 'error-logging-service'

class HttpTransport implements Transport {
    readonly name = 'http'

    async send(entry: LogEntry): Promise<void> {
        await fetch('/api/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${your_token}`
            },
            body: JSON.stringify({
                ...entry,
                // Error objects are not JSON-serializable by default
                // serialize them manually
                error: entry.error
                    ? {message: entry.error.message, stack: entry.error.stack}
                    : undefined,
            }),
        })
    }
}

Logger.init({
    transports: [new HttpTransport()]
})
```

### Multiple Transports

All registered transports receive every log entry in parallel. If one fails, the others continue.

```typescript
Logger.init({
    transports: [
        new ConsoleTransport(),
        new HttpTransport(),
    ]
})
```

---

## Plugins

Plugins run before transports — they form a **pipeline** that processes each log entry in order.

A plugin is a function that receives a `LogEntry` and returns a `LogEntry` or `null`. Returning `null` drops the entry —
it will not be sent to any transport.

### Enrichment — add data to every log

```typescript
import {Plugin} from 'error-logging-service'

const withUserContext: Plugin = (entry) => ({
    ...entry,
    context: {
        ...entry.context,
        userId: getCurrentUser().id,
        sessionId: getSessionId(),
    }
})

const withAppMeta: Plugin = (entry) => ({
    ...entry,
    context: {
        ...entry.context,
        appVersion: '2.4.1',
        environment: process.env.NODE_ENV,
    }
})
```

### Filtering — drop entries conditionally

```typescript
// Drop all health check logs
const filterHealthChecks: Plugin = (entry) => {
    if (entry.message.includes('healthcheck')) return null
    return entry
}

// Sample — only send 10% of DEBUG logs in production
const sampleDebug: Plugin = (entry) => {
    if (entry.level === LogLevel.DEBUG && Math.random() > 0.1) return null
    return entry
}
```

### Redaction — remove sensitive data

```typescript
const redactSensitiveData: Plugin = (entry) => ({
    ...entry,
    message: entry.message.replace(/password=\S+/gi, 'password=[REDACTED]')
})
```

### Error serialization — fix empty error objects in JSON

```typescript
const serializeError: Plugin = (entry) => {
    if (!entry.error) return entry

    return {
        ...entry,
        error: {
            message: entry.error.message,
            name: entry.error.name,
            stack: entry.error.stack,
        } as unknown as Error
    }
}
```

### Registering plugins

```typescript
Logger.init({
    plugins: [
        withUserContext,
        withAppMeta,
        filterHealthChecks,
        redactSensitiveData,
        serializeError,
    ],
    transports: [new HttpTransport()]
})
```

Plugins can also be added after initialization:

```typescript
Logger.getInstance().addPlugin(myPlugin)
```

---

## React Integration

### Initialize before the React tree mounts

```tsx
// main.tsx
import {Logger, ConsoleTransport} from 'error-logging-service'

Logger.init({
    transports: [new ConsoleTransport()],
})

createRoot(document.getElementById('root')!).render(<App/>)
```

### useLogger hook

```tsx
// hooks/useLogger.ts
import {Logger} from 'error-logging-service'

export function useLogger() {
    return Logger.getInstance()
}

// In any component
function PaymentForm() {
    const logger = useLogger()

    const handleSubmit = async () => {
        try {
            await processPayment()
        } catch (error) {
            logger.error('Payment failed', error as Error, {component: 'PaymentForm'})
        }
    }
}
```

### ErrorBoundary integration

Since `ErrorBoundary` must be a class component, use `Logger.getInstance()` directly:

```tsx
import {Logger} from 'error-logging-service'
import {Component, ReactNode} from 'react'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = {hasError: false}
    }

    static getDerivedStateFromError() {
        return {hasError: true}
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        Logger.getInstance().error(
            'Uncaught error caught by ErrorBoundary',
            error,
            {componentStack: errorInfo.componentStack}
        )
    }

    render() {
        if (this.state.hasError) return <div>Something went wrong.</div>
        return this.props.children
    }
}
```

---

## API Reference

### `Logger.init(config)`

Initializes the logger. Must be called once before any other method.

| Option       | Type          | Default | Description        |
|--------------|---------------|---------|--------------------|
| `transports` | `Transport[]` | `[]`    | List of transports |
| `plugins`    | `Plugin[]`    | `[]`    | List of plugins    |

### `Logger.getInstance()`

Returns the existing logger instance. Throws if `init` has not been called.

### `Logger.reset()`

Resets the singleton. **For use in tests only.**

### `logger.debug / info / warn / error `

```
logger.debug(message: string, context?: Record<string, unknown>): void
logger.info(message: string, context?: Record<string, unknown>): void
logger.warn(message: string, context?: Record<string, unknown>): void
logger.error(message: string, error?: Error, context?: Record<string, unknown>): void
```

### `logger.addTransport(transport)`

Registers a transport after initialization. Throws if a transport with the same name is already registered.

### `logger.removeTransport(name)`

Removes a transport by name.

### `logger.addPlugin(plugin)`

Adds a plugin to the end of the pipeline after initialization.

---

## Project Structure

```
src/
├── core/
│   ├── Logger.ts           # Singleton logger class
│   ├── LogEntry.ts         # LogEntry model and factory
│   └── LogLevel.ts         # LogLevel enum
├── transports/
│   ├── Transport.ts        # Transport interface (Strategy pattern)
│   └── ConsoleTransport.ts # Built-in console transport
├── plugins/
│   └── Plugin.ts           # Plugin type definition
└── index.ts                # Public API
```

---

## License

MIT