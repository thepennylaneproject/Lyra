from __future__ import annotations

import unittest
from pathlib import Path


class DashboardArchitectPromptTests(unittest.TestCase):
    def test_prompt_exists_with_required_output_contract(self) -> None:
        prompt_path = (
            Path(__file__).resolve().parents[2]
            / "audits"
            / "prompts"
            / "dashboard-architect.md"
        )

        self.assertTrue(prompt_path.exists())

        content = prompt_path.read_text()

        self.assertIn("Define the core views (pages)", content)
        self.assertIn("Define the reusable components and their hierarchy", content)
        self.assertIn("Define the end-to-end data flows", content)
        self.assertIn("Prefer simple architecture over cleverness.", content)
        self.assertIn("Design for observability first", content)
        self.assertIn('"pages"', content)
        self.assertIn('"components"', content)
        self.assertIn('"data_flow"', content)
        self.assertIn('"state_management"', content)
        self.assertIn('"tech_stack"', content)
        self.assertIn('"realtime"', content)


if __name__ == "__main__":
    unittest.main()
