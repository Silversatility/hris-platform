# HRIS Platform

Full-stack HRIS (HR + Payroll + Employee Ticketing) portfolio project.

- **Backend:** Django + Django REST Framework, Celery (async/scheduled jobs), PostgreSQL, Redis
- **Frontend:** React + TypeScript (Vite)
- **AI:** LLM-assisted ticket triage/routing and HR self-service chatbot (embeddings + pgvector)
- **CI/CD:** GitHub Actions (lint, test, build)

## Modules

1. **HR Core** — employees, departments, org chart
2. **Payroll** — pay runs, payslips
3. **Time-off** — requests/approvals, balances
4. **Ticketing** — employee tickets, SLA, assignment, status workflow
5. **AI layer** — ticket triage/routing + HR chatbot

## Project layout

```
backend/    Django project (DRF API, Celery workers)
frontend/   React + TypeScript app (Vite)
```

## Local development

See `backend/README.md` and `frontend/README.md` (added in later phases) for setup instructions.
