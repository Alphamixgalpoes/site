from __future__ import annotations

from petrus.domain.services.source_adapter import SourceAdapter


class AdapterRegistry:
    """Registry of source adapters, keyed by adapter type string.

    Adapters register themselves at import time. The import service
    resolves the adapter by looking up Fonte.config["adapter_type"]
    or Fonte.tipo in this registry.
    """

    _adapters: dict[str, type[SourceAdapter]] = {}

    @classmethod
    def register(cls, key: str, adapter_cls: type[SourceAdapter]) -> None:
        cls._adapters[key] = adapter_cls

    @classmethod
    def get(cls, key: str, config: dict | None = None) -> SourceAdapter:
        adapter_cls = cls._adapters.get(key)
        if adapter_cls is None:
            raise ValueError(
                f"Adapter '{key}' não registrado. "
                f"Disponíveis: {list(cls._adapters.keys())}"
            )
        return adapter_cls(config or {})

    @classmethod
    def available(cls) -> list[str]:
        return list(cls._adapters.keys())

    @classmethod
    def resolve_for_fonte(cls, fonte_tipo: str, fonte_config: dict) -> SourceAdapter:
        """Resolve adapter: prefer config['adapter_type'], fallback to fonte.tipo."""
        key = fonte_config.get("adapter_type", fonte_tipo)
        return cls.get(key, fonte_config)
