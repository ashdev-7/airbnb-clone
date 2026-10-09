# AirStay API. One process, one worker: SQLite has a single writer (plan §18).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1     UV_COMPILE_BYTECODE=1     UV_LINK_MODE=copy
WORKDIR /app

RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app ./app

# Set in the host's environment: DATABASE_URL (a file on a persistent volume, for example
# sqlite:////data/app.db), SECRET_KEY, COOKIE_SECURE=true, SEED_ON_EMPTY=true.
# With SEED_ON_EMPTY the sample data is loaded once, when the database has no users.
EXPOSE 8000
CMD ["sh", "-c", "uv run --no-sync uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
