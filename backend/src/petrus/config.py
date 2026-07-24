from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Email (Resend)
    resend_api_key: str = ""
    resend_from_email: str = "Alphamix Galpoes <onboarding@resend.dev>"
    resend_to_email: str = ""

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "https://www.alphamixgalpoes.com.br",
        "https://alphamixgalpoes.com.br",
        "https://petrusweb.vercel.app",
    ]

    # AI (optional)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    cohere_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()  # type: ignore[call-arg]
