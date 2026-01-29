from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, load_index_from_storage, Settings
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KNOWLEDGE_DIR = os.path.join(BASE_DIR, "data", "knowledge")
PERSIST_DIR = os.path.join(BASE_DIR, "vector_store")

Settings.embed_model = GoogleGenAIEmbedding(
    model_name="models/gemini-embedding-001",
    api_key=os.getenv("GEMINI_API_KEY")
)

def build_or_load_index():
    if os.path.exists(PERSIST_DIR):
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
        index = load_index_from_storage(storage_context, embed_model=Settings.embed_model)
        print("✅ Đã load vector store từ disk.")
    else:
        documents = SimpleDirectoryReader(KNOWLEDGE_DIR).load_data()
        index = VectorStoreIndex.from_documents(documents, embed_model=Settings.embed_model)
        index.storage_context.persist(persist_dir=PERSIST_DIR)
        print("✅ Đã xây dựng vector store mới.")
    return index

index = build_or_load_index()
retriever = index.as_retriever(similarity_top_k=3)

def retrieve_relevant_docs(query: str):
    return retriever.retrieve(query)