
'use client';

import React from 'react';
import Link from 'next/link';
import {
  MOCK_CONTRACTS,
  MOCK_RENT_REQUESTS,
  MOCK_SERVICE_REQUESTS,
  MOCK_INVENTORY,
  MOCK_ACTIVITIES,
  getActiveContractsForCustomer,
} from '../../../lib/customer-mock';

export default function CustomerDashboard() {
  const activeContracts = getActiveContractsForCustomer();
  const shelvesOccupied = activeContracts.reduce((s, c) => s + c.shelvesRented, 0);
  const shelvesTotal = 24;
  const shelvesAvailable = shelvesTotal - shelvesOccupied;
  const totalSKUs = MOCK_INVENTORY.length;
  const totalQty = MOCK_INVENTORY.reduce((s, i) => s + i.quantity, 0);
  const requestsInProgress = MOCK_RENT_REQUESTS.filter(
    (r) => r.status === 'Submitted'
  ).length + MOCK_SERVICE_REQUESTS.filter(
    (r) => r.status === 'Pending' || r.status === 'Processing'
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 mt-1">Contract status, shelves, inventory & activity</p>
      </div>

      {/* Contract status */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-4">Contract status</h2>
        <div className="flex flex-wrap gap-4">
          {MOCK_CONTRACTS.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${c.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : c.status === 'Pending confirmation'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {c.status}
              </span>
              <span className="text-sm font-bold text-slate-900">{c.code}</span>
              <span className="text-xs text-slate-500">
                {c.startDate} → {c.endDate}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Shelves + SKUs + Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">view_agenda</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Shelves rented
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{shelvesOccupied}</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-bold text-slate-700">{shelvesAvailable}</span> available
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Total SKUs
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalSKUs}</p>
          <p className="text-xs text-slate-500 mt-1">Unique SKUs in storage</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-2xl">numbers</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Total quantity
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalQty}</p>
          <p className="text-xs text-slate-500 mt-1">By counting rule (contract unit)</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              In progress
            </h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{requestsInProgress}</p>
          <p className="text-xs text-slate-500 mt-1">Rent + service requests</p>
        </div>
      </div>

      {/* Recent activity */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Recent activity</h2>
          <div className="flex gap-4">
            <Link
              href="/customer/rent-requests"
              className="text-sm font-bold text-primary hover:text-primary-dark"
            >
              Rent requests
            </Link>
            <Link
              href="/customer/service-requests"
              className="text-sm font-bold text-primary hover:text-primary-dark"
            >
              Service requests
            </Link>
          </div>
        </div>
        <ul className="space-y-0">
          {MOCK_ACTIVITIES.slice(0, 6).map((a, i) => (
            <li
              key={a.id}
              className="flex gap-4 py-4 border-b border-slate-100 last:border-0"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`size-9 rounded-full flex items-center justify-center ${a.type === 'contract'
                      ? 'bg-primary/10 text-primary'
                      : a.type === 'rent_request'
                        ? 'bg-amber-500/10 text-amber-600'
                        : a.type === 'service'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {a.type === 'contract'
                      ? 'description'
                      : a.type === 'rent_request'
                        ? 'request_quote'
                        : a.type === 'service'
                          ? 'local_shipping'
                          : 'inventory_2'}
                  </span>
                </div>
                {i < 5 && (
                  <div className="w-px flex-1 min-h-[1rem] bg-slate-200 mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <p className="text-sm font-bold text-slate-900">{a.title}</p>
                {a.detail && (
                  <p className="text-xs text-slate-500 mt-0.5">{a.detail}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  {new Date(a.date).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
