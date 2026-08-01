from __future__ import annotations

from petrus.application.config_service import ConfigService
from petrus.application.contato_service import ContatoService
from petrus.application.enrichment_service import EnrichmentService
from petrus.application.imovel_image_service import ImovelImageService
from petrus.application.imovel_service import ImovelService
from petrus.application.lead_service import LeadAppService
from petrus.application.mdm_fonte_service import MdmFonteService
from petrus.application.mdm_processing_service import MdmProcessingService
from petrus.application.mdm_quality_service import MdmQualityService
from petrus.application.mdm_submission_service import MdmSubmissionService
from petrus.application.processo_file_service import ProcessoFileService
from petrus.application.processo_service import ProcessoAppService
from petrus.application.publicacao_service import PublicacaoService
from petrus.application.registro_service import RegistroAppService
from petrus.application.scraping_monitor_service import ScrapingMonitorService
from petrus.application.scraping_service import ScrapingService
from petrus.domain.repositories.config_repo import ConfigRepository
from petrus.domain.repositories.contato_repo import ContatoRepository
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.domain.repositories.lead_repo import LeadRepository
from petrus.domain.repositories.mdm_repo import (
    FonteRegistroRepository,
    FonteRepository,
    ImovelFonteRepository,
    ScrapingRunRepository,
)
from petrus.domain.repositories.processo_repo import ProcessoRepository
from petrus.domain.repositories.publicacao_repo import PublicacaoRepository
from petrus.domain.repositories.registro_repo import RegistroRepository
from petrus.domain.repositories.scraping_repo import RequestLogRepository
from petrus.domain.services.email_service import EmailService
from petrus.domain.services.geocoding_service import GeocodingService
from petrus.domain.services.image_service import ImageService
from petrus.domain.services.storage_service import StorageService
from petrus.infrastructure.database.repositories.supabase_config_repo import SupabaseConfigRepo
from petrus.infrastructure.database.repositories.supabase_contato_repo import SupabaseContatoRepo
from petrus.infrastructure.database.repositories.supabase_enrichment_card_repo import (
    SupabaseEnrichmentCardRepo,
)
from petrus.infrastructure.database.repositories.supabase_enrichment_event_repo import (
    SupabaseEnrichmentEventRepo,
)
from petrus.infrastructure.database.repositories.supabase_imovel_repo import SupabaseImovelRepo
from petrus.infrastructure.database.repositories.supabase_lead_repo import SupabaseLeadRepo
from petrus.infrastructure.database.repositories.supabase_mdm_repos import (
    SupabaseFonteRegistroRepo,
    SupabaseFonteRepo,
    SupabaseImovelFonteRepo,
    SupabaseScrapingRunRepo,
)
from petrus.infrastructure.database.repositories.supabase_processo_repo import SupabaseProcessoRepo
from petrus.infrastructure.database.repositories.supabase_publicacao_repo import (
    SupabasePublicacaoRepo,
)
from petrus.infrastructure.database.repositories.supabase_registro_repo import SupabaseRegistroRepo
from petrus.infrastructure.database.repositories.supabase_request_log_repo import (
    SupabaseRequestLogRepo,
)
from petrus.infrastructure.database.supabase_client import get_supabase
from petrus.infrastructure.email.resend_email import ResendEmailService
from petrus.infrastructure.geocoding.nominatim_geocoder import NominatimGeocoder
from petrus.infrastructure.imaging.pillow_watermark import PillowImageService
from petrus.infrastructure.mdm.quality import DefaultQualityService
from petrus.infrastructure.storage.supabase_storage import SupabaseStorageService

# --- Repositories (trocar banco = mudar apenas aqui) ---


def get_imovel_repo() -> ImovelRepository:
    return SupabaseImovelRepo(get_supabase())


def get_contato_repo() -> ContatoRepository:
    return SupabaseContatoRepo(get_supabase())


def get_lead_repo() -> LeadRepository:
    return SupabaseLeadRepo(get_supabase())


def get_processo_repo() -> ProcessoRepository:
    return SupabaseProcessoRepo(get_supabase())


def get_config_repo() -> ConfigRepository:
    return SupabaseConfigRepo(get_supabase())


def get_publicacao_repo() -> PublicacaoRepository:
    return SupabasePublicacaoRepo(get_supabase())


def get_fonte_repo() -> FonteRepository:
    return SupabaseFonteRepo(get_supabase())


def get_fonte_registro_repo() -> FonteRegistroRepository:
    return SupabaseFonteRegistroRepo(get_supabase())


def get_imovel_fonte_repo() -> ImovelFonteRepository:
    return SupabaseImovelFonteRepo(get_supabase())


def get_scraping_run_repo() -> ScrapingRunRepository:
    return SupabaseScrapingRunRepo(get_supabase())


def get_registro_repo() -> RegistroRepository:
    return SupabaseRegistroRepo(get_supabase())


# --- Infrastructure services ---


def get_storage_service() -> StorageService:
    return SupabaseStorageService(get_supabase())


def get_email_service() -> EmailService:
    return ResendEmailService()


def get_geocoding_service() -> GeocodingService:
    return NominatimGeocoder()


def get_image_service() -> ImageService:
    return PillowImageService(get_storage_service())


# --- Application services ---


def get_imovel_service() -> ImovelService:
    return ImovelService(get_imovel_repo())


def get_imovel_image_service() -> ImovelImageService:
    return ImovelImageService(get_imovel_repo(), get_storage_service())


def get_contato_service() -> ContatoService:
    return ContatoService(get_contato_repo())


def get_lead_service() -> LeadAppService:
    return LeadAppService(get_lead_repo(), get_email_service())


def get_processo_service() -> ProcessoAppService:
    return ProcessoAppService(get_processo_repo())


def get_processo_file_service() -> ProcessoFileService:
    return ProcessoFileService(get_processo_repo(), get_storage_service())


def get_config_service() -> ConfigService:
    return ConfigService(get_config_repo())


def get_publicacao_service() -> PublicacaoService:
    return PublicacaoService(get_publicacao_repo())


def get_mdm_fonte_service() -> MdmFonteService:
    return MdmFonteService(get_fonte_repo())


def get_mdm_submission_service() -> MdmSubmissionService:
    return MdmSubmissionService(
        get_fonte_repo(), get_fonte_registro_repo(),
        get_scraping_run_repo(), get_storage_service(),
    )


def get_mdm_processing_service() -> MdmProcessingService:
    return MdmProcessingService(
        get_fonte_repo(), get_fonte_registro_repo(),
    )


def get_mdm_quality_service() -> MdmQualityService:
    return MdmQualityService(get_imovel_repo(), DefaultQualityService())


def get_enrichment_card_repo():
    return SupabaseEnrichmentCardRepo(get_supabase())


def get_enrichment_event_repo():
    return SupabaseEnrichmentEventRepo(get_supabase())


def get_request_log_repo() -> RequestLogRepository:
    return SupabaseRequestLogRepo(get_supabase())


def get_scraping_service() -> ScrapingService:
    return ScrapingService(
        get_fonte_repo(), get_fonte_registro_repo(),
        get_scraping_run_repo(), get_request_log_repo(),
    )


def get_scraping_monitor_service() -> ScrapingMonitorService:
    return ScrapingMonitorService(
        get_fonte_repo(), get_scraping_run_repo(),
        get_request_log_repo(),
    )


def get_registro_service() -> RegistroAppService:
    return RegistroAppService(get_registro_repo(), get_storage_service())


def get_enrichment_service() -> EnrichmentService:
    return EnrichmentService(
        card_repo=get_enrichment_card_repo(),
        event_repo=get_enrichment_event_repo(),
        imovel_repo=get_imovel_repo(),
        imovel_fonte_repo=get_imovel_fonte_repo(),
        registro_repo=get_fonte_registro_repo(),
        fonte_repo=get_fonte_repo(),
    )
