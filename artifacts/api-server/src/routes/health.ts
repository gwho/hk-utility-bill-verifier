/**
 * FILE: src/routes/health.ts
 * ROLE: Node.js API health check endpoint.
 * WHY: Provides a dedicated health route for the Express server itself.
 *      The Express proxy at /api/py/healthz checks Python backend health.
 *      This route checks the Express server health.
 *
 * Full path: GET /api/healthz
 *
 * TUTORIAL NOTE — why /healthz not /health?
 * The 'z' suffix is a Kubernetes/GKE convention that distinguishes the health
 * endpoint from application routes that might naturally be called /health.
 * It is also distinctive enough that no user-facing route would accidentally
 * conflict with it.
 */
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
