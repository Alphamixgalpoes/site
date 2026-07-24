"""Tests for DefaultQualityService: avaliar() and score_geral()."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from petrus.domain.entities.imovel import Imovel
from petrus.domain.entities.mdm_types import QualidadeCampo
from petrus.infrastructure.mdm.quality import CAMPOS_AVALIADOS, DefaultQualityService


def _make_imovel(**kwargs) -> Imovel:
    defaults = {
        "id": uuid4(),
        "titulo": "Galpão Teste",
        "tipo": "galpao",
        "categoria": "logistico",
        "cidade": "Barueri",
        "publicado": False,
    }
    defaults.update(kwargs)
    return Imovel(**defaults)


class TestAvaliar:
    def setup_method(self):
        self.svc = DefaultQualityService()

    def test_complete_imovel_high_completude(self):
        imovel = _make_imovel(
            titulo="G1",
            tipo="galpao",
            categoria="logistico",
            cidade="Barueri",
            endereco="Rua A",
            logradouro="Rua A",
            area_construida_m2=1500,
            area_total_m2=2000,
            valor=25000,
            pe_direito_m=12,
            numero_docas=4,
            latitude=-23.5,
            longitude=-46.8,
            descricao="Bom galpão",
            updated_at=datetime.now(UTC).isoformat(),
        )
        result = self.svc.avaliar(imovel)
        assert len(result) == len(CAMPOS_AVALIADOS)
        # All fields are filled → completude should be 1.0 for all
        for campo in result:
            assert campo.completude == 1.0

    def test_empty_imovel_zero_completude(self):
        imovel = _make_imovel()
        result = self.svc.avaliar(imovel)
        # titulo, tipo, categoria, cidade are set in defaults
        filled = {c.campo for c in result if c.completude == 1.0}
        assert "titulo" in filled
        assert "cidade" in filled
        # Optional fields should be 0
        empty = {c.campo for c in result if c.completude == 0.0}
        assert "area_construida_m2" in empty

    def test_frescor_recent_update(self):
        recent = datetime.now(UTC).isoformat()
        imovel = _make_imovel(updated_at=recent, titulo="Test")
        result = self.svc.avaliar(imovel)
        titulo_campo = next(c for c in result if c.campo == "titulo")
        assert titulo_campo.frescor > 0.9

    def test_frescor_old_update(self):
        old = (datetime.now(UTC) - timedelta(days=400)).isoformat()
        imovel = _make_imovel(updated_at=old, titulo="Test")
        result = self.svc.avaliar(imovel)
        titulo_campo = next(c for c in result if c.campo == "titulo")
        assert titulo_campo.frescor == 0.0

    def test_frescor_no_update(self):
        imovel = _make_imovel()
        result = self.svc.avaliar(imovel)
        titulo_campo = next(c for c in result if c.campo == "titulo")
        assert titulo_campo.frescor == 0.0


class TestScoreGeral:
    def setup_method(self):
        self.svc = DefaultQualityService()

    def test_empty_list(self):
        assert self.svc.score_geral([]) == 0.0

    def test_all_perfect(self):
        campos = [QualidadeCampo(campo=c, score=1.0) for c in CAMPOS_AVALIADOS]
        assert self.svc.score_geral(campos) == 1.0

    def test_all_zero(self):
        campos = [QualidadeCampo(campo=c, score=0.0) for c in CAMPOS_AVALIADOS]
        assert self.svc.score_geral(campos) == 0.0

    def test_weighted_average(self):
        campos = [
            QualidadeCampo(campo="titulo", score=1.0),  # peso 1.0
            QualidadeCampo(campo="tipo", score=0.0),  # peso 0.5
        ]
        score = self.svc.score_geral(campos)
        # (1.0*1.0 + 0.0*0.5) / (1.0+0.5) = 0.667
        assert abs(score - 0.67) < 0.01
