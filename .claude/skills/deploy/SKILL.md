---
name: deploy
description: Deploy backend to AWS ECS (build, push, verify)
---
Deploy the backend to production: $ARGUMENTS

1. Run `pytest` and `ruff check src/ tests/` — abort if anything fails
2. Verify current branch is up to date with main
3. Build Docker image: `docker build -t petrus-api .` in backend/
4. Tag and push to ECR (sa-east-1)
5. Force new ECS deployment: `aws ecs update-service --cluster petrus-api --service petrus-api-service --force-new-deployment`
6. Wait for stability: `aws ecs wait services-stable`
7. Health check: `curl -sf https://api.alphamixgalpoes.com.br/health`
8. If any step fails, guide user to check logs: `/logs aws`
9. Report final status

IMPORTANT: Use AWS CLI via `"/c/Program Files/Amazon/AWSCLIV2/aws.exe"` with `--region sa-east-1`
