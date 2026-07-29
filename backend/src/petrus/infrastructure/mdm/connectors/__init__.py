"""Source adapter connectors — auto-registers all adapters at import time."""

from petrus.infrastructure.mdm.connectors.asp_adapter import AspAdapter
from petrus.infrastructure.mdm.connectors.clickgalpoes_adapter import ClickGalpoesAdapter
from petrus.infrastructure.mdm.connectors.code49_adapter import Code49Adapter
from petrus.infrastructure.mdm.connectors.generic_csv import GenericCsvAdapter
from petrus.infrastructure.mdm.connectors.imobibrasil_adapter import ImobiBrasilAdapter
from petrus.infrastructure.mdm.connectors.petrus_spreadsheet import PetrusSpreadsheetAdapter
from petrus.infrastructure.mdm.connectors.registry import AdapterRegistry
from petrus.infrastructure.mdm.connectors.static_html_adapter import StaticHtmlAdapter
from petrus.infrastructure.mdm.connectors.union_adapter import UnionAdapter
from petrus.infrastructure.mdm.connectors.wordpress_adapter import WordPressAdapter

AdapterRegistry.register("generic_csv", GenericCsvAdapter)
AdapterRegistry.register("petrus_spreadsheet", PetrusSpreadsheetAdapter)
AdapterRegistry.register("static_html", StaticHtmlAdapter)
AdapterRegistry.register("code49", Code49Adapter)
AdapterRegistry.register("union", UnionAdapter)
AdapterRegistry.register("wordpress_houzez", WordPressAdapter)
AdapterRegistry.register("clickgalpoes", ClickGalpoesAdapter)
AdapterRegistry.register("nextjs", ClickGalpoesAdapter)
AdapterRegistry.register("imobibrasil", ImobiBrasilAdapter)
AdapterRegistry.register("asp_ajax", AspAdapter)
