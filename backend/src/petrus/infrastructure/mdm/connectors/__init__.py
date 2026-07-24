"""Source adapter connectors — auto-registers all adapters at import time."""

from petrus.infrastructure.mdm.connectors.registry import AdapterRegistry
from petrus.infrastructure.mdm.connectors.generic_csv import GenericCsvAdapter
from petrus.infrastructure.mdm.connectors.petrus_spreadsheet import PetrusSpreadsheetAdapter

AdapterRegistry.register("generic_csv", GenericCsvAdapter)
AdapterRegistry.register("petrus_spreadsheet", PetrusSpreadsheetAdapter)
