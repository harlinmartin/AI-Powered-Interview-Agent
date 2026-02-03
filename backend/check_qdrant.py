from qdrant_client import QdrantClient
import sys

def check_qdrant():
    try:
        print("Attempting to connect to Qdrant at localhost:6333...")
        client = QdrantClient(url="http://localhost:6333")
        collections = client.get_collections()
        print(f"Success! Connected to Qdrant. Collections: {collections}")
    except Exception as e:
        print(f"FAILED to connect to Qdrant: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_qdrant()
