import { Types } from "mongoose";
import StaffWarehouse from "../models/StaffWarehouse";
import User from "../models/User";
import Warehouse from "../models/Warehouse";

export async function getAllowedStaffIdsForWarehouse(
  warehouseId: string,
  staffIds: string[]
): Promise<Set<string>> {
  if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouse id");
  if (!staffIds || staffIds.length === 0) return new Set<string>();

  const objectIds = staffIds.map((id) => {
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid staff id: " + id);
    return new Types.ObjectId(id);
  });

  const docs = await StaffWarehouse.find({
    warehouseId: new Types.ObjectId(warehouseId),
    staffId: { $in: objectIds },
  })
    .select("staffId")
    .lean();

  return new Set(docs.map((d: any) => d.staffId.toString()));
}

export async function listActiveStaffWithWarehouse(params: {
  search?: string;
  warehouseId?: string;
}): Promise<
  Array<{
    user_id: string;
    name: string;
    email: string;
    warehouse_id: string | null;
    warehouse_name: string | null;
  }>
> {
  const search = (params.search ?? "").trim();
  const warehouseId = (params.warehouseId ?? "").trim();

  const userQuery: any = { role: "staff", isActive: true };
  if (search) {
    userQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const staffs = await User.find(userQuery).select("_id name email").sort({ name: 1 }).lean();
  if (staffs.length === 0) return [];

  const staffIds = staffs.map((s: any) => s._id);
  const mappings = await StaffWarehouse.find({ staffId: { $in: staffIds } }).select("staffId warehouseId").lean();
  const mappingByStaff = new Map<string, string>();
  const warehouseIds = new Set<string>();
  for (const m of mappings as any[]) {
    const sid = m.staffId.toString();
    const wid = m.warehouseId?.toString();
    if (!wid) continue;
    mappingByStaff.set(sid, wid);
    warehouseIds.add(wid);
  }

  const warehouses = warehouseIds.size
    ? await Warehouse.find({ _id: { $in: Array.from(warehouseIds).map((id) => new Types.ObjectId(id)) } })
        .select("_id name")
        .lean()
    : [];
  const warehouseNameById = new Map<string, string>();
  for (const w of warehouses as any[]) {
    warehouseNameById.set(w._id.toString(), w.name);
  }

  const rows = staffs.map((s: any) => {
    const wid = mappingByStaff.get(s._id.toString()) ?? null;
    return {
      user_id: s._id.toString(),
      name: s.name,
      email: s.email,
      warehouse_id: wid,
      warehouse_name: wid ? warehouseNameById.get(wid) ?? null : null,
    };
  });

  if (warehouseId) {
    if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouse id");
    return rows.filter((r) => r.warehouse_id === warehouseId);
  }

  return rows;
}

export async function transferStaffWarehouse(
  staffId: string,
  warehouseId: string
): Promise<{ user_id: string; warehouse_id: string; warehouse_name: string }> {
  if (!Types.ObjectId.isValid(staffId)) throw new Error("Invalid staff id");
  if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouse id");

  const staff = await User.findOne({ _id: new Types.ObjectId(staffId), role: "staff", isActive: true }).select("_id");
  if (!staff) throw new Error("Staff not found or inactive");

  const warehouse = await Warehouse.findById(warehouseId).select("_id name");
  if (!warehouse) throw new Error("Warehouse not found");

  // IMPORTANT:
  // A staff can belong to only one warehouse. We must delete existing mappings for this staff
  // first to avoid violating unique indexes in existing DB data.
  await StaffWarehouse.deleteMany({ staffId: new Types.ObjectId(staffId) });
  await StaffWarehouse.create({
    staffId: new Types.ObjectId(staffId),
    warehouseId: new Types.ObjectId(warehouseId),
  });

  return {
    user_id: staffId,
    warehouse_id: warehouseId,
    warehouse_name: (warehouse as any).name,
  };
}

