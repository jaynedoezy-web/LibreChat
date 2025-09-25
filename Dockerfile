# Use the latest stable LibreChat image
FROM ghcr.io/danny-avila/librechat:latest

# Copy your custom config into the container
COPY librechat.yaml /app/librechat.yaml

# Ensure the app runs on port 3080
EXPOSE 3080
ENV HOST=0.0.0.0
