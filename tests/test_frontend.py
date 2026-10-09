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
            "connectionStatus", "chatMessages", "customTaskForm",
            "customTaskInput", "exportWorkspaceButton", "importWorkspaceButton",
            "importWorkspaceInput", "savedWorkspacesPanel", "savedWorkspacesList", "savedWorkspaceSearch", "workspaceName",
            "workspaceStatus", "workspaceNotes",
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

    def test_saved_ideas_can_be_loaded_into_planner(self):
        script = (ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn('useIdea.className = "load-idea"', script)
        self.assertIn("ideaInput.value = idea;", script)
        self.assertIn("Saved idea loaded.", script)

    def test_project_plan_can_be_exported(self):
        script = (ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn('document.getElementById("exportPlanButton")', script)
        self.assertIn('link.download = "nexa-project-plan.txt"', script)
        self.assertIn("exportPlanButton.hidden = false;", script)

    def test_workspace_supports_custom_tasks_and_backup_export(self):
        script = (ROOT / "workspace.js").read_text(encoding="utf-8")
        self.assertIn('customTaskForm.addEventListener("submit"', script)
        self.assertIn('activeWorkspace.tasks.push({ text, done: false })', script)
        self.assertIn('nexa-workspace-${safeName}.json', script)
        self.assertIn('JSON.stringify(backup, null, 2)', script)
        self.assertIn('importWorkspaceInput.addEventListener("change"', script)
        self.assertIn('backup?.app !== "Nexa AI Studio"', script)
        self.assertIn('Workspace backup imported successfully.', script)

    def test_saved_workspaces_can_be_listed_and_reopened(self):
        script = (ROOT / "workspace.js").read_text(encoding="utf-8")
        self.assertIn("function listSavedWorkspaces()", script)
        self.assertIn("localStorage.key(index)", script)
        self.assertIn('open.textContent = "Open"', script)
        self.assertIn('renderWorkspace(workspace, workspace.plan || "")', script)
        self.assertIn('remove.textContent = "Delete"', script)
        self.assertIn("localStorage.removeItem(entry.key)", script)
        self.assertIn("window.confirm(", script)

    def test_saved_workspaces_can_be_searched(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        script = (ROOT / "workspace.js").read_text(encoding="utf-8")
        self.assertIn('id="savedWorkspaceSearch"', html)
        self.assertIn('savedWorkspaceSearch.addEventListener("input", listSavedWorkspaces)', script)
        self.assertIn('(entry.name + " " + entry.idea + " " + entry.status).toLocaleLowerCase().includes(query)', script)
        self.assertIn("No saved workspaces match your search.", script)

    def test_generated_plan_is_persisted_and_restored_with_workspace(self):
        script = (ROOT / "workspace.js").read_text(encoding="utf-8")
        self.assertIn('plan: typeof stored.plan === "string" ? stored.plan.slice(0, 20000) : ""', script)
        self.assertIn("workspace.plan = activePlan;", script)
        self.assertIn('renderWorkspace(workspace, workspace.plan || "")', script)
        self.assertIn('plan: typeof backup.plan === "string" ? backup.plan.slice(0, 20000) : ""', script)


if __name__ == "__main__":
    unittest.main()
