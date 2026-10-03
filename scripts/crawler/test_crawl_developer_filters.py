"""Seam tests for crawl_developer.keep_url (issue #7 phased widen)."""

from __future__ import annotations

import unittest

from crawl_developer import keep_url


def _dmo(name: str) -> str:
    return f"https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/{name}"


def _integ(name: str) -> str:
    return f"https://developer.salesforce.com/docs/data/data-cloud-int/guide/{name}"


class KeepUrlDmoPhasedTests(unittest.TestCase):
    def test_keeps_standard_ssot_object_leaves(self) -> None:
        self.assertTrue(keep_url(_dmo("c360dm-account-dmo.md"), "dmo_phased"))
        self.assertTrue(keep_url(_dmo("c360dm-si-academicinterestdmo-dmo.md"), "dmo_phased"))

    def test_keeps_standard_mapping_leaves(self) -> None:
        self.assertTrue(keep_url(_dmo("c360dm-account_dmo_mappings.md"), "dmo_phased"))
        self.assertTrue(keep_url(_dmo("c360dm-standard_mappings.md"), "dmo_phased"))

    def test_keeps_conceptual_dmo_guide_pages(self) -> None:
        self.assertTrue(
            keep_url(_dmo("c360dm-si-entity-interface-dmos-introduction.md"), "dmo_phased")
        )
        self.assertTrue(keep_url(_dmo("c360a-starter-data-bundles.md"), "dmo_phased"))

    def test_drops_pure_dlo_leaf_noise(self) -> None:
        self.assertFalse(keep_url(_dmo("c360dm-account-dlo.md"), "dmo_phased"))
        self.assertFalse(keep_url(_dmo("example_dlo.md"), "dmo_phased"))


class KeepUrlIntegrationsPhasedTests(unittest.TestCase):
    def test_keeps_first_party_platform_connectors(self) -> None:
        for name in (
            "c360-a-awss3-connector.md",
            "c360-a-gcs-connector.md",
            "c360-a-set-up-awss3-connection.md",
            "c360-a-set-up-gcs-connection.md",
            "c360-a-set-up-azure-connection.md",
            "c360-a-azure-data-streams.md",
            "c360-a-create-ingestion-data-stream.md",
            "c360-a-ingestion-api.md",
            "c360-a-mulesoft.md",
            "c360-a-salesforce-web-sdk.md",
            "c360-a-mobile-web-app-connector.md",
        ):
            with self.subTest(name=name):
                self.assertTrue(keep_url(_integ(name), "integrations_phased"))

    def test_drops_third_party_vendor_catalog_leaves(self) -> None:
        for name in (
            "c360-a-jira-connector.md",
            "c360-a-confluence-connector.md",
            "c360-a-servicenow-connector.md",
            "c360-a-airtable-objects.md",
            "c360-a-azuremysql-connector.md",
        ):
            with self.subTest(name=name):
                self.assertFalse(keep_url(_integ(name), "integrations_phased"))


if __name__ == "__main__":
    unittest.main()
