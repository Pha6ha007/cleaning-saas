# ============================================================================
# Stage 1: Builder — install Python deps into a venv
# ============================================================================
FROM python:3.12-slim AS builder

WORKDIR /app

# System deps needed to build psycopg2 and other C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create venv in /app/venv so it's easy to copy to final stage
RUN python -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Upgrade pip first
RUN pip install --upgrade pip --quiet

# Install requirements
# --prefer-binary: critical for python-bidi==0.4.2 (0.6.x requires Rust/maturin)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# ============================================================================
# Stage 2: Runtime — minimal image with only what's needed to run
# ============================================================================
FROM python:3.12-slim AS runtime

WORKDIR /app

# Runtime system deps only (libpq for psycopg2, no gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd --gid 1001 appuser && useradd --uid 1001 --gid appuser --no-create-home appuser

# Copy virtualenv from builder
COPY --from=builder /app/venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy application code
COPY --chown=appuser:appuser . .

# Entrypoint script (runs migrate + collectstatic + gunicorn)
COPY --chown=appuser:appuser entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Switch to non-root
USER appuser

EXPOSE 8000

# Liveness probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

CMD ["/app/entrypoint.sh"]
