import { Types } from "mongoose";
import RentRequest, { IRentRequest, RentRequestStatus } from "../models/RentRequest";
import User from "../models/User";

export interface CreateRentRequestDTO {
  shelves: number;
  startDate: string;
  durationMonths: number;
  zonePreference?: string;
  goodsCategory?: string[];
  handlingNotes?: string[];
  specialNotes?: string;
  countingUnit: string;
  conversionRule?: {
    boxToPiece?: number;
    cartonToBox?: number;
    palletToCarton?: number;
  };
}

export interface RentRequestResponse {
  id: string;
  shelves: number;
  startDate: string;
  durationMonths: number;
  zonePreference?: string;
  goodsCategory: string[];
  handlingNotes: string[];
  specialNotes?: string;
  countingUnit: string;
  conversionRule?: {
    boxToPiece?: number;
    cartonToBox?: number;
    palletToCarton?: number;
  };
  status: RentRequestStatus;
  customerName?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt?: string;
}

function mapToResponse(doc: IRentRequest, customerName?: string): RentRequestResponse {
  return {
    id: doc._id.toString(),
    shelves: doc.shelves,
    startDate: doc.startDate.toISOString().slice(0, 10),
    durationMonths: doc.durationMonths,
    zonePreference: doc.zonePreference || undefined,
    goodsCategory: doc.goodsCategory || [],
    handlingNotes: doc.handlingNotes || [],
    specialNotes: doc.specialNotes || undefined,
    countingUnit: doc.countingUnit,
    conversionRule: doc.conversionRule || undefined,
    status: doc.status,
    customerName,
    rejectReason: doc.rejectReason || undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}

function validateCreatePayload(data: CreateRentRequestDTO) {
  if (!data.shelves || data.shelves <= 0) {
    throw new Error("Shelves must be greater than 0");
  }

  if (!data.durationMonths || data.durationMonths <= 0) {
    throw new Error("Duration must be greater than 0");
  }

  if (!data.startDate) {
    throw new Error("Start date is required");
  }

  const start = new Date(data.startDate);
  if (isNaN(start.getTime())) {
    throw new Error("Invalid start date");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    throw new Error("Start date must be today or in the future");
  }

  if (!data.countingUnit || data.countingUnit.trim().length === 0) {
    throw new Error("Counting unit is required");
  }
}

export async function createRentRequest(
  data: CreateRentRequestDTO,
  customerId: string
): Promise<RentRequestResponse> {
  validateCreatePayload(data);

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  if (customer.role !== "customer") {
    throw new Error("Only customers can create rent requests");
  }

  const doc = await RentRequest.create({
    customerId: new Types.ObjectId(customerId),
    shelves: data.shelves,
    startDate: new Date(data.startDate),
    durationMonths: data.durationMonths,
    zonePreference: data.zonePreference,
    goodsCategory: data.goodsCategory || [],
    handlingNotes: data.handlingNotes || [],
    specialNotes: data.specialNotes,
    countingUnit: data.countingUnit,
    conversionRule: data.conversionRule,
    status: "Draft",
  });

  return mapToResponse(doc, customer.name);
}

export async function getRentRequests(
  userId: string,
  role: string
): Promise<RentRequestResponse[]> {
  const query: any = {};

  if (role === "customer") {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid customer ID");
    }
    query.customerId = new Types.ObjectId(userId);
  }

  const docs = await RentRequest.find(query)
    .populate("customerId", "name")
    .sort({ createdAt: -1 });

  return docs.map((doc: any) =>
    mapToResponse(doc, doc.customerId?.name)
  );
}

export async function submitRentRequest(
  requestId: string,
  customerId: string
): Promise<RentRequestResponse> {
  if (!Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid request ID");
  }
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const doc = await RentRequest.findById(requestId).populate("customerId", "name");
  if (!doc) {
    throw new Error("Rent request not found");
  }

  if (doc.customerId.toString() !== customerId) {
    throw new Error("You can only submit your own rent requests");
  }

  if (doc.status !== "Draft") {
    throw new Error("Only draft requests can be submitted");
  }

  doc.status = "Submitted";
  await doc.save();

  return mapToResponse(doc, (doc as any).customerId?.name);
}

export async function cancelRentRequest(
  requestId: string,
  customerId: string
): Promise<{ message: string }> {
  if (!Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid request ID");
  }
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const doc = await RentRequest.findById(requestId);
  if (!doc) {
    throw new Error("Rent request not found");
  }

  if (doc.customerId.toString() !== customerId) {
    throw new Error("You can only cancel your own rent requests");
  }

  if (doc.status === "Approved" || doc.status === "Rejected") {
    throw new Error("Approved or rejected requests cannot be cancelled");
  }

  await RentRequest.findByIdAndDelete(requestId);

  return { message: "Rent request cancelled successfully" };
}

export async function updateRentRequestStatus(
  requestId: string,
  status: RentRequestStatus,
  rejectReason?: string
): Promise<RentRequestResponse> {
  if (!Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid request ID");
  }

  if (!["Approved", "Rejected"].includes(status)) {
    throw new Error("Status must be Approved or Rejected");
  }

  const doc = await RentRequest.findById(requestId).populate("customerId", "name");
  if (!doc) {
    throw new Error("Rent request not found");
  }

  if (doc.status !== "Submitted") {
    throw new Error("Only submitted requests can be approved or rejected");
  }

  doc.status = status;
  if (status === "Rejected" && rejectReason) {
    doc.rejectReason = rejectReason;
  }
  await doc.save();

  return mapToResponse(doc, (doc as any).customerId?.name);
}

