import os
import json
from typing import Dict, Any
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from gemini_helper import generate_response, generate_warehouse_json
from rag import retrieve_relevant_docs
from n8n_integration import trigger_n8n_workflow

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)

WAREHOUSE_DIR = os.path.join(BASE_DIR, "data", "warehouses")

def _is_id_exists(target_id: str) -> bool:
    if not os.path.exists(WAREHOUSE_DIR):
        return False
    for filename in os.listdir(WAREHOUSE_DIR):
        if filename.endswith(".json"):
            try:
                with open(os.path.join(WAREHOUSE_DIR, filename), "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("id") == target_id:
                        return True
            except:
                continue
    return False

def save_warehouse_json(warehouse_data: Dict[str, Any]) -> tuple[str, str]:
    os.makedirs(WAREHOUSE_DIR, exist_ok=True)

    today = datetime.now().strftime("%Y%m%d")
    counter = 1
    while True:
        new_id = f"WH-{today}-{counter:03d}"
        if not _is_id_exists(new_id):
            break
        counter += 1

    warehouse_data["id"] = new_id
    warehouse_data["created_at"] = datetime.now().isoformat()

    safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in warehouse_data.get("warehouse_name", "unknown"))
    safe_name = safe_name.strip("_- ").replace(" ", "_")
    filename = f"{new_id}_{safe_name}.json"
    filepath = os.path.join(WAREHOUSE_DIR, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(warehouse_data, f, indent=4, ensure_ascii=False)

    message = f"Đã tạo kho mới thành công!\nID kho: {new_id}\nLưu tại: {filepath}"
    return filepath, message

def process_user_request(user_input: str) -> str:
    user_input_lower = user_input.lower()

    if any(k in user_input_lower for k in ["thiết lập kho", "tạo kho", "setup warehouse", "new warehouse", "cấu trúc kho"]):
        try:
            docs = retrieve_relevant_docs(user_input)
        except Exception as e:
            docs = []
            print(f"[WARNING] Lỗi RAG: {e}")

        warehouse_json = generate_warehouse_json(user_input, docs)
        if warehouse_json:
            try:
                saved_path, message = save_warehouse_json(warehouse_json)
                warehouse_id = warehouse_json.get("id", "N/A")
                return f"{message}\n\nNội dung JSON (ID: {warehouse_id}):\n{json.dumps(warehouse_json, indent=2, ensure_ascii=False)}"
            except Exception as e:
                return f"Lỗi lưu file: {e}"
        else:
            return "Không thể tạo JSON warehouse."

    if any(k in user_input_lower for k in ["automate", "tự động hóa", "báo cáo tồn kho"]):
        result = trigger_n8n_workflow("inventory_report", {"request_from": "Warehouse AI"})
        return f"Yêu cầu tự động hóa đã gửi tới n8n.\n{result}"

    try:
        docs = retrieve_relevant_docs(user_input)
    except:
        docs = []
    return generate_response(user_input, docs)

def main():
    print("🏭 Warehouse AI Assistant sẵn sàng! (Gõ 'exit' để thoát)")
    while True:
        user_input = input("\nBạn: ")
        if user_input.strip().lower() in ["exit", "quit", "thoát"]:
            print("Tạm biệt!")
            break
        if not user_input.strip():
            continue
        print(f"\nAI: {process_user_request(user_input)}")

if __name__ == "__main__":
    main()