# Drive

**Drive** is a personal cloud-storage web app, in the spirit of Google Drive. You create an account, upload your files, organise them in folders, find them again with search, share them with other people, and get them back from the trash if you delete something by mistake.

This repository has two parts that work together:

| Part | Folder | What it is |
|---|---|---|
| **Frontend** (this folder) | `frontend/` | The website people use – Next.js, React, Tailwind CSS, Zustand |
| **Backend** | `backend/` | The server and database behind it – Express, PostgreSQL, Drizzle ORM. See [`backend/README.md`](../backend/README.md) for the API, architecture and database |

```
┌────────────────────┐   HTTP / JSON    ┌────────────────────┐        ┌──────────────┐
│  Frontend          │ ───────────────► │  Backend (API)     │ ─────► │ PostgreSQL   │
│  Next.js · :3000   │ ◄─────────────── │  Express · :5000   │ ─────► │ + file disk  │
└────────────────────┘                  └────────────────────┘        └──────────────┘
```

---

## Contents

1. [What users can do](#1-what-users-can-do)
2. [Screens](#2-screens)
3. [A typical session](#3-a-typical-session)
4. [Quick start](#4-quick-start)
5. [How the frontend is built](#5-how-the-frontend-is-built)
6. [Folder structure](#6-folder-structure)
7. [State management](#7-state-management)
8. [Scripts](#8-scripts)

---

## 1. What users can do

### Account
- **Sign up** with name, email, password and password confirmation.
- **Log in** with email and password, or with **Google**, **GitHub** or **LinkedIn**.
- Stay logged in after closing the tab; **log out** from the avatar menu in the top-right corner.

### Files and folders
- **Upload files** – images (JPG, PNG, GIF, WebP), PDF, Word (DOC, DOCX), Excel (XLS, XLSX) and MP4 video, up to 200 MB each.
  - **Several files at once:** press **Upload → Choose files** and select as many as you like.
  - **A whole folder:** press **Upload → Choose folder**. The folder and all its sub-folders are recreated in your drive, with every file in its place.
  - **Drag and drop** files *or folders* from your computer straight onto the page (empty folders are kept too).
  - Before anything is sent you see the full list. Files that can't be uploaded (wrong type, empty, too big) are marked and skipped; the rest go ahead.
  - A progress bar shows the overall upload and each file has its own status. You can **cancel**, and **retry** the ones that failed.
  - If a file with the same name already exists, both are kept (`photo (1).png`); uploading a folder with the same name as an existing one **merges** into it.
  - **Uploading a single file?** You can give it any name you like first; the extension is added for you.
- **Create folders**, including folders inside folders, and move around with the clickable path at the top (*My Drive › Work › 2026*).
- **Preview** files without downloading them: images and videos open in the page, PDFs open in a new tab. Images and PDFs also show a **thumbnail** on their card.
- **Download** any file.
- **Rename** files and folders (a file keeps its extension).
- **Move** a file or folder by **dragging it onto a folder**, or with **Move to…** and the folder picker.
- **Search** by name from the top bar. Results show where each item lives.
- Switch between **grid** and **list** view.

### Trash and safety net
- Deleting only **moves items to the Trash**, and a toast offers **Undo**.
- In **Trash** you can **restore** an item (it returns to its old place) or **delete it forever**, or empty the whole trash.

### Sharing
- **Share** a file or folder with another user by typing their email.
- They find it under **Shared with me** and can browse, preview and download – but not change anything (view only).
- You can stop sharing at any time; they can also remove it from their own list.

### Storage
- A **storage meter** in the sidebar shows how much of your space you've used (1 GB by default). Items in the trash still count until they are deleted forever.

### Comfort
- **Dark and light themes** (the toggle is in the top-right corner; your choice is remembered, and the first visit follows your system setting).
- Works on **phones and tablets**: the sidebar becomes a slide-out menu.

---

## 2. Screens

| Page | URL | What it shows |
|---|---|---|
| Sign up | `/register` | Create an account (also offers Google / GitHub / LinkedIn) |
| Log in | `/login` | Log in with email + password or a social account |
| Social login return | `/auth/callback` | Short "Signing you in…" page after a provider redirects back |
| **My Drive** | `/drive` | Your top-level folders and files |
| A folder | `/drive/<folderId>` | The contents of one folder, with breadcrumbs |
| **Shared with me** | `/shared` | Files and folders other people shared with you |
| A shared folder | `/shared/<folderId>` | Read-only contents of a shared folder |
| **Trash** | `/trash` | Deleted items waiting to be restored or removed |
| Home | `/` | Sends you to My Drive (or to Log in if you aren't signed in) |

Pages after login share one frame: a **sidebar** (My Drive, Shared with me, Trash, storage meter), a **top bar** (search, account menu) and **toast** messages at the bottom. If you are not logged in, any of these pages sends you to `/login`.

### What each card's menu (⋮) offers

| Where | Actions |
|---|---|
| A folder in My Drive | Rename · Move to… · Share · Move to trash |
| A file in My Drive | Open · Download · Rename · Move to… · Share · Move to trash |
| Items in Shared with me | Open / Download (and *Remove from list* on top-level items) |
| Items in Trash | Restore · Delete forever |

---

## 3. A typical session

1. **Register** (or click *Continue with Google*). You land on an empty **My Drive**.
2. Click **+ New folder**, name it *Invoices*.
3. Click **Upload → Choose files**, pick `scan.pdf`, name it *March invoice*, upload. The PDF card shows a thumbnail of its first page. (Or drag your whole *Invoices 2026* folder onto the page to upload everything in it at once.)
4. Drag *March invoice.pdf* onto the *Invoices* folder to file it away.
5. Next month, type *invoice* in the search box and open it straight from the results.
6. Open the file's **⋮ menu → Share** and enter your accountant's email. They now see the file under **Shared with me**.
7. Delete an old file by mistake? Click **Undo** in the toast, or open **Trash → Restore** later.
8. Check the **storage meter** to see how much space is left.

---

## 4. Quick start

You need **Node.js 20+** and a running **PostgreSQL**.

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env     # set DATABASE_URL (your Postgres login) and JWT_SECRET
npm run dev              # http://localhost:5000
```

On first start the backend creates the database and its tables automatically.

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev                    # http://localhost:3000
```

Open **http://localhost:3000** and register.

| Setting | File | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Address of the backend API, e.g. `http://localhost:5000/api` |
| `CORS_ORIGIN` | `backend/.env` | Must equal the frontend address, e.g. `http://localhost:3000` |

> Social login needs OAuth keys from Google / GitHub / LinkedIn in `backend/.env`. Without them the password login works normally and the social buttons show "not configured". Details are in [`backend/README.md`](../backend/README.md#2-environment-variables).

> Restart `npm run dev` after changing an `.env` file – Next.js and the backend read them only at startup.

---

## 5. How the frontend is built

**Stack:** Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Zustand

```
 Page (src/app)            thin: picks the view inside <AppShell>
    │
    ▼
 View component            DriveView · SharedView · TrashView   (src/components/drive)
    │  builds a list of "entries", opens dialogs, shows toasts
    ▼
 Zustand store             driveStore · sharedStore · trashStore    (src/store)
    │  holds the data, calls the API, reloads after each change
    ▼
 API client                src/lib/driveApi.ts  (adds the login token, signs out on 401)
    │
    ▼
 Backend REST API          http://localhost:5000/api
```

How things fit together:

- **One list component for everything.** `EntryList` draws the grid/list of cards. Each view converts its data into the same `DriveEntry` shape (name, meta line, thumbnail, menu actions), so My Drive, Search, Shared and Trash all look and behave alike.
- **The server is the source of truth.** After every change (rename, move, delete…) the store re-fetches the folder, so the screen always matches the database.
- **Login.** The token returned by the backend is kept in the browser (`localStorage`) by the auth store. `driveApi` sends it with every request; if the server answers `401` the user is signed out.
- **Files are never loaded through `fetch` with a token.** For previews and downloads the backend gives a temporary signed link, so `<img>`, `<video>` and download links work directly.
- **Theming** uses CSS variables in `src/app/globals.css` (`:root[data-theme="dark"]` / `"light"`). A tiny inline script in `layout.tsx` applies the saved theme before the first paint, so there is no flash.

---

## 6. Folder structure

```
frontend/src/
├── app/                      Pages (Next.js App Router)
│   ├── layout.tsx            Root layout: fonts, theme script, theme toggle
│   ├── globals.css           Theme colours + gold/purple component styles
│   ├── page.tsx              "/"  → redirect to /drive or /login
│   ├── login/  register/     Auth pages
│   ├── auth/callback/        Landing page after Google/GitHub/LinkedIn login
│   ├── drive/[[...folderId]]/    My Drive and any folder
│   ├── shared/[[...folderId]]/   Shared with me
│   └── trash/                Trash
│
├── components/
│   ├── layout/               AppShell, Sidebar, TopBar, SearchBox, StorageMeter, Toaster
│   ├── drive/                DriveView, SharedView, TrashView, EntryList, dialogs
│   │                         (Upload, Move, Share, Name, Confirm, Preview), Breadcrumbs, icons…
│   ├── auth/                 AuthCard, FormError, SocialButtons
│   ├── theme/                ThemeToggle
│   └── ui/                   Button, Input
│
├── store/                    Zustand stores (see below)
├── lib/                      api.ts, driveApi.ts, uploader.ts (multi-file / folder upload engine),
│                             readDropped.ts (reads dropped folders), validation.ts, format.ts, errors.ts, constants.ts
└── types/                    TypeScript types, one file per topic
```

---

## 7. State management

All client state lives in small [Zustand](https://zustand.docs.pmnd.rs/) stores.

| Store | Holds | Saved in browser? |
|---|---|---|
| `authStore` | Logged-in `user` and `token`; `register`, `login`, `completeSocialLogin`, `logout` | ✔ (`localStorage`) |
| `driveStore` | Current folder's contents, search query/results, storage usage; create / rename / move / trash / upload actions | – |
| `sharedStore` | Contents of *Shared with me*; remove a share | – |
| `trashStore` | Trash contents; restore / delete forever / empty | – |
| `uiStore` | Grid or list view, mobile menu open/closed | grid/list only |
| `themeStore` | Dark or light | ✔ (`localStorage`, via the layout script) |
| `toastStore` | The little messages at the bottom (with optional **Undo**) | – |

---

## 8. Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Check the code with ESLint |
