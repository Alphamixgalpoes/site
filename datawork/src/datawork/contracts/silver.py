"""Silver layer schema: validates cleaned/normalized data.

Mirrors the CanonicalRecord fields from the backend domain.
All fields nullable since adapters fill what they can.
"""

from __future__ import annotations

import pandera.pandas as pa
from pandera.pandas import Column, Check, DataFrameSchema

# Known cities in the operating region
CIDADES_VALIDAS = [
    "Barueri", "Cotia", "Osasco", "Jandira",
    "Santana de Parnaíba", "Carapicuíba", "Itapevi",
    "Araçariguama", "São Roque",
]

TIPOS_OPERACAO = ["venda", "locacao", "ambos"]
TIPOS_IMOVEL = ["galpao", "terreno", "sala", "loja"]
STATUS_OCUPACAO = ["vago", "alugado", "vendido", "obra", "reformado"]

CleanRecordSchema = DataFrameSchema(
    {
        # Location
        "logradouro": Column(str, nullable=True, required=False),
        "numero": Column(str, nullable=True, required=False),
        "complemento": Column(str, nullable=True, required=False),
        "unidade": Column(str, nullable=True, required=False),
        "bairro": Column(str, nullable=True, required=False),
        "cidade": Column(str, Check.isin(CIDADES_VALIDAS), nullable=True, required=False),
        "uf": Column(str, Check.str_length(max_value=2), nullable=True, required=False),
        "cep": Column(str, nullable=True, required=False),
        "endereco": Column(str, nullable=True, required=False),
        "latitude": Column(float, Check.in_range(-24.0, -23.0), nullable=True, required=False),
        "longitude": Column(float, Check.in_range(-47.5, -46.0), nullable=True, required=False),
        # Areas
        "area_total_m2": Column(float, Check.gt(0), nullable=True, required=False),
        "area_construida_m2": Column(float, Check.gt(0), nullable=True, required=False),
        "area_piso_m2": Column(float, Check.gt(0), nullable=True, required=False),
        "area_escritorio_m2": Column(float, Check.gt(0), nullable=True, required=False),
        "area_mezanino_m2": Column(float, Check.gt(0), nullable=True, required=False),
        # Physical
        "pe_direito_m": Column(float, Check.in_range(2.0, 30.0), nullable=True, required=False),
        "numero_docas": Column(int, Check.ge(0), nullable=True, required=False),
        "vagas_estacionamento": Column(int, Check.ge(0), nullable=True, required=False),
        "potencia_eletrica_kva": Column(int, Check.gt(0), nullable=True, required=False),
        # Boolean features
        "elevador": Column(bool, nullable=True, required=False),
        "gerador": Column(bool, nullable=True, required=False),
        "ponte_rolante": Column(bool, nullable=True, required=False),
        # Commercial
        "tipo": Column(str, Check.isin(TIPOS_IMOVEL), nullable=True, required=False),
        "tipo_operacao": Column(str, Check.isin(TIPOS_OPERACAO), nullable=True, required=False),
        "valor_locacao": Column(float, Check.gt(0), nullable=True, required=False),
        "valor_venda": Column(float, Check.gt(0), nullable=True, required=False),
        "valor_condominio": Column(float, Check.ge(0), nullable=True, required=False),
        "iptu_valor": Column(float, Check.ge(0), nullable=True, required=False),
        "status": Column(str, Check.isin(STATUS_OCUPACAO), nullable=True, required=False),
        # Contact
        "proprietario_nome": Column(str, nullable=True, required=False),
        "proprietario_telefone": Column(str, nullable=True, required=False),
        "proprietario_email": Column(str, nullable=True, required=False),
        # Metadata
        "observacoes": Column(str, nullable=True, required=False),
        "regiao": Column(str, nullable=True, required=False),
        "hash_dedup": Column(str, nullable=True, required=False),
    },
    coerce=True,
    strict=False,
)
