# SIMS-AI — Knowledge for support chatbot (English)

## What is SIMS-AI?
SIMS-AI is a Smart Warehouse & Storage Management System. Roles: **Customer**, **Manager**, **Staff**, **Admin**.

## Customer — main flows
1. **Rent warehouse space**: Customer → **Rent Requests** → select warehouse, zones, period → submit → Manager approves → contract may become **pending_payment** → Customer **Pay** via **VNPay** on checkout → contract becomes **active**.
2. **Contracts**: List contracts, view detail. Statuses include `draft`, `pending_payment`, `active`, `expired`, `terminated`.
3. **Payments**: If status is **pending_payment**, use **Pay** to open VNPay. Only one **pending** payment session per contract at a time; complete or wait for expiry before starting again.
4. **Service requests (Inbound/Outbound)**: Create from **Service Requests**; track status (Pending → Approved → In progress / Done by staff → Customer may **confirm completed** → Completed).
5. **Inventory**: Product-level overview; **View details** per SKU shows shelf distribution and import/export history.
6. **Cycle count**: Separate flow from inbound/outbound; use **View details** for a specific cycle count.
7. **Profile / Settings**: Update name, phone, company, avatar; change password.

## Manager — main flows
- Approve rent requests, manage contracts, assign inbound/outbound tasks to staff, warehouses & zones, reports, payments monitoring.

## Staff — main flows
- Tasks assigned by manager: inbound putaway, outbound picking, complete operations on assigned requests.

## Admin
- User management, system overview.

## URLs (typical)
- Customer dashboard: `/customer/dashboard`
- Contracts: `/customer/contracts`
- Checkout: `/customer/contracts/[id]/checkout`
- Service requests: `/customer/service-requests`
- Inventory: `/customer/inventory`

## Support rules for the assistant
- Prefer **factual** answers; when the user asks for **their** data (contracts, inventory, requests), use the provided tools — do not invent IDs or statuses.
- If tools return empty, say clearly that nothing was found for their account.
- Keep answers concise; offer next steps (which menu or page) when helpful.
