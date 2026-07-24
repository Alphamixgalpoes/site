from __future__ import annotations

from petrus.domain.services.email_service import EmailService
from petrus.domain.services.geocoding_service import GeocodingService, GeoResult, ReverseGeoResult
from petrus.domain.services.image_service import ImageService
from petrus.domain.services.storage_service import StorageService


class FakeEmailService(EmailService):
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send_lead_notification(
        self,
        nome: str,
        telefone: str,
        empresa: str | None,
        imovel_titulo: str | None,
    ) -> None:
        self.sent.append({"nome": nome, "telefone": telefone, "empresa": empresa})


class FakeStorageService(StorageService):
    def __init__(self) -> None:
        self._files: dict[str, bytes] = {}

    async def upload(self, bucket: str, path: str, file_bytes: bytes, content_type: str) -> str:
        key = f"{bucket}/{path}"
        self._files[key] = file_bytes
        return f"https://fake-storage.test/{key}"

    async def remove(self, bucket: str, paths: list[str]) -> None:
        for p in paths:
            self._files.pop(f"{bucket}/{p}", None)

    async def get_public_url(self, bucket: str, path: str) -> str:
        return f"https://fake-storage.test/{bucket}/{path}"

    async def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        return f"https://fake-storage.test/signed/{bucket}/{path}"

    async def download(self, bucket: str, path: str) -> bytes | None:
        return self._files.get(f"{bucket}/{path}")


class FakeGeocodingService(GeocodingService):
    async def forward(
        self,
        endereco: str = "",
        bairro: str = "",
        cidade: str = "",
        cep: str = "",
    ) -> GeoResult:
        return GeoResult(lat=-23.5, lng=-46.8)

    async def reverse(self, lat: float, lng: float) -> ReverseGeoResult:
        return ReverseGeoResult(
            logradouro="Rua Teste",
            bairro="Centro",
            cidade="Barueri",
            uf="SP",
            cep="06454-000",
        )


class FakeImageService(ImageService):
    async def get_watermarked(self, storage_path: str) -> bytes | None:
        return b"\x89PNG fake image bytes"
