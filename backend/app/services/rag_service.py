import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from fastembed import TextEmbedding
from typing import List
import pypdf
import io

# Local Qdrant (Disk persistence)
# Local Qdrant (Disk persistence) or Server
qdrant_url = os.getenv("QDRANT_URL")
if qdrant_url:
    print(f"INFO: Connecting to Qdrant at {qdrant_url}")
    client = QdrantClient(url=qdrant_url)
else:
    print("INFO: Using local Qdrant (disk)")
    client = QdrantClient(path="qdrant_db")
COLLECTION_NAME = "resume_chunks"

embedding_model = TextEmbedding()

def close_client():
    client.close()

def init_db():
    try:
        collections = client.get_collections()
        if COLLECTION_NAME not in [c.name for c in collections.collections]:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
            )
        print(f"✅ Qdrant connected: Collection '{COLLECTION_NAME}' ready")
    except Exception as e:
        print(f"⚠️  WARNING: Could not connect to Qdrant on startup: {e}")
        print("Qdrant will be retried on first use. Backend will continue running.")

# Initialize on module load (non-blocking)
try:
    init_db()
except:
    pass  # Allow backend to start even if Qdrant is down

def ingest_resume(file_bytes: bytes, interview_id: int):
    try:
        # Extract text from PDF
        pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        full_text = ""
        for page in pdf_reader.pages:
            full_text += page.extract_text() + "\n"
        
        # Split text (Simple chunking for MVP)
        # A real implementation would use a better splitter (RecursiveCharacterTextSplitter)
        chunk_size = 500
        chunks = [full_text[i:i+chunk_size] for i in range(0, len(full_text), chunk_size)]
        
        # Embed
        embeddings = list(embedding_model.embed(chunks))
        
        # Upsert to Qdrant
        points = []
        for idx, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            import uuid
            points.append(models.PointStruct(
                id=str(uuid.uuid4()), # UUID required for string IDs
                vector=vector.tolist(),
                payload={"interview_id": interview_id, "text": chunk}
            ))
        
        if points: # Only if resume had text
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=points
            )
        
        return full_text
    except Exception as e:
        print(f"CRITICAL ERROR in ingest_resume: {e}")
        import traceback
        traceback.print_exc()
        raise e

def get_relevant_context(query: str, interview_id: int) -> str:
    # Embed query
    query_embedding = list(embedding_model.embed([query]))[0]
    
    # Search
    search_result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding.tolist(),
        query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="interview_id",
                    match=models.MatchValue(value=interview_id)
                )
            ]
        ),
        limit=3
    ).points
    
    context = "\n".join([hit.payload['text'] for hit in search_result])
    return context
