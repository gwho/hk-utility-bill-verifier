/**
 * FILE: src/routes/index.ts
 * ROLE: Root router — mounts all Node.js API sub-routers under /api.
 * WHY: A barrel router keeps app.ts clean. Each domain (health, future auth,
 *      future user preferences) gets its own sub-router file in routes/.
 *      This mirrors the Python backend's routers/ pattern.
 *
 * ROUTES CURRENTLY MOUNTED:
 *   GET /api/health   — Node.js health check (via healthRouter)
 *
 * NOTE: Python backend routes are NOT mounted here. They are handled by
 *       the /api/py proxy middleware in app.ts before this router runs.
 */
import { Router, type IRouter } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);

export default router;
