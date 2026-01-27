
'use client';

import React from 'react';
import Link from 'next/link';
import { MOCK_CONTRACTS } from '../../../lib/customer-mock';

export default function ContractsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contracts</h1>
        <p className="text-slate-500 mt-1">Shelf rental contracts — confirm to activate</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Contract code
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Shelves rented
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Start / End
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CONTRACTS.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-900">{c.code}</td>
                  <td className="px-6 py-4 text-slate-700">{c.shelvesRented}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {c.startDate} → {c.endDate}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${c.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.status === 'Pending confirmation'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/customer/contracts/${c.id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      View detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
