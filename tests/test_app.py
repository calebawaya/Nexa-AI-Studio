import unittest
from unittest.mock import patch

import app as backend


class FakeResponse:
    output_text = "Here is a simple project plan."


class FakeResponses:
    def create(self, **kwargs):
        self.last_request = kwargs
        return FakeResponse()


class FakeClient:
    def __init__(self):
        self.responses = FakeResponses()


class NexaApiTests(unittest.TestCase):
    def setUp(self):
        self.client = backend.app.test_client()
        self.original_client = backend.client

    def tearDown(self):
        backend.client = self.original_client

    def test_root_describes_service(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["service"], "Nexa AI Studio API")

    def test_health_endpoint_works_without_api_key(self):
        backend.client = None
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()["ai_configured"])

    def test_chat_requires_api_configuration(self):
        backend.client = None
        response = self.client.post("/api/chat", json={"message": "Help me build a website"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("OPENAI_API_KEY", response.get_json()["error"])

    def test_chat_rejects_empty_message(self):
        backend.client = FakeClient()
        response = self.client.post("/api/chat", json={"message": "   "})
        self.assertEqual(response.status_code, 400)

    def test_chat_rejects_oversized_message(self):
        backend.client = FakeClient()
        response = self.client.post("/api/chat", json={"message": "x" * 2001})
        self.assertEqual(response.status_code, 400)

    def test_chat_returns_assistant_reply(self):
        backend.client = FakeClient()
        response = self.client.post("/api/chat", json={"message": "Help me build a website"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["reply"], "Here is a simple project plan.")


if __name__ == "__main__":
    unittest.main()
