# Hugging Face Spaces Deployment

This project is configured as a Docker Space. The container builds the React frontend and serves it from the FastAPI backend on the same URL.

## Create the Space

1. Sign in at https://huggingface.co.
2. Select **New Space**.
3. Choose **Docker** as the SDK and choose the free CPU hardware.
4. Upload the repository contents, including `Dockerfile`, `.dockerignore`, `backend/`, `frontend/`, `model/`, `data/`, `requirements.txt`, and `README_HUGGINGFACE.md`.
5. Set the Space visibility as desired and wait for the Docker build to finish.

The public app URL will be:

```text
https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
```

The API health check is available at `/api/health` on the same Space URL.

## Free-tier limitations

- Provide `MONGODB_URI` in Space Settings > Repository Secrets for persistent data storage (e.g. MongoDB Atlas).
- Free Spaces sleep when idle, so the first request after inactivity may be slow.
- The live ingestion scheduler is not guaranteed to run while the Space is asleep.
- Do not upload `.env`, local databases, `node_modules`, or `dist`; Docker creates what it needs during the build.