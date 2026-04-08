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
  let mappings: any[] = [];
  if (warehouseId) {
    if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouse id");
    mappings = await StaffWarehouse.find({
      warehouseId: new Types.ObjectId(warehouseId),
      staffId: { $in: staffIds },
    })
      .select("staffId warehouseId")
      .lean();
  } else {
    mappings = await StaffWarehouse.find({ staffId: { $in: staffIds } }).select("staffId warehouseId").lean();
  }

  const mappedStaffIds = new Set<string>();
  const warehouseIds = new Set<string>();
  for (const m of mappings) {
    const sid = m.staffId.toString();
    const wid = m.warehouseId?.toString();
    if (!wid) continue;
    mappedStaffIds.add(sid);
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

  const rows = staffs
    .filter((s: any) => (!warehouseId ? true : mappedStaffIds.has(s._id.toString())))
    .map((s: any) => {
    const wid = warehouseId || null;
    return {
      user_id: s._id.toString(),
      name: s.name,
      email: s.email,
      warehouse_id: wid,
      warehouse_name: wid ? warehouseNameById.get(wid) ?? null : null,
    };
  });

  return rows;
}

export async function listWarehousesWithAssignedStaff(params: {
  search?: string;
}): Promise<
  Array<{
    warehouse_id: string;
    warehouse_name: string;
    staff_id: string | null;
    staff_name: string | null;
    staff_email: string | null;
  }>
> {
  const search = (params.search ?? "").trim();
  const warehouseQuery: any = {};
  if (search) {
    warehouseQuery.name = { $regex: search, $options: "i" };
  }

  const warehouses = await Warehouse.find(warehouseQuery)
    .select("_id name")
    .sort({ name: 1 })
    .lean();
  if (warehouses.length === 0) return [];

  const warehouseIds = warehouses.map((w: any) => w._id);
  const mappings = await StaffWarehouse.find({ warehouseId: { $in: warehouseIds } })
    .select("warehouseId staffId")
    .lean();

  const staffIds = Array.from(new Set(mappings.map((m: any) => m.staffId?.toString()).filter(Boolean)));
  const staffs = staffIds.length
    ? await User.find({ _id: { $in: staffIds.map((id) => new Types.ObjectId(id)) } })
        .select("_id name email role isActive")
        .lean()
    : [];
  const staffById = new Map<string, any>();
  for (const s of staffs as any[]) {
    if (s.role === "staff" && s.isActive) {
      staffById.set(s._id.toString(), s);
    }
  }

  const mappingByWarehouse = new Map<string, string>();
  for (const m of mappings as any[]) {
    const wid = m.warehouseId?.toString();
    const sid = m.staffId?.toString();
    if (!wid || !sid) continue;
    mappingByWarehouse.set(wid, sid);
  }

  return warehouses.map((w: any) => {
    const sid = mappingByWarehouse.get(w._id.toString()) ?? null;
    const staff = sid ? staffById.get(sid) : null;
    return {
      warehouse_id: w._id.toString(),
      warehouse_name: w.name,
      staff_id: staff?._id?.toString?.() ?? null,
      staff_name: staff?.name ?? null,
      staff_email: staff?.email ?? null,
    };
  });
}

export async function assignStaffToWarehouse(
  warehouseId: string,
  staffId: string
): Promise<{
  warehouse_id: string;
  warehouse_name: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
}> {
  if (!Types.ObjectId.isValid(staffId)) throw new Error("Invalid staff id");
  if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouse id");

  const staff = await User.findOne({ _id: new Types.ObjectId(staffId), role: "staff", isActive: true })
    .select("_id name email")
    .lean();
  if (!staff) throw new Error("Staff not found or inactive");

  const warehouse = await Warehouse.findById(warehouseId).select("_id name").lean();
  if (!warehouse) throw new Error("Warehouse not found");

  await StaffWarehouse.findOneAndUpdate(
    { warehouseId: new Types.ObjectId(warehouseId) },
    {
      $set: {
        warehouseId: new Types.ObjectId(warehouseId),
        staffId: new Types.ObjectId(staffId),
      },
    },
    { upsert: true, new: true }
  );

  return {
    warehouse_id: warehouseId,
    warehouse_name: (warehouse as any).name,
    staff_id: staffId,
    staff_name: (staff as any).name,
    staff_email: (staff as any).email,
  };
}

export async function unassignStaffFromWarehouse(
  warehouseId: string
): Promise<{ warehouse_id: string; warehouse_name: string }> {
  if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouse id");

  const warehouse = await Warehouse.findById(warehouseId).select("_id name").lean();
  if (!warehouse) throw new Error("Warehouse not found");

  await StaffWarehouse.deleteOne({ warehouseId: new Types.ObjectId(warehouseId) });

  return {
    warehouse_id: warehouseId,
    warehouse_name: (warehouse as any).name,
  };
}

