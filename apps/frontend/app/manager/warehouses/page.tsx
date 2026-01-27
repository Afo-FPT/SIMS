'use client';

import React, { useState, useEffect } from 'react';
import type { Shelf } from '../../../types/manager';
import { listShelves, listContracts, assignShelf, releaseShelf } from '../../../lib/mockApi/manager.api';
import type { Contract } from '../../../lib/customer-types';
import { useToastHelpers } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ManagerWarehousesPage() {
  const toast = useToastHelpers();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, c] = await Promise.all([listShelves(), listContracts()]);
      setShelves(s);
      setContracts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      toast.error('Failed to load shelves');
    } finally {
      setLoading(false);
    }
  };

  const openAssign = (s: Shelf) => {
    if (s.status === 'Occupied') return;
    setSelectedShelf(s);
    setSelectedContractId('');
    setAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedShelf || !selectedContractId) return;
    try {
      setUpdating(true);
      await assignShelf(selectedContractId, selectedShelf.id);
      toast.success('Shelf assigned to contract');
      setAssignModal(false);
      setSelectedShelf(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setUpdating(false);
    }
  };

  const handleRelease = async (s: Shelf) => {
    if (s.status !== 'Occupied') return;
    try {
      setUpdating(true);
      await releaseShelf(s.id);
      toast.success('Shelf released');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to release');
    } finally {
      setUpdating(false);
    }
  };

  const activeContracts = contracts.filter((c) => c.status === 'Active');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warehouses</h1>
        <p className="text-slate-500 mt-1">Shelf and slot management</p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState title="Failed to load" message={error} onRetry={load} />
      ) : shelves.length === 0 ? (
        <EmptyState icon="warehouse" title="No shelves" message="No shelf data" />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableHeader>Shelf code</TableHeader>
              <TableHeader>Zone</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Contract</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {shelves.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-bold text-slate-900">{s.code}</TableCell>
                  <TableCell className="text-slate-700">{s.zone}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'Occupied' ? 'warning' : 'success'}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">{s.contractCode || '—'}</TableCell>
                  <TableCell>
                    {s.status === 'Available' ? (
                      <button type="button" onClick={() => openAssign(s)} className="text-sm font-bold text-primary hover:underline">
                        Assign to contract
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleRelease(s)} disabled={updating} className="text-sm font-bold text-red-600 hover:underline">
                        Release
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {assignModal && selectedShelf && (
        <Modal open={assignModal} onOpenChange={setAssignModal} title="Assign shelf to contract" size="md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Shelf {selectedShelf.code} ({selectedShelf.zone})</p>
            <Select
              label="Contract"
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              options={[{ value: '', label: 'Select contract' }, ...activeContracts.map((c) => ({ value: c.id, label: `${c.code} — ${c.customerName || ''}` }))]}
            />
            <div className="flex gap-3">
              <Button onClick={handleAssign} disabled={!selectedContractId || updating}>Assign</Button>
              <Button variant="ghost" onClick={() => { setAssignModal(false); setSelectedShelf(null); }}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
