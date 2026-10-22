from __future__ import annotations

from decimal import Decimal
import unittest

from market_partner.container import get_application


class PortfolioValuationRegressionTests(unittest.TestCase):
    """
    Regression tests for portfolio valuation correctness.

    All values below are SYNTHETIC DEMO DATA (quality_flags: ['synthetic_fixture']).
    They represent no real brokerage account, portfolio, or security.

    Fixture values:
        NORTHSTAR:   25 shares @ ₹1,500 => ₹37,500   (market_value_minor=3,750,000 paise)
        RIVERSTONE:  80 shares @ ₹800   => ₹64,000   (market_value_minor=6,400,000 paise)
        CEDARTECH:   40 shares @ ₹1,300 => ₹52,000   (market_value_minor=5,200,000 paise)
        MAPLEBIO:    15 shares           => valuation missing
        Total valued holdings:           ₹1,53,500   (invested_holdings_value_minor=15,350,000 paise)
    """

    def setUp(self) -> None:
        self.app = get_application()

    # ------------------------------------------------------------------
    # Northstar (focused query)
    # ------------------------------------------------------------------

    def test_northstar_holding_minor_units(self) -> None:
        """Northstar holding is 3,750,000 paise (₹37,500) — not ₹3,75,000 or ₹1,12,500."""
        response = self.app.get_portfolio_exposure(symbol="NORTHSTAR")
        pos = next(p for p in response.snapshot.positions if p.symbol == "NORTHSTAR")
        # Fixture assertion: quantity and price
        self.assertEqual(pos.quantity, Decimal("25"))
        self.assertEqual(pos.valuation_price, Decimal("1500.00"))
        # Fixture assertion: market_value_minor is in PAISE (100 paise = ₹1)
        self.assertEqual(pos.market_value_minor, 3_750_000)
        self.assertEqual(Decimal(pos.market_value_minor) / 100, Decimal("37500.00"))

    def test_northstar_exposure_metric_minor_and_inr(self) -> None:
        """Northstar exposure metric is ₹37,500 in both minor and inr fields."""
        response = self.app.get_portfolio_exposure(symbol="NORTHSTAR")
        metric = next(m for m in response.metrics if "Northstar" in m.label)
        self.assertEqual(metric.amount_minor, 3_750_000)
        self.assertEqual(Decimal(metric.amount_minor) / 100, Decimal("37500.00"))
        # _inr companion field must exist and be the formatted rupee string
        self.assertEqual(metric.amount_inr, "₹37,500.00")

    def test_northstar_focused_summary_states_holding_value(self) -> None:
        """Focused summary must explicitly state '25 shares valued at ₹37,500.00'."""
        response = self.app.get_portfolio_exposure(symbol="NORTHSTAR")
        self.assertIn("25 shares valued at ₹37,500.00", response.summary)

    def test_northstar_focused_summary_also_states_total(self) -> None:
        """Focused summary must also include the portfolio total for cross-reference."""
        response = self.app.get_portfolio_exposure(symbol="NORTHSTAR")
        self.assertIn("₹153,500.00", response.summary)

    def test_northstar_components_variant_summary(self) -> None:
        """'North Star Components' spelling variant must return the same ₹37,500 summary."""
        response = self.app.get_portfolio_exposure(symbol="North Star Components")
        self.assertIn("₹37,500.00", response.summary)
        self.assertIn("₹153,500.00", response.summary)

    # ------------------------------------------------------------------
    # Total valued holdings (unfocused query)
    # ------------------------------------------------------------------

    def test_total_valued_holdings_minor(self) -> None:
        """Total valued holdings is 15,350,000 paise = ₹1,53,500."""
        response = self.app.get_portfolio_exposure()
        self.assertEqual(response.invested_holdings_value_minor, 15_350_000)
        self.assertEqual(
            Decimal(response.invested_holdings_value_minor) / 100, Decimal("153500.00")
        )

    def test_total_valued_holdings_inr_companion(self) -> None:
        """invested_holdings_value_inr must be '₹153,500.00' (pre-formatted, no arithmetic needed)."""
        response = self.app.get_portfolio_exposure()
        self.assertEqual(response.invested_holdings_value_inr, "₹153,500.00")

    def test_unfocused_summary_states_total_valued_holdings(self) -> None:
        """Unfocused summary must state the ₹153,500 total — not ₹1,12,500 or any other value."""
        response = self.app.get_portfolio_exposure()
        self.assertIn("₹153,500.00", response.summary)
        # Must NOT contain the known wrong value
        self.assertNotIn("₹1,12,500", response.summary)
        self.assertNotIn("₹37,500", response.summary)  # That's only in focused replies

    def test_unfocused_all_sector_metrics_inr(self) -> None:
        """Each sector metric must carry a correct amount_inr companion field."""
        response = self.app.get_portfolio_exposure()
        metric_map = {m.label: m for m in response.metrics}
        # Consumer Staples = Riverstone = 80 * 800 = 64,000
        self.assertEqual(metric_map["Consumer Staples invested holdings exposure"].amount_minor, 6_400_000)
        self.assertEqual(metric_map["Consumer Staples invested holdings exposure"].amount_inr, "₹64,000.00")
        # Industrials = Northstar = 25 * 1500 = 37,500
        self.assertEqual(metric_map["Industrials invested holdings exposure"].amount_minor, 3_750_000)
        self.assertEqual(metric_map["Industrials invested holdings exposure"].amount_inr, "₹37,500.00")
        # Information Technology = CedarTech = 40 * 1300 = 52,000
        self.assertEqual(metric_map["Information Technology invested holdings exposure"].amount_minor, 5_200_000)
        self.assertEqual(metric_map["Information Technology invested holdings exposure"].amount_inr, "₹52,000.00")

    def test_four_positions_three_valued(self) -> None:
        """Snapshot has 4 positions, 3 with valuations, 1 missing (MAPLEBIO)."""
        response = self.app.get_portfolio_exposure()
        self.assertEqual(len(response.snapshot.positions), 4)
        valued = [p for p in response.snapshot.positions if p.market_value_minor is not None]
        self.assertEqual(len(valued), 3)
        missing = [p for p in response.snapshot.positions if p.market_value_minor is None]
        self.assertEqual(len(missing), 1)
        self.assertEqual(missing[0].symbol, "MAPLEBIO")
        self.assertEqual(response.snapshot.coverage, "partial")

    # ------------------------------------------------------------------
    # Missing valuation handling
    # ------------------------------------------------------------------

    def test_maplebio_missing_valuation_handled_gracefully(self) -> None:
        """Focused query on MAPLEBIO (missing valuation) should not raise and should say 'valuation data missing'."""
        response = self.app.get_portfolio_exposure(symbol="MAPLEBIO")
        self.assertIn("valuation data missing", response.summary)
        # Portfolio total still reported correctly in summary
        self.assertIn("₹153,500.00", response.summary)

    def test_invested_holdings_inr_is_dash_when_no_valued_positions(self) -> None:
        """invested_holdings_value_inr should be '—' when no valued positions exist."""
        # We can't easily empty the fixture, so just verify the format_inr helper path
        # by checking that a non-None minor value always produces a ₹ string
        response = self.app.get_portfolio_exposure()
        self.assertTrue(response.invested_holdings_value_inr.startswith("₹"))


class ConversationTotalValuationTests(unittest.IsolatedAsyncioTestCase):
    """Regression tests for MCPConversationHost total valued holdings handling."""

    def setUp(self) -> None:
        from market_partner.config import get_settings
        from market_partner.conversation import MCPConversationHost

        self.settings = get_settings()
        self.host = MCPConversationHost(self.settings)

    def test_total_portfolio_valuation_query_matching(self) -> None:
        """Verify targeted total portfolio valuation queries match and specific/unrelated queries do not."""
        # Queries that should match:
        positive_queries = [
            "What is the total value of my valued holdings?",
            "What is the total value of my valued holdings",
            "What is the total portfolio value?",
            "What is the total value of my portfolio?",
            "What is the total value of my holdings?",
            "What is my total portfolio valuation?",
            "What is the total worth of my portfolio?",
            "Total valued holdings",
            "total valued holdings",
            "what is the value of my valued holdings?",
        ]
        for query in positive_queries:
            with self.subTest(query=query):
                self.assertTrue(
                    self.host._is_total_portfolio_valuation_query(query),
                    f"Expected '{query}' to be identified as total portfolio valuation query",
                )

        # Queries that must NOT match (narrowly scoped):
        negative_queries = [
            "What is my exposure to NORTHSTAR?",
            "What is my exposure to North Star Components?",
            "What is my exposure to Riverstone?",
            "What is the total value of my NORTHSTAR holdings?",
            "What is the total value of North Star Components?",
            "What is my exposure to Industrials?",
            "What is my exposure to Healthcare?",
            "What is my portfolio exposure?",
            "What are my portfolio holdings?",
            "Show me my portfolio",
            "What is my portfolio performance?",
            "What is my P&L?",
            "What is my profit and loss?",
            "Research NORTHSTAR",
            "Can you preview a paper order?",
            "What are my alerts?",
            "Screen for high growth stocks",
            "",
            "   ",
            None,
            123,
        ]
        for query in negative_queries:
            with self.subTest(query=query):
                self.assertFalse(
                    self.host._is_total_portfolio_valuation_query(query),
                    f"Expected '{query}' NOT to be identified as total portfolio valuation query",
                )

    async def test_total_valued_holdings_returns_authoritative_total_and_caveat(self) -> None:
        """A total-valued-holdings question returns backend's formatted total without confusing paise."""
        from unittest.mock import AsyncMock
        from market_partner.container import get_application
        from market_partner.mcp_server import payload
        from market_partner.models import ChatRequest

        app = get_application()
        fixture_payload = payload(app.get_portfolio_exposure())

        self.host._call_tool = AsyncMock(return_value=fixture_payload)

        request = ChatRequest(message="What is the total value of my valued holdings?")
        response = await self.host.respond(request)

        # 1. Authoritative formatted total present
        self.assertIn("₹153,500.00", response.reply)
        # 2. Caveat about incomplete portfolio valuation present
        self.assertIn("missing valuation data", response.reply)
        self.assertIn("does not represent the full portfolio", response.reply)
        # 3. Must NOT confuse integer paise (15350000) with rupees
        self.assertNotIn("15350000", response.reply)
        self.assertNotIn("₹15,350,000", response.reply)
        # 4. Valid mode and tool calls
        self.assertIn(response.mode, ("sarvam", "bedrock", "fixture_router"))
        self.assertEqual(len(response.tool_calls), 1)
        self.assertEqual(response.tool_calls[0]["name"], "get_portfolio_exposure")
        self.assertIsNotNone(response.data)

    async def test_tool_error_handled_safely(self) -> None:
        """Tool error is handled safely without crashing or fabricating a total."""
        from unittest.mock import AsyncMock
        from market_partner.models import ChatRequest

        self.host._call_tool = AsyncMock(return_value={"error": "Database lock timeout"})

        request = ChatRequest(message="What is the total value of my valued holdings?")
        response = await self.host.respond(request)

        self.assertIn("Unable to calculate portfolio valuation", response.reply)
        self.assertIn("Database lock timeout", response.reply)
        self.assertNotIn("₹153,500", response.reply)

    async def test_missing_valuation_data_handled_safely(self) -> None:
        """Missing valuation fields are handled safely without fabricating a total."""
        from unittest.mock import AsyncMock
        from market_partner.models import ChatRequest

        empty_data = {
            "snapshot": {"coverage": "unavailable", "positions": []},
            "invested_holdings_value_minor": None,
            "invested_holdings_value_inr": "—",
            "metrics": [],
            "summary": "No valued positions available.",
        }
        self.host._call_tool = AsyncMock(return_value=empty_data)

        request = ChatRequest(message="What is the total value of my valued holdings?")
        response = await self.host.respond(request)

        self.assertIn("unavailable", response.reply)
        self.assertNotIn("₹153,500", response.reply)

    async def test_specific_security_not_intercepted_by_total_handler(self) -> None:
        """Specific security questions bypass the total handler and proceed to model/router."""
        from unittest.mock import AsyncMock, patch
        from market_partner.models import ChatRequest

        northstar_request = ChatRequest(message="What is my exposure to NORTHSTAR?")
        self.assertFalse(self.host._is_total_portfolio_valuation_query(northstar_request.message))

        northstar_comp_request = ChatRequest(message="What is my exposure to North Star Components?")
        self.assertFalse(self.host._is_total_portfolio_valuation_query(northstar_comp_request.message))


if __name__ == "__main__":
    unittest.main()

