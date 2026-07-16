from __future__ import annotations

from fastapi import APIRouter, Depends

from petrus.api.schemas.geocode import GeoForwardQuery, GeoReverseBody
from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_geocoding_service
from petrus.domain.services.geocoding_service import GeocodingService

router = APIRouter(prefix="/api/v1/geocode", tags=["geocode"])


@router.get("/forward")
async def forward_geocode(
    endereco: str = "",
    bairro: str = "",
    cidade: str = "",
    cep: str = "",
    _user: dict = Depends(get_current_user),
    geo: GeocodingService = Depends(get_geocoding_service),
):
    result = await geo.forward(endereco=endereco, bairro=bairro, cidade=cidade, cep=cep)
    return {"lat": result.lat, "lng": result.lng}


@router.post("/reverse")
async def reverse_geocode(
    body: GeoReverseBody,
    _user: dict = Depends(get_current_user),
    geo: GeocodingService = Depends(get_geocoding_service),
):
    result = await geo.reverse(body.lat, body.lng)
    return {
        "logradouro": result.logradouro,
        "bairro": result.bairro,
        "cidade": result.cidade,
        "uf": result.uf,
        "cep": result.cep,
    }
