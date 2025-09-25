FROM ghcr.io/danny-avila/librechat:latest

COPY librechat.yaml /app/librechat.yaml

EXPOSE 3080
ENV HOST=0.0.0.0
