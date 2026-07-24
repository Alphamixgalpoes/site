"""Tests for generate_cards(): card creation logic from match results."""

from __future__ import annotations

from petrus.domain.entities.mdm_types import MatchResult
from petrus.infrastructure.mdm.card_generator import generate_cards


class TestGenerateCards:
    def test_no_matches_creates_criar_card(self):
        registro = {"cidade": "Barueri", "area_construida_m2": 1500}
        cards = generate_cards(registro, matches=[], fonte_id="f1")
        assert len(cards) == 1
        assert cards[0]["tipo"] == "criar"
        assert cards[0]["confianca"] == 0.0
        assert cards[0]["fonte_id"] == "f1"
        assert cards[0]["dados_propostos"] == registro

    def test_match_with_diff_creates_atualizar_card(self):
        registro = {"cidade": "Barueri", "valor": 30000}
        match = MatchResult(
            registro_id="r1",
            imovel_id="im1",
            score=0.9,
            tipo="match",
            campos_diferentes=["valor"],
        )
        cards = generate_cards(registro, [match])
        assert len(cards) == 1
        assert cards[0]["tipo"] == "atualizar"
        assert cards[0]["imovel_id"] == "im1"
        assert cards[0]["confianca"] == 0.9
        assert cards[0]["dados_propostos"] == {"valor": 30000}

    def test_match_without_diff_no_card(self):
        registro = {"cidade": "Barueri"}
        match = MatchResult(
            registro_id="r1",
            imovel_id="im1",
            score=0.95,
            tipo="match",
            campos_diferentes=[],
        )
        cards = generate_cards(registro, [match])
        assert len(cards) == 0

    def test_candidato_creates_mesclar_card(self):
        registro = {"cidade": "Barueri"}
        match = MatchResult(
            registro_id="r1",
            imovel_id="im1",
            score=0.6,
            tipo="candidato",
        )
        cards = generate_cards(registro, [match])
        assert len(cards) == 1
        assert cards[0]["tipo"] == "mesclar"
        assert "verificar" in cards[0]["mensagem"].lower()

    def test_multiple_matches(self):
        registro = {"cidade": "Barueri", "valor": 30000}
        matches = [
            MatchResult(
                registro_id="r1",
                imovel_id="im1",
                score=0.9,
                tipo="match",
                campos_diferentes=["valor"],
            ),
            MatchResult(registro_id="r1", imovel_id="im2", score=0.55, tipo="candidato"),
        ]
        cards = generate_cards(registro, matches)
        assert len(cards) == 2
        tipos = {c["tipo"] for c in cards}
        assert "atualizar" in tipos
        assert "mesclar" in tipos

    def test_base_fields_propagated(self):
        registro = {
            "cidade": "Barueri",
            "bairro": "Centro",
            "area_construida_m2": 500,
            "valor": 10000,
        }
        cards = generate_cards(
            registro,
            matches=[],
            fonte_id="f1",
            fonte_registro_id="fr1",
            importacao_id="imp1",
        )
        card = cards[0]
        assert card["fonte_id"] == "f1"
        assert card["fonte_registro_id"] == "fr1"
        assert card["importacao_id"] == "imp1"
        assert card["cidade"] == "Barueri"
        assert card["bairro"] == "Centro"
        assert card["area"] == 500
        assert card["valor"] == 10000
