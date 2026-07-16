FROM python:3.12-slim

WORKDIR /app

# Install system deps for Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo-dev libpng-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY src/ ./src/
COPY assets/ ./assets/

EXPOSE 8000

CMD ["uvicorn", "petrus.main:app", "--host", "0.0.0.0", "--port", "8000"]
