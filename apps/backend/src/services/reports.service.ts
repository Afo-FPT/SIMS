import StorageRequest from "../models/StorageRequest";
import StorageRequestDetail from "../models/StorageRequestDetail";
import Shelf from "../models/Shelf";
import StoredItem from "../models/StoredItem";
import CycleCountItem from "../models/CycleCountItem";
import Contract from "../models/Contract";
import Zone from "../models/Zone";
import User from "../models/User";
import { suggestZoneMonthlyPrices, type ZonePricingInputRow } from "./pricing-suggestion.service";
import InboundApproval from "../models/InboundApproval";
import OutboundApproval from "../models/OutboundApproval";
import { Types } from "mongoose";

/** Top outbound product by quantity and frequency */
export interface TopOutboundProductItem {
  rank: number;
  itemName: string;
  totalQuantity: number;
  outboundCount: number;
  unit: string;
}

/** Approval stats per manager (Inbound + Outbound) */
export interface ApprovalByManagerItem {
  managerId: string;
  managerName: string;
  inboundApproved: number;
  inboundRejected: number;
  outboundApproved: number;
  outboundRejected: number;
  totalApproved: number;
  totalRejected: number;
  totalDecisions: number;
  approvalRatePercent: number;
}

/** Processing time trend point (by week/month) */
export interface ProcessingTimeTrendPoint {
  period: string;
  inboundAvgHours: number;
  outboundAvgHours: number;
  inboundCount: number;
  outboundCount: number;
}

/** Box plot stats: min, Q1, median, Q3, max (hours) */
export interface ProcessingTimeBoxPlotItem {
  type: "IN" | "OUT";
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
  avgHours: number;
}

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

/**
 * Get top 10 products by outbound quantity (highest frequency and volume).
 * Uses completed OUT requests (DONE_BY_STAFF, COMPLETED) within date range.
 */
export async function getTopOutboundProducts(
  startDate: string,
  endDate: string
): Promise<TopOutboundProductItem[]> {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const aggregated = await StorageRequestDetail.aggregate([
    {
      $lookup: {
        from: "storagerequests",
        localField: "requestId",
        foreignField: "_id",
        as: "request"
      }
    },
    { $unwind: "$request" },
    {
      $match: {
        "request.requestType": "OUT",
        "request.status": { $in: ["DONE_BY_STAFF", "COMPLETED"] },
        "request.updatedAt": { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: { itemName: "$itemName", unit: { $ifNull: ["$unit", "pcs"] } },
        totalQuantity: {
          $sum: { $ifNull: ["$quantityActual", "$quantityRequested"] }
        },
        requestIds: { $addToSet: "$requestId" }
      }
    },
    {
      $project: {
        itemName: "$_id.itemName",
        unit: "$_id.unit",
        totalQuantity: 1,
        outboundCount: { $size: "$requestIds" }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 }
  ]);

  return aggregated.map(
    (
      r: { itemName: string; totalQuantity: number; outboundCount: number; unit: string },
      i: number
    ) => ({
      rank: i + 1,
      itemName: r.itemName || "Unknown",
      totalQuantity: r.totalQuantity,
      outboundCount: r.outboundCount,
      unit: r.unit || "pcs"
    })
  );
}

/**
 * Get approval rate by manager (Inbound + Outbound).
 * Aggregates InboundApproval and OutboundApproval by manager within date range.
 */
export async function getApprovalRateByManager(
  startDate: string,
  endDate: string
): Promise<ApprovalByManagerItem[]> {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const dateFilter = { approvedAt: { $gte: start, $lte: end } };

  const [inboundAgg, outboundAgg] = await Promise.all([
    InboundApproval.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$managerId",
          approved: { $sum: { $cond: [{ $eq: ["$decision", "APPROVED"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$decision", "REJECTED"] }, 1, 0] } }
        }
      }
    ]),
    OutboundApproval.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$managerId",
          approved: { $sum: { $cond: [{ $eq: ["$decision", "APPROVED"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$decision", "REJECTED"] }, 1, 0] } }
        }
      }
    ])
  ]);

  const managerIds = new Set<string>();
  inboundAgg.forEach((r: { _id: Types.ObjectId }) => managerIds.add(r._id.toString()));
  outboundAgg.forEach((r: { _id: Types.ObjectId }) => managerIds.add(r._id.toString()));

  if (managerIds.size === 0) {
    return [];
  }

  const users = await User.find({ _id: { $in: Array.from(managerIds) } })
    .select("_id name")
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u.name || "Unknown"]));
  const inboundMap = new Map(
    inboundAgg.map(
      (r: { _id: Types.ObjectId; approved: number; rejected: number }) => [
        r._id.toString(),
        { approved: r.approved, rejected: r.rejected }
      ]
    )
  );
  const outboundMap = new Map(
    outboundAgg.map(
      (r: { _id: Types.ObjectId; approved: number; rejected: number }) => [
        r._id.toString(),
        { approved: r.approved, rejected: r.rejected }
      ]
    )
  );

  const result: ApprovalByManagerItem[] = [];

  for (const mid of managerIds) {
    const inbound = inboundMap.get(mid) || { approved: 0, rejected: 0 };
    const outbound = outboundMap.get(mid) || { approved: 0, rejected: 0 };
    const totalApproved = inbound.approved + outbound.approved;
    const totalRejected = inbound.rejected + outbound.rejected;
    const totalDecisions = totalApproved + totalRejected;
    const approvalRatePercent =
      totalDecisions > 0 ? Math.round((totalApproved / totalDecisions) * 100) : 0;

    result.push({
      managerId: mid,
      managerName: userMap.get(mid) || "Unknown",
      inboundApproved: inbound.approved,
      inboundRejected: inbound.rejected,
      outboundApproved: outbound.approved,
      outboundRejected: outbound.rejected,
      totalApproved,
      totalRejected,
      totalDecisions,
      approvalRatePercent
    });
  }

  result.sort((a, b) => b.totalDecisions - a.totalDecisions);
  return result;
}

/** Percentile from sorted array (0-100) */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  const w = idx - lo;
  return sortedArr[lo] * (1 - w) + sortedArr[hi] * w;
}

/**
 * Get average processing time stats (creation to approval/rejection).
 * Time from createdAt to approvedAt. Distinguishes Inbound vs Outbound.
 */
export async function getProcessingTimeStats(
  startDate: string,
  endDate: string,
  granularity: "week" | "month" = "week"
): Promise<{
  trendData: ProcessingTimeTrendPoint[];
  boxPlotData: ProcessingTimeBoxPlotItem[];
}> {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const requests = await StorageRequest.find({
    status: { $in: ["APPROVED", "REJECTED"] },
    approvedAt: { $exists: true, $ne: null, $gte: start, $lte: end }
  })
    .select("requestType createdAt approvedAt")
    .lean();

  const inboundHours: number[] = [];
  const outboundHours: number[] = [];

  for (const r of requests) {
    const created = new Date(r.createdAt).getTime();
    const approved = new Date(r.approvedAt as Date).getTime();
    const hours = (approved - created) / (1000 * 60 * 60);
    if (r.requestType === "IN") {
      inboundHours.push(hours);
    } else {
      outboundHours.push(hours);
    }
  }

  const boxPlotData: ProcessingTimeBoxPlotItem[] = [];

  const groups: Array<["IN" | "OUT", number[]]> = [
    ["IN", inboundHours],
    ["OUT", outboundHours]
  ];

  for (const [type, arr] of groups) {
    const sorted = [...arr].sort((a, b) => a - b);
    const count = sorted.length;
    const avgHours = count > 0 ? sorted.reduce((s, x) => s + x, 0) / count : 0;

    boxPlotData.push({
      type,
      min: count > 0 ? sorted[0] : 0,
      q1: percentile(sorted, 25),
      median: percentile(sorted, 50),
      q3: percentile(sorted, 75),
      max: count > 0 ? sorted[count - 1] : 0,
      count,
      avgHours: Math.round(avgHours * 100) / 100
    });
  }

  const periodMap = new Map<string, { inbound: number[]; outbound: number[] }>();

  const fmtPeriod = (d: Date) => {
    if (granularity === "month") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    const y = d.getFullYear();
    const startOfYear = new Date(y, 0, 1);
    const weekNum = Math.ceil(
      ((d.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000) + 1)
    );
    return `${y}-W${String(weekNum).padStart(2, "0")}`;
  };

  for (const r of requests) {
    const approvedAt = new Date(r.approvedAt as Date);
    const created = new Date(r.createdAt).getTime();
    const approved = approvedAt.getTime();
    const hours = (approved - created) / (1000 * 60 * 60);
    const period = fmtPeriod(approvedAt);

    if (!periodMap.has(period)) {
      periodMap.set(period, { inbound: [], outbound: [] });
    }
    const entry = periodMap.get(period)!;
    if (r.requestType === "IN") {
      entry.inbound.push(hours);
    } else {
      entry.outbound.push(hours);
    }
  }

  const trendData: ProcessingTimeTrendPoint[] = [];
  const periods = Array.from(periodMap.keys()).sort();

  for (const period of periods) {
    const entry = periodMap.get(period)!;
    const inboundAvg =
      entry.inbound.length > 0
        ? entry.inbound.reduce((s, x) => s + x, 0) / entry.inbound.length
        : 0;
    const outboundAvg =
      entry.outbound.length > 0
        ? entry.outbound.reduce((s, x) => s + x, 0) / entry.outbound.length
        : 0;

    trendData.push({
      period,
      inboundAvgHours: Math.round(inboundAvg * 100) / 100,
      outboundAvgHours: Math.round(outboundAvg * 100) / 100,
      inboundCount: entry.inbound.length,
      outboundCount: entry.outbound.length
    });
  }

  return { trendData, boxPlotData };
}

/** Manager deep reports: expiry stacked + zone pricing + penalty */

export type ManagerDeepReportGranularity = "daily" | "monthly" | "yearly";

/** Actionable contract row at a bucket snapshot (expired or expiring within 30d of as-of). */
export interface ExpiryContractAlertRow {
  contractId: string;
  contractCode: string;
  customerName: string;
  aggregateEndDate: string;
  tier: "expired" | "expiringSoon";
  contractStatus: string;
}

/** Per zone lease line + shelf codes from StoredItem inventory in that zone for the contract. */
export interface ExpiryZoneLeaseAlertRow {
  contractId: string;
  contractCode: string;
  customerName: string;
  zoneId: string;
  zoneCode: string;
  leaseEndDate: string;
  tier: "expired" | "expiringSoon";
  shelfCodes: string[];
  contractStatus: string;
}

export interface ExpiryStackedBucket {
  label: string;
  contracts: { expired: number; expiringSoon: number; active: number };
  zoneLeases: { expired: number; expiringSoon: number; active: number };
  /** Names/codes needing action for this time bucket (capped server-side). */
  details?: {
    contractAlerts: ExpiryContractAlertRow[];
    zoneLeaseAlerts: ExpiryZoneLeaseAlertRow[];
  };
}

export interface ExpiryStackedReport {
  granularity: ManagerDeepReportGranularity;
  buckets: ExpiryStackedBucket[];
}

export interface ZonePricingComboRow {
  zoneCode: string;
  zoneId: string;
  warehouseId: string;
  warehouseName: string;
  occupancyPercent: number;
  avgMonthlyRentInRange: number;
  suggestedMonthlyPrice: number;
  shelfTotal: number;
  shelfRented: number;
}

export interface PenaltyTopCustomerRow {
  customerId: string;
  customerName: string;
  totalDamageUnits: number;
  affectedRequestCount: number;
  topDamagedItems: { itemName: string; damageUnits: number }[];
}

function parseYMDLocal(s: string): Date {
  const [y, mo, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, d);
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function expiryTier(zoneEnd: Date, asOf: Date): "expired" | "expiringSoon" | "active" {
  const endMs = endOfLocalDay(zoneEnd).getTime();
  const asMs = endOfLocalDay(asOf).getTime();
  const soonEnd = asMs + 30 * 24 * 60 * 60 * 1000;
  if (endMs < asMs) return "expired";
  if (endMs <= soonEnd) return "expiringSoon";
  return "active";
}

function enumerateExpiryBuckets(
  startStr: string,
  endStr: string,
  g: ManagerDeepReportGranularity
): { asOf: Date; label: string }[] {
  const rangeStart = parseYMDLocal(startStr);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = parseYMDLocal(endStr);
  rangeEnd.setHours(23, 59, 59, 999);
  const out: { asOf: Date; label: string }[] = [];

  if (g === "daily") {
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd && out.length < 400) {
      out.push({ asOf: endOfLocalDay(new Date(cur)), label: formatYMDLocal(cur) });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  if (g === "monthly") {
    let y = rangeStart.getFullYear();
    let m = rangeStart.getMonth();
    const endY = rangeEnd.getFullYear();
    const endM = rangeEnd.getMonth();
    while ((y < endY || (y === endY && m <= endM)) && out.length < 120) {
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
      if (monthEnd >= rangeStart && monthEnd <= rangeEnd) {
        out.push({
          asOf: monthEnd,
          label: `${y}-${String(m + 1).padStart(2, "0")}`
        });
      }
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return out;
  }

  for (let y = rangeStart.getFullYear(); y <= rangeEnd.getFullYear() && out.length < 30; y++) {
    const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    if (yearEnd >= rangeStart && yearEnd <= rangeEnd) {
      out.push({ asOf: yearEnd, label: String(y) });
    }
  }
  return out;
}

const MAX_EXPIRY_CONTRACT_ALERTS = 45;
const MAX_EXPIRY_ZONE_LEASE_ALERTS = 70;

function customerNameFromContractLean(c: {
  customerId?: { name?: string } | Types.ObjectId | null;
}): string {
  const cid = c.customerId;
  if (cid && typeof cid === "object" && "name" in cid && (cid as { name?: string }).name) {
    return String((cid as { name?: string }).name);
  }
  return "—";
}

function sortExpiryContractAlerts(a: ExpiryContractAlertRow, b: ExpiryContractAlertRow): number {
  const rank = (t: string) => (t === "expired" ? 0 : 1);
  const d = rank(a.tier) - rank(b.tier);
  if (d !== 0) return d;
  return a.aggregateEndDate.localeCompare(b.aggregateEndDate);
}

function sortExpiryZoneLeaseAlerts(a: ExpiryZoneLeaseAlertRow, b: ExpiryZoneLeaseAlertRow): number {
  const rank = (t: string) => (t === "expired" ? 0 : 1);
  const d = rank(a.tier) - rank(b.tier);
  if (d !== 0) return d;
  return a.leaseEndDate.localeCompare(b.leaseEndDate);
}

/**
 * Stacked time series: contract-level (max zone end among zones started by asOf) and per zone-lease row.
 * Each bucket includes capped detail rows (contract code, customer, zone/shelf codes from MongoDB).
 */
export async function getManagerExpiryStackedReport(
  startDate: string,
  endDate: string,
  granularity: ManagerDeepReportGranularity
): Promise<ExpiryStackedReport> {
  const bucketsMeta = enumerateExpiryBuckets(startDate, endDate, granularity);
  const contracts = await Contract.find({
    rentedZones: { $exists: true, $not: { $size: 0 } }
  })
    .populate("customerId", "name")
    .select("createdAt rentedZones contractCode customerId status")
    .lean();

  const zoneIds = new Set<string>();
  for (const c of contracts) {
    for (const rz of c.rentedZones || []) {
      zoneIds.add((rz.zoneId as Types.ObjectId).toString());
    }
  }
  const zoneDocs =
    zoneIds.size > 0
      ? await Zone.find({ _id: { $in: [...zoneIds].map((id) => new Types.ObjectId(id)) } })
          .select("_id zoneCode")
          .lean()
      : [];
  const zoneCodeById = new Map(zoneDocs.map((z) => [String(z._id), String(z.zoneCode ?? z._id)]));

  const shelfColl = Shelf.collection.collectionName;
  const shelfAgg = await StoredItem.aggregate<{
    _id: { contractId: Types.ObjectId; zoneId: Types.ObjectId };
    shelfCodes: string[];
  }>([
    {
      $lookup: {
        from: shelfColl,
        localField: "shelfId",
        foreignField: "_id",
        as: "sh"
      }
    },
    { $unwind: "$sh" },
    {
      $group: {
        _id: { contractId: "$contractId", zoneId: "$sh.zoneId" },
        shelfCodes: { $addToSet: "$sh.shelfCode" }
      }
    }
  ]);
  const shelfCodesByContractZone = new Map<string, string[]>();
  for (const row of shelfAgg) {
    const cid = row._id.contractId.toString();
    const zid = row._id.zoneId.toString();
    const codes = (row.shelfCodes || []).filter(Boolean).slice().sort();
    shelfCodesByContractZone.set(`${cid}|${zid}`, codes);
  }

  const buckets: ExpiryStackedBucket[] = bucketsMeta.map(({ asOf, label }) => {
    let ce = 0,
      cx = 0,
      ca = 0;
    let ze = 0,
      zx = 0,
      za = 0;

    const contractAlerts: ExpiryContractAlertRow[] = [];
    const zoneLeaseAlerts: ExpiryZoneLeaseAlertRow[] = [];

    for (const c of contracts) {
      if (new Date(c.createdAt as Date) > asOf) continue;
      const zones = (c.rentedZones || []).filter((rz) => new Date(rz.startDate) <= asOf);
      if (zones.length === 0) continue;

      const maxEnd = new Date(
        Math.max(...zones.map((z) => new Date(z.endDate).getTime()))
      );
      const ct = expiryTier(maxEnd, asOf);
      if (ct === "expired") ce++;
      else if (ct === "expiringSoon") cx++;
      else ca++;

      for (const rz of zones) {
        const zt = expiryTier(new Date(rz.endDate), asOf);
        if (zt === "expired") ze++;
        else if (zt === "expiringSoon") zx++;
        else za++;
      }
    }

    detailLoop: for (const c of contracts) {
      if (new Date(c.createdAt as Date) > asOf) continue;
      const zones = (c.rentedZones || []).filter((rz) => new Date(rz.startDate) <= asOf);
      if (zones.length === 0) continue;

      const cidStr = String((c as { _id: Types.ObjectId })._id);
      const contractCode = String((c as { contractCode?: string }).contractCode || cidStr);
      const customerName = customerNameFromContractLean(
        c as { customerId?: { name?: string } | Types.ObjectId | null }
      );
      const contractStatus = String((c as { status?: string }).status ?? "unknown");

      const maxEnd = new Date(
        Math.max(...zones.map((z) => new Date(z.endDate).getTime()))
      );
      const ct = expiryTier(maxEnd, asOf);

      if (
        (ct === "expired" || ct === "expiringSoon") &&
        contractAlerts.length < MAX_EXPIRY_CONTRACT_ALERTS
      ) {
        contractAlerts.push({
          contractId: cidStr,
          contractCode,
          customerName,
          aggregateEndDate: formatYMDLocal(maxEnd),
          tier: ct,
          contractStatus
        });
      }

      for (const rz of zones) {
        const zt = expiryTier(new Date(rz.endDate), asOf);
        if (zt !== "expired" && zt !== "expiringSoon") continue;
        if (zoneLeaseAlerts.length >= MAX_EXPIRY_ZONE_LEASE_ALERTS) break detailLoop;

        const zid = (rz.zoneId as Types.ObjectId).toString();
        const zoneCode = zoneCodeById.get(zid) || zid;
        const shelfCodes = shelfCodesByContractZone.get(`${cidStr}|${zid}`) ?? [];

        zoneLeaseAlerts.push({
          contractId: cidStr,
          contractCode,
          customerName,
          zoneId: zid,
          zoneCode,
          leaseEndDate: formatYMDLocal(new Date(rz.endDate)),
          tier: zt,
          shelfCodes,
          contractStatus
        });
      }
    }

    contractAlerts.sort(sortExpiryContractAlerts);
    zoneLeaseAlerts.sort(sortExpiryZoneLeaseAlerts);

    return {
      label,
      contracts: { expired: ce, expiringSoon: cx, active: ca },
      zoneLeases: { expired: ze, expiringSoon: zx, active: za },
      details: {
        contractAlerts,
        zoneLeaseAlerts
      }
    };
  });

  return { granularity, buckets };
}

/**
 * Zone occupancy (current shelf snapshot) + avg zone rent from contract lines overlapping date range + Gemini suggested price.
 */
export async function getManagerZonePricingComboData(
  startDate: string,
  endDate: string
): Promise<ZonePricingComboRow[]> {
  const start = parseYMDLocal(startDate);
  start.setHours(0, 0, 0, 0);
  const end = parseYMDLocal(endDate);
  end.setHours(23, 59, 59, 999);

  const zones = await Zone.find({ status: "ACTIVE" })
    .select("_id zoneCode warehouseId")
    .populate("warehouseId", "name")
    .lean();

  const shelfAgg = await Shelf.aggregate([
    {
      $group: {
        _id: "$zoneId",
        total: { $sum: 1 },
        rented: { $sum: { $cond: [{ $eq: ["$status", "RENTED"] }, 1, 0] } }
      }
    }
  ]);

  const shelfMap = new Map(
    shelfAgg.map((x: { _id: Types.ObjectId; total: number; rented: number }) => [
      x._id.toString(),
      { total: x.total, rented: x.rented }
    ])
  );

  const contracts = await Contract.find({
    status: { $in: ["active", "expired", "terminated", "pending_payment"] },
    rentedZones: { $exists: true, $not: { $size: 0 } }
  })
    .select("rentedZones")
    .lean();

  const rentSumByZone = new Map<string, { sum: number; n: number }>();
  for (const c of contracts) {
    for (const z of c.rentedZones || []) {
      const zs = new Date(z.startDate).getTime();
      const ze = new Date(z.endDate).getTime();
      if (ze < start.getTime() || zs > end.getTime()) continue;
      const id = (z.zoneId as Types.ObjectId).toString();
      const cur = rentSumByZone.get(id) || { sum: 0, n: 0 };
      cur.sum += z.price;
      cur.n += 1;
      rentSumByZone.set(id, cur);
    }
  }

  function warehouseFields(z: {
    warehouseId?: Types.ObjectId | { _id?: Types.ObjectId; name?: string } | null;
  }): { warehouseId: string; warehouseName: string } {
    const w = z.warehouseId;
    if (w && typeof w === "object" && w !== null && "name" in w) {
      const wid = (w as { _id?: Types.ObjectId })._id;
      return {
        warehouseId: wid ? String(wid) : "",
        warehouseName: String((w as { name?: string }).name || "—")
      };
    }
    return { warehouseId: "", warehouseName: "—" };
  }

  const rows: ZonePricingInputRow[] = zones.map((z) => {
    const id = z._id.toString();
    const sh = shelfMap.get(id) || { total: 0, rented: 0 };
    const total = sh.total || 0;
    const rented = sh.rented || 0;
    const occ = total > 0 ? Math.round((rented / total) * 1000) / 10 : 0;
    const rs = rentSumByZone.get(id);
    const avg = rs && rs.n > 0 ? Math.round(rs.sum / rs.n) : 0;
    return { zoneCode: z.zoneCode, occupancyPercent: occ, avgMonthlyRent: avg };
  });

  const suggested = await suggestZoneMonthlyPrices(rows);

  return zones.map((z, i) => {
    const id = z._id.toString();
    const sh = shelfMap.get(id) || { total: 0, rented: 0 };
    const total = sh.total || 0;
    const rented = sh.rented || 0;
    const occ = total > 0 ? Math.round((rented / total) * 1000) / 10 : 0;
    const rs = rentSumByZone.get(id);
    const avg = rs && rs.n > 0 ? Math.round(rs.sum / rs.n) : 0;
    const wh = warehouseFields(z);
    return {
      zoneCode: z.zoneCode,
      zoneId: id,
      warehouseId: wh.warehouseId,
      warehouseName: wh.warehouseName,
      occupancyPercent: occ,
      avgMonthlyRentInRange: avg,
      suggestedMonthlyPrice: suggested[i] ?? avg,
      shelfTotal: total,
      shelfRented: rented
    };
  });
}

/**
 * Top customers by summed damageQuantity on storage request lines (inventory penalty proxy).
 */
export async function getManagerPenaltyTopCustomers(
  startDate: string,
  endDate: string,
  limit = 10
): Promise<PenaltyTopCustomerRow[]> {
  const start = parseYMDLocal(startDate);
  start.setHours(0, 0, 0, 0);
  const end = parseYMDLocal(endDate);
  end.setHours(23, 59, 59, 999);

  const agg = await StorageRequestDetail.aggregate([
    {
      $lookup: {
        from: "storagerequests",
        localField: "requestId",
        foreignField: "_id",
        as: "req"
      }
    },
    { $unwind: "$req" },
    {
      $match: {
        "req.createdAt": { $gte: start, $lte: end },
        damageQuantity: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: "$req.customerId",
        totalDamage: { $sum: "$damageQuantity" },
        reqIds: { $addToSet: "$requestId" }
      }
    },
    { $sort: { totalDamage: -1 } },
    { $limit: limit },
    {
      $project: {
        customerId: "$_id",
        totalDamageUnits: "$totalDamage",
        affectedRequestCount: { $size: "$reqIds" }
      }
    }
  ]);

  const ids = agg.map((a: { customerId: Types.ObjectId }) => a.customerId);
  if (ids.length === 0) return [];

  const users = await User.find({ _id: { $in: ids } })
    .select("name")
    .lean();
  const nameMap = new Map(users.map((u) => [u._id.toString(), u.name || "Unknown"]));

  const itemBreakdownAgg = await StorageRequestDetail.aggregate([
    {
      $lookup: {
        from: "storagerequests",
        localField: "requestId",
        foreignField: "_id",
        as: "req"
      }
    },
    { $unwind: "$req" },
    {
      $match: {
        "req.createdAt": { $gte: start, $lte: end },
        "req.customerId": { $in: ids },
        damageQuantity: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: { customerId: "$req.customerId", itemName: "$itemName" },
        damageUnits: { $sum: "$damageQuantity" }
      }
    },
    { $sort: { "_id.customerId": 1, damageUnits: -1 } }
  ]);
  const topItemsByCustomerId = new Map<string, { itemName: string; damageUnits: number }[]>();
  for (const row of itemBreakdownAgg as Array<{
    _id: { customerId: Types.ObjectId; itemName: string };
    damageUnits: number;
  }>) {
    const customerId = String(row._id.customerId);
    const current = topItemsByCustomerId.get(customerId) || [];
    if (current.length >= 5) continue;
    current.push({
      itemName: String(row._id.itemName || "Unknown item"),
      damageUnits: Number(row.damageUnits) || 0
    });
    topItemsByCustomerId.set(customerId, current);
  }

  return agg.map(
    (a: {
      customerId: Types.ObjectId;
      totalDamageUnits: number;
      affectedRequestCount: number;
    }) => ({
      customerId: a.customerId.toString(),
      customerName: nameMap.get(a.customerId.toString()) || "Unknown",
      totalDamageUnits: a.totalDamageUnits,
      affectedRequestCount: a.affectedRequestCount,
      topDamagedItems: topItemsByCustomerId.get(a.customerId.toString()) || []
    })
  );
}
