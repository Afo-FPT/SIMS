import requests
import os

def trigger_n8n_workflow(workflow_type: str, data: dict = None):
    url = os.getenv("N8N_WEBHOOK_URL")
    if not url:
        return "Chưa cấu hình N8N_WEBHOOK_URL trong .env"
    
    payload = {"type": workflow_type, "data": data or {}}
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            return "Thành công! " + response.text
        else:
            return f"Lỗi {response.status_code}: {response.text}"
    except Exception as e:
        return f"Exception: {str(e)}"