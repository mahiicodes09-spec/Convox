# Smart Community – Backend

Django backend for **Smart Community**, a Discord-like real-time chat platform with AI-powered moderation.

- **Live API:** https://smart-community-api-o0h9.onrender.com
- **Swagger docs:** https://smart-community-api-o0h9.onrender.com/api/docs/
- **Health check:** https://smart-community-api-o0h9.onrender.com/api/health/

---

## Features

| Area | What it does |
|---|---|
| Accounts | Email + password signup with OTP verification, JWT login, logout, forgot/reset password, profile with avatar |
| Redis | Pending signups, OTPs and reset tokens are stored in Redis with a 10 minute TTL. Logout blacklist and login rate limit also use Redis |
| Servers | Create a server, join with an invite code or link, public invite preview |
| Roles | owner / admin / moderator / member per server. Only the owner can change roles (no privilege escalation) |
| Channels | Text channels inside a server. A `general` channel is created automatically |
| Messages | History with cursor pagination, send, edit own message, delete (author or owner/admin/moderator) |
| Real-time chat | WebSocket per channel using Django Channels + Redis channel layer |
| AI moderation | Every new or edited message is checked by the ML service (toxicity + spam). Toxic/spam messages are **flagged**, not blocked |
| Moderator tools | Flagged message queue, dismiss / warn / remove actions with a reason, and an audit log |

---

## Tech stack

- Python 3.14, Django 6.1, Django REST Framework
- SimpleJWT (authentication), drf-spectacular (Swagger / OpenAPI)
- Django Channels + Daphne (WebSocket, ASGI server)
- Redis (cache + channel layer), PostgreSQL on Neon (production), SQLite (local)
- Brevo SMTP (OTP emails), WhiteNoise (static files)
- Deployed on Render (web service + Key Value / Redis)

---

## Folder structure

```
backend/
├── config/          settings, main urls, asgi (HTTP + WebSocket router)
├── accounts/        custom User, register/OTP/login/logout/reset, Redis helpers
├── communities/     Server, ServerMember (roles), Channel, invites
├── chat/            Message, REST views, WebSocket consumer, JWT middleware, ML client
├── moderation/      ModerationLog, flagged queue, moderator actions
├── manage.py
├── requirements.txt
└── .env.example
```

---

## Local setup (Windows / PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # then edit .env (at least SECRET_KEY)
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open http://127.0.0.1:8000/api/docs/ for Swagger.

`runserver` starts **Daphne** (because `daphne` is in `INSTALLED_APPS`), so WebSockets work locally too.

Locally you do not need Redis or PostgreSQL:
- No `REDIS_URL` → local-memory cache + in-memory channel layer
- No `DATABASE_URL` → SQLite
- `USE_BREVO=False` → OTP emails are printed in the terminal

---

## Environment variables

See `.env.example`. Never commit the real `.env`.

| Variable | Required | Example / default | Purpose |
|---|---|---|---|
| `SECRET_KEY` | yes | – | Django secret key |
| `DEBUG` | no | `False` | `True` only for local |
| `ALLOWED_HOSTS` | yes (prod) | `127.0.0.1,localhost` | Comma separated hosts |
| `CSRF_TRUSTED_ORIGINS` | prod | `https://*.onrender.com` | For admin login over HTTPS |
| `CORS_ALLOWED_ORIGINS` | yes | `http://localhost:5173,https://convox-weld.vercel.app` | Frontend origins (no spaces, no trailing `/`) |
| `FRONTEND_URL` | yes | `https://convox-weld.vercel.app` | Used to build invite links |
| `DATABASE_URL` | prod | – | PostgreSQL URL. Empty = SQLite |
| `REDIS_URL` | prod | – | Redis URL. Empty = local memory |
| `USE_BREVO` | no | `False` | `True` = send real emails |
| `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` | if Brevo | – | Brevo SMTP credentials |
| `DEFAULT_FROM_EMAIL` | yes | – | Verified sender email |
| `ML_SERVICE_URL` | no | `https://convox-ml-api.onrender.com/predict` | ML moderation API. Empty = moderation off |
| `TOXICITY_THRESHOLD` | no | `0.7` | Flag if toxicity probability ≥ this |
| `SPAM_THRESHOLD` | no | `0.9` | Flag if spam probability ≥ this |
| `ML_TIMEOUT_SECONDS` | no | `5` | Max wait for the ML API |
| `ML_MODEL_VERSION` | no | `convox-ml-api-0.1.0` | Stored with each moderation result |

---

## Authentication

All endpoints need a JWT access token unless marked **public**:

```
Authorization: Bearer <access_token>
```

- Access token: 30 minutes. Refresh token: 7 days.
- After logout, both tokens stop working immediately (Redis blacklist).
- Login is locked for 15 minutes after 5 wrong passwords (returns `429`).

---

## REST API

Base URL: `/api/`

### Accounts – `/api/auth/`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `register/` | public | `email, display_name, password, password2` → sends OTP (202). User is **not** created yet |
| POST | `verify-email/` | public | `email, otp` → creates user, returns `user, access, refresh` (201) |
| POST | `resend-verification/` | public | `email` → new OTP (60 s cooldown) |
| POST | `login/` | public | `email, password` → `access, refresh` |
| POST | `token/refresh/` | public | `refresh` → new `access` |
| POST | `logout/` | yes | `refresh` → blacklists refresh + current access token (204) |
| GET / PATCH | `me/` | yes | Own profile (`display_name, bio, status, avatar`). Avatar: jpg/png/webp, max 2 MB |
| POST | `forgot-password/` | public | `email` → reset OTP (always 200) |
| POST | `verify-reset-otp/` | public | `email, otp` → `reset_token` (one time, 10 min) |
| POST | `reset-password/` | public | `email, reset_token, new_password, new_password2` |

### Servers, members, channels

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `servers/` | member | Servers I have joined |
| POST | `servers/` | any user | Create server (creator = owner, `general` channel auto created) |
| GET / PATCH / DELETE | `servers/<id>/` | member / owner | Details for members, edit/delete only owner |
| POST | `servers/join/` | any user | `invite_code` (code or full link) → 201 joined, 200 already member |
| GET | `invites/<code>/` | **public** | Invite preview: name, description, icon, member count |
| GET | `servers/<id>/members/` | member | Members with roles |
| PATCH | `servers/<id>/members/<user_id>/` | owner | `{"role": "admin" \| "moderator" \| "member"}` |
| GET | `servers/<id>/channels/` | member | Channels of the server |
| POST | `servers/<id>/channels/` | owner / admin | `{"name": "doubts"}` (saved as lowercase, spaces → `-`) |

### Messages

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `channels/<id>/messages/` | member | Latest 50 messages first. Use `next` link for older ones |
| POST | `channels/<id>/messages/` | member | `{"content": "hello"}` (max 2000 chars) |
| GET | `messages/<id>/` | member | One message |
| PATCH | `messages/<id>/` | author | Edit content (sets `edited_at`, re-checked by AI) |
| DELETE | `messages/<id>/` | author / owner / admin / moderator | Delete message |

Message object:

```json
{
  "id": 12,
  "channel": 3,
  "author": {"id": 1, "display_name": "Rahul", "avatar": null},
  "content": "hello",
  "created_at": "2026-10-25T10:30:00Z",
  "edited_at": null,
  "moderation_status": "clean"
}
```

`moderation_status`: `unchecked` (ML not available), `clean`, `flagged`, `reviewed` (warned by a moderator).

### Moderation

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `servers/<id>/moderation/queue/` | owner / admin / moderator | Flagged messages with label and score |
| POST | `moderation/messages/<id>/action/` | owner / admin / moderator | `{"action": "dismiss" \| "warn" \| "remove", "reason": "..."}` |
| GET | `servers/<id>/moderation/logs/` | owner / admin / moderator | Audit log (action, actor, target user, message id, reason, time) |

| Action | Result |
|---|---|
| `dismiss` | AI was wrong → message becomes `clean` |
| `warn` | Message stays, marked `reviewed` |
| `remove` | Message is deleted |

---

## WebSocket (real-time chat)

```
ws://127.0.0.1:8000/ws/channels/<channel_id>/?token=<access_token>
wss://smart-community-api-o0h9.onrender.com/ws/channels/<channel_id>/?token=<access_token>
```

- The token goes in the query string because browsers cannot send an `Authorization` header with WebSocket.
- Connection is rejected if the token is missing, invalid, logged out, or the user is not a member of the server.

Send:

```json
{"content": "hello"}
```

Receive (everyone connected to the channel, including the sender):

```json
{"type": "message.new", "message": { ...message object... }}
```

Error:

```json
{"type": "error", "detail": "Message khaali nahi ho sakta."}
```

Messages sent over WebSocket are saved in the database, so they also appear in the history API.

Quick browser test (open the page on the same server, then the console with `Ctrl + Shift + J`):

```js
const ws = new WebSocket("ws://127.0.0.1:8000/ws/channels/1/?token=TOKEN");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.send(JSON.stringify({content: "hello"}));
```

---

## AI moderation flow

```
message (REST or WebSocket)
   → chat/moderation.py → POST ML_SERVICE_URL {"message": "..."}
   → toxicity_probability ≥ 0.7  → flagged (label "toxic")
   → else spam_probability ≥ 0.9 → flagged (label "spam")
   → else                        → clean
   → saved with toxicity_label, toxicity_score, model_version
   → moderator reviews in the queue → dismiss / warn / remove → audit log
```

- Expected ML response: `{"toxicity_detection": {"toxicity_probability": ...}, "spam_detection": {"spam_probability": ...}}`
- The AI only gives a **signal**. Messages are never auto-deleted; a human moderator decides (as required by the project brief).
- If the ML service is down, slow (> 5 s) or not configured, the message is still saved with `unchecked`. Chat never stops.

---

## Redis usage

| Key | TTL | Used for |
|---|---|---|
| `pending_reg:<email>` | 10 min | Signup data (hashed password + hashed OTP) until the email is verified |
| `reset_otp:<email>` | 10 min | Forgot-password OTP (hashed) |
| `reset_token:<email>` | 10 min | One-time reset token (hashed) |
| `login_fail:<email>` | 15 min | Wrong password counter (lock after 5) |
| `blacklist:<jti>` | until token expiry | Logged-out JWTs |
| channel layer | – | Delivers WebSocket messages to every connected user |

---

## Deployment (Render)

- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- **Start command:** `daphne -b 0.0.0.0 -p $PORT config.asgi:application`
- **Redis:** Render Key Value (same region as the web service). Put its *Internal* URL in `REDIS_URL`
- **Database:** Neon PostgreSQL via `DATABASE_URL`
- Render deploys from the `dev` branch. Workflow: push to `backend` → PR `backend → dev` → merge → auto deploy
- Free services sleep after 15 min. UptimeRobot pings `/api/health/` every 5 minutes (do the same for the ML API)

---

## Known limitations / future scope

- Direct messages and group conversations
- File and image attachments, reactions, message search
- Notifications, typing indicator, online presence
- Private channels, invite revoke/expiry
- Mute / suspend members, server analytics
- Uploaded avatars/icons are lost on Render restart (needs Cloudinary/S3)
- The ML model misses some Hinglish insults (for example "tu pagal hai kya bewakoof" is non-toxic) – reported to the ML team
