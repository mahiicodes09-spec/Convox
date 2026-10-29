# Smart Community (Convox) – Backend

Django backend for a Discord-like real-time chat app with AI toxicity/spam moderation.
The React frontend and the FastAPI ML service are built by teammates; this folder is the API + WebSocket server.

## Tech stack

- Django 6.1, Django REST Framework, SimpleJWT
- drf-spectacular (Swagger docs)
- Django Channels + Daphne (WebSockets)
- Redis (optional, via `REDIS_URL`) for cache and channel layer, falls back to in-memory
- PostgreSQL (Neon) in production, SQLite locally
- Cloudinary for media storage (optional)
- Brevo SMTP for OTP emails
- WhiteNoise for static files
- Docker + docker-compose (web + redis)
- Deployed on Render

## Features

- **Auth:** register with email OTP, login, token refresh, logout (JWT blacklist), profile with avatar, forgot/reset password with OTP
- **Servers and channels:** create servers, join with invite code/link, invite preview, channels, member list
- **Roles:** owner, admin, moderator, member
- **Chat:** REST message API with cursor pagination, real-time WebSocket chat, edit and delete
- **File attachments:** jpg, png, webp, pdf, mp4 (max 10 MB)
- **AI moderation:** every message is sent to the ML service for toxicity and spam scores
- **Moderation tools:** review queue, actions (dismiss, warn, remove, mute, suspend), audit log
- **Search and filter:** message search, member search, filter by author or role
- **Rate limiting:** DRF throttling plus a login lock after repeated failures
- **Server analytics:** counts and activity for moderators

## Project structure

```
backend/
  config/        settings, urls, asgi, wsgi
  accounts/      user model, auth views, OTP and blacklist helpers (utils.py)
  communities/   Server, ServerMember, Channel
  chat/          Message, Attachment, REST views, WebSocket consumer, moderation call
  moderation/    ModerationLog, queue, actions, analytics
```

## Local setup (Windows PowerShell)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see the table below), then:

```powershell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open:

- API docs: http://127.0.0.1:8000/api/docs/
- Health check: http://127.0.0.1:8000/api/health/

If port 8000 is busy, run `python manage.py runserver 8001`.

### Run with Docker

```powershell
cd backend
docker compose up --build
```

This starts the web service and Redis. `/api/health/` should then report `"cache": "redis"`.
Stop it with `docker compose down` before running `runserver` locally.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key (required) | none |
| `DEBUG` | Debug mode | `False` |
| `ALLOWED_HOSTS` | Comma separated hosts | `127.0.0.1,localhost` |
| `CORS_ALLOWED_ORIGINS` | Frontend origins | `http://localhost:5173,http://localhost:3000` |
| `CSRF_TRUSTED_ORIGINS` | Trusted origins | empty |
| `DATABASE_URL` | Database URL | SQLite file |
| `REDIS_URL` | Enables Redis cache and channel layer | empty (in-memory) |
| `FRONTEND_URL` | Used to build invite links | `http://localhost:5173` |
| `ML_SERVICE_URL` | ML prediction endpoint | empty (moderation skipped) |
| `ML_TIMEOUT_SECONDS` | ML request timeout | `5` |
| `ML_MODEL_VERSION` | Stored with each moderated message | `convox-ml-api-0.1.0` |
| `TOXICITY_THRESHOLD` | Flag if toxicity probability is at or above this | `0.7` |
| `SPAM_THRESHOLD` | Flag if spam probability is at or above this | `0.9` |
| `USE_BREVO` | Send real emails through Brevo | `False` (console) |
| `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` | Brevo credentials | none |
| `DEFAULT_FROM_EMAIL` | Sender address | `no-reply@smartcommunity.local` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Enable Cloudinary media storage | empty (local disk) |

Never commit `.env`.

## API overview

All paths are under `/api/`. Authenticated endpoints need `Authorization: Bearer <access_token>`.

### Auth (`/api/auth/`)

| Method | Path | Description |
|---|---|---|
| POST | `register/` | Start registration, sends OTP |
| POST | `verify-email/` | Verify OTP and create the user |
| POST | `resend-verification/` | Resend OTP |
| POST | `login/` | Get access and refresh tokens |
| POST | `token/refresh/` | Refresh the access token |
| POST | `logout/` | Blacklist the refresh token |
| GET, PATCH | `me/` | View or update profile (avatar max 2 MB) |
| POST | `forgot-password/` | Send reset OTP |
| POST | `verify-reset-otp/` | Verify OTP, returns a reset token |
| POST | `reset-password/` | Set a new password |

### Servers, channels, members

| Method | Path | Description |
|---|---|---|
| GET, POST | `servers/` | List your servers or create one |
| POST | `servers/join/` | Join with an invite code or link |
| GET, PATCH, DELETE | `servers/<id>/` | Server detail (changes are owner only) |
| GET, POST | `servers/<id>/channels/` | List channels or create one (owner and admin) |
| GET | `servers/<id>/members/` | List members, supports `?role=` and `?search=` |
| PATCH | `servers/<id>/members/<user_id>/` | Change a role (owner only) |
| GET | `invites/<code>/` | Public invite preview |

### Messages

| Method | Path | Description |
|---|---|---|
| GET, POST | `channels/<id>/messages/` | List (cursor pagination, 50 per page) or send, supports `?search=` and `?author=` |
| GET, PATCH, DELETE | `messages/<id>/` | Read, edit (author only) or delete (author, or owner/admin/moderator) |
| POST | `channels/<id>/attachments/` | Upload a file (multipart, field name `file`) |

### Moderation

| Method | Path | Description |
|---|---|---|
| GET | `servers/<id>/moderation/queue/` | Flagged messages for review |
| GET | `servers/<id>/moderation/logs/` | Audit log of moderation actions |
| POST | `moderation/messages/<id>/action/` | Apply an action: dismiss, warn, remove, mute, suspend |
| GET | `servers/<id>/analytics/` | Server statistics (moderators only) |

Queue and logs use page-number pagination (20 per page, max 100).

### Other

- `GET /api/health/` – service and cache status
- `GET /api/docs/` – Swagger UI, `GET /api/schema/` – OpenAPI schema

## WebSocket

Connect to:

```
ws://<host>/ws/channels/<channel_id>/?token=<access_token>
```

- Only members of the channel's server are accepted (others are closed with code 4003).
- Send: `{"content": "hello"}`
- Receive: `{"type": "message.new", "message": {...}}`
- Messages created through the REST API are also broadcast to the channel.

## How moderation works

1. A message is saved, and its text is sent to `ML_SERVICE_URL`.
2. If the toxicity probability is at or above `TOXICITY_THRESHOLD`, it is labelled `toxic`. Otherwise, if the spam probability is at or above `SPAM_THRESHOLD`, it is labelled `spam`. Otherwise it is `non-toxic`.
3. Toxic or spam messages get the status `flagged`, clean ones get `clean`.
4. If the ML service is down or `ML_SERVICE_URL` is empty, the status stays `unchecked` and chat keeps working.
5. Flagged and reviewed messages are masked with `*` for everyone except the author.
6. Moderators review flagged messages in the queue and apply an action. Every action is stored in the audit log.
7. Muted or suspended members cannot send messages.

## Roles

| Role | Can do |
|---|---|
| owner | everything, including changing roles and server settings |
| admin | create channels, moderate |
| moderator | review the queue, apply actions, delete others' messages |
| member | chat, edit and delete own messages |

## Rate limits

Anonymous 60/min, authenticated 120/min, login 10/min, OTP endpoints 5/min. After 5 wrong passwords, login is locked for 15 minutes. OTPs expire after 10 minutes with a maximum of 5 attempts.

## Tests

```powershell
python manage.py test moderation
```

## Deployment (Render)

- Render deploys from the `dev` branch.
- Start command: `daphne -b 0.0.0.0 -p $PORT config.asgi:application`
- Make sure `python manage.py migrate` runs in the build or pre-deploy step.
- Set the environment variables from the table above in the Render dashboard.
- `/api/health/` is pinged by UptimeRobot to avoid cold starts on the free plan.

## Known limitations and not implemented

- OAuth (Google/GitHub) is not implemented.
- reCAPTCHA is not implemented.
- WebRTC voice/video: a signaling consumer exists only on the `backend` branch and is not merged. It needs frontend work and a TURN server for strict networks.
- Edit and delete events are not pushed over the WebSocket.
- Direct messages, private channels, reactions, and notifications are not implemented.
- Without Cloudinary, uploaded files are stored on local disk, which Render clears on restart.
