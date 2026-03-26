import { GoogleGenerativeAI } from "@google/generative-ai";

type ReportInsightParams = {
  chartKey: string;
  startDate: string;
  endDate: string;
  data: unknown;
  userId?: string;
  role?: string;
};

function buildSystemInstruction(chartKey: string, startDate: string, endDate: string): string {
  return [
    "Bạn là trợ lý phân tích báo cáo vận hành kho của hệ thống SIMS.",
    "Nhiệm vụ của bạn là đọc dữ liệu biểu đồ JSON mà người dùng cung cấp và đưa ra nhận xét hữu ích cho khách hàng.",
    "Chỉ sử dụng dữ liệu trong JSON người dùng gửi (không tự suy đoán số liệu). Nếu thiếu dữ liệu để kết luận chắc chắn, hãy nói rõ giới hạn.",
    "BẮT BUỘC trả lời bằng tiếng Anh (không trả lời tiếng Việt). If you accidentally write Vietnamese, translate everything to English before sending.",
    "You may use light Markdown for emphasis (e.g., **keyword**), but don't use Markdown tables.",
    "Trả lời theo đúng format:",
    "- 1-2 câu tóm tắt xu hướng chính",
    "- 2 ý bất thường/điểm đáng chú ý (nếu có, nếu không hãy nói 'chưa thấy bất thường rõ ràng')",
    "- 1-2 giả định nguyên nhân hợp lý (nêu dưới dạng 'có thể')",
    "- 1-2 khuyến nghị hành động cụ thể",
    `Phạm vi thời gian: ${startDate} -> ${endDate}.`
  ].join("\n");
}

export async function getReportInsight(params: ReportInsightParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const startDate = params.startDate;
  const endDate = params.endDate;
  const chartKey = params.chartKey;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(chartKey, startDate, endDate)
  });

  // Limit payload size to avoid exceeding model limits.
  const rawDataStr = JSON.stringify(params.data ?? {});
  const dataStr = rawDataStr.length > 12000 ? rawDataStr.slice(0, 12000) : rawDataStr;

  const prompt = [
    `chartKey: ${chartKey}`,
    `startDate: ${startDate}`,
    `endDate: ${endDate}`,
    "data(JSON):",
    dataStr
  ].join("\n");

  const chat = model.startChat();
  const result = await chat.sendMessage(prompt);
  const text = result?.response?.text?.() ?? "";

  const trimmed = String(text).trim();

  let sanitized = trimmed;

  // Remove any trailing open-ended question line.
  const lines = sanitized.split(/\r?\n/);
  if (lines.length > 0) {
    const last = lines[lines.length - 1];
    if (/[?？]\s*$/.test(last.trim())) {
      lines.pop();
    }
  }

  sanitized = lines.join("\n").trim();
  return sanitized || "Chưa đủ dữ liệu để tạo insight rõ ràng.";
}

