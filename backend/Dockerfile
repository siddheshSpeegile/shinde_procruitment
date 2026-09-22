# Backend Dockerfile - Flask + Gunicorn, served on port 5000.
# Build context should be the backend/ folder (the one containing app.py).

FROM python:3.11-slim

WORKDIR /app

# System deps: psycopg2-binary doesn't need libpq-dev, but keeping the
# image slim by only installing what's actually needed to install
# requirements (pip itself + a C compiler are already in the base image
# for the rare wheel that needs building).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Uploaded product photos live here - mount a volume over this path
# (see docker-compose.yml) so images survive container rebuilds/restarts.
RUN mkdir -p /app/uploads/products

EXPOSE 5000

# 2 workers is a reasonable default for a small internal tool; raise it
# if you expect more concurrent users. Gunicorn (unlike the Flask dev
# server) handles concurrent requests safely with the thread-local DB
# connection fix already in database.py.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]