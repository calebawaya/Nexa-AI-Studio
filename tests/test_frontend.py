import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PageInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.assets = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.ids.append(element_id)
        if tag == "link" and attributes.get("rel") == "stylesheet":
            self.assets.append(attributes.get("href"))
        if tag == "script" and attributes.get("src"):
            self.assets.append(attributes["src"])


class FrontendIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.page = PageInspector()
        cls.page.feed(cls.html)

    def test_page_has_no_duplicate_ids(self):
        duplicates = sorted({
            element_id for element_id in self.page.ids
            if self.page.ids.count(element_id) > 1
        })
        self.assertEqual(duplicates, [], f"Duplicate HTML IDs: {duplicates}")

    def test_required_interactive_controls_exist_once(self):
        required = [
            "themeButton", "ideaForm", "ideaInput", "clearButton",
            "exportIdeasButton", "chatForm", "chatInput",
            "checkBackendButton", "clearChatButton", "chatCounter",
            "connectionStatus", "chatMessages",
        ]
        for element_id in required:
            with self.subTest(element_id=element_id):
                self.assertEqual(self.page.ids.count(element_id), 1)

    def test_local_css_and_javascript_files_exist(self):
        for asset in self.page.assets:
            with self.subTest(asset=asset):
                self.assertIsNotNone(asset)
                self.assertTrue((ROOT / asset).is_file(), f"Missing local asset: {asset}")

    def test_idea_planner_has_ai_and_fallback_paths(self):
        script = (ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn("async function generateIdeaPlan(idea)", script)
        self.assertIn("/api/chat", script)
        self.assertIn("AI-generated plan for:", script)
        self.assertIn("Local starter plan", script)
        self.assertIn("Nexa is preparing your project plan...", script)

    def test_idea_planner_restores_submit_button_label(self):
        script = (ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn("originalSubmitText", script)
        self.assertIn("submitButton.textContent = originalSubmitText;", script)


if __name__ == "__main__":
    unittest.main()
