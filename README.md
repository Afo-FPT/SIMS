# Warehouse AI Assistant

Một AI hỗ trợ quản lý kho hàng thông minh sử dụng Gemini API, RAG đơn giản và tích hợp n8n.

## Cài đặt

1. Clone repo và tạo cấu trúc folder như trên.
2. Cài dependencies:
pip install -r requirements.txt


3. Set environment variables:
export GEMINI_API_KEY=your_gemini_api_key_here
export N8N_WEBHOOK_URL=https://your-n8n.com/webhook/your-workflow-id


## Chạy AI

AI chạy console-based. Nhập yêu cầu bằng tiếng Việt.

## Tích hợp n8n

1. Trong n8n, tạo một workflow bắt đầu bằng **Webhook node** (HTTP Method: POST).
2. Thêm các node xử lý (ví dụ: tính tồn kho → gửi email báo cáo).
3. Activate workflow → copy Production Webhook URL → set vào `N8N_WEBHOOK_URL`.
4. Khi người dùng yêu cầu "tạo báo cáo tồn kho tự động", AI sẽ POST data tới webhook này.

## Test Cases Mẫu

1. **Input**: "Thiết lập kho lạnh mới cho thực phẩm đông lạnh, diện tích 1500m², cần 40 kệ pallet"
   **Output mong đợi**: Tạo và lưu file JSON trong `data/warehouses/` với cấu trúc phù hợp.

2. **Input**: "Gợi ý bố trí kho cho sản phẩm tiêu dùng nhanh"
   **Output mong đợi**: Trả lời chi tiết dựa trên ABC layout từ knowledge.

3. **Input**: "Phân tích xu hướng tồn kho tháng này"
   **Output mong đợi**: Trả lời insights (có thể mở rộng sau khi có data thực).

4. **Input**: "Tự động hóa báo cáo tồn kho hàng ngày"
   **Output mong đợi**: "Đã trigger workflow n8n thành công..."

5. **Input**: "Kho khô cần điều kiện gì?"
   **Output mong đợi**: Trích dẫn từ dry_storage_guidelines.txt.

## Lưu ý
- Lần chạy đầu tiên sẽ build vector store từ folder `data/knowledge` (mất vài phút).
- Code có error handling cơ bản.
- Sau này có thể nâng cấp UI bằng Streamlit.
