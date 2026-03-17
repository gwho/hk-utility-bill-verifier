# Error Journal

This file documents every real error encountered during development of the HK Utility Bill Verifier project.

**Purpose:** Error logs are as valuable as the code itself for a tutorial project. Reading about what went wrong — and why — is often more instructive than reading about what went right.

**Format:**
```
#NNN — Short description of error
Stage: X
Date: YYYY-MM-DD
Symptom: What you saw
Root cause: Why it happened
Fix: What was changed
Lesson: The takeaway for a beginner
```

---

## Stage 1 Errors

### #001 — `ImportError: cannot import name 'model_config' from 'pydantic'`

**Stage:** 1
**Date:** 2025-03-17
**Symptom:**
```
File "python-backend/routers/health.py", line 14, in <module>
    from models.domain import HealthResponse
  File "python-backend/models/domain.py", line 27, in <module>
    from pydantic import BaseModel, Field, model_config
ImportError: cannot import name 'model_config' from 'pydantic'
```
The Python backend crashed on startup. The FastAPI health endpoint was unreachable.

**Root cause:**
`model_config` in Pydantic v2 is NOT a direct importable name — it is an attribute that Pydantic creates on model classes internally. The correct way to define model config in Pydantic v2 is to use `ConfigDict` (for the dict type) or the `model_config` class variable (set inside the class, not imported).

The original code had:
```python
from pydantic import BaseModel, Field, model_config  # ← WRONG
```

**Fix:**
```python
from pydantic import BaseModel, Field, ConfigDict  # ← CORRECT
```
`ConfigDict` can be used to define model configuration inside a Pydantic model class. In this project no custom config was actually needed yet, so the unused import was simply removed.

**Lesson:**
When upgrading from Pydantic v1 to v2, many names changed. The `Config` inner class was replaced by `model_config = ConfigDict(...)` at the class level. Pydantic's own migration guide (`pydantic.dev/blog/pydantic-v2`) is the authoritative source. Always check the installed package version (`python -c "import pydantic; print(pydantic.VERSION)"`) before assuming which API style to use.

---

### #002 — Express proxy returning `Cannot GET /api/py/healthz` (404)

**Stage:** 1
**Date:** 2025-03-17
**Symptom:**
```bash
curl http://localhost:8080/api/py/healthz
# Returns: Cannot GET /api/py/healthz (Express 404)
```
The Python backend was running and healthy at `http://localhost:8000/healthz`, but requests through the Express proxy were returning 404.

**Root cause:**
After adding `http-proxy-middleware` to `artifacts/api-server/src/app.ts`, the Express API server was not restarted. The running instance was the old binary that had no proxy configured. The new `app.ts` code was compiled but not loaded.

**Fix:**
Restart the `artifacts/api-server: API Server` workflow. After restart:
```bash
curl http://localhost:8080/api/py/healthz
# Returns: {"status":"ok","service":"..."}
```

**Lesson:**
In a compiled/transpiled Node.js project (using `tsx`, `ts-node`, or esbuild), code changes are NOT reflected in a running process until it is restarted. Always restart the workflow after changing backend code. The mobile app's Metro bundler handles hot reloading for the iOS side, but the server-side processes do not.

---

### #003 — TypeScript error in proxy error callback: `Parameter 'err' implicitly has 'any' type`

**Stage:** 1
**Date:** 2025-03-17
**Symptom:**
```
TS7006: Parameter 'err' implicitly has an 'any' type.
TS7006: Parameter 'req' implicitly has an 'any' type.
TS7006: Parameter 'res' implicitly has an 'any' type.
```
The TypeScript build failed. The `on.error` callback in `http-proxy-middleware` did not infer parameter types automatically.

**Root cause:**
`http-proxy-middleware`'s TypeScript types for the `on.error` callback require explicit type annotations. The original code:
```typescript
on: {
  error: (err, req, res, target) => { ... }
}
```
TypeScript's `strict: true` mode does not allow implicit `any` parameters.

**Fix:**
Add explicit type annotations:
```typescript
error: (err: Error, _req: express.Request, res: express.Response | import("http").ServerResponse) => { ... }
```
Prefix unused parameters with `_` (underscore convention) to satisfy the linter.

**Lesson:**
When using third-party middleware with TypeScript in strict mode, always add explicit type annotations to callback parameters. The TypeScript compiler never guesses — if it can't infer the type, it reports an error (or allows `any` if `noImplicitAny` is off, which it usually shouldn't be in a new project).

---

*This journal will be updated as new errors are encountered in subsequent stages.*
