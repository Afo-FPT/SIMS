import os
from google import genai
from google.genai import types
import json
from datetime import datetime

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Dùng model ổn định, quota cao hơn ở free tier
MODEL_NAME = "gemini-3-flash-preview"

def generate_response(prompt: str, retrieved_docs: list = None) -> str:
    try:
        contents = []
        if retrieved_docs:
            context = "\n\n".join([doc.text for doc in retrieved_docs])
            full_prompt = f"""Kiến thức tham khảo từ tiêu chuẩn kho hàng:
{context}

Yêu cầu người dùng: {prompt}

Hãy trả lời chuyên nghiệp, chi tiết bằng tiếng Việt."""
            contents.append(full_prompt)
        else:
            contents.append(prompt)

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=2048,
            )
        )
        return response.text.strip()
    except Exception as e:
        return f"Lỗi khi gọi Gemini: {str(e)}"


def generate_warehouse_json(user_input: str, retrieved_docs: list) -> dict:
    """
    Tạo cấu trúc kho với trường mới: address (địa chỉ kho hàng)
    Đảm bảo JSON hoàn chỉnh, không bị cắt ngang, có retry tự động
    """
    context = "\n\n".join([doc.text for doc in retrieved_docs])
    
    prompt = f"""Dựa trên tiêu chuẩn kho hàng và yêu cầu sau, tạo JSON cấu trúc kho hoàn chỉnh.
Chỉ output JSON thuần, không giải thích, không code block:

Tiêu chuẩn: {context}
Yêu cầu: {user_input}

Schema bắt buộc (phải có đầy đủ các trường sau):
{{
    "warehouse_name": "string",
    "address": "string",   // Địa chỉ cụ thể của kho, ví dụ: "Khu công nghiệp Tân Bình, TP.HCM" hoặc "123 Lê Lợi, Quận 1, Hà Nội"
    "dimensions": {{"length_m": number, "width_m": number, "height_m": number}},
    "total_area_sqm": number,
    "racks": {{"num_racks": integer, "rack_height_m": number, "aisle_width_m": number}},
    "storage_zones": [
        {{
            "zone_name": "string",
            "type": "cold|dry|ambient",
            "temperature_range_c": "string",
            "humidity_range_percent": "string",
            "main_product_types": ["string"]
        }}
    ],
    "layout_type": "string",
    "recommended_features": ["string"]
}}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=2048,  # Tăng để tránh cắt ngang
                response_mime_type="application/json"
            )
        )

        json_text = response.text.strip()

        # Clean code block triệt để
        json_text = json_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        return json.loads(json_text)

    except json.JSONDecodeError as je:
        print(f"Lỗi parse JSON (lần 1): {je}")
        print(f"Raw output từ Gemini:\n{response.text}")

        # Retry lần 2 với prompt ngắn gọn + temperature = 0 để đảm bảo chính xác
        try:
            print("Đang thử lại lần 2 với prompt đơn giản hơn...")
            retry_prompt = f"""Tạo JSON cấu trúc kho cho yêu cầu: {user_input}
Phải bao gồm trường "address" (địa chỉ kho).
Chỉ output JSON thuần theo đúng schema sau:

{{
    "warehouse_name": "string",
    "address": "string",
    "dimensions": {{"length_m": number, "width_m": number, "height_m": number}},
    "total_area_sqm": number,
    "racks": {{"num_racks": integer, "rack_height_m": number, "aisle_width_m": number}},
    "storage_zones": [...],
    "layout_type": "string",
    "recommended_features": ["string"]
}}
"""

            response2 = client.models.generate_content(
                model=MODEL_NAME,
                contents=retry_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=2048,
                    response_mime_type="application/json"
                )
            )

            json_text2 = response2.text.strip()
            json_text2 = json_text2.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

            return json.loads(json_text2)

        except Exception as e2:
            print(f"Retry thất bại: {e2}")
            return {}

    except Exception as e:
        print(f"Lỗi tạo JSON warehouse: {e}")
        return {}