# Google Cloud one-command deployment (Cloud Run)

## Prerequisites
- Install and login to Google Cloud CLI (`gcloud`).
- Authenticate once:
  - `gcloud auth login`
- Set your project once (or pass `--project=...` in deploy command):
  - `gcloud config set project YOUR_PROJECT_ID`

## Deploy in one command
From project root:

`npm run deploy:gcp -- --region=us-central1 --mongodb_uri="YOUR_MONGODB_URI" --service=pharmaco --project=YOUR_PROJECT_ID`

## Notes
- This deploys one Cloud Run service that serves both frontend and backend.
- Your frontend uses same-origin API calls by default in production.
- If your MongoDB blocks unknown IPs, allow Cloud Run egress or use a private connection.
- The script auto-enables required APIs (`run`, `cloudbuild`, `artifactregistry`) for the target project.
