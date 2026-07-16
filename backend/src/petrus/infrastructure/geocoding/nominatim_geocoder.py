from __future__ import annotations

import httpx

from petrus.domain.services.geocoding_service import GeocodingService, GeoResult, ReverseGeoResult

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": "AlphamixGalpoes/1.0 (petrusweb.vercel.app)"}


class NominatimGeocoder(GeocodingService):
    async def forward(
        self,
        endereco: str = "",
        bairro: str = "",
        cidade: str = "",
        cep: str = "",
    ) -> GeoResult:
        params: dict[str, str] = {
            "format": "json",
            "countrycodes": "br",
            "limit": "1",
        }
        if endereco:
            params["street"] = endereco
        if bairro:
            params["county"] = bairro
        if cidade:
            params["city"] = cidade
        if cep:
            params["postalcode"] = cep

        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NOMINATIM_URL}/search", params=params, headers=HEADERS)
            data = resp.json()

            if data:
                return GeoResult(lat=float(data[0]["lat"]), lng=float(data[0]["lon"]))

            # Fallback: CEP only
            if cep:
                params2 = {"format": "json", "countrycodes": "br", "limit": "1", "postalcode": cep}
                resp2 = await client.get(f"{NOMINATIM_URL}/search", params=params2, headers=HEADERS)
                data2 = resp2.json()
                if data2:
                    return GeoResult(lat=float(data2[0]["lat"]), lng=float(data2[0]["lon"]))

        return GeoResult()

    async def reverse(self, lat: float, lng: float) -> ReverseGeoResult:
        params = {"format": "json", "lat": str(lat), "lon": str(lng)}
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{NOMINATIM_URL}/reverse", params=params, headers=HEADERS)
            data = resp.json()

        addr = data.get("address", {})
        return ReverseGeoResult(
            logradouro=addr.get("road"),
            bairro=addr.get("suburb") or addr.get("neighbourhood"),
            cidade=addr.get("city") or addr.get("town") or addr.get("municipality"),
            uf=addr.get("state"),
            cep=addr.get("postcode"),
        )
