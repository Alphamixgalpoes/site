from pydantic import BaseModel


class GeoForwardQuery(BaseModel):
    endereco: str = ""
    bairro: str = ""
    cidade: str = ""
    cep: str = ""


class GeoReverseBody(BaseModel):
    lat: float
    lng: float
