ARG POETRY_VERSION='>=1.5.1,<1.8'
ARG PYTHON_TAG=python:3.12-bullseye
ARG WORKDIR=/opt/lunch_app
ARG VENV=/opt/venv

# ============================
#         Base Stage
# ============================

FROM ${PYTHON_TAG} AS base

ARG WORKDIR
ARG VENV

ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_HOME=/opt/poetry \
    VIRTUAL_ENV=$VENV \
    PATH="$POETRY_HOME/bin:$VENV/bin:$PATH"

WORKDIR ${WORKDIR}

# Dependencies + Poetry installation
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gnupg \
        dirmngr \
        ca-certificates \
        procps \
        tini \
        && rm -rf /var/lib/apt/lists/* \
    && curl -sSL https://install.python-poetry.org | python3 - --version "$POETRY_VERSION"

ENTRYPOINT ["/usr/bin/tini", "--"]

# ============================
#         Build Stage
# ============================

FROM base AS build

ARG WORKDIR
ARG VENV

RUN python -m venv /opt/poetry \
    && /opt/poetry/bin/pip install "poetry $POETRY_VERSION" \
    && ln -s /opt/poetry/bin/poetry /usr/local/bin/poetry

RUN python -m venv "$VENV" && $VENV/bin/pip install --upgrade pip

COPY pyproject.toml poetry.lock ./

# Without dev dependencies
RUN poetry install --no-root --only main

# Copy application code
COPY lunch_app ./lunch_app

RUN chgrp -R 0 "$WORKDIR" && chmod -R g=u "$WORKDIR"

# ============================
#         Final Stage
# ============================

FROM base AS final

ARG WORKDIR
ARG VENV

COPY --from=build "$VENV" "$VENV"
COPY --from=build "$WORKDIR" "$WORKDIR"

# Activate VENV
ENV VIRTUAL_ENV="$VENV" \
    PATH="$VENV/bin:$PATH" \
    PYTHONPATH=${WORKDIR}

CMD ["uvicorn", "lunch_app.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
