import StorageRequest from "../models/StorageRequest";
import Shelf from "../models/Shelf";
import StoredItem from "../models/StoredItem";
import CycleCountItem from "../models/CycleCountItem";
import Contract from "../models/Contract";
import User from "../models/User";
import type { Types } from "mongoose";

export interface ManagerReportStats {
  inbound: number;
  outbound: number;
  completion: number;
  discrepancies: number;
}

export interface CapacitySlice {
  name: string;
  value: number;
}

export interface StockByCategory {
  name: string;
  qty: number;
}

/** Single point in daily/weekly trend */
export interface TrendDataPoint {
  date: string;
  inbound: number;
  outbound: number;
}

/** Anomaly point (spike/drop vs trend) */
export interface TrendAnomaly {
  date: string;
  type: "inbound" | "outbound";
  value: number;
  message: string;
  severity: "high" | "low";
}

/** Contract expiring soon (for list and Gantt) */
export interface ExpiringContractItem {
  contractId: string;
  contractCode: string;
  customerName: string;
  startDate: string;
  endDate: string;
  status: string;
  expiresInDays: number;
}

/** Expiring contracts & capacity risk report */
export interface ExpiringAndCapacityKpis {
  expiringIn30: number;
  expiringIn60: number;
  expiringIn90: number;
  capacityUtilizationPercent: number;
}

export interface ExpiringAndCapacity {
  kpis: ExpiringAndCapacityKpis;
  expiringIn30: ExpiringContractItem[];
  expiringIn60: ExpiringContractItem[];
  expiringIn90: ExpiringContractItem[];
  ganttContracts: ExpiringContractItem[];
}

export interface ManagerReportResponse {
  stats: ManagerReportStats;
  capacityData: CapacitySlice[];
  inventoryData: StockByCategory[];
  trendData: TrendDataPoint[];
  anomalies: TrendAnomaly[];
  expiringAndCapacity: ExpiringAndCapacity;
}

export type TrendGranularity = "day" | "week";

/**
 * Get manager report (stats, capacity, inventory, trend, anomalies, expiring contracts & capacity).
 */
export async function getManagerReport(
  startDate: string,
  endDate: string,
  granularity: TrendGranularity = "day"
): Promise<ManagerReportResponse> {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const [stats, capacityData, inventoryData, trendData, expiringAndCapacity] =
    await Promise.all([
      getStats(start, end),
      getCapacityData(),
      getInventoryByItem(),
      getTrendData(start, end, granularity),
      getExpiringContractsAndCapacity()
    ]);

  const anomalies = detectAnomalies(trendData);

  return {
    stats,
    capacityData,
    inventoryData,
    trendData,
    anomalies,
    expiringAndCapacity
  };
}

async function getStats(
  start: Date,
  end: Date
): Promise<ManagerReportStats> {
  const completedStatuses = ["COMPLETED", "DONE_BY_STAFF"];

  const [inbound, outbound, totalCompleted, totalInPeriod] = await Promise.all([
    StorageRequest.countDocuments({
      requestType: "IN",
      status: { $in: completedStatuses },
      createdAt: { $gte: start, $lte: end }
    }),
    StorageRequest.countDocuments({
      requestType: "OUT",
      status: { $in: completedStatuses },
      createdAt: { $gte: start, $lte: end }
    }),
    StorageRequest.countDocuments({
      status: { $in: completedStatuses },
      createdAt: { $gte: start, $lte: end }
    }),
    StorageRequest.countDocuments({
      status: { $ne: "REJECTED" },
      createdAt: { $gte: start, $lte: end }
    })
  ]);

  const completion =
    totalInPeriod > 0 ? Math.round((totalCompleted / totalInPeriod) * 100) : 0;

  const discrepancies = await CycleCountItem.countDocuments({
    discrepancy: { $ne: 0 },
    createdAt: { $gte: start, $lte: end }
  });

  return {
    inbound,
    outbound,
    completion,
    discrepancies
  };
}

async function getCapacityData(): Promise<CapacitySlice[]> {
  const [rented, available, maintenance] = await Promise.all([
    Shelf.countDocuments({ status: "RENTED" }),
    Shelf.countDocuments({ status: "AVAILABLE" }),
    Shelf.countDocuments({ status: "MAINTENANCE" })
  ]);

  const total = rented + available + maintenance;
  if (total === 0) {
    return [
      { name: "Occupied", value: 0 },
      { name: "Empty", value: 100 }
    ];
  }

  const occupiedPct = Math.round((rented / total) * 100);
  const emptyPct = 100 - occupiedPct;

  return [
    { name: "Occupied", value: occupiedPct },
    { name: "Empty", value: emptyPct }
  ];
}

async function getInventoryByItem(): Promise<StockByCategory[]> {
  const aggregated = await StoredItem.aggregate([
    { $group: { _id: "$itemName", qty: { $sum: "$quantity" } } },
    { $sort: { qty: -1 } },
    { $limit: 15 },
    { $project: { name: "$_id", qty: 1, _id: 0 } }
  ]);

  return aggregated.map((r: { name: string; qty: number }) => ({
    name: r.name || "Unknown",
    qty: r.qty
  }));
}

async function getTrendData(
  start: Date,
  end: Date,
  granularity: TrendGranularity
): Promise<TrendDataPoint[]> {
  const match = {
    status: { $in: ["COMPLETED", "DONE_BY_STAFF"] as const },
    createdAt: { $gte: start, $lte: end }
  };

  if (granularity === "day") {
    const grouped = await StorageRequest.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
          inbound: { $sum: { $cond: [{ $eq: ["$requestType", "IN"] }, 1, 0] } },
          outbound: { $sum: { $cond: [{ $eq: ["$requestType", "OUT"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", inbound: 1, outbound: 1, _id: 0 } }
    ]);
    return grouped as TrendDataPoint[];
  }

  const weekGroups = await StorageRequest.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" }
        },
        inbound: { $sum: { $cond: [{ $eq: ["$requestType", "IN"] }, 1, 0] } },
        outbound: { $sum: { $cond: [{ $eq: ["$requestType", "OUT"] }, 1, 0] } }
      }
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } },
    {
      $project: {
        date: {
          $concat: [
            { $toString: "$_id.year" },
            "-W",
            {
              $cond: [
                { $lt: ["$_id.week", 10] },
                { $concat: ["0", { $toString: "$_id.week" }] },
                { $toString: "$_id.week" }
              ]
            }
          ]
        },
        inbound: 1,
        outbound: 1,
        _id: 0
      }
    }
  ]);
  return weekGroups as TrendDataPoint[];
}

async function getExpiringContractsAndCapacity(): Promise<ExpiringAndCapacity> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const in60 = new Date(now);
  in60.setDate(in60.getDate() + 60);
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);

  const activeContracts = await Contract.find({ status: "active" })
    .populate<{ customerId: { name: string } }>("customerId", "name")
    .lean();

  const toItem = (c: {
    _id: Types.ObjectId;
    contractCode: string;
    customerId: { name?: string } | Types.ObjectId;
    status: string;
    rentedZones: { startDate: Date; endDate: Date }[];
  }): { item: ExpiringContractItem; endDate: Date } => {
    const startDate = c.rentedZones?.length
      ? new Date(Math.min(...c.rentedZones.map((z) => new Date(z.startDate).getTime())))
      : new Date();
    const endDate = c.rentedZones?.length
      ? new Date(Math.max(...c.rentedZones.map((z) => new Date(z.endDate).getTime())))
      : new Date();
    const customerName =
      c.customerId && typeof c.customerId === "object" && "name" in c.customerId
        ? (c.customerId as { name: string }).name
        : "—";
    const expiresInDays = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return {
      item: {
        contractId: String(c._id),
        contractCode: c.contractCode,
        customerName,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        status: c.status,
        expiresInDays: Math.max(0, expiresInDays)
      },
      endDate
    };
  };

  const withEnd: { item: ExpiringContractItem; endDate: Date }[] = activeContracts
    .filter((c: { rentedZones?: unknown[] }) => c.rentedZones?.length)
    .map((c: unknown) => toItem(c as Parameters<typeof toItem>[0]));

  const expiringIn30 = withEnd
    .filter(({ endDate }) => endDate >= now && endDate <= in30)
    .map(({ item }) => item);
  const expiringIn60 = withEnd
    .filter(({ endDate }) => endDate > in30 && endDate <= in60)
    .map(({ item }) => item);
  const expiringIn90 = withEnd
    .filter(({ endDate }) => endDate > in60 && endDate <= in90)
    .map(({ item }) => item);

  const ganttContracts = withEnd
    .filter(({ endDate }) => endDate >= now && endDate <= in90)
    .map(({ item }) => item)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const [totalQuantity, totalCapacity] = await Promise.all([
    StoredItem.aggregate([{ $group: { _id: null, sum: { $sum: "$quantity" } } }]),
    Shelf.aggregate([{ $group: { _id: null, sum: { $sum: "$maxCapacity" } } }])
  ]);
  const used = totalQuantity[0]?.sum ?? 0;
  const capacity = totalCapacity[0]?.sum ?? 1;
  const capacityUtilizationPercent = Math.round((used / capacity) * 1000) / 10;

  return {
    kpis: {
      expiringIn30: expiringIn30.length,
      expiringIn60: expiringIn60.length,
      expiringIn90: expiringIn90.length,
      capacityUtilizationPercent
    },
    expiringIn30,
    expiringIn60,
    expiringIn90,
    ganttContracts
  };
}

/**
 * Detect anomalies: unusually high or low volume vs mean (simple z-score)
 */
function detectAnomalies(trendData: TrendDataPoint[]): TrendAnomaly[] {
  if (trendData.length < 3) return [];

  const inboundValues = trendData.map((d) => d.inbound);
  const outboundValues = trendData.map((d) => d.outbound);

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr: number[]) => {
    const m = mean(arr);
    const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
    return Math.sqrt(variance) || 1;
  };

  const inboundMean = mean(inboundValues);
  const inboundStd = std(inboundValues);
  const outboundMean = mean(outboundValues);
  const outboundStd = std(outboundValues);

  const threshold = 2;
  const anomalies: TrendAnomaly[] = [];

  trendData.forEach((point) => {
    const inboundZ = inboundStd > 0 ? (point.inbound - inboundMean) / inboundStd : 0;
    const outboundZ = outboundStd > 0 ? (point.outbound - outboundMean) / outboundStd : 0;

    if (inboundZ >= threshold && point.inbound > 0) {
      anomalies.push({
        date: point.date,
        type: "inbound",
        value: point.inbound,
        message: `Unusually high inbound volume (${point.inbound} requests, avg ~${Math.round(inboundMean)})`,
        severity: inboundZ >= 3 ? "high" : "high"
      });
    }
    if (inboundZ <= -threshold && point.inbound < inboundMean) {
      anomalies.push({
        date: point.date,
        type: "inbound",
        value: point.inbound,
        message: `Unusually low inbound volume (${point.inbound} requests)`,
        severity: "low"
      });
    }
    if (outboundZ >= threshold && point.outbound > 0) {
      anomalies.push({
        date: point.date,
        type: "outbound",
        value: point.outbound,
        message: `Unusually high outbound volume (${point.outbound} requests, avg ~${Math.round(outboundMean)})`,
        severity: outboundZ >= 3 ? "high" : "high"
      });
    }
    if (outboundZ <= -threshold && point.outbound < outboundMean) {
      anomalies.push({
        date: point.date,
        type: "outbound",
        value: point.outbound,
        message: `Unusually low outbound volume (${point.outbound} requests)`,
        severity: "low"
      });
    }
  });

  return anomalies;
}
