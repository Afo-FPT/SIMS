export type ContractStatus =
  | "draft"
  | "pending_payment"
  | "scheduled"
  | "active"
  | "expired"
  | "terminated";

type ContractLike = {
  status: ContractStatus | string;
};

/**
 * Customer may create IN only when active; OUT when active or expired (clearance).
 */
export function assertCustomerMayCreateStorageRequest(
  contract: ContractLike,
  requestType: "IN" | "OUT"
): void {
  const s = contract.status as ContractStatus;
  if (s === "scheduled") {
    throw new Error(
      "Payment is complete, but the rental period has not started yet. You can create storage requests from the contract start date."
    );
  }
  if (s === "active") return;
  if (s === "expired" && requestType === "OUT") return;
  if (s === "expired" && requestType === "IN") {
    throw new Error(
      "Contract has expired. Inbound requests are not allowed. You may create outbound requests to remove remaining inventory."
    );
  }
  if (s === "terminated") {
    throw new Error("Contract is terminated. New storage requests are not allowed.");
  }
  throw new Error("Contract is not active");
}

/**
 * Staff may complete IN only when contract is active; OUT when active or expired.
 */
export function assertStaffMayCompleteStorageRequest(
  contract: ContractLike,
  requestType: "IN" | "OUT"
): void {
  const s = contract.status as ContractStatus;
  if (s === "scheduled") {
    throw new Error(
      "This contract is paid but not yet in its rental period. Storage requests cannot be completed until the contract is active."
    );
  }
  if (s === "active") return;
  if (s === "expired" && requestType === "OUT") return;
  if (s === "expired" && requestType === "IN") {
    throw new Error(
      "Contract has expired. Inbound putaway can no longer be completed. Create a new contract or contact the warehouse."
    );
  }
  if (s === "terminated") {
    throw new Error("Contract is terminated. This request can no longer be completed.");
  }
  throw new Error("Contract is not active. This request cannot be completed.");
}

/**
 * Manager assigns PENDING → APPROVED: same rules as clearance (OUT allowed if expired).
 */
export function assertManagerMayAssignStorageRequest(
  contract: ContractLike,
  requestType: "IN" | "OUT"
): void {
  const s = contract.status as ContractStatus;
  if (s === "scheduled") {
    throw new Error(
      "Cannot assign staff: the contract is paid but the rental period has not started yet."
    );
  }
  if (s === "active") return;
  if (s === "expired" && requestType === "OUT") return;
  if (s === "expired" && requestType === "IN") {
    throw new Error(
      "Cannot assign staff: contract has expired and inbound requests are closed. Reject this request or renew the contract."
    );
  }
  if (s === "terminated") {
    throw new Error("Cannot assign staff: contract is terminated.");
  }
  throw new Error("Cannot assign staff: contract is not active.");
}

/**
 * Manager approves inbound: only while contract is still active.
 */
export function assertManagerMayApproveInbound(contract: ContractLike): void {
  if (contract.status === "scheduled") {
    throw new Error(
      "Cannot approve inbound: the rental period has not started yet. Reject the request or wait until the contract becomes active."
    );
  }
  if (contract.status !== "active") {
    throw new Error(
      "Cannot approve inbound: contract is not active. Reject the request or renew the contract first."
    );
  }
}

/**
 * Manager approves outbound: allowed for active or expired; not after terminated.
 */
export function assertManagerMayApproveOutbound(contract: ContractLike): void {
  const s = contract.status as ContractStatus;
  if (s === "scheduled") {
    throw new Error(
      "Cannot approve outbound: the rental period has not started yet."
    );
  }
  if (s === "active" || s === "expired") return;
  if (s === "terminated") {
    throw new Error("Cannot approve outbound: contract is terminated.");
  }
  throw new Error("Cannot approve outbound: contract is not active.");
}

export function assertContractEligibleForRequestCredits(contract: ContractLike): void {
  const s = contract.status as ContractStatus;
  if (s === "scheduled") {
    throw new Error(
      "Request credits can be purchased after the rental period has started (contract is active)."
    );
  }
  if (s === "active" || s === "expired") return;
  if (s === "terminated") {
    throw new Error("Request credits cannot be purchased for a terminated contract.");
  }
  throw new Error("Request credits can only be purchased for active or expired contracts.");
}
