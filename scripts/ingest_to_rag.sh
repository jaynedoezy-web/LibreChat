RAG_URL="${RAG_API_URL:-http://localhost:8000}"
SEED_DIR="${RAG_SEED_DIR:-./seed}"
NAMESPACE="${PINECONE_NAMESPACE:-librechat}"

if ! command -v curl >/dev/null; then
echo "curl is required" >&2
exit 1
fi

if [ ! -d "$SEED_DIR" ]; then
echo "Seed dir not found: $SEED_DIR" >&2
exit 1
fi

echo "Ingesting from $SEED_DIR to $RAG_URL (namespace=$NAMESPACE)"

shopt -s nullglob
for f in "$SEED_DIR"/*; do
if [ -f "$f" ]; then
echo "# -> $f"
curl -sSf -X POST "$RAG_URL/ingest" \
-F "file=@$f" \
-F "namespace=$NAMESPACE" \
-F "chunk_size=${RAG_CHUNK_SIZE:-1200}" \
-F "chunk_overlap=${RAG_CHUNK_OVERLAP:-150}" \
-F "embedder=${RAG_EMBEDDINGS_MODEL:-text-embedding-3-large}" \
>/dev/null && echo " ok" || { echo " failed"; exit 1; }
fi
done

echo "Done."