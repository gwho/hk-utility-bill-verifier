/**
 * FILE: src/app.ts
 * ROLE: Express application factory — sets up middleware and mounts all routes.
 * WHY: Separating app creation from server startup (index.ts) allows easy
 *      unit testing of the app without binding to a port.
 *
 * PROXY ARCHITECTURE:
 * The Express server acts as a unified gateway. The iOS app only talks to
 * one URL base (/api). Express then routes:
 *   /api/py/*  → Python FastAPI backend (OCR, billing logic, regulations)
 *   /api/*     → Node.js routes (health check, future auth/session)
 *
 * WHY proxy instead of separate service: The iOS app running in Expo Go
 * can only contact one server URL. The Express proxy hides the two-backend
 * architecture from the mobile client.
 *
 * WHY http-proxy-middleware: It handles streaming, error forwarding, and
 * path rewriting correctly. A manual fetch-based proxy would not handle
 * multipart file uploads or streamed responses.
 */

import express, { type Express } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";

const app: Express = express();

// ---------------------------------------------------------------------------
// CORS — allow all origins in development.
// WHY: The Expo app in development runs from a dynamic ngrok/replit URL and
// the iOS simulator uses a different origin. Restricting CORS here would
// break local dev. Tighten to specific origins before production deployment.
// ---------------------------------------------------------------------------
app.use(cors());

// ---------------------------------------------------------------------------
// Python backend proxy — must be registered BEFORE json/urlencoded parsers
// so that multipart file uploads are forwarded raw to the Python backend.
//
// WHY before body parsers: Express body parsers consume the request stream.
// Once consumed, http-proxy-middleware cannot forward the body to Python.
// File upload endpoints (POST /api/py/documents/upload) rely on the raw
// stream being forwarded intact.
//
// pathRewrite removes the /api/py prefix so Python sees clean paths:
//   /api/py/healthz → /healthz on the Python server
// ---------------------------------------------------------------------------
const PYTHON_PORT = process.env["PYTHON_PORT"] ?? "8000";
const PYTHON_BASE_URL = `http://localhost:${PYTHON_PORT}`;

app.use(
  "/api/py",
  createProxyMiddleware({
    target: PYTHON_BASE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/py": "" },
    on: {
      error: (err: Error, _req: express.Request, res: express.Response | import("http").ServerResponse) => {
        console.error(`[proxy] Python backend unreachable at ${PYTHON_BASE_URL}:`, err.message);
        const httpRes = res as express.Response;
        if (!httpRes.headersSent) {
          httpRes.status(502).json({
            error: "Python backend unavailable",
            detail: "The OCR and billing service is not reachable. Ensure the Python backend workflow is running.",
          });
        }
      },
    },
  })
);

// ---------------------------------------------------------------------------
// Standard body parsers — applied after proxy so they don't consume the stream
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Node.js API routes — health check, future auth, etc.
// ---------------------------------------------------------------------------
app.use("/api", router);

export default app;
