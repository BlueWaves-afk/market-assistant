from __future__ import annotations

import json
import threading
import unittest
from pathlib import Path
from typing import Any

from market_partner.models import SourceRecord
from market_partner.workflows.research import (
    ResearchValidationError,
    _analyze_validated,
    create_research_run,
)


class InvalidThenValidModel:
    def __init__(self, *, always_invalid: bool = False) -> None:
        self.always_invalid = always_invalid
        self.calls: dict[str, int] = {}
        self._lock = threading.Lock()

    @property
    def usage_summary(self) -> dict[str, Any]:
        return {
            "provider": "test",
            "model_id": "invalid-then-valid",
            "requests": sum(self.calls.values()),
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }

    def analyze(self, role: str, question: str, sources: list[SourceRecord]) -> dict[str, Any]:
        with self._lock:
            count = self.calls.get(role, 0) + 1
            self.calls[role] = count
        if count == 1 or self.always_invalid:
            return {
                "summary": "The analysis is based on the supplied synthetic evidence.",
                "claim_ids": ["invented-excerpt-id"],
                "counterpoints": [],
                "open_questions": [],
            }
        excerpt_ids = [
            excerpt["excerpt_id"] for source in sources for excerpt in source.excerpts
        ]
        return {
            "summary": f"The {role.replace('_', ' ')} finds a conditional case in the supplied evidence.",
            "claim_ids": excerpt_ids,
            "counterpoints": ["The packet leaves important evidence unresolved."],
            "open_questions": ["Which new evidence would change this interpretation?"],
        }


class ResearchValidationRetryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        fixture_path = (
            Path(__file__).resolve().parents[1]
            / "fixtures"
            / "sources"
            / "northstar.json"
        )
        packet = json.loads(fixture_path.read_text(encoding="utf-8"))
        cls.sources = [SourceRecord.model_validate(source) for source in packet["sources"]]

    def test_invalid_first_response_gets_one_validated_retry(self) -> None:
        model = InvalidThenValidModel()
        run = create_research_run(
            owner_id="test-owner",
            instrument_id="NSE:NORTHSTAR:EQ:INR",
            company_name="Northstar Components Ltd (fictional demo company)",
            question="Compare the supported case and countercase.",
            sources=self.sources,
            model=model,
        )

        self.assertEqual(run.validation_status, "valid")
        self.assertEqual(len(run.analyses), 5)
        self.assertTrue(all(count == 2 for count in model.calls.values()))
        self.assertTrue(all(analysis.claim_ids for analysis in run.analyses))

    def test_invalid_second_response_still_fails_closed(self) -> None:
        model = InvalidThenValidModel(always_invalid=True)

        with self.assertRaises(ResearchValidationError):
            _analyze_validated(
                model,
                "business_financial_analyst",
                "Compare the supported case and countercase.",
                self.sources,
            )

        self.assertEqual(model.calls.get("business_financial_analyst"), 2)


if __name__ == "__main__":
    unittest.main()
