# Drive Backend

REST API for a Google-Drive-style app: sign up / log in (email or Google / GitHub / LinkedIn), folders and files, move, search, trash, sharing between users, thumbnails and storage quotas.

**Stack:** Node.js · Express 5 · TypeScript · PostgreSQL · Drizzle ORM · Zod · JWT · Multer · Sharp

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [Environment variables](#2-environment-variables)
3. [Architecture](#3-architecture)
4. [Folder structure](#4-folder-structure)
5. [Route → Controller → Service → Repository map](#5-route--controller--service--repository-map)
6. [Database](#6-database)
7. [Drizzle ORM commands](#7-drizzle-orm-commands)
8. [API reference](#8-api-reference)
9. [Business rules](#9-business-rules)
10. [Security notes](#10-security-notes)
11. [npm scripts](#11-npm-scripts)

---

## 1. Quick start

```bash
cd backend
npm install
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET
npm run dev                 # http://localhost:5000
```

With `DB_AUTO_SETUP=true` (the default) the server, on startup, **creates the database if it is missing and applies all pending migrations**. You do not need to run any Drizzle command for a first run. See [section 7](#7-drizzle-orm-commands) for when you do.

Health check: `GET http://localhost:5000/api/health`

> `tsx watch` restarts on code changes only. After editing `.env` or adding a new migration file, stop the server (`Ctrl+C`) and run `npm run dev` again.

---

## 2. Environment variables

Validated at startup by `src/config/env.ts` (Zod). The server exits with a clear message if something is invalid.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `production` or `test` |
| `PORT` | `5000` | HTTP port |
| `DATABASE_URL` | – (required) | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET` | – (required, ≥ 32 chars) | Signs login tokens and file links |
| `JWT_EXPIRES_IN` | `1d` | Login token lifetime |
| `CORS_ORIGIN` | `*` | Allowed frontend origin, e.g. `http://localhost:3000` |
| `DB_AUTO_SETUP` | `true` | Create the database and run migrations on startup (set `false` in production) |
| `BACKEND_URL` | `http://localhost:5000` | Public URL of this API (OAuth callbacks, file links) |
| `FRONTEND_URL` | `http://localhost:3000` | Where users are sent after social login |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | empty | Leave blank to disable Google login |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | empty | Leave blank to disable GitHub login |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | empty | Leave blank to disable LinkedIn login |
| `UPLOAD_DIR` | `uploads` | Where files are stored on disk (relative to the working directory) |
| `MAX_FILE_SIZE_MB` | `200` | Largest single upload |
| `USER_QUOTA_MB` | `1024` | Storage per user |

OAuth callback URLs to register with each provider: `{BACKEND_URL}/api/auth/{google|github|linkedin}/callback`.

---

## 3. Architecture

### 3.1 Layers (block diagram)

Every request travels down through the layers and the answer travels back up. A layer only talks to the layer directly below it.

```
                         ┌──────────────────────────┐
                         │   Frontend (Next.js)     │
                         └────────────┬─────────────┘
                                      │  HTTP / JSON   (multipart for uploads)
┌─────────────────────────────────────▼───────────────────────────────────────┐
│  app.ts        helmet · cors · express.json · cookieParser                  │
│                  └─► routes/index.ts  (mounted under /api)                  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│  ROUTES        routes/*.routes.ts                                           │
│                maps  METHOD + URL  ──►  middleware chain ──► controller     │
├─────────────────────────────────────────────────────────────────────────────┤
│  MIDDLEWARE    authenticate (JWT) · validate (Zod) · checkQuota ·           │
│                uploadSingle (Multer) · error handler / 404                  │
│                       ▲ validators/*.ts (Zod schemas) used by validate      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│  CONTROLLERS   controllers/*.controller.ts                                  │
│                read req (params / query / body), call ONE service,          │
│                send the response with sendSuccess()                         │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│  SERVICES      services/*.service.ts            ◄── business rules          │
│                ownership checks · quota · trash logic · sharing ·           │
│                name-conflict handling · thumbnails · OAuth account linking  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│  REPOSITORIES  repositories/*.repository.ts     ◄── ONLY place with queries │
│                Drizzle ORM queries (select / insert / update / delete)      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│  SCHEMAS       schemas/*.schema.ts   (Drizzle table definitions)            │
│  CONFIG        config/database.ts    (pg Pool + drizzle instance)           │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                         ┌────────────▼─────────────┐        ┌───────────────┐
                         │   PostgreSQL             │        │  Disk         │
                         │   users, folders, files, │        │  uploads/     │
                         │   shares, oauth_accounts │        │  <userId>/... │
                         └──────────────────────────┘        └───────────────┘
```

Supporting folders used by several layers: `utils/` (helpers), `types/` (shared TypeScript types), `config/` (env, database, bootstrap).

### 3.2 Same picture as a Mermaid diagram

```mermaid
flowchart TD
    FE["Frontend (Next.js)"] -->|"HTTP / JSON"| APP["app.ts<br/>helmet · cors · json · cookies"]
    APP --> RT["Routes<br/>routes/*.routes.ts"]
    RT --> MW["Middleware<br/>authenticate · validate · checkQuota · upload"]
    MW --> CT["Controllers<br/>controllers/*.controller.ts"]
    VAL["Validators (Zod)<br/>validators/*.ts"] -.used by.-> MW
    CT --> SV["Services<br/>services/*.service.ts"]
    SV --> RP["Repositories<br/>repositories/*.repository.ts"]
    RP --> SC["Schemas (Drizzle)<br/>schemas/*.schema.ts"]
    SC --> DB[("PostgreSQL")]
    SV --> DISK[("Disk<br/>uploads/userId/...")]
    SV --> OA["OAuth providers<br/>services/oauth/*"]
    OA --> EXT["Google · GitHub · LinkedIn"]
```

### 3.3 Request lifecycle (example: upload a file)

```mermaid
sequenceDiagram
    participant C as Client
    participant R as file.routes
    participant M as Middleware
    participant K as file.controller
    participant S as file.service
    participant P as file.repository
    participant D as PostgreSQL + Disk

    C->>R: POST /api/files (multipart)
    R->>M: authenticate (JWT -> req.user)
    M->>M: checkQuota (Content-Length vs free space)
    M->>D: uploadSingle writes the file to uploads/<userId>/
    M->>K: uploadFile
    K->>K: Zod-validate name + folderId
    K->>S: fileService.create()
    S->>S: folder ownership · exact quota · name conflict
    S->>P: fileRepository.create()
    P->>D: INSERT INTO files
    K-->>C: 201 { success, message, data: { file } }
    Note over K,D: On any error the uploaded file is deleted from disk
```

### 3.4 Social login flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as Backend
    participant G as Provider (Google/GitHub/LinkedIn)
    B->>API: GET /api/auth/google
    API-->>B: set oauth_state cookie, 302 to provider
    B->>G: user signs in and approves
    G-->>B: 302 /api/auth/google/callback?code&state
    B->>API: callback (cookie + state)
    API->>API: compare state with cookie (CSRF check)
    API->>G: exchange code for token, fetch profile
    API->>API: find / link / create user, issue JWT
    API-->>B: 302 FRONTEND_URL/auth/callback#token=JWT
```

---

## 4. Folder structure

```
backend/
├── drizzle.config.ts          Drizzle Kit config (schema path, migrations folder, DB url)
├── drizzle/                   Generated SQL migrations (commit these!)
├── scripts/
│   └── pdf-render.mjs         Renders page 1 of a PDF to PNG. Runs as a SEPARATE process (see below)
├── uploads/                   Stored files (git-ignored): uploads/<userId>/<uuid>.<ext>
│                              and uploads/<userId>/.thumbs/<uuid>.<ext>.webp
└── src/
    ├── server.ts              Starts the app (runs DB setup first, graceful shutdown)
    ├── app.ts                 Express setup: security headers, CORS, parsers, routes, errors
    │
    ├── config/
    │   ├── env.ts             Zod-validated environment variables
    │   ├── database.ts        pg Pool + Drizzle instance
    │   └── bootstrap.ts       CREATE DATABASE if missing + run migrations
    │
    ├── routes/                URL ↔ controller wiring (index mounts everything under /api)
    ├── middleware/            auth, validate, quota, upload, error handling
    ├── validators/            Zod schemas for request bodies
    ├── controllers/           HTTP layer: read request, call a service, send response
    ├── services/              Business logic (and services/oauth/ for the 3 providers)
    ├── repositories/          Database queries (Drizzle) – the only layer that touches tables
    ├── schemas/               Drizzle table definitions
    ├── types/                 Shared TypeScript types (one file per topic)
    └── utils/                 ApiError, asyncHandler, jwt, password, storage, file types…
```

| Folder | Responsibility | Must **not** |
|---|---|---|
| `routes` | Choose which middleware + controller runs for a URL | contain logic |
| `middleware` | Cross-cutting checks (auth, validation, quota, upload) | talk to the DB directly (except `checkQuota` via repository) |
| `validators` | Describe valid request bodies with Zod | – |
| `controllers` | Translate HTTP ⇄ service calls | contain business rules or queries |
| `services` | Business rules, orchestration | build HTTP responses |
| `repositories` | Run queries | contain business rules |
| `schemas` | Define tables and columns | – |

---

## 5. Route → Controller → Service → Repository map

All paths are prefixed with `/api`. `Auth` = needs `Authorization: Bearer <JWT>`.

| Route file | Mounted at | Controller file | Service(s) | Repository(ies) |
|---|---|---|---|---|
| `auth.routes.ts` | `/api/auth` | `auth.controller.ts`, `oauth.controller.ts` | `auth.service`, `services/oauth/*` | `user`, `oauth` |
| `drive.routes.ts` | `/api/drive` | `drive.controller.ts` | `drive.service`, `folder.service` | `folder`, `file` |
| `folder.routes.ts` | `/api/folders` | `folder.controller.ts` | `folder.service` | `folder` |
| `file.routes.ts` | `/api/files` | `file.controller.ts` | `file.service`, `folder.service`, `thumbnail.service` | `file`, `folder`, `share` |
| `trash.routes.ts` | `/api/trash` | `trash.controller.ts` | `trash.service` | `folder`, `file` |
| `share.routes.ts` | `/api/shares` | `share.controller.ts` | `share.service`, `file.service`, `folder.service` | `share`, `folder`, `file`, `user` |

### Schemas used by each repository

| Repository | Tables |
|---|---|
| `user.repository` | `users` |
| `oauth.repository` | `oauth_accounts`, `users` |
| `folder.repository` | `folders` (+ raw recursive SQL for the folder tree) |
| `file.repository` | `files` |
| `share.repository` | `shares`, `files`, `folders`, `users` |

### Middleware order per route group

| Route group | Middleware chain (in order) |
|---|---|
| `/auth/register`, `/auth/login` | `validate(schema)` → controller |
| `/auth/me` | `authenticate` → controller |
| `/drive/*`, `/folders/*`, `/trash/*`, `/shares/*` | `authenticate` → (`validate(schema)`) → controller |
| `POST /files` | `authenticate` → `checkQuota` → `uploadSingle` → controller |
| other `/files/*` (except below) | `authenticate` → (`validate(schema)`) → controller |
| `GET /files/:id/content`, `GET /files/:id/thumbnail` | *no `authenticate`* – protected by a signed `?token=` in the URL |
| everything | `notFound` → `errorHandler` at the end |

---

## 6. Database

### 6.1 Entity relationship diagram

```mermaid
erDiagram
    users ||--o{ folders : owns
    users ||--o{ files : owns
    users ||--o{ oauth_accounts : "signs in with"
    users ||--o{ shares : "shares (owner)"
    users ||--o{ shares : "receives (recipient)"
    folders ||--o{ folders : "contains (parent_id)"
    folders ||--o{ files : contains
    folders ||--o{ shares : "shared as"
    files   ||--o{ shares : "shared as"

    users {
        serial id PK
        varchar name
        varchar email UK
        varchar password "nullable (social-only users)"
        timestamp created_at
        timestamp updated_at
    }
    oauth_accounts {
        serial id PK
        int user_id FK
        varchar provider "google | github | linkedin"
        varchar provider_account_id
        timestamp created_at
    }
    folders {
        serial id PK
        int user_id FK
        int parent_id FK "null = top level"
        varchar name
        timestamp deleted_at "null = active, set = in trash"
        timestamp created_at
        timestamp updated_at
    }
    files {
        serial id PK
        int user_id FK
        int folder_id FK "null = top level"
        varchar name "display name incl. extension"
        varchar stored_name UK "random name on disk"
        varchar mime_type
        bigint size
        timestamp deleted_at "null = active, set = in trash"
        timestamp created_at
        timestamp updated_at
    }
    shares {
        serial id PK
        int owner_id FK
        int recipient_id FK
        int file_id FK "exactly one of file_id / folder_id"
        int folder_id FK
        timestamp created_at
    }
```

### 6.2 Tables

| Table | Schema file | Notes |
|---|---|---|
| `users` | `schemas/user.schema.ts` | `email` unique; `password` is `NULL` for social-only accounts |
| `oauth_accounts` | `schemas/oauth-account.schema.ts` | Unique on (`provider`, `provider_account_id`) |
| `folders` | `schemas/folder.schema.ts` | Self-reference via `parent_id`, `ON DELETE CASCADE`; index on (`user_id`, `parent_id`) |
| `files` | `schemas/file.schema.ts` | `ON DELETE CASCADE` from folder; index on (`user_id`, `folder_id`) |
| `shares` | `schemas/share.schema.ts` | `CHECK` that exactly one of `file_id` / `folder_id` is set; unique per (`recipient_id`, item) |

---

## 7. Drizzle ORM commands

Configuration lives in `drizzle.config.ts`:

```ts
schema: './src/schemas/*.schema.ts'   // where tables are defined
out:    './drizzle'                    // where SQL migrations are written
dialect: 'postgresql'
dbCredentials: { url: process.env.DATABASE_URL }
```

### 7.1 Commands

| npm script | Underlying command | What it does | When to use it |
|---|---|---|---|
| `npm run db:generate` | `drizzle-kit generate` | Compares your `schemas/*.schema.ts` with the last snapshot and writes a new SQL file into `drizzle/`. **Does not touch the database.** | After you change a schema file |
| `npm run db:migrate` | `drizzle-kit migrate` | Runs the not-yet-applied SQL files from `drizzle/` against the database | To apply migrations by hand (production, CI) |
| `npm run db:push` | `drizzle-kit push` | Syncs the schema straight to the database, **without** migration files | Quick throw-away prototyping only |
| `npm run db:studio` | `drizzle-kit studio` | Opens a web UI to browse and edit your data (https://local.drizzle.studio) | Inspecting data during development |
| – | `npx drizzle-kit check` | Checks the migration files for inconsistencies | Before committing migrations |

> `migrate`, `push` and `studio` connect to the database, so `DATABASE_URL` must be set in `.env`. `generate` only reads your schema files and works without a database connection.

### 7.2 Workflow when you change the database

```mermaid
flowchart LR
    A["Edit src/schemas/*.schema.ts"] --> B["npm run db:generate"]
    B --> C["Review the new drizzle/000X_*.sql file"]
    C --> D{"How to apply?"}
    D -->|"Dev: restart server<br/>(DB_AUTO_SETUP=true)"| E["Migration applied on startup"]
    D -->|"Manually / production"| F["npm run db:migrate"]
```

1. Edit or add a file in `src/schemas/` (new tables must be named `*.schema.ts` so the config finds them, and imported in `src/config/database.ts`).
2. `npm run db:generate` – creates `drizzle/000X_name.sql`.
3. Read the generated SQL, then commit it.
4. Apply it: restart the server (auto-setup) or run `npm run db:migrate`.

### 7.3 Good to know

- **Never edit a migration that has already been applied.** Generate a new one instead.
- **Commit the `drizzle/` folder** (including `meta/`). The server reads it at startup.
- **Auto-setup** (`src/config/bootstrap.ts`): creates the database from `DATABASE_URL` if it doesn't exist (connecting to the `postgres` database to do so), then calls Drizzle's `migrate()` on the `drizzle/` folder. The server must be started from the `backend/` folder so `./drizzle` resolves. In production set `DB_AUTO_SETUP=false` and run `npm run db:migrate` as a deploy step.
- **`db:push` vs migrations:** `push` is quick but leaves no history and can drop data. Prefer `generate` + `migrate`.
- **Studio:** if `local.drizzle.studio` doesn't load in Chrome/Brave, allow local network access for the site or try Firefox.

Inspect the database directly:

```bash
psql "$DATABASE_URL" -c "\dt"                # list tables
psql "$DATABASE_URL" -c "\d files"           # describe a table
psql "$DATABASE_URL" -c "select * from drizzle.__drizzle_migrations"   # applied migrations
```

---

## 8. API reference

Base URL: `http://localhost:5000/api`

### 8.1 Response format

Success:

```json
{ "success": true, "message": "Login successful", "data": { } }
```

Error:

```json
{ "success": false, "message": "Validation failed", "errors": { "email": ["Invalid email address"] } }
```

| Status | Meaning |
|---|---|
| `200` / `201` | OK / created |
| `400` | Validation failed or invalid request |
| `401` | Missing, invalid or expired token / wrong credentials |
| `404` | Not found (also returned for items that belong to someone else, so ids can't be probed) |
| `409` | Name already exists / already shared |
| `413` | File too large or storage quota exceeded |
| `500` | Unexpected server error |

### 8.2 Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | Returns `{ success: true, message: "OK" }` |

### 8.3 Auth – `routes/auth.routes.ts`

| Method | Endpoint | Auth | Body / Query | Controller → Service | Description |
|---|---|---|---|---|---|
| POST | `/auth/register` | – | `name`, `email`, `password`, `confirmPassword` | `register` → `authService.register` | Create an account; returns `{ user, token }` |
| POST | `/auth/login` | – | `email`, `password` | `login` → `authService.login` | Log in; returns `{ user, token }` |
| GET | `/auth/me` | ✔ | – | `me` → `authService.getProfile` | Current user |
| GET | `/auth/:provider` | – | `provider` = `google` \| `github` \| `linkedin` | `startOAuth` | Redirects to the provider's sign-in page |
| GET | `/auth/:provider/callback` | – | `code`, `state` (from provider) | `finishOAuth` → `authService.oauthLogin` | Finishes social login, redirects to `FRONTEND_URL/auth/callback#token=…` |

Password rules: 8–72 characters with a lowercase letter, an uppercase letter and a number; `confirmPassword` must match.

### 8.4 Drive (browse, search, storage) – `routes/drive.routes.ts`

| Method | Endpoint | Auth | Body / Query | Controller → Service | Description |
|---|---|---|---|---|---|
| GET | `/drive` | ✔ | `?folderId=` (omit for top level) | `getContents` → `driveService.getContents` | Folders + files in a folder, plus breadcrumbs |
| GET | `/drive/search` | ✔ | `?q=` (max 100 chars) | `search` → `driveService.search` | Find folders/files by name; each hit includes its `path` |
| GET | `/drive/storage` | ✔ | – | `getStorage` → `driveService.getStorage` | `{ used, quota }` in bytes (trash counts as used) |

### 8.5 Folders – `routes/folder.routes.ts`

| Method | Endpoint | Auth | Body | Controller → Service | Description |
|---|---|---|---|---|---|
| POST | `/folders` | ✔ | `name`, `parentId?` | `createFolder` → `folderService.create` | Create a folder (top level if no `parentId`) |
| POST | `/folders/ensure-path` | ✔ | `parentId` (`null` = top level), `path` (array of 1–20 folder names, e.g. `["Photos","2026"]`) | `ensureFolderPath` → `folderService.ensurePath` | Find-or-create a chain of nested folders and return the last one. Existing folders (case-insensitive) are reused, so uploading a folder **merges** into an existing one. Used when uploading whole folders |
| PATCH | `/folders/:id` | ✔ | `name` | `renameFolder` → `folderService.rename` | Rename |
| PATCH | `/folders/:id/move` | ✔ | `parentId` (`null` = top level) | `moveFolder` → `folderService.move` | Move; cannot move into itself or a sub-folder |
| DELETE | `/folders/:id` | ✔ | – | `trashFolder` → `folderService.trash` | **Moves to trash** (not permanent) |

### 8.6 Files – `routes/file.routes.ts`

| Method | Endpoint | Auth | Body / Query | Controller → Service | Description |
|---|---|---|---|---|---|
| POST | `/files` | ✔ | multipart: `file`, `name?`, `folderId?`, `onConflict?` (`fail` default, or `rename`) | `uploadFile` → `fileService.create` | Upload one file. Allowed: jpg, jpeg, png, gif, webp, pdf, doc, docx, xls, xlsx, mp4. With `onConflict=rename` a name clash becomes `name (1).ext` instead of `409`. Several files / a folder = one request per file (see below) |
| GET | `/files/:id/url` | ✔ | – | `getFileUrl` → `fileService.getViewable` | Temporary link (1 h) for preview/download; works for the owner and for people the file is shared with |
| GET | `/files/:id/content` | token | `?token=` (from `/url`), `&download=1` | `streamFile` | Streams the file (supports Range for video) |
| GET | `/files/:id/thumbnail` | token | `?token=` (from the `thumbnailUrl` field) | `streamThumbnail` → `thumbnailService.ensure` | 480×360 WebP preview of an image or the first page of a PDF; cached |
| PATCH | `/files/:id` | ✔ | `name` | `renameFile` → `fileService.rename` | Rename (the extension is kept) |
| PATCH | `/files/:id/move` | ✔ | `folderId` (`null` = top level) | `moveFile` → `fileService.move` | Move |
| DELETE | `/files/:id` | ✔ | – | `trashFile` → `fileService.trash` | **Moves to trash** (not permanent) |

File objects returned by the API:

```json
{
  "id": 7, "name": "Report.pdf", "mimeType": "application/pdf", "size": 20480,
  "folderId": null, "createdAt": "…", "updatedAt": "…", "deletedAt": null,
  "thumbnailUrl": "http://localhost:5000/api/files/7/thumbnail?token=…"
}
```

PDF thumbnails are rendered by `scripts/pdf-render.mjs` in a **separate short-lived process** (at most 2 at a time, 30 s timeout). PDF rendering uses native code (`pdfjs-dist` + `@napi-rs/canvas`); if it ever crashes, only that one thumbnail fails and the API server keeps running. Start the server from the `backend/` folder so the script is found, and keep `@napi-rs/canvas` on the `0.1.x` line that `pdfjs-dist` supports.

`thumbnailUrl` is `null` for file types without a preview (Word, Excel, MP4) and for trashed files.

**Uploading several files or a whole folder.** The API stays simple: the frontend does it with the endpoints above.

1. For every folder in the selection it calls `POST /folders/ensure-path` (parents before children, one at a time) to recreate the structure.
2. It then sends each file with `POST /files`, a few at a time, with `folderId` set to the matching folder and `onConflict=rename`.
3. Each file succeeds or fails on its own, so one bad file never stops the rest. A full storage (`413` quota) stops the remaining uploads.

### 8.7 Trash – `routes/trash.routes.ts`

| Method | Endpoint | Auth | Controller → Service | Description |
|---|---|---|---|---|
| GET | `/trash` | ✔ | `listTrash` → `trashService.list` | Items you deleted (items inside a trashed folder are not listed separately) |
| POST | `/trash/folders/:id/restore` | ✔ | `restoreFolder` → `trashService.restoreFolder` | Restore; goes to the top level if its parent is gone; renames on conflict (`name (1)`) |
| POST | `/trash/files/:id/restore` | ✔ | `restoreFile` → `trashService.restoreFile` | Same for a file |
| DELETE | `/trash/folders/:id` | ✔ | `deleteFolderForever` → `trashService.deleteFolderForever` | **Permanent**: folder, everything inside it, files on disk and cached thumbnails |
| DELETE | `/trash/files/:id` | ✔ | `deleteFileForever` → `trashService.deleteFileForever` | **Permanent** |
| DELETE | `/trash` | ✔ | `emptyTrash` → `trashService.empty` | **Permanent**: empties the whole trash |

### 8.8 Sharing – `routes/share.routes.ts`

Sharing is **view-only**: recipients can browse, preview and download, nothing else.

| Method | Endpoint | Auth | Body / Query | Controller → Service | Description |
|---|---|---|---|---|---|
| POST | `/shares` | ✔ | `itemType` (`file`\|`folder`), `itemId`, `email` | `createShare` → `shareService.create` | Share with a registered user by email |
| GET | `/shares/item` | ✔ | `?type=file\|folder&id=` | `listRecipients` → `shareService.listRecipients` | Who an item is shared with (owner only) |
| GET | `/shares/with-me` | ✔ | `?folderId=` (omit for top level) | `sharedWithMe` → `shareService.browse` | "Shared with me": top-level shares, or the contents of a shared folder |
| DELETE | `/shares/:id` | ✔ | – | `revokeShare` → `shareService.revoke` | Owner revokes, or recipient removes it from their own list |

---

## 9. Business rules

| Area | Rule |
|---|---|
| Ownership | Every query is filtered by `user_id`. Other people's items return `404`. |
| Names | Unique (case-insensitive) among active siblings in the same folder, separately for files and folders. Conflicts return `409` (or are auto-renamed `name (1)` when uploading with `onConflict=rename`). |
| Folder upload | `ensure-path` reuses folders that already exist, so uploading a folder named like an existing one merges into it; clashing files get ` (1)` added. |
| Extensions | A file's extension can't be changed by renaming. |
| Moving | A folder can't be moved into itself or one of its own sub-folders. |
| Trash | `DELETE /files/:id` and `/folders/:id` only set `deleted_at`. Trashed items don't appear in listings or search, can't be opened, and their share links stop working. Restoring brings them (and their shares) back. |
| Storage | Quota is checked twice: from `Content-Length` before the upload is written, and with the exact size afterwards. Trashed files still count until deleted forever. |
| Sharing | View-only. Access to a file is allowed for the owner, for people it was shared with, and for people who have a shared parent folder. It is re-checked on every request. |
| Social login | An account is linked to an existing user only when the provider reports a **verified** email. Social-only users have no password. |
| Uploads | Allowed by extension (the server sets the MIME type itself); files are stored under random names. |

---

## 10. Security notes

- Passwords are hashed with bcrypt (12 rounds); they are never returned by any endpoint.
- Login tokens are JWTs. File and thumbnail links use **separate token types** (`purpose: file` / `thumb`) that cannot be used to log in, and a thumbnail token can't open the full file.
- Social login uses a random `state` stored in an `httpOnly` cookie to prevent CSRF, and puts the token in the URL *fragment* so it never reaches server logs.
- `helmet` security headers are on; CORS is limited to `CORS_ORIGIN`.
- Request bodies are validated with Zod; the file allow-list excludes SVG and HTML to avoid script injection.
- Keep `JWT_SECRET` and OAuth secrets out of git (`.env` is git-ignored).

---

## 11. npm scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | Development server with auto-restart |
| `npm run build` | `tsc -p tsconfig.json` | Compile to `dist/` |
| `npm start` | `node dist/server.js` | Run the compiled server |
| `npm run typecheck` | `tsc --noEmit` | Type-check without building |
| `npm run db:generate` | `drizzle-kit generate` | Create a migration from schema changes |
| `npm run db:migrate` | `drizzle-kit migrate` | Apply migrations |
| `npm run db:push` | `drizzle-kit push` | Sync schema directly (prototyping) |
| `npm run db:studio` | `drizzle-kit studio` | Browse data in the browser |
