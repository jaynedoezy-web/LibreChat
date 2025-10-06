#!/usr/bin/env python3
import os, sys, glob
from pathlib import Path

PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX = os.environ.get("PINECONE_INDEX")
PINECONE_HOST = os.environ.get("PINECONE_HOST")
NAMESPACE = os.environ.get("PINECONE_NAMESPACE", "librechat")
SEED_DIR = Path(os.environ.get("RAG_SEED_DIR", "./seed"))

if not all([PINECONE_API_KEY, PINECONE_INDEX, PINECONE_HOST]):
    print("Missing Pinecone envs: PINECONE_API_KEY, PINECONE_INDEX, PINECONE_HOST", file=sys.stderr)
    sys.exit(1)

# Lazy import to avoid hard dependency if not used
try:
    from pinecone import Pinecone
except Exception:
    print("pip install pinecone-client needed for warmup script", file=sys.stderr)
    sys.exit(1)

pc = Pinecone(api_key=PINECONE_API_KEY)
idx = pc.Index(host=PINECONE_HOST)
print(f"Using Pinecone index host: {PINECONE_HOST}\nNamespace: {NAMESPACE}")

if not SEED_DIR.exists():
    print(f"Seed dir not found: {SEED_DIR} (skipping ingest)")
    sys.exit(0)

files = sorted(glob.glob(str(SEED_DIR / "**/*"), recursive=True))
files = [f for f in files if Path(f).is_file()]
print(f"Found {len(files)} files to seed from {SEED_DIR}")

# This is a stub — actual embedding + upsert is handled by your RAG API.
# Here we just list files to verify the seed step; real ingest should POST to RAG API.
for f in files[:10]:
    print("-", f)
print("(Preview only) For full ingest, POST files to your RAG API /ingest endpoint.")