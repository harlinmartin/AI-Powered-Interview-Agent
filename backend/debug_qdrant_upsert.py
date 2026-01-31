from qdrant_client import QdrantClient
client = QdrantClient(location=":memory:")
help(client.upsert)
