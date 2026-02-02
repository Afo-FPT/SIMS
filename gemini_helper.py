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


def generate_warehouse_json(user_input: str, retrieved_docs: list, product_types: list = None) -> dict:
    """
    Tạo cấu trúc kho với trường mới: address (địa chỉ kho hàng)
    Đảm bảo JSON hoàn chỉnh, không bị cắt ngang, có retry tự động
    Thêm hỗ trợ product_types để tối ưu shelf_arrangement
    """
    context = "\n\n".join([doc.text for doc in retrieved_docs])
    
    # Xử lý product_types nếu có
    product_str = ", ".join(product_types) if product_types and isinstance(product_types, list) else "không xác định"
    arrangement_instruction = f"""
    Loại sản phẩm chính: {product_str}
    Tối ưu sắp xếp sản phẩm lên kệ dựa trên loại sản phẩm (ví dụ ABC: sản phẩm bán nhanh gần lối vào, cao tầng cho hàng nhẹ, thấp tầng cho hàng nặng).
    Thêm field "shelf_arrangement": [{{ "product_type": str, "shelf_position": "near entrance|back|high shelf|low shelf|special zone|etc", "reason": str }}]
    """ if product_types else ""

    prompt = f"""Dựa trên tiêu chuẩn kho hàng và yêu cầu sau, tạo JSON cấu trúc kho hoàn chỉnh.
Chỉ output JSON thuần, không giải thích, không code block:

Tiêu chuẩn: {context}
Yêu cầu: {user_input}
{arrangement_instruction}

Schema bắt buộc (phải có đầy đủ các trường sau):
{{
    "warehouse_name": "string",
    "address": "string",   // Địa chỉ cụ thể của kho, ví dụ: "Khu công nghiệp Tân Bình, TP.HCM"
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
    "recommended_features": ["string"],
    "shelf_arrangement": [  // Field mới: Tối ưu sắp xếp sản phẩm lên kệ
        {{"product_type": "string", "shelf_position": "string", "reason": "string"}}
    ]
}}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=2048,
                response_mime_type="application/json"
            )
        )

        json_text = response.text.strip()
        json_text = json_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        return json.loads(json_text)

    except json.JSONDecodeError as je:
        print(f"Lỗi parse JSON (lần 1): {je}")
        print(f"Raw output từ Gemini:\n{response.text}")

        # Retry lần 2 với prompt ngắn gọn
        try:
            print("Đang thử lại lần 2...")
            retry_prompt = f"""Tạo JSON cấu trúc kho cho yêu cầu: {user_input}
Phải bao gồm trường "address" và "shelf_arrangement" nếu có loại sản phẩm.
Chỉ output JSON thuần theo schema sau:

{{
    "warehouse_name": "string",
    "address": "string",
    "dimensions": {{...}},
    "total_area_sqm": number,
    "racks": {{...}},
    "storage_zones": [...],
    "layout_type": "string",
    "recommended_features": ["string"],
    "shelf_arrangement": [{{ "product_type": "string", "shelf_position": "string", "reason": "string" }}]
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


# =====================================================================
# HÀM MỚI: extract_product_types (đã có từ trước)
# =====================================================================
def extract_product_types(user_input: str) -> list:
    """
    Extract danh sách loại sản phẩm chính (main_product_types) từ yêu cầu người dùng.
    Output: list string, ví dụ ["thịt", "cá", "kem"]
    Nếu không tìm thấy, trả về list rỗng [].
    """
    prompt = f"""
    Từ yêu cầu của người dùng sau:
    {user_input}

    Hãy extract danh sách các loại sản phẩm chính (main_product_types) mà kho cần lưu trữ.
    Chỉ output JSON thuần, không giải thích, không code block:

    {{"product_types": ["string", "string", ...]}}

    Nếu không có thông tin loại sản phẩm nào, trả về {{"product_types": []}}.
    """

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=512,
                response_mime_type="application/json"
            )
        )

        json_text = response.text.strip()
        json_text = json_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        extracted = json.loads(json_text)
        product_types = extracted.get("product_types", [])

        # Validate
        if not isinstance(product_types, list):
            product_types = []
        product_types = [str(item).strip() for item in product_types if item and str(item).strip()]

        return product_types

    except json.JSONDecodeError as je:
        print(f"Lỗi parse JSON khi extract product types: {je}")
        print(f"Raw output từ Gemini:\n{response.text}")
        return []
    except Exception as e:
        print(f"Lỗi khi extract product types: {str(e)}")
        return []