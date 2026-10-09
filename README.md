# Nexa AI Studio

A static website frontend with an optional Python/Flask AI backend.

## Files

- `index.html`, `style.css`, `script.js`: GitHub Pages frontend
- `app.py`: Flask API
- `requirements.txt`: Python dependencies
- `render.yaml`: Render deployment blueprint
- `.env.example`: environment-variable example only; contains no real secrets

## Run the backend locally

1. Install Python 3.11 or newer.
2. Create and activate a virtual environment.
3. Install dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Set `OPENAI_API_KEY` in your local environment. You can copy `.env.example` to `.env` and replace the placeholder locally. Never commit `.env`.
5. Start the server:

   ```bash
   python app.py
   ```

6. Open `http://127.0.0.1:5000/api/health`.

## Run the API tests

After installing dependencies, run:

```bash
python -m unittest discover -s tests -v
```

These tests cover API health and validation, malformed and non-object JSON, security headers, and a mocked assistant reply without calling the paid AI API. Frontend integrity tests check for duplicate HTML IDs, required controls, and missing local assets. GitHub Actions also checks JavaScript syntax. The frontend remembers the selected glow and up to 50 recent chat messages in this browser; saved ideas can be exported as a text file.

## Deploy the backend on Render

1. In Render, create a new Blueprint from this repository, or create a Python web service.
2. Set `OPENAI_API_KEY` as a secret environment variable in Render. Do not add the key to frontend files or GitHub.
3. Deploy and test `https://YOUR-SERVICE.onrender.com/api/health`.
4. Copy the service URL. In `script.js`, set `API_BASE_URL` to that URL and commit the update.
5. Keep `CORS_ORIGINS` set to the exact GitHub Pages origin for this site: `https://calebawaya.github.io`.

The backend reports whether a key is configured, but never returns the key. The free hosting tier may sleep when idle. AI API usage may incur separate charges.

## GitHub Pages

GitHub Pages serves only the static frontend; it does not run Flask. Enable Pages from the `main` branch and `/(root)`. The website can still show local demo responses until the backend is deployed and `API_BASE_URL` is configured.
