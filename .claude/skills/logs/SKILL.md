---
name: logs
description: Guide user to find and read logs on Vercel, GitHub Actions, or AWS CloudWatch
---
Help the user navigate logs on: $ARGUMENTS (vercel | github | aws | all)

DO NOT read the logs yourself. GUIDE the user to find them.

## Vercel
1. Go to vercel.com/dashboard → select the project
2. Click "Deployments" tab
3. Click the deployment you want to inspect
4. "Build Logs" = what happened during `npm run build`
5. "Runtime Logs" = errors happening live on the server
6. Common errors: TypeScript type errors, missing imports, env vars not set

## GitHub Actions
1. Go to github.com/Alphamixgalpoes/site → "Actions" tab
2. Click the workflow run (green = passed, red = failed)
3. Click the failed job (Backend Lint, Backend Tests, Frontend Build, or Frontend Lint)
4. Expand the failed step to see the error
5. Common errors: test failures (pytest output), lint errors (ruff), build errors (tsc)

## AWS CloudWatch
1. Go to AWS Console → CloudWatch → Log Groups
2. Find `/ecs/petrus-api`
3. Click the most recent log stream
4. These are stdout/stderr from the FastAPI container
5. Via CLI: `"/c/Program Files/Amazon/AWSCLIV2/aws.exe" logs tail /ecs/petrus-api --follow --region sa-east-1`
6. Common errors: Python exceptions, connection timeouts, missing env vars

After the user finds the error, help them understand and fix it.
