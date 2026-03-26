# SIMS-AI — Chatbot Knowledge Base (English, AI-ready)

This document is the **production knowledge base** for the SIMS-AI support chatbot.
SIMS-AI is a Smart Warehouse & Storage Management System with 4 roles: **Customer**, **Manager**, **Staff**, **Admin**.

---

## 1) System overview (end-to-end)

### Goals by role
- **Customer**: rent warehouse space, manage contracts, create inbound/outbound service requests, track inventory, view reports & history.
- **Manager**: approve rent requests/contracts, orchestrate operations (inbound/outbound), monitor inventory, manage warehouses/zones/shelves, view operational reports.
- **Staff**: execute assigned operational work (inbound putaway, outbound picking, cycle count), update statuses, report issues.
- **Admin**: manage the system (users, overview, logs, reports, configurations).

### Quick glossary
- **Rent request**: a request submitted by Customer to rent warehouse space (warehouse/zones, period).
- **Contract**: rental agreement; may require payment to become active.
- **Service request**: operational request for inbound (store goods) or outbound (release goods).
- **Inventory / stored items**: product/SKU quantities currently stored in the warehouse.
- **Cycle count**: inventory counting process to reconcile system vs physical quantities.
- **Notifications**: event-driven messages for operational updates.

---

## 2) Chatbot support rules

### Response principles
- Prefer **accurate UI guidance** (menu path + correct page route).
- Keep answers concise and action-oriented.
- When a user asks about **their own data** (contracts, inventory, requests, notifications), the assistant **MUST call tools** (do not invent IDs, statuses, or quantities).
- If the tools return empty results: clearly state **“no matching data found”** and suggest what filters/statuses/time-range to check next.

### Chat access control (in-chat)
- Contract & inventory tools are **Customer-only** in chat.
- If a **non-customer** asks for customer contract/inventory data, refuse politely and direct them to the correct **Manager/Staff UI pages**.

---

## 3) Customer — features & operational flows

### Main menu/pages
- Dashboard: `/customer/dashboard`
- Warehouse services: `/customer/warehouse-services`
- Rent requests: `/customer/rent-requests`
- Contracts list: `/customer/contracts`
- Contract detail: `/customer/contracts/[id]`
- Checkout/Pay (VNPay): `/customer/contracts/[id]/checkout`
- Inventory list: `/customer/inventory`
- Inventory detail: `/customer/inventory/[productId]`
- Service requests list: `/customer/service-requests`
- Service request detail: `/customer/service-requests/[id]`
- Inventory checking / cycle count: `/customer/inventory-checking`, `/customer/cycle-count/[id]`
- History: `/customer/history`
- Reports: `/customer/reports`
- Settings: `/customer/settings`

### Flow 1 — Rent warehouse (Rent request → Contract → Payment → Active)
1. Go to **Customer → Rent Requests** (`/customer/rent-requests`).
2. Create a rent request: choose warehouse/zones, rental period, required details.
3. Submit the request → wait for **Manager** approval.
4. After approval, a **Contract** may be created/updated and can become `pending_payment`.
5. Go to **Customer → Contracts** → open the target contract.
6. Click **Pay/Checkout** → VNPay checkout (`/customer/contracts/[id]/checkout`).
7. After successful payment → contract becomes `active`.

Notes:
- If a contract is `pending_payment`, avoid creating multiple payment attempts in parallel.

### Flow 2 — Manage contracts
1. Go to **Customer → Contracts** (`/customer/contracts`).
2. View list + statuses (commonly `draft`, `pending_payment`, `active`, `expired`, `terminated`).
3. Open contract detail for full information and next actions (payment, details, history).

### Flow 3 — Service requests (Inbound/Outbound)
1. Go to **Customer → Service Requests** (`/customer/service-requests`).
2. Create:
   - **Inbound**: store items into the warehouse
   - **Outbound**: release items from the warehouse
3. Track the status lifecycle (typical): `PENDING → APPROVED → IN_PROGRESS/ASSIGNED → DONE_BY_STAFF → (CUSTOMER_CONFIRM?) → COMPLETED`.
4. Open request detail for items, status and timeline.

### Flow 4 — Inventory & product detail
1. Go to **Customer → Inventory** (`/customer/inventory`).
2. See product/SKU list currently stored.
3. Open **Product detail** (`/customer/inventory/[productId]`) for:
   - shelf distribution
   - import/export history (if available on UI)

### Flow 5 — Inventory checking (cycle count)
1. Go to **Customer → Inventory checking** (`/customer/inventory-checking`) or open a cycle count (`/customer/cycle-count/[id]`).
2. Review the cycle count results, discrepancies, and processing status.

### Flow 6 — History, reports, notifications, settings
- **History** (`/customer/history`): operational/log history for the account.
- **Reports** (`/customer/reports`): charts and optional **AI Insight** per diagram.
- **Notifications**: view role-specific notifications if the UI provides it.
- **Settings** (`/customer/settings`): update profile/avatar, change password.

---

## 4) Manager — features & operational flows

### Main menu/pages
- Dashboard: `/manager/dashboard`
- Rent requests: `/manager/rent-requests`
- Contracts: `/manager/contracts`
- Contract packages: `/manager/packages`
- Service requests: `/manager/service-requests`
- Inbound assignment: `/manager/inbound-requests`
- Outbound assignment: `/manager/outbound-requests`
- Inventory: `/manager/inventory`
- Cycle count: `/manager/cycle-count`
- Warehouses: `/manager/warehouses`, detail `/manager/warehouses/[id]`
- Reports: `/manager/reports`
- Payments: `/manager/payments`
- Tasks: `/manager/tasks`
- Settings: `/manager/settings`

### Flow 1 — Approve rent request & activate contract
1. Go to **Manager → Rent Requests** (`/manager/rent-requests`).
2. Approve/Reject requests.
3. After approval, a contract is created/updated so the customer can pay/activate.
4. Monitor in **Manager → Contracts** (`/manager/contracts`).

### Flow 2 — Orchestrate service requests (Inbound/Outbound)
1. Review requests in **Manager → Service Requests** (`/manager/service-requests`).
2. Approve and assign:
   - Inbound assignment: **Manager → Inbound Requests** (`/manager/inbound-requests`)
   - Outbound assignment: **Manager → Outbound Requests** (`/manager/outbound-requests`)
3. Assign tasks to staff.
4. Track progress in **Manager → Tasks** (`/manager/tasks`) and request status.

### Flow 3 — Warehouses/zones/shelves & inventory oversight
1. **Warehouses** (`/manager/warehouses`): manage warehouses and view details.
2. **Inventory** (`/manager/inventory`): monitor inventory level by product/SKU.
3. **Cycle count** (`/manager/cycle-count`): oversee counts and discrepancy handling.

### Flow 4 — Reports & payments monitoring
- **Reports** (`/manager/reports`): operational reports (trend + anomalies).
- **Payments** (`/manager/payments`): monitor payment/contract statuses.

---

## 5) Staff — features & operational flows

### Main menu/pages
- Dashboard: `/staff/dashboard`
- Tasks: `/staff/tasks`, detail `/staff/tasks/[id]`
- Inbound putaway: `/staff/inbound-requests`, detail `/staff/inbound-requests/[id]`
- Outbound picking: `/staff/outbound-requests`, detail `/staff/outbound-requests/[id]`
- Cycle count: `/staff/cycle-count`, detail `/staff/cycle-count/[id]`
- Scanner: `/staff/scanner`
- Inventory movement: `/staff/inventory`
- Report issue: `/staff/report-issue`
- Notifications: `/staff/notifications`
- Reports: `/staff/reports`
- Settings: `/staff/settings`
- History: `/staff/history`

### Flow 1 — Execute inbound tasks
1. Open **Staff → Inbound Requests** (`/staff/inbound-requests`) or **Tasks** (`/staff/tasks`).
2. Open assigned request/task detail.
3. Perform putaway steps (zone/shelf guidance if provided).
4. Update status to complete according to UI.

### Flow 2 — Execute outbound tasks
1. Open **Staff → Outbound Requests** (`/staff/outbound-requests`) or **Tasks**.
2. Open detail → pick items as specified.
3. Update status and confirm completion.

### Flow 3 — Cycle count execution
1. Open **Staff → Cycle Count** (`/staff/cycle-count`).
2. Open cycle count detail.
3. Submit counted quantities for review/approval per workflow.

### Flow 4 — Scanner & issue reporting
- **Scanner** (`/staff/scanner`): fast operational actions using barcode/QR.
- **Report issue** (`/staff/report-issue`): report operational incidents/discrepancies.

---

## 6) Admin — features & operational flows

### Main menu/pages
- Dashboard: `/admin/dashboard`
- Users: `/admin/users`
- Reports: `/admin/reports`
- Settings (Profile + Chatbot FAQs): `/admin/settings`

### Flow 1 — User administration
1. Go to **Admin → Users** (`/admin/users`).
2. Review users, active/locked status (depending on UI).
3. Manage users (create/update role/lock/unlock) based on the available UI/API.

### Flow 2 — System monitoring & reporting
- **Dashboard** (`/admin/dashboard`): system overview.
- **Reports** (`/admin/reports`): system-level reporting.

### Flow 3 — Configure chatbot FAQs by role
1. Go to **Admin → Settings** (`/admin/settings`).
2. Open **Chatbot FAQs**.
3. Choose role (**Customer / Manager / Staff / Admin**) and edit label/prompt.
4. Click **Save FAQs**.
5. Users in that role will see updated FAQ chips in the chatbot widget.

---

## 7) Suggested FAQ prompts (guidance)
- Customer: "List my contracts", "Check inventory by SKU", "Service request status", "Contracts expiring soon".
- Manager: "Pending requests", "Top outbound", "Low inventory items", "Cycle count anomalies".
- Staff: "My tasks today", "Inbound/outbound backlog", "How to report an issue".
- Admin: "Manage users", "View logs", "Configure chatbot FAQs by role".

---

## 8) Data schema (core entities)

These schemas define the **canonical shape** of business data the assistant may reference.
When answering questions that require real values, the assistant must use tools and map results into these shapes.

### Contract
- `id` (string): contract identifier
- `contractCode` (string): human-readable code (if available)
- `customerId` (string)
- `warehouseId` (string)
- `status` (string): e.g. `draft | pending_payment | active | expired | terminated`
- `startDate` (string, ISO date)
- `endDate` (string, ISO date)
- `createdAt` (string, ISO datetime)
- `updatedAt` (string, ISO datetime)

### Inventory (Stored Item / Product)
- `productId` (string)
- `sku` (string)
- `productName` (string)
- `quantity` (number)
- `unit` (string, optional)
- `warehouseId` (string, optional)
- `contractId` (string, optional)
- `createdAt` (string, ISO datetime, optional)
- `updatedAt` (string, ISO datetime, optional)

### Service Request (Inbound/Outbound)
- `id` (string)
- `requestType` (string): `IN | OUT`
- `status` (string): e.g. `PENDING | APPROVED | IN_PROGRESS | DONE_BY_STAFF | COMPLETED | REJECTED`
- `items` (array):
  - `productId` (string, optional)
  - `sku` (string)
  - `itemName` (string)
  - `quantityRequested` (number)
  - `quantityActual` (number, optional)
- `createdAt` (string, ISO datetime)
- `updatedAt` (string, ISO datetime)

---

## 9) Chart / report context

When explaining charts, the assistant must identify:
- axes (`x-axis`, `y-axis`)
- metrics
- time granularity
- units (if known)

### Inbound/Outbound trend (typical)
- **x-axis**: time bucket (daily / weekly / monthly)
- **y-axis**: quantity
- **metrics**:
  - `inbound_quantity`: total inbound quantity in the bucket
  - `outbound_quantity`: total outbound quantity in the bucket
- **granularity**:
  - daily: `DD-MM-YYYY`
  - monthly: `MM-YYYY`

### Inventory level vs turnover (typical)
- **x-axis**: product/SKU
- **y-axis**: quantity or turnover rate
- **metrics**:
  - `stock_quantity`
  - `turnover` (ratio, e.g. (in+out)/avg_stock)

### Discrepancy (cycle count)
- **x-axis**: cycle count id or time bucket
- **y-axis**: quantity difference
- **metrics**:
  - `system_quantity`
  - `counted_quantity`
  - `discrepancy = abs(counted - system)`

---

## 10) AI insight output format (standard)

When producing insights (e.g., report analysis), use this exact structure:

1) **Summary**: 1–2 sentences  
2) **Key findings**: 2–4 bullet points  
3) **Recommendation** (optional): 1–2 bullets

Rules:
- **Do not hallucinate** numbers or entities.
- If data is missing or insufficient, explicitly say: **"Insufficient data to conclude."**
- If user asks for exact values, prefer tool output or state you cannot confirm without data.

---

## 11) Intent layer (structured intents + examples)

These intents help route user requests to the correct tool/UI guidance.

### `list_contracts`
Examples:
- "List my contracts"
- "Show my current contracts and statuses"

Expected behavior:
- Customer: call contract tools and return a concise summary + (optional) table.
- Others: direct to Manager UI.

### `check_inventory`
Examples:
- "How many products do I have in inventory?"
- "List inventory by SKU"

Expected behavior:
- Customer: call inventory tools and return table.
- Others: direct to correct UI.

### `check_service_status`
Examples:
- "What is the status of my service request?"
- "Show my inbound/outbound requests"

Expected behavior:
- Call service request tools if available; otherwise guide to `/customer/service-requests`.

### `explain_chart`
Examples:
- "Explain this inbound/outbound chart"
- "What does turnover mean here?"

Expected behavior:
- Use chart/report context (axes/metrics/granularity) and the standard insight format.

---

## 12) Error handling playbook (explicit responses)

### No data
Use when tool output is empty.
- "No matching data found for your account in the selected time range/status."
- Suggest next steps: adjust filters, confirm contract is active, verify request exists.

### Unauthorized access
Use when role is not allowed to access data/tools.
- "I can’t access that data for your role in chat."
- Provide UI path: e.g. "Please open **Manager → Contracts**" or "Staff → Tasks".

### Invalid state (e.g. no active contract)
Use when the workflow requires a state that does not exist.
- "You don’t currently have an active contract, so inventory/service actions may be unavailable."
- Next steps: "Submit a rent request" or "Complete pending payment" depending on context.
