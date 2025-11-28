Google Gemini (Generative) — Quick setup

This file explains how to configure Google Generative API (Gemini) for the project.

1) Create a Service Account & JSON key (recommended for Docker / production)

```bash
# Authenticate and select your project
gcloud auth login
gcloud config set project PROJECT_ID

# Create service account
gcloud iam service-accounts create chatbot-sa --display-name="Chatbot SA"

# Grant a role (for testing use editor; use least privilege in production)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:chatbot-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create and download key to ./secrets
mkdir -p ./secrets
gcloud iam service-accounts keys create ./secrets/gcp-sa.json \
  --iam-account=chatbot-sa@PROJECT_ID.iam.gserviceaccount.com
```

2) Enable the Generative Language API for the project

```bash
gcloud services enable generativelanguage.googleapis.com --project=PROJECT_ID
```

3) Place the JSON key at `./secrets/gcp-sa.json` (do NOT commit it into git)

4) Docker: the project `docker-compose.yml` mounts `./secrets/gcp-sa.json` into the web container at `/run/secrets/gcp-sa.json` and sets `GOOGLE_APPLICATION_CREDENTIALS`.

Run:

```bash
# ensure key is present locally
ls -l ./secrets/gcp-sa.json

docker compose down
docker compose up --build
docker compose logs -f web
```

5) Quick local token check (for development):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/secrets/gcp-sa.json"
node -e "const {GoogleAuth}=require('google-auth-library');(async()=>{const a=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});const c=await a.getClient();const t=await c.getAccessToken();console.log(typeof t==='object'?t.token:t);})()"
```

Expected: a long access token printed. If you see `Could not load the default credentials`, the `GOOGLE_APPLICATION_CREDENTIALS` file is not found or invalid — re-check step 3.

6) Test the Generative API (curl) if token OK:

```bash
TOKEN=$(node -e "const {GoogleAuth}=require('google-auth-library');(async()=>{const a=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});const c=await a.getClient();const t=await c.getAccessToken();process.stdout.write(typeof t==='object'?t.token:t);})()")

curl -s -X POST "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":{"text":"Xin chào"},"temperature":0.2,"maxOutputTokens":64}' | jq .
```

7) Notes & troubleshooting

- If the curl returns 403/permission errors: ensure the Generative API is enabled in the same project, and the service account has roles to call APIs and the project has billing enabled.
- For local dev you can also run `gcloud auth application-default login` to set up ADC without a JSON key (not usable from inside container unless you mount credentials).
- Do NOT store JSON keys in the repo. Use Docker mounts or secret managers for deployment.

If you want, I can also add a short snippet to the main `README.md` pointing to this file.
