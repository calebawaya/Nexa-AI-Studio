import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "*").split(",")}})

MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=API_KEY) if API_KEY else None

SYSTEM_PROMPT = (
    "You are Nexa, a helpful beginner-friendly project planning assistant. "
    "Help users plan websites, software projects, and small business ideas. "
    "Give practical, safe, clear steps. Be honest about uncertainty. "
    "Do not claim to have changed files, deployed code, or performed actions unless you actually did."
)

@app.get("/")
def home():
    return jsonify({
        "service": "Nexa AI Studio API",
        "status": "ok",
        "endpoints": ["/api/health", "/api/chat"]
    })

@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "ai_configured": bool(client),
        "model": MODEL if client else None
    })

@app.post("/api/chat")
def chat():
    if not client:
        return jsonify({
            "error": "AI backend is not configured yet. Add OPENAI_API_KEY in the hosting service environment variables."
        }), 503

    payload = request.get_json(silent=True) or {}
    message = payload.get("message", "")
    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Please provide a message."}), 400
    message = message.strip()
    if len(message) > 2000:
        return jsonify({"error": "Message is too long. Please keep it under 2,000 characters."}), 400

    try:
        response = client.responses.create(
            model=MODEL,
            instructions=SYSTEM_PROMPT,
            input=message,
            max_output_tokens=500
        )
        answer = (response.output_text or "").strip()
        if not answer:
            return jsonify({"error": "The AI returned an empty response. Please try again."}), 502
        return jsonify({"reply": answer})
    except Exception:
        app.logger.exception("AI chat request failed")
        return jsonify({"error": "The AI service could not complete the request. Check the backend logs and configuration."}), 502

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
