# Google Service Account Setup — Drive Export Pipeline

**Status:** Required for Phase 2C activation  
**Last updated:** 2026-03-21

---

## Purpose

This file defines how to configure Google Drive access for the GitHub export pipeline using a service account under `admin@getmyadvocate.org`.

This is the recommended authentication method for MyAdvocate because it is stable, automation-friendly, and separate from personal interactive login state.

---

## What this enables

Once configured, GitHub Actions can:
- authenticate to Google Drive
- upload approved export files
- route files into the correct Drive folders
- keep NotebookLM source folders downstream of governed repo changes

---

## Recommended ownership model

- Google Workspace owner: `admin@getmyadvocate.org`
- Service account: dedicated to export automation only
- Drive folder access: restricted to the MyAdvocate export tree only

---

## Setup steps

### 1. Create or select a Google Cloud project
Use a dedicated project for MyAdvocate automation.

### 2. Enable the Google Drive API
Enable Drive API for the project.

### 3. Create a service account
Suggested name:
- `myadvocate-drive-exporter`

### 4. Generate a JSON key
Create one JSON key for the service account and store it securely.

### 5. Share the MyAdvocate Drive root folder
Share the target MyAdvocate Drive root folder with the service account email as an editor.

### 6. Add GitHub secrets
Add the following repository secrets:
- `GDRIVE_SERVICE_ACCOUNT_JSON`
- `GDRIVE_ROOT_FOLDER_ID`

Optional future secrets:
- `GDRIVE_NOTEBOOKLM_FOLDER_ID`
- `GDRIVE_EXPORTS_FOLDER_ID`

---

## Secret format

### `GDRIVE_SERVICE_ACCOUNT_JSON`
Store the full JSON key as the secret value.

### `GDRIVE_ROOT_FOLDER_ID`
Store only the Drive folder ID, not the full URL.

---

## Folder structure expected

Root:
- `/MyAdvocate/`

Subfolders:
- `00_System`
- `01_Strategy`
- `02_Product`
- `03_Content`
- `04_Automation`
- `05_Compliance`
- `06_Operations`
- `07_Exports`

---

## Security rules

- Do not commit service account JSON to the repo
- Do not reuse the service account for unrelated apps
- Limit Drive sharing to the required folder tree only
- Rotate the key if exposure is suspected

---

## Operational rule

GitHub remains the source of truth.

The service account exists only to move approved exports downstream into Drive.
