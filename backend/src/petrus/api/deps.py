from __future__ import annotations

from petrus.infrastructure.database.supabase_client import get_supabase
from petrus.infrastructure.database.repositories.supabase_galpao_repo import SupabaseGalpaoRepo
from petrus.infrastructure.database.repositories.supabase_contato_repo import SupabaseContatoRepo
from petrus.infrastructure.database.repositories.supabase_lead_repo import SupabaseLeadRepo
from petrus.infrastructure.database.repositories.supabase_processo_repo import SupabaseProcessoRepo
from petrus.infrastructure.database.repositories.supabase_config_repo import SupabaseConfigRepo
from petrus.infrastructure.storage.supabase_storage import SupabaseStorageService
from petrus.infrastructure.email.resend_email import ResendEmailService
from petrus.infrastructure.geocoding.nominatim_geocoder import NominatimGeocoder
from petrus.infrastructure.imaging.pillow_watermark import PillowImageService

from petrus.domain.repositories.galpao_repo import GalpaoRepository
from petrus.domain.repositories.contato_repo import ContatoRepository
from petrus.domain.repositories.lead_repo import LeadRepository
from petrus.domain.repositories.processo_repo import ProcessoRepository
from petrus.domain.repositories.config_repo import ConfigRepository
from petrus.domain.services.storage_service import StorageService
from petrus.domain.services.email_service import EmailService
from petrus.domain.services.geocoding_service import GeocodingService
from petrus.domain.services.image_service import ImageService

from petrus.application.galpao_image_service import GalpaoImageService
from petrus.application.processo_file_service import ProcessoFileService


# --- Repositories ---


def get_galpao_repo() -> GalpaoRepository:
    return SupabaseGalpaoRepo(get_supabase())


def get_contato_repo() -> ContatoRepository:
    return SupabaseContatoRepo(get_supabase())


def get_lead_repo() -> LeadRepository:
    return SupabaseLeadRepo(get_supabase())


def get_processo_repo() -> ProcessoRepository:
    return SupabaseProcessoRepo(get_supabase())


def get_config_repo() -> ConfigRepository:
    return SupabaseConfigRepo(get_supabase())


# --- Infrastructure services ---


def get_storage_service() -> StorageService:
    return SupabaseStorageService(get_supabase())


def get_email_service() -> EmailService:
    return ResendEmailService()


def get_geocoding_service() -> GeocodingService:
    return NominatimGeocoder()


def get_image_service() -> ImageService:
    storage = get_storage_service()
    return PillowImageService(storage)


# --- Application services ---


def get_galpao_image_service() -> GalpaoImageService:
    return GalpaoImageService(get_galpao_repo(), get_storage_service())


def get_processo_file_service() -> ProcessoFileService:
    return ProcessoFileService(get_processo_repo(), get_storage_service())
