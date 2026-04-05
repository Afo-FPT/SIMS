import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getContracts, getContractById, getContractByCode } from "./contract.service";
import {
  getMyStoredProducts,
  getMyStoredProductShelves,
  getMyStoredProductsInZoneOrWarehouse,
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
import { getCycleCounts, getCycleCountById } from "./cycle-count.service";
import { searchAndFilterWarehouses } from "./warehouse.service";
import { getManagerReport } from "./reports.service";
import { getAllUsers } from "./user.service";
import { getAiRuntimeSettings } from "./ai-settings.service";

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
  /** Optional link to the relevant app page (list/detail) */
  contextHref?: string;
  /** Optional label for the context link */
  contextLabel?: string;
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

Access control:
- Contract data tools (get_contracts_summary, get_contract_by_id) are customer-only in chat.
- Inventory data tools are customer-only in chat.
- If a non-customer asks for contract/inventory data, politely refuse and direct them to the manager/staff UI pages.

For managers/admins, if they need to inspect contract rows, tell them to open **Manager → Contracts** in the app UI.

When the user asks for contract details, prefer get_contract_by_code(contractCode) if the user provides a contract code (e.g. CT-XXXX). Otherwise, call get_contracts_summary first and ask them which contractCode they mean, then call get_contract_by_code.
When the user asks for contracts expiring soon (e.g., in the next month), call get_expiring_contracts_summary and sort/display nearest expiry first.
When the user asks where a SKU is located, call get_inventory_product_shelves(sku, contractId?).
When the user asks about low stock / nearly out-of-stock products, call get_low_stock_products_summary.
When the user asks about high stock / products with plenty of stock, call get_high_stock_products_summary.
When the user asks to list products currently stored in a specific zone or warehouse they are renting, call get_zone_inventory_products(zoneCode?, warehouseId?, contractCode?).
When the user asks for a storage/service request detail, call get_storage_request_by_id(requestId).
When the user asks about rent requests, call get_rent_requests_summary.
When the user asks about notifications, call get_unread_notification_count and/or list_my_notifications.
For staff, use get_cycle_counts_summary and get_cycle_count_by_id to review assigned cycle count work.
For managers/admins, use get_manager_report_summary for operational reports and list_warehouses for warehouse overview.
For admins, use list_users_summary to view user list in chat.

Knowledge base:
---
${KB_FOR_PROMPT}
---

Rules:
- Answer in the same language as the user when possible (Vietnamese or English).
- Be concise. Use bullet lists when listing steps.
- If tools return no data, say so clearly.
- Do NOT output Markdown tables using pipe syntax. Let the UI render lists as tables.
- When a structured table is rendered by the UI, do not repeat every row in the text reply.
- Keep text natural and conversational. Avoid rigid "summary template" phrasing.
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
      if (ctx.role !== "customer") {
        return { error: "Contract lookup in chat is only available for customers." };
      }
      const statusFilter = (args.status as string | undefined) || undefined;
      const codeFilter = (args.contractCode as string | undefined) || undefined;
      const rows = await getContracts(ctx.userId, ctx.role);
      const filtered = rows.filter((c) => {
        if (statusFilter && String(c.status) !== String(statusFilter)) return false;
        if (codeFilter) {
          const q = String(codeFilter).trim().toUpperCase();
          if (!String(c.contract_code || "").toUpperCase().includes(q)) return false;
        }
        return true;
      });
      return filtered.slice(0, limit).map((c) => ({
        contractId: c.contract_id,
        contractCode: c.contract_code,
        status: c.status,
        warehouse: c.warehouse_name,
        startDate: c.requested_start_date ?? c.rented_zones?.[0]?.start_date,
        endDate: c.requested_end_date ?? c.rented_zones?.[0]?.end_date,
      }));
    }
    case "get_expiring_contracts_summary": {
      if (ctx.role !== "customer") {
        return { error: "Expiring contract lookup in chat is only available for customers." };
      }

      const withinDays = Math.min(Math.max(Number(args.withinDays) || 30, 1), 365);
      const warehouseName = String(args.warehouseName || "").trim().toLowerCase();
      const statusFilter = String(args.status || "active").trim().toLowerCase();
      const expiryDate = String(args.expiryDate || "").trim(); // YYYY-MM-DD preferred
      const expiryMonth = String(args.expiryMonth || "").trim(); // YYYY-MM or MM/YYYY

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const deadline = new Date(today);
      deadline.setDate(deadline.getDate() + withinDays);

      const rows = await getContracts(ctx.userId, ctx.role);

      const normalizeDateOnly = (value: unknown): Date | null => {
        if (!value) return null;
        const d = new Date(String(value));
        if (Number.isNaN(d.getTime())) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const parseMonthFilter = (raw: string): { y: number; m: number } | null => {
        if (!raw) return null;
        const ym = raw.match(/^(\d{4})-(\d{1,2})$/);
        if (ym) {
          const y = Number(ym[1]);
          const m = Number(ym[2]);
          if (m >= 1 && m <= 12) return { y, m };
        }
        const my = raw.match(/^(\d{1,2})\/(\d{4})$/);
        if (my) {
          const m = Number(my[1]);
          const y = Number(my[2]);
          if (m >= 1 && m <= 12) return { y, m };
        }
        return null;
      };

      const monthFilter = parseMonthFilter(expiryMonth);
      const exactExpiryDate = expiryDate ? normalizeDateOnly(expiryDate) : null;

      const filtered = rows
        .map((c) => {
          const end = normalizeDateOnly(c.requested_end_date ?? c.rented_zones?.[0]?.end_date);
          if (!end) return null;
          const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            contractId: c.contract_id,
            contractCode: c.contract_code,
            status: c.status,
            warehouse: c.warehouse_name,
            startDate: c.requested_start_date ?? c.rented_zones?.[0]?.start_date,
            endDate: c.requested_end_date ?? c.rented_zones?.[0]?.end_date,
            daysUntilEnd,
            _end: end,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .filter((row) => row.daysUntilEnd >= 0 && row._end <= deadline)
        .filter((row) => (!warehouseName ? true : String(row.warehouse || "").toLowerCase().includes(warehouseName)))
        .filter((row) => (!statusFilter ? true : String(row.status || "").toLowerCase() === statusFilter))
        .filter((row) => {
          if (!exactExpiryDate) return true;
          return (
            row._end.getFullYear() === exactExpiryDate.getFullYear() &&
            row._end.getMonth() === exactExpiryDate.getMonth() &&
            row._end.getDate() === exactExpiryDate.getDate()
          );
        })
        .filter((row) => {
          if (!monthFilter) return true;
          return row._end.getFullYear() === monthFilter.y && row._end.getMonth() + 1 === monthFilter.m;
        })
        .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);

      return filtered.slice(0, limit).map(({ _end, ...row }) => row);
    }
    case "get_inventory_products_summary": {
      if (ctx.role !== "customer") {
        return { error: "Inventory lookup is only available for customers." };
      }
      const skuFilter = (args.sku as string | undefined) || undefined;
      const products = await getMyStoredProducts(ctx.userId);
      const filtered = skuFilter
        ? products.filter((p) =>
            String(p.sku || "")
              .toLowerCase()
              .includes(String(skuFilter).trim().toLowerCase())
          )
        : products;
      return filtered.slice(0, limit).map((p) => ({
        productName: p.sku,
        sku: p.sku,
        productId: p.product_id,
        contractId: (p as any).contract_id,
        totalQuantity: p.total_quantity,
        unit: p.unit,
        lastUpdated: p.last_updated,
      }));
    }
    case "get_low_stock_products_summary": {
      if (ctx.role !== "customer") {
        return { error: "Low-stock lookup is only available for customers." };
      }
      const threshold = Math.max(0, Number(args.threshold) || 10);
      const skuFilter = String(args.sku || "").trim().toLowerCase();
      const products = await getMyStoredProducts(ctx.userId);
      const filtered = products
        .filter((p) => {
          const qty = Number((p as any).total_quantity) || 0;
          if (qty > threshold) return false;
          if (skuFilter && !String(p.sku || "").toLowerCase().includes(skuFilter)) return false;
          return true;
        })
        .sort((a, b) => (Number((a as any).total_quantity) || 0) - (Number((b as any).total_quantity) || 0));

      return filtered.slice(0, limit).map((p) => ({
        productName: p.sku,
        sku: p.sku,
        productId: p.product_id,
        contractId: (p as any).contract_id,
        totalQuantity: p.total_quantity,
        unit: p.unit,
        threshold,
        stockLevel: "LOW",
        lastUpdated: p.last_updated,
      }));
    }
    case "get_high_stock_products_summary": {
      if (ctx.role !== "customer") {
        return { error: "High-stock lookup is only available for customers." };
      }
      const threshold = Math.max(0, Number(args.threshold) || 100);
      const skuFilter = String(args.sku || "").trim().toLowerCase();
      const products = await getMyStoredProducts(ctx.userId);
      const filtered = products
        .filter((p) => {
          const qty = Number((p as any).total_quantity) || 0;
          if (qty < threshold) return false;
          if (skuFilter && !String(p.sku || "").toLowerCase().includes(skuFilter)) return false;
          return true;
        })
        .sort((a, b) => (Number((b as any).total_quantity) || 0) - (Number((a as any).total_quantity) || 0));

      return filtered.slice(0, limit).map((p) => ({
        productName: p.sku,
        sku: p.sku,
        productId: p.product_id,
        contractId: (p as any).contract_id,
        totalQuantity: p.total_quantity,
        unit: p.unit,
        threshold,
        stockLevel: "HIGH",
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
      if (ctx.role !== "customer") {
        return { error: "Contract detail lookup in chat is only available for customers." };
      }
      const contractId = args.contractId as string | undefined;
      if (!contractId) return { error: "contractId is required" };
      return await getContractById(contractId, ctx.userId, ctx.role);
    }
    case "get_contract_by_code": {
      if (ctx.role !== "customer") {
        return { error: "Contract detail lookup in chat is only available for customers." };
      }
      const contractCode = args.contractCode as string | undefined;
      if (!contractCode) return { error: "contractCode is required" };
      return await getContractByCode(contractCode, ctx.userId, ctx.role);
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
    case "get_zone_inventory_products": {
      if (ctx.role !== "customer") {
        return { error: "Zone/warehouse inventory lookup is only available for customers." };
      }
      const zoneCode =
        (args.zoneCode as string | undefined) ||
        ((args as any).zone as string | undefined) ||
        ((args as any).zone_code as string | undefined) ||
        undefined;
      const warehouseId = (args.warehouseId as string | undefined) || undefined;
      const contractCode =
        (args.contractCode as string | undefined) ||
        ((args as any).contract_code as string | undefined) ||
        undefined;
      const rows = await getMyStoredProductsInZoneOrWarehouse({
        customerId: ctx.userId,
        zoneCode,
        warehouseId,
        contractCode,
      });
      return rows.slice(0, limit).map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        sku: r.product_name,
        totalQuantity: r.total_quantity,
        unit: r.unit,
        zoneCodes: r.zone_codes,
        shelfCount: r.shelf_count,
        lastUpdated: r.last_updated,
      }));
    }
    case "get_storage_request_by_id": {
      const requestId = args.requestId as string | undefined;
      if (!requestId) return { error: "requestId is required" };
      return await getStorageRequestById(requestId, ctx.userId, ctx.role);
    }
    case "get_rent_requests_summary": {
      const statusFilter = (args.status as string | undefined) || undefined;
      const rows = await getRentRequests(ctx.userId, ctx.role);
      const filtered = statusFilter
        ? rows.filter((r: any) => String(r.status) === String(statusFilter))
        : rows;
      return filtered.slice(0, limit);
    }
    case "get_cycle_counts_summary": {
      // customer/staff/manager/admin are handled inside cycle-count.service
      const statusFilter = (args.status as string | undefined) || undefined;
      const codeFilter = (args.contractCode as string | undefined) || undefined;
      const rows = await getCycleCounts(ctx.userId, ctx.role);
      const filtered = rows.filter((c) => {
        if (statusFilter && String(c.status) !== String(statusFilter)) return false;
        if (codeFilter) {
          const q = String(codeFilter).trim().toUpperCase();
          if (!String(c.contract_code || "").toUpperCase().includes(q)) return false;
        }
        return true;
      });
      return filtered.slice(0, limit).map((c) => ({
        cycleCountId: c.cycle_count_id,
        contractCode: c.contract_code,
        warehouse: c.warehouse_name,
        status: c.status,
        requestedAt: c.requested_at,
        countingDeadline: c.counting_deadline,
        updatedAt: c.updated_at,
      }));
    }
    case "get_cycle_count_by_id": {
      const cycleCountId = args.cycleCountId as string | undefined;
      if (!cycleCountId) return { error: "cycleCountId is required" };
      return await getCycleCountById(cycleCountId, ctx.userId, ctx.role);
    }
    case "list_warehouses": {
      if (ctx.role !== "manager" && ctx.role !== "admin" && ctx.role !== "staff") {
        return { error: "Warehouse listing is not available for this role in chat." };
      }
      const search = (args.search as string | undefined) || undefined;
      const status = (args.status as "ACTIVE" | "INACTIVE" | undefined) || undefined;
      const page = Math.max(1, Number(args.page) || 1);
      const res = await searchAndFilterWarehouses({
        search,
        status,
        page,
        limit,
      } as any);
      return {
        items: res.warehouses,
        pagination: res.pagination,
      };
    }
    case "get_manager_report_summary": {
      if (ctx.role !== "manager" && ctx.role !== "admin") {
        return { error: "Manager report is only available for manager/admin in chat." };
      }
      const startDate = args.startDate as string | undefined;
      const endDate = args.endDate as string | undefined;
      const granularity = ((args.granularity as string) || "day") === "week" ? "week" : "day";
      if (!startDate || !endDate) return { error: "startDate and endDate are required (YYYY-MM-DD)" };
      return await getManagerReport(startDate, endDate, granularity as any);
    }
    case "list_users_summary": {
      if (ctx.role !== "admin") {
        return { error: "User listing is only available for admin in chat." };
      }
      const roleFilter = (args.role as string | undefined) || undefined;
      const emailFilter = (args.email as string | undefined) || undefined;
      const activeOnly = Boolean(args.activeOnly);
      const users = await getAllUsers();
      const filtered = users.filter((u: any) => {
        if (roleFilter && String(u.role) !== String(roleFilter)) return false;
        if (activeOnly && !u.isActive) return false;
        if (emailFilter) {
          const q = String(emailFilter).trim().toLowerCase();
          if (!String(u.email || "").toLowerCase().includes(q)) return false;
        }
        return true;
      });
      return filtered.slice(0, limit).map((u: any) => ({
        userId: u._id?.toString?.() ?? String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: Boolean(u.isActive),
        createdAt: u.createdAt,
      }));
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

type ToolErrorPayload = {
  error: {
    message: string;
    reason?: string;
    fix?: string;
    tool?: string;
  };
};

function toToolErrorPayload(toolName: string, err: unknown): ToolErrorPayload {
  const raw = err instanceof Error ? err.message : String(err || "Tool failed");
  const message = raw || "Tool failed";
  const lower = message.toLowerCase();

  let reason: string | undefined;
  let fix: string | undefined;

  if (lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("access denied")) {
    reason = "Unauthorized access for your role or account.";
    fix = "Make sure you are logged in with the correct role/account. If you are a non-customer, use the UI pages (e.g., Manager → Contracts) instead of chat for contract/inventory data.";
  } else if (lower.includes("not found")) {
    reason = "The requested item does not exist or is not visible to your account.";
    fix = "Double-check the identifier (e.g., contract code) and try again. You can also ask me to list your contracts/requests first, then pick one from the list.";
  } else if (lower.includes("invalid")) {
    reason = "Invalid input format.";
    fix = "Please provide a valid identifier (e.g., contractCode like CT-XXXX) or ask me to list items first.";
  } else if (lower.includes("pending_payment") || lower.includes("no active contract") || lower.includes("active contract")) {
    reason = "Your account is in a state that prevents this action.";
    fix = "Check your contracts and ensure you have an active contract (or complete pending payment) before using this feature.";
  } else if (lower.includes("zone is not in your rented area") || lower.includes("does not belong")) {
    reason = "The target zone/contract is not part of your rented area.";
    fix = "Use a zone that appears in your active contract. Ask me to list your contracts first, then choose the correct contract/zone.";
  } else {
    reason = "The system could not complete the request.";
    fix = "Try again with a shorter/more specific query, or ask me to list the related items first to avoid using the wrong identifier.";
  }

  return {
    error: {
      tool: toolName,
      message,
      reason,
      fix,
    },
  };
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
  toolOutputs: Array<{ name: string; out: unknown }>,
  ctx: AiChatContext
): ChatTableSpec | undefined {
  const lastOf = (names: string[]) => {
    for (let i = toolOutputs.length - 1; i >= 0; i--) {
      if (names.includes(toolOutputs[i].name)) return toolOutputs[i];
    }
    return undefined;
  };

  // 1) Contracts list
  const contracts = lastOf(["get_contracts_summary", "get_expiring_contracts_summary"]);
  if (contracts?.out && Array.isArray(contracts.out)) {
    const rows = contracts.out.map((r: any) => ({
      ...r,
      startDate: formatTableCellValue(r.startDate),
      endDate: formatTableCellValue(r.endDate),
    }));
    const hasDaysLeft = rows.some((r: any) => typeof r.daysUntilEnd === "number");
    return {
      contextHref: "/customer/contracts",
      contextLabel: "Open Contracts",
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
        ...(hasDaysLeft ? [{ key: "daysUntilEnd", label: "Days left" }] : []),
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
      contextHref: "/customer/inventory",
      contextLabel: "Open Inventory",
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
  const invSummary = lastOf([
    "get_inventory_products_summary",
    "get_low_stock_products_summary",
    "get_high_stock_products_summary",
  ]);
  if (invSummary?.out && Array.isArray(invSummary.out)) {
    const rows = invSummary.out.map((r: any) => ({
      ...r,
      lastUpdated: formatTableCellValue(r.lastUpdated),
    }));
    const hasStockLevel = rows.some((r: any) => typeof r.stockLevel === "string");
    const hasThreshold = rows.some((r: any) => r.threshold != null);
    return {
      contextHref: "/customer/inventory",
      contextLabel: "Open Inventory",
      columns: [
        {
          key: "productName",
          label: "Product name",
          textKey: "productName",
          hrefTemplate: "/customer/inventory/{productId}?contractId={contractId}",
        },
        ...(hasStockLevel ? [{ key: "stockLevel", label: "Stock level" }] : []),
        ...(hasThreshold ? [{ key: "threshold", label: "Threshold" }] : []),
        { key: "totalQuantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "lastUpdated", label: "Updated" },
      ],
      rows,
    };
  }

  // 2c) Inventory in a rented zone/warehouse (customer)
  const invZone = lastOf(["get_zone_inventory_products"]);
  if (invZone?.out && Array.isArray(invZone.out)) {
    const rows = invZone.out.map((r: any) => ({
      ...r,
      lastUpdated: formatTableCellValue(r.lastUpdated),
    }));
    return {
      contextHref: "/customer/inventory",
      contextLabel: "Open Inventory",
      columns: [
        {
          key: "productName",
          label: "Product name",
          textKey: "productName",
          hrefTemplate: "/customer/inventory/{productId}",
        },
        { key: "totalQuantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "zoneCodes", label: "Zone(s)" },
        { key: "shelfCount", label: "Shelves" },
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
      contextHref: "/customer/service-requests",
      contextLabel: "Open Service Requests",
      columns: [
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "contractCode", label: "Contract" },
        {
          key: "reference",
          label: "Reference",
          hrefTemplate: "/customer/service-requests/{requestId}",
          textKey: "reference",
        },
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
      contextHref: "/customer/rent-requests",
      contextLabel: "Open Rent Requests",
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

  // 5b) Cycle counts list (summary)
  const ccSumm = lastOf(["get_cycle_counts_summary"]);
  if (ccSumm?.out && Array.isArray(ccSumm.out)) {
    const cycleHref =
      ctx.role === "staff"
        ? "/staff/cycle-count"
        : ctx.role === "manager"
          ? "/manager/cycle-count"
          : ctx.role === "customer"
            ? "/customer/inventory-checking"
            : "/manager/cycle-count";
    return {
      contextHref: cycleHref,
      contextLabel: "Open Cycle Counts",
      columns: [
        { key: "contractCode", label: "Contract" },
        { key: "warehouse", label: "Warehouse" },
        { key: "status", label: "Status" },
        { key: "requestedAt", label: "Requested" },
        { key: "countingDeadline", label: "Deadline" },
        { key: "updatedAt", label: "Updated" },
      ],
      rows: ccSumm.out.map((r: any) => ({
        ...r,
        requestedAt: formatTableCellValue(r.requestedAt),
        countingDeadline: formatTableCellValue(r.countingDeadline),
        updatedAt: formatTableCellValue(r.updatedAt),
      })),
    };
  }

  // 5c) Warehouses list
  const wh = lastOf(["list_warehouses"]);
  if (wh?.out && typeof wh.out === "object" && wh.out && Array.isArray((wh.out as any).items)) {
    const items = (wh.out as any).items as any[];
    return {
      contextHref: "/manager/warehouses",
      contextLabel: "Open Warehouses",
      columns: [
        { key: "name", label: "Warehouse name" },
        { key: "address", label: "Address" },
        { key: "area", label: "Area" },
        { key: "status", label: "Status" },
        { key: "updated_at", label: "Updated" },
      ],
      rows: items.map((w: any) => ({
        ...w,
        updated_at: formatTableCellValue(w.updated_at),
      })),
    };
  }

  // 5d) Users list (admin)
  const users = lastOf(["list_users_summary"]);
  if (users?.out && Array.isArray(users.out)) {
    return {
      contextHref: "/admin/users",
      contextLabel: "Open Users",
      columns: [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "isActive", label: "Active" },
        { key: "createdAt", label: "Created" },
      ],
      rows: users.out.map((u: any) => ({
        ...u,
        createdAt: formatTableCellValue(u.createdAt),
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
      contextHref:
        ctx.role === "staff"
          ? "/staff/notifications"
          : ctx.role === "customer"
            ? "/customer/dashboard"
            : ctx.role === "manager"
              ? "/manager/dashboard"
              : "/admin/dashboard",
      contextLabel: "Open Notifications",
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

type FollowUpIntent =
  | "list"
  | "detail"
  | "status"
  | "report"
  | "help"
  | "unknown";

type FollowUpLanguage = "vi" | "en";

function detectLanguage(text: string, fallback: FollowUpLanguage = "vi"): FollowUpLanguage {
  const t = (text || "").trim();
  if (!t) return fallback;

  const hasVietnameseDiacritics =
    /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(
      t
    );
  if (hasVietnameseDiacritics) return "vi";

  const viHits = (t.match(/\b(mình|bạn|vui lòng|hợp đồng|tồn kho|yêu cầu|báo cáo|thông báo)\b/gi) || [])
    .length;
  const enHits = (t.match(/\b(you|your|please|contract|inventory|request|report|notification|would|can)\b/gi) || [])
    .length;

  if (viHits === 0 && enHits === 0) return fallback;
  return viHits >= enHits ? "vi" : "en";
}

/**
 * Language for the closing follow-up question must match the assistant reply above,
 * not the user's query language (user may ask in Vietnamese while the model answers in English).
 */
function detectFollowUpLanguage(reply: string, userQuery: string): FollowUpLanguage {
  const r = (reply || "").trim();
  const u = (userQuery || "").trim();
  if (!r) return detectLanguage(u, "vi");

  if (/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(r)) {
    return "vi";
  }

  const viHits =
    (r.match(
      /\b(mình|bạn|vui lòng|hợp đồng|tồn kho|yêu cầu|báo cáo|thông báo|của|để|không|được|đã|trong|với|hoặc|nếu|khi|liệt kê|danh sách|tóm|chi tiết|quản lý|kho|hàng|một|các|từ|theo|vẫn|còn|đang)\b/gi
    ) || []).length;
  const enHits =
    (r.match(
      /\b(you|your|please|contract|inventory|request|report|notification|would|can|could|should|may|might|the|here|this|that|these|those|summary|details|open|click|list|show|active|pending|below|above|status|table|items|rows|have|has|had|are|was|were|is|not|for|with|from|will|let|see|check|want|need|total|page|filter|there|what|which|when|where|how|about|more|help|any|available|successful|approved|rejected|completed|pending|also|just|note|link|below|above|overview|dashboard|warehouse|storage)\b/gi
    ) || []).length;

  if (viHits > enHits) return "vi";
  if (enHits > viHits) return "en";

  if (/\b(the|a|an|is|are|was|were|have|has|had|this|that|your|here|there|please|can|could|would|will|don't|doesn't|didn't)\b/i.test(r)) {
    return "en";
  }
  if (/\b(cua|khong|duoc|tai|va|hoac|cho|hay|tat ca|yeu cau|hop dong|danh sach|liet ke|chinh|xem|link|duong|bao cao|ton kho)\b/i.test(r)) {
    return "vi";
  }

  return detectLanguage(u, "vi");
}

function inferFollowUpIntent(
  userQuery: string,
  toolOutputs: Array<{ name: string; out: unknown }>
): FollowUpIntent {
  const q = (userQuery || "").toLowerCase();
  const toolNames = toolOutputs.map((t) => t.name);

  const looksLikeList =
    /\b(list|show|all|summary|overview)\b/.test(q) ||
    /liệt kê|danh sách|tổng hợp|bao nhiêu/.test(q) ||
    toolNames.some((n) =>
      [
        "get_contracts_summary",
        "get_inventory_products_summary",
        "get_service_requests_summary",
        "get_rent_requests_summary",
        "get_cycle_counts_summary",
        "list_users_summary",
        "list_warehouses",
        "list_my_notifications",
      ].includes(n)
    );

  const looksLikeStatus =
    /\b(status|state|pending|approved|rejected|completed|active|expired)\b/.test(q) ||
    /trạng thái|đang|chờ|hoàn thành|đã duyệt|từ chối/.test(q);

  const looksLikeReport =
    /\b(report|chart|trend|anomal|insight|metric|granularity)\b/.test(q) ||
    /báo cáo|biểu đồ|xu hướng|insight|thống kê/.test(q) ||
    toolNames.includes("get_manager_report_summary");

  const looksLikeHelp =
    /\b(how|where|what|guide|steps)\b/.test(q) ||
    /cách|ở đâu|hướng dẫn|làm sao/.test(q);

  if (looksLikeReport) return "report";
  if (looksLikeList) return "list";
  if (
    toolNames.some((n) =>
      ["get_contract_by_id", "get_contract_by_code", "get_storage_request_by_id", "get_cycle_count_by_id"].includes(n)
    )
  ) {
    return "detail";
  }
  if (looksLikeStatus) return "status";
  if (looksLikeHelp) return "help";
  return "unknown";
}

function stablePick<T>(items: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[h % items.length];
}

function generateFollowUp(
  intent: FollowUpIntent,
  language: FollowUpLanguage,
  context: { userQuery: string; toolNames: string[] }
): string {
  const seed = `${intent}::${language}::${context.userQuery}::${context.toolNames.join(",")}`;

  const vi: Record<FollowUpIntent, string[]> = {
    list: [
      "Bạn muốn xem chi tiết mục nào không?",
      "Bạn muốn mình thu hẹp theo trạng thái hoặc mốc thời gian nào không?",
      "Bạn muốn lọc lại theo tiêu chí nào (ví dụ trạng thái hoặc mã) không?",
    ],
    status: [
      "Bạn có muốn mình phân tích sâu hơn theo trạng thái hoặc timeline không?",
      "Bạn muốn mình làm rõ nguyên nhân/điểm nghẽn (nếu có) không?",
    ],
    detail: [
      "Bạn muốn kiểm tra thêm dữ liệu liên quan (tồn kho, yêu cầu dịch vụ, hoặc thông báo) không?",
      "Bạn muốn mình đối chiếu thêm thông tin liên quan để bạn dễ theo dõi không?",
    ],
    report: [
      "Bạn có muốn mình rút ra insight ngắn gọn và gợi ý bước tiếp theo không?",
      "Bạn muốn mình tập trung vào xu hướng, bất thường hay khuyến nghị vận hành?",
    ],
    help: [
      "Bạn muốn mình hướng dẫn theo luồng nào trước, và bạn đang ở role nào?",
      "Bạn muốn mình chỉ đúng menu/path trên UI để thao tác nhanh không?",
    ],
    unknown: [
      "Bạn muốn mình hỗ trợ thêm theo hướng nào?",
      "Bạn muốn xem chi tiết hay tóm tắt theo một tiêu chí cụ thể?",
    ],
  };

  const en: Record<FollowUpIntent, string[]> = {
    list: [
      "Would you like to view details for any item?",
      "Do you want me to narrow this down by status or time range?",
      "Would you like a filtered view (e.g., by status or code)?",
    ],
    status: [
      "Would you like a deeper breakdown by status or timeline?",
      "Do you want me to highlight potential blockers or anomalies?",
    ],
    detail: [
      "Would you like to check related data (inventory, service requests, or notifications)?",
      "Do you want me to cross-check anything else related to this item?",
    ],
    report: [
      "Would you like a short insight and next-step recommendations?",
      "Should I focus on trends, anomalies, or operational recommendations?",
    ],
    help: [
      "Which flow should we walk through first, and what role are you using?",
      "Do you want the exact UI navigation steps for this task?",
    ],
    unknown: [
      "How would you like me to help next?",
      "Do you want a detailed view or a quick summary with a specific filter?",
    ],
  };

  const bank = language === "vi" ? vi[intent] : en[intent];
  return stablePick(bank, seed);
}

function ensureDynamicFollowUp(
  reply: string,
  userQuery: string,
  toolOutputs: Array<{ name: string; out: unknown }>
): string {
  const normalized = (reply || "").trim();
  if (!normalized) return normalized;
  if (/[?？]\s*$/.test(normalized)) return normalized;

  const language = detectFollowUpLanguage(normalized, userQuery || "");
  const intent = inferFollowUpIntent(userQuery, toolOutputs);
  const toolNames = toolOutputs.map((t) => t.name);
  const followUp = generateFollowUp(intent, language, { userQuery, toolNames });
  return `${normalized}\n\n${followUp}`;
}

function sanitizeReplyWhenTableExists(reply: string): string {
  if (!reply) return reply;
  const lines = reply.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    // Stop when model starts listing rows in bullets/numbering.
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) break;
    out.push(line);
  }
  const cleaned = out.join("\n").trim();
  return cleaned || reply.trim();
}

function shouldAttachTable(
  table: ChatTableSpec | undefined,
  toolOutputs: Array<{ name: string; out: unknown }>,
  userText: string
): boolean {
  if (!table) return false;
  const names = toolOutputs.map((t) => t.name);
  // Unread count is better as plain text, not a one-cell table.
  if (names.includes("get_unread_notification_count")) return false;
  if (table.rows.length === 0) return false;

  const q = (userText || "").toLowerCase();
  const listIntent =
    /liệt kê|danh sách|list|show|hiển thị|toàn bộ|tất cả|all|bao nhiêu hợp đồng|các hợp đồng|các sản phẩm|các yêu cầu/.test(
      q
    );
  const singleAnswerIntent =
    /nhiều nhất|ít nhất|lớn nhất|nhỏ nhất|max|min|top\s*1|cao nhất|thấp nhất|đầu tiên|gần nhất|mới nhất|cũ nhất|so sánh|best|worst/.test(
      q
    );

  // Prefer concise natural text for "single best/worst/top-1" style questions.
  if (singleAnswerIntent && !listIntent) return false;
  return table.rows.length > 0;
}

const functionDeclarations = [
  {
    name: "get_contracts_summary",
    description:
      "Get a summary of contracts visible to this user (customer: own contracts; manager: all). Use for questions about how many contracts, contract list, status, payment pending, rental period. Each item includes contractId for building detail links.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Optional status filter (e.g., active, pending_payment, expired)",
        },
        contractCode: {
          type: SchemaType.STRING,
          description: "Optional contract code filter (substring match, case-insensitive)",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of contracts to return (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_expiring_contracts_summary",
    description:
      "List customer contracts expiring soon (default: within 30 days), ordered by nearest expiry date first. Supports filtering by warehouse name, exact expiry date, and expiry month.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        withinDays: {
          type: SchemaType.NUMBER,
          description: "Days ahead from today to include (default 30, max 365)",
        },
        warehouseName: {
          type: SchemaType.STRING,
          description: "Optional warehouse name filter (substring match, case-insensitive)",
        },
        expiryDate: {
          type: SchemaType.STRING,
          description: "Optional exact expiry date filter (YYYY-MM-DD)",
        },
        expiryMonth: {
          type: SchemaType.STRING,
          description: "Optional expiry month filter (YYYY-MM or MM/YYYY)",
        },
        status: {
          type: SchemaType.STRING,
          description: "Optional status filter (default: active)",
        },
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
      "Get customer's inventory products grouped by SKU (totals per product). Only for customers. Use for stock, SKU, quantity questions. Optionally filter by sku.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sku: {
          type: SchemaType.STRING,
          description: "Optional SKU filter (substring match, case-insensitive)",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max products (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_low_stock_products_summary",
    description:
      "List customer's low-stock products (nearly out of stock). Returns products with totalQuantity <= threshold (default 10), sorted by lowest quantity first.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        threshold: {
          type: SchemaType.NUMBER,
          description: "Low-stock threshold, include quantity <= threshold (default 10)",
        },
        sku: {
          type: SchemaType.STRING,
          description: "Optional SKU filter (substring match, case-insensitive)",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max products (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_high_stock_products_summary",
    description:
      "List customer's high-stock products (products with plenty of stock). Returns products with totalQuantity >= threshold (default 100), sorted by highest quantity first.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        threshold: {
          type: SchemaType.NUMBER,
          description: "High-stock threshold, include quantity >= threshold (default 100)",
        },
        sku: {
          type: SchemaType.STRING,
          description: "Optional SKU filter (substring match, case-insensitive)",
        },
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
    name: "get_contract_by_code",
    description:
      "Get full details of a specific contract by contractCode (e.g., CT-XXXX). Prefer this when user provides a contract code.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        contractCode: {
          type: SchemaType.STRING,
          description: "Contract code (e.g., CT-ABC-123). Case-insensitive.",
        },
      },
      required: ["contractCode"],
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
    name: "get_zone_inventory_products",
    description:
      "List products currently stored inside a rented zone or a rented warehouse scope for the authenticated customer. Provide zoneCode (recommended) or warehouseId. Optionally provide contractCode to scope to one contract.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        zoneCode: {
          type: SchemaType.STRING,
          description: "Zone code (e.g., ZONE-A). Case-insensitive.",
        },
        warehouseId: {
          type: SchemaType.STRING,
          description: "Warehouse id (Mongo ObjectId string). Optional alternative to zoneCode.",
        },
        contractCode: {
          type: SchemaType.STRING,
          description: "Optional contract code to scope zones to one contract (e.g., CT-XXXX).",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows (default 12, max 25)",
        },
      },
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
        status: {
          type: SchemaType.STRING,
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
    name: "get_cycle_counts_summary",
    description:
      "List cycle counts visible to this user. Staff: only assigned cycle counts; customer: only their own; manager/admin: all. Use for 'my cycle counts', 'inventory checking tasks', 'cycle count status'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, description: "Optional status filter" },
        contractCode: {
          type: SchemaType.STRING,
          description: "Optional contract code filter (substring match, case-insensitive)",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows (default 12, max 25)",
        },
      },
    },
  },
  {
    name: "get_cycle_count_by_id",
    description:
      "Get full detail of a single cycle count by id. Staff can only view assigned cycle counts. Use for 'show cycle count detail' or discrepancy review.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        cycleCountId: {
          type: SchemaType.STRING,
          description: "Cycle count id (Mongo ObjectId string)",
        },
      },
      required: ["cycleCountId"],
    },
  },
  {
    name: "list_warehouses",
    description:
      "List warehouses with optional search/status filter. Intended for manager/admin/staff to quickly locate warehouses in chat.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: { type: SchemaType.STRING, description: "Search by name/address (optional)" },
        status: { type: SchemaType.STRING, enum: ["ACTIVE", "INACTIVE"], description: "Filter by status (optional)" },
        page: { type: SchemaType.NUMBER, description: "Page number (default 1)" },
        limit: { type: SchemaType.NUMBER, description: "Rows per page (default 12, max 25)" },
      },
    },
  },
  {
    name: "get_manager_report_summary",
    description:
      "Get operational report data for manager/admin. Requires startDate/endDate and optional granularity (day|week). Use when user asks about manager reports, trend, anomalies, expiring contracts.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        endDate: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
        granularity: { type: SchemaType.STRING, enum: ["day", "week"], description: "day (default) or week" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "list_users_summary",
    description:
      "Admin-only: list users (manager/staff/customer) for quick overview in chat.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        role: { type: SchemaType.STRING, enum: ["manager", "staff", "customer"], description: "Optional role filter" },
        email: { type: SchemaType.STRING, description: "Optional email filter (substring match)" },
        activeOnly: { type: SchemaType.BOOLEAN, description: "If true, only return active users" },
        limit: { type: SchemaType.NUMBER, description: "Max rows (default 12, max 25)" },
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

  const aiSettings = await getAiRuntimeSettings();
  if (!aiSettings.enabled) {
    throw new Error("AI is currently disabled by admin settings.");
  }

  const modelName = aiSettings.chatModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(ctx),
    tools: [{ functionDeclarations: functionDeclarations as any }],
    generationConfig: {
      temperature: aiSettings.temperature,
      maxOutputTokens: aiSettings.maxOutputTokens,
    },
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
      const table = buildChatTableSpec(toolOutputs, ctx);
      const attachTable = shouldAttachTable(table, toolOutputs, lastUser.content);
      const baseReply = attachTable
        ? sanitizeReplyWhenTableExists(text || "")
        : text || "I could not generate a reply.";
      const reply = ensureDynamicFollowUp(baseReply, lastUser.content, toolOutputs);
      return { reply, model: modelName, table: attachTable ? table : undefined };
    }

    const toolResults = await Promise.all(
      calls.map(async (call) => {
        const out = await runTool(call.name, (call.args as Record<string, unknown>) || {}, ctx).catch(
          (e) => toToolErrorPayload(call.name, e)
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

  const table = buildChatTableSpec(toolOutputs, ctx);
  const attachTable = shouldAttachTable(table, toolOutputs, lastUser.content);
  const natural = safeText() || "Sorry, the response was cut off. Please try a shorter question.";
  const baseReply = attachTable ? sanitizeReplyWhenTableExists(natural) : natural;

  return {
    reply: ensureDynamicFollowUp(baseReply, lastUser.content, toolOutputs),
    model: modelName,
    table: attachTable ? table : undefined,
  };
}
