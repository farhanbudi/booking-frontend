import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./utils/logger";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-datepicker/dist/react-datepicker.css";
import "./styles/index.css";

window.addEventListener("error", (event) => {
  logger.error("Uncaught error di window", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled promise rejection", {
    reason: (event.reason as { message?: string } | null)?.message ?? String(event.reason),
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ErrorBoundary>
);
