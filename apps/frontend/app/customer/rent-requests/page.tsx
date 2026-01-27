
'use client';

import React, { useState } from 'react';
import type {
  RentRequest,
  RentRequestStatus,
  StorageZone,
  GoodsCategory,
  CountingUnit,
} from '../../../lib/customer-types';
import { MOCK_RENT_REQUESTS } from '../../../lib/customer-mock';
import { useToastHelpers } from '../../../lib/toast';

const DURATION_OPTIONS = [1, 3, 6, 12] as const;
const ZONES: StorageZone[] = ['Zone A', 'Zone B', 'Zone C', 'No preference'];
const GOODS: { id: GoodsCategory; label: string }[] = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'cosmetics', label: 'Cosmetics' },
  { id: 'food', label: 'Food' },
  { id: 'documents', label: 'Documents' },
  { id: 'apparel', label: 'Apparel' },
  { id: 'other', label: 'Other' },
];
const HANDLING: ('fragile' | 'keep dry' | 'do not stack')[] = [
  'fragile',
  'keep dry',
  'do not stack',
];
const COUNTING_UNITS: { id: CountingUnit; label: string }[] = [
  { id: 'piece', label: 'Piece' },
  { id: 'box', label: 'Box' },
  { id: 'carton', label: 'Carton' },
  { id: 'pallet', label: 'Pallet' },
];

const today = new Date().toISOString().slice(0, 10);

export default function RentRequestsPage() {
  const toast = useToastHelpers();
  const [requests, setRequests] = useState<RentRequest[]>(MOCK_RENT_REQUESTS);
  const [shelves, setShelves] = useState(1);
  const [startDate, setStartDate] = useState(today);
  const [duration, setDuration] = useState(6);
  const [zone, setZone] = useState<StorageZone>('No preference');
  const [goods, setGoods] = useState<GoodsCategory[]>([]);
  const [handling, setHandling] = useState<('fragile' | 'keep dry' | 'do not stack')[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [countingUnit, setCountingUnit] = useState<CountingUnit>('piece');
  const [boxToPiece, setBoxToPiece] = useState('');
  const [cartonToBox, setCartonToBox] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  const toggleGood = (g: GoodsCategory) => {
    setGoods((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const toggleHandling = (h: 'fragile' | 'keep dry' | 'do not stack') => {
    setHandling((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (shelves <= 0) e.shelves = 'Shelves must be > 0';
    if (duration <= 0) e.duration = 'Duration must be > 0';
    if (new Date(startDate) < new Date(today)) e.startDate = 'Start date must be >= today';
    if (!countingUnit) e.countingUnit = 'Counting unit is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.warning('Please fix validation errors before submitting');
      return;
    }
    const conversion: { boxToPiece?: number; cartonToBox?: number } = {};
    if (countingUnit !== 'piece' && boxToPiece) conversion.boxToPiece = +boxToPiece;
    if (countingUnit === 'carton' && cartonToBox) conversion.cartonToBox = +cartonToBox;
    const newReq: RentRequest = {
      id: `RR-${String(requests.length + 1).padStart(3, '0')}`,
      shelves,
      startDate,
      durationMonths: duration,
      zonePreference: zone,
      goodsCategory: goods,
      handlingNotes: handling,
      specialNotes: specialNotes || undefined,
      countingUnit,
      conversionRule: Object.keys(conversion).length ? conversion : undefined,
      status: 'Draft',
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newReq, ...prev]);
    setDetailId(newReq.id);
    toast.success(`Rent request ${newReq.id} created as draft`);
  };

  const submitRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id && r.status === 'Draft'
          ? { ...r, status: 'Submitted' as RentRequestStatus }
          : r
      )
    );
    setDetailId(null);
    toast.success(`Rent request ${id} submitted successfully`);
  };

  const cancelRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setDetailId(null);
    toast.info(`Rent request ${id} cancelled`);
  };

  const selected = detailId ? requests.find((r) => r.id === detailId) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Rent Requests
        </h1>
        <p className="text-slate-500 mt-1">Create shelf rental requests and manage status</p>
      </div>

      {/* Form: Create Shelf Rental Request */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8"
      >
        <h2 className="text-xl font-black text-slate-900">Create Shelf Rental Request</h2>

        {/* Section 1 — Rental Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
            Section 1 — Rental info <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Number of shelves/slots
              </label>
              <input
                type="number"
                min={1}
                value={shelves}
                onChange={(e) => setShelves(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {errors.shelves && (
                <p className="text-xs text-red-500 mt-1">{errors.shelves}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Start date
              </label>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Duration (months)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} month{d > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              {errors.duration && (
                <p className="text-xs text-red-500 mt-1">{errors.duration}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Storage area preference (optional)
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as StorageZone)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2 — Goods Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
            Section 2 — Goods info
          </h3>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Goods category (multi-select)
            </label>
            <div className="flex flex-wrap gap-2">
              {GOODS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGood(g.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${goods.includes(g.id)
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Handling notes (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {HANDLING.map((h) => (
                <label key={h} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handling.includes(h)}
                    onChange={() => toggleHandling(h)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-medium capitalize">{h.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Special notes
            </label>
            <textarea
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes for warehouse"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>
        </div>

        {/* Section 3 — Counting Rule */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
            Section 3 — Counting rule <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Counting unit
              </label>
              <select
                value={countingUnit}
                onChange={(e) => setCountingUnit(e.target.value as CountingUnit)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {COUNTING_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
              {errors.countingUnit && (
                <p className="text-xs text-red-500 mt-1">{errors.countingUnit}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {countingUnit !== 'piece' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  1 box = ? pieces (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 24"
                  value={boxToPiece}
                  onChange={(e) => setBoxToPiece(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            )}
            {countingUnit === 'carton' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  1 carton = ? boxes (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 12"
                  value={cartonToBox}
                  onChange={(e) => setCartonToBox(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            )}
          </div>
          {(boxToPiece || cartonToBox) && (
            <p className="text-xs text-slate-500">
              Example: 1 {countingUnit} = {boxToPiece || '?'} pieces
              {countingUnit === 'carton' && cartonToBox && `, 1 carton = ${cartonToBox} boxes`}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-colors"
          >
            Create request (Draft)
          </button>
        </div>
      </form>

      {/* Request List */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <h2 className="text-lg font-black text-slate-900 p-6 pb-0">Request list</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  ID
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Shelves
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Start / Duration
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Unit
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-900">{r.id}</td>
                  <td className="px-6 py-4 text-slate-700">{r.shelves}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {r.startDate} / {r.durationMonths}m
                  </td>
                  <td className="px-6 py-4 text-slate-700">{r.countingUnit}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${r.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'Submitted'
                            ? 'bg-blue-100 text-blue-700'
                            : r.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailId(r.id)}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        View detail
                      </button>
                      {r.status !== 'Approved' && r.status !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => cancelRequest(r.id)}
                          className="text-sm font-bold text-red-500 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                      {r.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => submitRequest(r.id)}
                          className="text-sm font-bold text-emerald-600 hover:underline"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDetailId(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-900 mb-4">Request {selected.id}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Shelves</dt>
                <dd className="font-bold">{selected.shelves}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Start / Duration</dt>
                <dd className="font-bold">
                  {selected.startDate} / {selected.durationMonths} months
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Zone</dt>
                <dd className="font-bold">{selected.zonePreference ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Categories</dt>
                <dd className="font-bold">{selected.goodsCategory.join(', ') || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Counting unit</dt>
                <dd className="font-bold">{selected.countingUnit}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${selected.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : selected.status === 'Submitted'
                          ? 'bg-blue-100 text-blue-700'
                          : selected.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    {selected.status}
                  </span>
                </dd>
              </div>
              {selected.specialNotes && (
                <div>
                  <dt className="text-slate-500 mb-1">Special notes</dt>
                  <dd className="text-slate-700">{selected.specialNotes}</dd>
                </div>
              )}
            </dl>
            <div className="flex gap-3 mt-6">
              {selected.status === 'Draft' && (
                <button
                  type="button"
                  onClick={() => submitRequest(selected.id)}
                  className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark"
                >
                  Submit
                </button>
              )}
              {selected.status !== 'Approved' && selected.status !== 'Rejected' && (
                <button
                  type="button"
                  onClick={() => cancelRequest(selected.id)}
                  className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200"
                >
                  Cancel request
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
