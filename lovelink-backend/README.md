---
title: LoveLink Backend
emoji: ❤️
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# LoveLink Backend (FastAPI + WebSockets)

Dockerized FastAPI backend for LoveLink, designed for **Hugging Face Spaces**, **Koyeb**, **Railway**, or **Render** with **Neon PostgreSQL**.

## Required Environment Variables / Secrets
- `DATABASE_URL`: Neon PostgreSQL async URL (`postgresql+asyncpg://...`)
- `SECRET_KEY`: Random JWT signing secret
- `ALLOW_DEV_OTP`: `false` in production (set `true` only for local dev)
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`: SMTP credentials
- `FIREBASE_CREDENTIALS_JSON`: Firebase service account JSON string
