from __future__ import annotations

import unittest

from market_partner.container import get_application
from market_partner.errors import DomainError


class InstrumentResolutionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = get_application()

    def test_northstar_variations_resolve_successfully(self) -> None:
        """Verify exact failing UI variation 'North Star Components' and variants resolve to NORTHSTAR."""
        for variation in [
            "Northstar Components",
            "North Star Components",
            "North Star",
            "north star components",
            "NORTHSTAR",
        ]:
            instrument = self.app.resolve_instrument(variation)
            self.assertEqual(instrument["symbol"], "NORTHSTAR")

    def test_get_portfolio_exposure_with_north_star_components(self) -> None:
        """Verify get_portfolio_exposure works with 'North Star Components' without raising 404."""
        response = self.app.get_portfolio_exposure(symbol="North Star Components")
        self.assertIsNotNone(response.snapshot)
        self.assertTrue(any("Northstar" in m.label for m in response.metrics))

    def test_other_demo_universe_whitespace_variations(self) -> None:
        """Verify River Stone and Cedar Tech variations resolve correctly."""
        self.assertEqual(self.app.resolve_instrument("River Stone Foods")["symbol"], "RIVERSTONE")
        self.assertEqual(self.app.resolve_instrument("River Stone")["symbol"], "RIVERSTONE")
        self.assertEqual(self.app.resolve_instrument("Cedar Tech")["symbol"], "CEDARTECH")
        self.assertEqual(self.app.resolve_instrument("Maple Bio")["symbol"], "MAPLEBIO")

    def test_unknown_and_ambiguous_securities_fail_closed(self) -> None:
        """Preserve strict fictional demo universe boundary."""
        for unknown in ["Apple", "Reliance", "Tesla", "Random Corp"]:
            with self.assertRaises(DomainError) as ctx:
                self.app.resolve_instrument(unknown)
            self.assertEqual(ctx.exception.code, "instrument_not_found")
            self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(DomainError) as ctx:
            self.app.resolve_instrument("Ltd")
        self.assertEqual(ctx.exception.code, "ambiguous_instrument")
        self.assertEqual(ctx.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
