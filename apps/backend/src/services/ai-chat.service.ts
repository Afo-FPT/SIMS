import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getContracts, getContractById } from "./contract.service";
import {
  getMyStoredProducts,
  getMyStoredProductShelves,
} from "./stored-item.service";
import {
  getStorageRequestById,
  listStorageRequests,
} from "./storage-request-query.service";
import { getRentRequests } from "./rent-request.service";
import {
  getUnreadCount,
  listMyNotifications,
} from "./notification.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AiChatContext {
  userId: string;
  role: "admin" | "manager" | "staff" | "customer";
}

export interface ChatTableColumn {
  key: string;
  label: string;
  /** If provided, the cell will be rendered as a link with href built from hrefTemplate. */
  hrefTemplate?: string; // e.g. /customer/contracts/{contractId}
  /** Which field to display as link text (defaults to `key`). */
  textKey?: string;
}

export interface ChatTableSpec {
  columns: ChatTableColumn[];
  rows: Array<Record<string, unknown>>;
}

function loadKnowledgeBase(): string {
  const cwdKb = join(process.cwd(), "knowledge", "sims-chatbot.md");
  const srcRelative = join(__dirname, "..", "..", "knowledge", "sims-chatbot.md");
  for (const p of [cwdKb, srcRelative]) {
    if (existsSync(p)) {
      try {
        return readFileSync(p, "utf-8");
      } catch {
        /* continue */
      }
    }
  }
  return "";
}

const KB = loadKnowledgeBase();
const KB_FOR_PROMPT = KB.length > 14000 ? `${KB.slice(0, 14000)}\n\n[... truncated ...]` : KB;

function buildSystemInstruction(ctx: AiChatContext): string {
  return `You are SIMS-AI Assistant, a helpful support bot for the SIMS warehouse management web app.
The user is logged in as role: ${ctx.role}. User id (do not repeat to user unless needed): ${ctx.userId}.

Use the knowledge base below for general flows, menus, and concepts. When the user asks about THEIR contracts, inventory, or service requests, you MUST call the appropriate tools — never invent contract codes, amounts, or statuses.

When you list multiple items (contracts, inventory, storage/service requests, rent requests, notifications), call the appropriate tools and keep the narrative short.
The UI will render the detailed list as a structured table (no Markdown pipe tables).

For **managers/admins**, if the user needs to open a specific row, tell them to open **Manager → Contracts** / **Manager → Service Requests** (UI routing).

When the user asks for contract details, call get_contract_by_id(contractId).
When the user asks where a SKU is located, call get_inventory_product_shelves(sku, contractId?).
When the user asks for a storage/service request detail, call get_storage_request_by_id(requestId).
When the user asks about rent requests, call get_rent_requests_summary.
When the user asks about notifications, call get_unread_notification_count and/or list_my_notifications.

Knowledge base:
---
${KB_FOR_PROMPT}
---

Rules:
- Answer in the same language as the user when possible (Vietnamese or English).
- Be concise. Use bullet lists when listing steps.
- If tools return no data, say so clearly.
- Do NOT output Markdown tables using pipe syntax. Let the UI render lists as tables.
- When a structured table is rendered by the UI, do not repeat every row in the text reply; keep reply to 1-2 sentences like "Dưới đây là bảng...".
- Do not execute payments or change data; only explain how to do it in the UI.`;
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AiChatContext
): Promise<unknown> {
  const limit = Math.min(Math.max(Number(args.limit) || 12, 1), 25);

  switch (name) {
    case "get_contracts_summary": {
      const rows = await getContracts(ctx.userId, ctx.role);
      return rows.slice(0, limit).map((c) => ({
        contractId: c.contract_id,
        contractCode: c.contract_code,
        status: c.status,
        warehouse: c.warehouse_name,
        startDate: c.requested_start_date ?? c.rented_zones?.[0]?.start_date,
        endDate: c.requested_end_date ?? c.rented_zones?.[0]?.end_date,
      }));
    }
    case "get_inventory_products_summary": {
      if (ctx.role !== "customer") {
        return { error: "Inventory lookup is only available for customers." };
      }
      const products = await getMyStoredProducts(ctx.userId);
      return products.slice(0, limit).map((p) => ({
        sku: p.sku,
        productId: p.product_id,
        contractId: (p as any).contract_id,
        contractCode: p.contract_code,
        totalQuantity: p.total_quantity,
        unit: p.unit,
        lastUpdated: p.last_updated,
      }));
    }
    case "get_service_requests_summary": {
      const requestType = args.requestType as "IN" | "OUT" | undefined;
      const status = args.status as
        | "PENDING"
        | "APPROVED"
        | "DONE_BY_STAFF"
        | "COMPLETED"
        | "REJECTED"
        | undefined;
      const rows = await listStorageRequests(ctx.userId, ctx.role, {
        requestType,
        status,
      });
      return rows.slice(0, limit).map((r) => ({
        requestId: r.request_id,
        type: r.request_type === "IN" ? "Inbound" : "Outbound",
        status: r.status,
        contractCode: r.contract_code,
        reference: r.reference,
        createdAt: r.created_at,
        itemCount: r.items?.length ?? 0,
      }));
    }
    case "get_contract_by_id": {
      const contractId = args.contractId as string | undefined;
      if (!contractId) return { error: "contractId is required" };
      return await getContractById(contractId, ctx.userId, ctx.role);
    }
    case "get_inventory_product_shelves": {
      if (ctx.role !== "customer") {
        return { error: "Inventory shelf lookup is only available for customers." };
      }
      const sku = args.sku as string | undefined;
      const contractId = (args.contractId as string | undefined) || undefined;
      if (!sku) return { error: "sku is required" };
      const rows = await getMyStoredProductShelves(ctx.userId, sku, contractId);
      return rows.slice(0, limit);
    }
    case "get_storage_request_by_id": {
      const requestId = args.requestId as string | undefined;
      if (!requestId) return { error: "requestId is required" };
      return await getStorageRequestById(requestId, ctx.userId, ctx.role);
    }
    case "get_rent_requests_summary": {
      const rows = await getRentRequests(ctx.userId, ctx.role);
      return rows.slice(0, limit);
    }
    case "get_unread_notification_count": {
      return await getUnreadCount({ userId: ctx.userId });
    }
    case "list_my_notifications": {
      const page = Math.max(1, Number(args.page) || 1);
      const unreadOnly = Boolean(args.unreadOnly);
      const data = await listMyNotifications({
        userId: ctx.userId,
        page,
        limit,
        unreadOnly,
      });
      return data;
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function toFunctionResponsePayload(out: unknown): Record<string, unknown> {
  // Gemini functionResponse expects a JSON object (Struct), not a top-level array.
  if (out && typeof out === "object" && !Array.isArray(out)) {
    return out as Record<string, unknown>;
  }
  return { result: out };
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTableCellValue(v: unknown): unknown {
  // Normalize table display: show date as DD/MM/YYYY only.
  if (v instanceof Date) return formatDateOnly(v);

  if (typeof v === 'string') {
    // Heuristic: treat ISO-like strings as dates.
    const maybeDate = new Date(v);
    if (!Number.isNaN(maybeDate.getTime())) return formatDateOnly(maybeDate);
    return v;
  }

  return v;
}

function buildHrefFromTemplate(
  hrefTemplate: string,
  row: Record<string, unknown>
): string {
  return hrefTemplate.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const val = row[key];
    return val == null ? "" : String(val);
  });
}

function buildChatTableSpec(
  toolOutputs: Array<{ name: string; out: unknown }>
): ChatTableSpec | undefined {
  const lastOf = (names: string[]) => {
    for (let i = toolOutputs.length - 1; i >= 0; i--) {
      if (names.includes(toolOutputs[i].name)) return toolOutputs[i];
    }
    return undefined;
  };

  // 1) Contracts list
  const contracts = lastOf(["get_contracts_summary"]);
  if (contracts?.out && Array.isArray(contracts.out)) {
    const rows = contracts.out.map((r: any) => ({
      ...r,
      startDate: formatTableCellValue(r.startDate),
      endDate: formatTableCellValue(r.endDate),
    }));
    return {
      columns: [
        {
          key: "contractCode",
          label: "Contract",
          hrefTemplate: "/customer/contracts/{contractId}",
        },
        { key: "status", label: "Status" },
        { key: "warehouse", label: "Warehouse" },
        { key: "startDate", label: "Start" },
        { key: "endDate", label: "End" },
      ],
      rows,
    };
  }

  // 2) Inventory shelf distribution (customer)
  const invShelves = lastOf(["get_inventory_product_shelves"]);
  if (invShelves?.out && Array.isArray(invShelves.out)) {
    const rows = invShelves.out.map((r: any) => ({
      ...r,
      last_updated: formatTableCellValue(r.last_updated),
    }));
    return {
      columns: [
        { key: "shelf", label: "Shelf" },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "quantity_per_unit", label: "Qty / unit" },
        { key: "contract_code", label: "Contract" },
        { key: "last_updated", label: "Updated" },
      ],
      rows,
    };
  }

  // 2b) Inventory by SKU summary (customer)
  const invSummary = lastOf(["get_inventory_products_summary"]);
  if (invSummary?.out && Array.isArray(invSummary.out)) {
    const rows = invSummary.out.map((r: any) => ({
      ...r,
      lastUpdated: formatTableCellValue(r.lastUpdated),
    }));
    return {
      columns: [
        {
          key: "sku",
          label: "SKU",
        },
        {
          key: "contractCode",
          label: "Contract",
          hrefTemplate: "/customer/contracts/{contractId}",
        },
        { key: "totalQuantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "lastUpdated", label: "Updated" },
      ],
      rows,
    };
  }

  // 3) Storage/service request detail (items)
  const storageDetail = lastOf(["get_storage_request_by_id"]);
  if (storageDetail?.out && typeof storageDetail.out === "object" && storageDetail.out) {
    const d: any = storageDetail.out;
    if (Array.isArray(d.items)) {
      const rows = d.items.map((it: any) => ({
        ...it,
        quantity_actual: it.quantity_actual ?? "",
        damage_quantity: it.damage_quantity ?? "",
      }));
      return {
        columns: [
          { key: "item_name", label: "Item" },
          { key: "unit", label: "Unit" },
          { key: "quantity_requested", label: "Requested" },
          { key: "quantity_actual", label: "Actual" },
          { key: "damage_quantity", label: "Damage" },
          { key: "loss_reason", label: "Loss reason" },
          { key: "shelf_code", label: "Shelf" },
          { key: "zone_code", label: "Zone" },
        ],
        rows,
      };
    }
  }

  // 4) Service requests list (summary)
  const serviceSumm = lastOf(["get_service_requests_summary"]);
  if (serviceSumm?.out && Array.isArray(serviceSumm.out)) {
    return {
      columns: [
        { key: "requestId", label: "Request" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "contractCode", label: "Contract" },
        { key: "reference", label: "Reference" },
        { key: "createdAt", label: "Created" },
        { key: "itemCount", label: "Items" },
      ],
      rows: serviceSumm.out.map((r: any) => ({
        ...r,
        createdAt: formatTableCellValue(r.createdAt),
      })),
    };
  }

  // 5) Rent requests list
  const rentSumm = lastOf(["get_rent_requests_summary"]);
  if (rentSumm?.out && Array.isArray(rentSumm.out)) {
    return {
      columns: [
        { key: "id", label: "Rent request" },
        { key: "status", label: "Status" },
        { key: "startDate", label: "Start" },
        { key: "durationMonths", label: "Duration (mo)" },
        { key: "shelves", label: "Shelves" },
        { key: "zonePreference", label: "Zone pref" },
        { key: "countingUnit", label: "Unit" },
        { key: "createdAt", label: "Created" },
      ],
      rows: rentSumm.out.map((r: any) => ({
        ...r,
        startDate: formatTableCellValue(r.startDate),
        createdAt: formatTableCellValue(r.createdAt),
      })),
    };
  }

  // 6) Notifications list
  const notifList = lastOf(["list_my_notifications"]);
  if (
    notifList?.out &&
    typeof notifList.out === "object" &&
    notifList.out &&
    (notifList.out as any).notifications &&
    Array.isArray((notifList.out as any).notifications)
  ) {
    const notifications = (notifList.out as any).notifications as any[];
    return {
      columns: [
        { key: "title", label: "Title" },
        { key: "type", label: "Type" },
        { key: "message", label: "Message" },
        { key: "relatedEntityType", label: "Entity" },
        { key: "relatedEntityId", label: "Entity ID" },
        { key: "read", label: "Read" },
        { key: "createdAt", label: "Created" },
      ],
      rows: notifications.map((n: any) => ({
        ...n,
        createdAt: formatTableCellValue(n.createdAt),
      })),
    };
  }

  // 7) Unread count
  const unread = lastOf(["get_unread_notification_count"]);
  if (unread?.out && typeof unread.out === "object" && unread.out) {
    const u: any = unread.out;
    return {
      columns: [{ key: "unread", label: "Unread" }],
      rows: [{ unread: u.unread ?? 0 }],
    };
  }

  return undefined;
}

function buildTableSummary(toolOutputs: Array<{ name: string; out: unknown }>): string {
  const names = toolOutputs.map((t) => t.name);
  if (names.includes("get_contracts_summary")) {
    return "Dưới đây là bảng các hợp đồng kèm trạng thái của bạn.";
  }
  if (names.includes("get_inventory_products_summary")) {
    return "Dưới đây là bảng tồn kho theo SKU của bạn (kèm cập nhật gần nhất).";
  }
  if (names.includes("get_service_requests_summary")) {
    return "Dưới đây là bảng các service requests (yêu cầu dịch vụ) của bạn.";
  }
  if (names.includes("get_storage_request_by_id")) {
    return "Dưới đây là bảng chi tiết các items trong request bạn yêu cầu.";
  }
  if (names.includes("get_rent_requests_summary")) {
    return "Dưới đây là bảng các rent requests của bạn.";
  }
  if (names.includes("list_my_notifications")) {
    return "Dưới đây là danh sách thông báo của bạn.";
  }
  if (names.includes("get_unread_notification_count")) {
    return "Dưới đây là số lượng thông báo chưa đọc của bạn.";
  }
  return "Dưới đây là bảng tóm tắt theo yêu cầu.";
}

const functionDeclarations = [
  {
    name: "get_contracts_summary",
    description:
      "Get a summary of contracts visible to this user (customer: own contracts; manager: all). Use for questions about how many contracts, contract list, status, payment pending, rental period. Each item includes contractId for building detail links.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of contracts to return (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_inventory_products_summary",
    description:
      "Get customer's inventory products grouped by SKU (totals per product). Only for customers. Use for stock, SKU, quantity questions.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Max products (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_service_requests_summary",
    description:
      "List inbound/outbound service requests visible to this user. Customer: own requests. Staff: assigned. Manager/Admin: all (or filter).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        requestType: {
          type: SchemaType.STRING,
          enum: ["IN", "OUT"],
          description: "Filter by IN (inbound) or OUT (outbound), optional",
        },
        status: {
          type: SchemaType.STRING,
          enum: ["PENDING", "APPROVED", "DONE_BY_STAFF", "COMPLETED", "REJECTED"],
          description: "Optional status filter",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_contract_by_id",
    description:
      "Get full details of a specific contract by contractId. Use when the user asks about what is inside/terms/status/dates for one particular contract.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        contractId: {
          type: SchemaType.STRING,
          description: "Contract id (Mongo ObjectId string)",
        },
      },
      required: ["contractId"],
    },
  },
  {
    name: "get_inventory_product_shelves",
    description:
      "Get shelf distribution for a customer's SKU (where the items are stored). Optionally scope to a specific contractId. Use when user asks 'SKU X is located on which shelves and quantities per shelf'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sku: {
          type: SchemaType.STRING,
          description: "SKU / item_name string",
        },
        contractId: {
          type: SchemaType.STRING,
          description: "Optional contract id to scope shelves",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows (default 12, max 25)",
        },
      },
      required: ["sku"],
    },
  },
  {
    name: "get_storage_request_by_id",
    description:
      "Get full detail of one storage/service request by requestId (including items and shelf/zone info). Use for questions about what items are included and quantities by shelf for a single request.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        requestId: {
          type: SchemaType.STRING,
          description: "Request id (StorageRequest._id string)",
        },
      },
      required: ["requestId"],
    },
  },
  {
    name: "get_rent_requests_summary",
    description:
      "List rent requests visible to this user. Customer: only their rent requests; manager/admin: all. Use for questions about how many rent requests exist and their statuses.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_unread_notification_count",
    description:
      "Get unread notifications count for the current user. Use when user asks how many notifications are unread.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "list_my_notifications",
    description:
      "List notifications for the current user (optionally only unread). Use when user asks for notification list or wants to read the latest notifications.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        page: {
          type: SchemaType.NUMBER,
          description: "Page number (default 1)",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Rows per page (default 12, max 25)",
        },
        unreadOnly: {
          type: SchemaType.BOOLEAN,
          description: "If true, only return unread notifications",
        },
      },
    },
  },
];

export async function runAiChat(
  messages: ChatMessage[],
  ctx: AiChatContext
): Promise<{ reply: string; model?: string; table?: ChatTableSpec }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI chat is not configured. Set GEMINI_API_KEY in the backend environment."
    );
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(ctx),
    tools: [{ functionDeclarations: functionDeclarations as any }],
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const lastUser = messages[messages.length - 1];
  if (!lastUser || lastUser.role !== "user") {
    throw new Error("Last message must be from user");
  }

  const chat = model.startChat({
    history: history as any,
  });

  let result = await chat.sendMessage(lastUser.content);
  let response = result.response;

  function safeText(): string {
    try {
      return response.text();
    } catch {
      return "";
    }
  }

  // Function calling loop (max 5 rounds)
  const toolOutputs: Array<{ name: string; out: unknown }> = [];
  for (let i = 0; i < 5; i++) {
    const calls = response.functionCalls?.();
    if (!calls || calls.length === 0) {
      const text = safeText();
      const table = buildChatTableSpec(toolOutputs);
      if (table) {
        return { reply: buildTableSummary(toolOutputs), model: modelName, table };
      }
      return { reply: text || "I could not generate a reply.", model: modelName, table };
    }

    const toolResults = await Promise.all(
      calls.map(async (call) => {
        const out = await runTool(
          call.name,
          (call.args as Record<string, unknown>) || {},
          ctx
        );
        return {
          name: call.name,
          out,
          functionResponse: {
            name: call.name,
            response: toFunctionResponsePayload(out),
          },
        };
      })
    );

    toolOutputs.push(...toolResults.map((r) => ({ name: r.name, out: r.out })));
    // The SDK expects an array of Parts; FunctionResponsePart shape is:
    // { functionResponse: { name: string, response: object } }
    const functionResponses = toolResults.map((r) => ({
      functionResponse: r.functionResponse,
    }));

    result = await chat.sendMessage(functionResponses as any);
    response = result.response;
  }

  const table = buildChatTableSpec(toolOutputs);
  if (table) {
    return {
      reply: buildTableSummary(toolOutputs),
      model: modelName,
      table,
    };
  }

  return {
    reply:
      safeText() ||
      "Sorry, the response was cut off. Please try a shorter question.",
    model: modelName,
    table,
  };
}
