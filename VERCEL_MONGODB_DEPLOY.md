# Vercel + MongoDB Atlas deployment (preview)

This branch adds a Vercel Services configuration with the existing Vite frontend and a Laravel 12 / FrankenPHP backend container. The backend uses MongoDB Atlas for application records and GridFS for persistent media files. The existing Docker Compose/MySQL workflow is kept for local development.

## Vercel project settings

1. Open the existing MangaLib project in Vercel.
2. Set **Root Directory** to the repository root (not `frontend`). The `vercel.json` file declares the frontend service root as `frontend` and the backend service root as `backend`.
3. Do not set the whole project framework preset to Container. Vercel detects Vite for the frontend service and uses `backend/Dockerfile.vercel` for the backend service.
4. Keep the current `main` branch as production until the preview deployment is verified. Deploy this branch as a Preview first.

## Environment variables

Set these for **Preview** first. Add them to Production only after the preview passes.

- `MONGODB_URI`: supplied by the connected MongoDB Atlas integration. Do not commit or share it.
- `MONGODB_DATABASE=mangalib`
- `DB_CONNECTION=mongodb`
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY`: a unique Laravel key beginning with `base64:`. Generate it locally with PowerShell:
  ```powershell
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 32
  $rng.GetBytes($bytes)
  $rng.Dispose()
  "base64:" + [Convert]::ToBase64String($bytes)
  ```
  Paste the output into Vercel only. Never put it in GitHub or this chat.
- `APP_URL=https://<your-vercel-domain>`
- `SESSION_DRIVER=mongodb`
- `SESSION_CONNECTION=mongodb`
- `SESSION_SECURE_COOKIE=true`
- `SANCTUM_STATEFUL_DOMAINS=<your-vercel-domain-without-https>`
- `FILESYSTEM_DISK=public`

For the first admin account, also set:

- `MANGA_ADMIN_EMAIL=<your-admin-email>`
- `MANGA_ADMIN_NAME=MangaLib Admin`
- `MANGA_ADMIN_PASSWORD=<a-unique-password-at-least-12-characters>`

The initial administrator is created only if the configured email does not already exist. An existing configured user is promoted to admin, but its password is not overwritten.

## What the container does

- Installs Laravel MongoDB Integration 5.11 and the Flysystem GridFS adapter.
- Uses MongoDB collections and creates the indexes required by the application on container startup.
- Uses MongoDB-backed sessions so authentication survives container scale-down.
- Stores uploaded media in MongoDB GridFS rather than the ephemeral container filesystem.
- Keeps the existing local Dockerfile and Compose/MySQL setup separate.

## Known deployment limits

This is an initial preview, not a production certification. Test registration/login, catalog filtering, author applications, admin moderation, bookmarks, reading progress, and image delivery before merging. Vercel container functions are stateless and inherit platform function limits. The current upload UI sends image files through the API; large or multi-page chapter uploads may hit Vercel request-size limits and need a direct-upload flow to object storage. GridFS files also count against the Atlas cluster storage quota.
