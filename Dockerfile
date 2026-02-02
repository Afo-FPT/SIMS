# Dockerfile cho Warehouse AI Assistant (Python console-based)
# Sử dụng Python 3.12 slim, non-root user, persist data & vector_store

FROM python:3.12-slim-bookworm

# Tạo non-root user để chạy an toàn
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Cài các công cụ build cần thiết (cho deps như faiss-cpu, llama-index, v.v.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy requirements trước để cache pip
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code Python
COPY . .

# Chuyển quyền sở hữu cho non-root user
RUN chown -R appuser:appuser /app

# Chạy với non-root user
USER appuser

# Environment variables (lấy từ .env hoặc docker compose)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Command: Chạy file main.py (console-based)
CMD ["python", "main.py"]