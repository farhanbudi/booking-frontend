type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = import.meta.env.DEV;

const recentLogs: Record<string, unknown>[] = [];

if (isDev) {
  (window as unknown as { __recentLogs: Record<string, unknown>[] }).__recentLogs = recentLogs;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    message,
  };
  if (context) entry.context = context;

  const consoleMethod =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (isDev) {
    const styles: Record<LogLevel, string> = {
      debug: "color: #6B7280",
      info: "color: #2F3C7E",
      warn: "color: #E2A83D",
      error: "color: #C0392B; font-weight: bold",
    };
    consoleMethod(`%c[${level.toUpperCase()}] ${message}`, styles[level], context ?? "");
  } else {
    consoleMethod(JSON.stringify(entry));
  }

  recentLogs.push(entry);
  if (recentLogs.length > 50) recentLogs.shift();
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
