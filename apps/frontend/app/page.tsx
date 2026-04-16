'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listContractPackages, type ContractPackage } from '../lib/contract-packages.api';
import { clearAuth, getAuthState } from '../lib/auth';
import { getApiUrl } from '../lib/api-client';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

interface PublicWarehouse {
  _id: string;
  name: string;
  address: string;
  area: number;
  description?: string;
}

async function listPublicWarehouses(): Promise<PublicWarehouse[]> {
  const res = await fetch(getApiUrl('/public/warehouses'));
  if (!res.ok) throw new Error('Failed to load warehouses');
  const json = await res.json();
  return (json?.data ?? json) as PublicWarehouse[];
}

function dashboardPathForRole(role: string | null): string | null {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === 'CUSTOMER') return '/customer/dashboard';
  if (r === 'ADMIN') return '/admin/dashboard';
  if (r === 'MANAGER') return '/manager/dashboard';
  if (r === 'STAFF') return '/staff/dashboard';
  return null;
}

/* ─── Static data ─────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: 'deployed_code',
    title: 'Smart Inventory Control',
    description:
      'Track every item down to the exact shelf position. Inbound, outbound, and cycle counts are fully automated with real-time sync.',
    color: 'bg-primary',
  },
  {
    icon: 'compare_arrows',
    title: 'Inbound & Outbound Flow',
    description:
      'Clear request-to-completion workflows for every shipment. Staff process tasks fast while managers monitor all statuses at a glance.',
    color: 'bg-amber-500',
  },
  {
    icon: 'assignment_turned_in',
    title: 'Contract Management',
    description:
      'Handle storage contracts with predefined packages or custom periods. Payment history, invoices, and renewals — all in one place.',
    color: 'bg-violet-600',
  },
  {
    icon: 'inventory',
    title: 'Cycle Counting',
    description:
      'Scheduled inventory audits detect stock discrepancies instantly and reconcile physical counts with system records automatically.',
    color: 'bg-emerald-600',
  },
  {
    icon: 'bar_chart_4_bars',
    title: 'Analytics & Reports',
    description:
      'Role-specific dashboards for Admin, Manager, Staff, and Customer. Trend charts, warehouse performance, and stock health at a glance.',
    color: 'bg-rose-500',
  },
  {
    icon: 'smart_toy',
    title: 'AI-Powered Insights',
    description:
      'Built-in AI assistant analyses warehouse data, suggests storage optimisations, and forecasts inbound/outbound demand.',
    color: 'bg-slate-800',
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Register & Create Contract',
    body: 'Customers submit a storage request, choose a package, and sign a contract — entirely within the platform.',
  },
  {
    step: '02',
    title: 'Receive Goods & Assign Slots',
    body: 'Staff accept inbound shipments, scan items, and the system automatically assigns optimal shelf positions.',
  },
  {
    step: '03',
    title: 'Monitor & Manage',
    body: 'Managers and customers track live inventory, raise outbound requests, and review cycle-count results in real time.',
  },
] as const;

/* ─── Component ───────────────────────────────────────────────── */

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<{
    loggedIn: boolean;
    dashboardPath: string | null;
  }>({ loggedIn: false, dashboardPath: null });

  useEffect(() => {
    const state = getAuthState();
    const dashboardPath = dashboardPathForRole(state.role);
    const loggedIn = state.isAuthenticated && dashboardPath !== null;
    setSession({ loggedIn, dashboardPath });
  }, []);

  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [packages, setPackages] = useState<ContractPackage[]>([]);

  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<PublicWarehouse[]>([]);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setPackagesLoading(true);
        setPackagesError(null);
        const list = await listContractPackages();
        if (cancelled) return;
        setPackages(list);
      } catch (e) {
        if (cancelled) return;
        setPackagesError(e instanceof Error ? e.message : 'Failed to load packages');
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listPublicWarehouses()
      .then((list) => { if (!cancelled) { setWarehouses(list); if (list.length > 0) setSelectedWarehouseId(list[0]._id); } })
      .catch(() => { if (!cancelled) setWarehouses([]); })
      .finally(() => { if (!cancelled) setWarehousesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activePackages = useMemo(() => packages.filter((p) => p.isActive), [packages]);

  const packagesByWarehouse = useMemo(() => {
    const map = new Map<string, ContractPackage[]>();
    for (const p of activePackages) {
      if (!map.has(p.warehouseId)) map.set(p.warehouseId, []);
      map.get(p.warehouseId)!.push(p);
    }
    return map;
  }, [activePackages]);

  const selectedPackages = useMemo(
    () => (selectedWarehouseId ? (packagesByWarehouse.get(selectedWarehouseId) ?? []) : []),
    [selectedWarehouseId, packagesByWarehouse],
  );

  const navigateTo = (path: string) => router.push(path);
  const handleLogout = () => {
    clearAuth();
    setSession({ loggedIn: false, dashboardPath: null });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden">

      {/* ── Ambient orbs ──────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[30%] -left-[15%] size-[800px] rounded-full bg-primary/[0.07] blur-[160px] animate-float-slow" />
        <div className="absolute top-[45%] -right-[20%] size-[600px] rounded-full bg-amber-400/[0.06] blur-[120px] animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute bottom-[10%] left-[30%] size-[500px] rounded-full bg-violet-500/[0.04] blur-[140px] animate-float-slow" style={{ animationDelay: '-4s' }} />
      </div>

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 px-4 pt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/25">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>warehouse</span>
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">SIMS</span>
            <span className="hidden sm:block text-[10px] font-semibold text-slate-400 border border-slate-200 rounded-md px-1.5 py-0.5 tracking-wide">LOGISTICS</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {(['Features', 'How It Works', 'Packages'] as const).map((label, i) => (
              <a
                key={label}
                href={['#features', '#how-it-works', '#packages'][i]}
                className="text-sm font-medium text-slate-500 hover:text-primary transition-colors duration-200"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {session.loggedIn && session.dashboardPath ? (
              <>
                <Button
                  variant="primary" size="sm"
                  onClick={() => navigateTo(session.dashboardPath!)}
                  leftIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>}
                >
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>Sign out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('/login')}>Sign in</Button>
                <Button
                  variant="primary" size="sm"
                  onClick={() => navigateTo('/request')}
                  rightIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-28 px-6 text-center overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 hero-grid-overlay opacity-60 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto space-y-8">
          {/* Animated pill */}
          <div className="animate-slide-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/25 bg-primary-light text-primary text-xs font-semibold shadow-sm">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Smart AI-powered Inventory Management System
          </div>

          {/* Headline */}
          <h1 className="animate-slide-up stagger-1 text-[clamp(2.6rem,6.5vw,5rem)] font-black text-slate-900 leading-[1.02] tracking-tight">
            One platform to{' '}
            <span className="relative inline-block">
              <span className="text-gradient">control every shelf</span>
            </span>
            ,<br />
            <span className="text-slate-400 font-extrabold">from intake to delivery.</span>
          </h1>

          {/* Sub */}
          <p className="animate-slide-up stagger-2 text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto">
            SIMS-AI connects warehouse managers, customers, and on-floor staff on a single unified platform — with real-time inventory, AI insights, and complete contract visibility.
          </p>

          {/* CTAs */}
          <div className="animate-slide-up stagger-3 flex flex-wrap items-center justify-center gap-3 pt-2">
            {session.loggedIn && session.dashboardPath ? (
              <Button
                variant="primary" size="lg"
                onClick={() => navigateTo(session.dashboardPath!)}
                rightIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="primary" size="lg"
                  onClick={() => navigateTo('/request')}
                  rightIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>}
                >
                  Request Storage
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigateTo('/login')}>
                  Sign In
                </Button>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
              Everything you need to run<br />a warehouse at scale
            </h2>
            <p className="text-slate-500 text-base leading-relaxed">
              From inbound receiving to scheduled audits, SIMS-AI provides purpose-built tools for every role in your logistics chain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  'group relative bg-white rounded-2xl border border-slate-200 p-6',
                  'feature-card-glow shadow-card hover:shadow-elevated hover:-translate-y-1',
                  'transition-all duration-300 overflow-hidden',
                  `stagger-${Math.min(i + 1, 6)}`,
                )}
              >
                {/* Subtle hover gradient sweep */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/[0.03] group-hover:to-transparent transition-all duration-300 pointer-events-none rounded-2xl" />

                <div className={cn(
                  'relative size-11 rounded-xl flex items-center justify-center text-white mb-5 shadow-sm',
                  'group-hover:scale-110 transition-transform duration-300',
                  f.color,
                )}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{f.icon}</span>
                </div>
                <h3 className="relative text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="relative text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Up and running in 3 steps
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-base leading-relaxed">
              Onboarding is simple. Your team can start managing warehouse operations the same day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-[2.75rem] left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px">
              <div className="h-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-primary/40" />
            </div>

            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={item.step}
                className={cn(
                  'relative bg-white rounded-2xl border border-slate-200 p-8 shadow-card text-center',
                  'hover:shadow-elevated hover:-translate-y-1 transition-all duration-300',
                  `stagger-${i + 1}`,
                )}
              >
                {/* Step number */}
                <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center text-sm font-black mx-auto mb-6 shadow-md shadow-primary/25 animate-border-glow">
                  {item.step}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Warehouses & Packages ─────────────────────────────────── */}
      <section id="packages" className="relative py-28 px-6 bg-slate-50/70 border-y border-slate-100 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.4]" />
        <div className="pointer-events-none absolute -top-32 right-0 size-[500px] rounded-full bg-primary/[0.06] blur-3xl" />

        <div className="relative max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Facilities & Packages</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Pick a warehouse, choose a plan
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-base leading-relaxed">
              Browse our warehouse network and the storage packages available at each facility. All pricing is transparent — no hidden fees.
            </p>
          </div>

          {warehousesLoading ? (
            /* Loading skeleton */
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-72 shrink-0 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
                    <LoadingSkeleton className="h-4 w-3/5" />
                    <LoadingSkeleton className="h-3 w-4/5" />
                    <LoadingSkeleton className="h-3 w-2/5" />
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                    <LoadingSkeleton className="h-5 w-24 rounded-full" />
                    <LoadingSkeleton className="h-6 w-4/5" />
                    <LoadingSkeleton className="h-4 w-full" />
                    <LoadingSkeleton className="h-10 w-full rounded-xl mt-4" />
                  </div>
                ))}
              </div>
            </div>
          ) : warehouses.length === 0 ? (
            <EmptyState
              icon="warehouse"
              title="No facilities listed yet"
              message="Our warehouse network will be published here soon."
            />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:h-[640px]">

              {/* ── Left: warehouse list ─────────────────── */}
              <div className="w-full lg:w-72 shrink-0 lg:h-full">
                {/* Mobile: horizontal scroll tabs */}
                <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
                  {warehouses.map((wh, idx) => (
                    <button
                      key={wh._id}
                      type="button"
                      onClick={() => setSelectedWarehouseId(wh._id)}
                      className={cn(
                        'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                        selectedWarehouseId === wh._id
                          ? 'bg-primary text-white border-primary shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40',
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warehouse</span>
                      <span className="whitespace-nowrap">{wh.name}</span>
                    </button>
                  ))}
                </div>

                {/* Desktop: vertical card list — scrollable */}
                <div className="hidden lg:flex flex-col gap-2 h-full overflow-y-auto pr-1 custom-scrollbar">
                  {warehouses.map((wh, idx) => {
                    const pkgCount = packagesByWarehouse.get(wh._id)?.length ?? 0;
                    const isSelected = selectedWarehouseId === wh._id;
                    return (
                      <button
                        key={wh._id}
                        type="button"
                        onClick={() => setSelectedWarehouseId(wh._id)}
                        className={cn(
                          'w-full text-left rounded-2xl border p-4 transition-all duration-200',
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:shadow-card',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className={cn(
                            'size-8 rounded-lg flex items-center justify-center shrink-0',
                            isSelected ? 'bg-white/20' : 'bg-primary-light',
                          )}>
                            <span
                              className={cn('material-symbols-outlined', isSelected ? 'text-white' : 'text-primary')}
                              style={{ fontSize: 16 }}
                            >warehouse</span>
                          </div>
                          <span className={cn(
                            'text-[10px] font-black rounded-md px-1.5 py-0.5 tracking-widest',
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400',
                          )}>
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <p className={cn('text-sm font-black leading-snug', isSelected ? 'text-white' : 'text-slate-900')}>
                          {wh.name}
                        </p>
                        <div className={cn('flex items-start gap-1 mt-1.5', isSelected ? 'text-white/70' : 'text-slate-500')}>
                          <span className="material-symbols-outlined shrink-0 mt-px" style={{ fontSize: 13 }}>location_on</span>
                          <p className="text-xs line-clamp-2 leading-snug">{wh.address}</p>
                        </div>
                        <div className={cn('flex items-center justify-between mt-3 pt-2.5 border-t', isSelected ? 'border-white/20' : 'border-slate-100')}>
                          <span className={cn('text-[10px] font-semibold', isSelected ? 'text-white/60' : 'text-slate-400')}>
                            {wh.area.toLocaleString()} m²
                          </span>
                          <span className={cn(
                            'text-[10px] font-black px-2 py-0.5 rounded-full',
                            isSelected ? 'bg-white/20 text-white' : 'bg-primary-light text-primary',
                          )}>
                            {pkgCount} package{pkgCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Right: packages for selected warehouse ── */}
              <div className="flex-1 min-w-0 overflow-y-auto max-h-[600px] lg:max-h-none lg:h-full custom-scrollbar">
                {(() => {
                  const wh = warehouses.find((w) => w._id === selectedWarehouseId);
                  return (
                    <>
                      {/* Warehouse detail header */}
                      {wh && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 flex flex-wrap items-center gap-4 shadow-card">
                          <div className="size-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>warehouse</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900">{wh.name}</p>
                            {wh.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{wh.description}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                              {wh.address}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>straighten</span>
                              {wh.area.toLocaleString()} m²
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Packages */}
                      {packagesLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                              <LoadingSkeleton className="h-5 w-24 rounded-full" />
                              <LoadingSkeleton className="h-6 w-4/5" />
                              <LoadingSkeleton className="h-4 w-full" />
                              <LoadingSkeleton className="h-10 w-full rounded-xl mt-4" />
                            </div>
                          ))}
                        </div>
                      ) : packagesError ? (
                        <ErrorState title="Failed to load packages" message={packagesError} onRetry={() => window.location.reload()} />
                      ) : selectedPackages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                          <span className="material-symbols-outlined text-slate-300 text-5xl">inventory_2</span>
                          <p className="mt-3 text-sm font-semibold text-slate-500">No packages available for this warehouse yet.</p>
                          <p className="text-xs text-slate-400 mt-1">You can still submit a custom rental request.</p>
                          <button
                            type="button"
                            onClick={() => navigateTo('/request')}
                            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                          >
                            Request Custom Period
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                          {selectedPackages.map((p) => (
                            <article
                              key={p._id}
                              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card hover:shadow-elevated hover:-translate-y-1 hover:border-primary/30 transition-all duration-200"
                            >
                              {/* Duration badge */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="size-8 rounded-lg bg-primary-light flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>inventory_2</span>
                                  </div>
                                  <Badge variant="info" size="sm">
                                    {p.duration} {p.unit}{p.duration > 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              </div>

                              <h3 className="text-base font-black text-slate-900 leading-snug mb-1">{p.name}</h3>
                              <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1 line-clamp-2">
                                {p.description || 'Storage rental package with a fixed duration and transparent pricing.'}
                              </p>

                              {/* Price */}
                              <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 mb-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Pricing</p>
                                <p className="text-base font-black tabular-nums text-primary">
                                  {Number(p.pricePerM2 ?? 0).toLocaleString('vi-VN')} ₫/m²
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  + {Number(p.pricePerDay ?? 0).toLocaleString('vi-VN')} ₫/day
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => navigateTo('/customer/rent-requests')}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-700 transition-all active:scale-[0.98]"
                              >
                                Choose this package
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                              </button>
                            </article>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-primary rounded-3xl px-10 py-20 text-center overflow-hidden shadow-2xl shadow-primary/25">
            {/* Animated mesh */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-1/2 -left-1/4 size-[600px] rounded-full bg-white/5 blur-3xl animate-float-slow" />
              <div className="absolute -bottom-1/2 -right-1/4 size-[500px] rounded-full bg-white/5 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
              {/* Subtle dot grid */}
              <div className="absolute inset-0 bg-dot-grid opacity-[0.08]" />
            </div>

            <div className="relative z-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System is live
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Ready to optimise your warehouse?
              </h2>
              <p className="text-white/70 text-base max-w-lg mx-auto leading-relaxed">
                Get started today with a professional warehouse management system. No complex setup — just sign up and go.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => navigateTo('/request')}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-[0.97] shadow-lg"
                >
                  Get Started Free
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
                <button
                  onClick={() => navigateTo('/login')}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/15 text-white rounded-xl font-semibold text-sm hover:bg-white/25 transition-all border border-white/20"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-3 gap-10">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="size-9 bg-primary rounded-xl flex items-center justify-center shadow">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>warehouse</span>
              </div>
              <span className="text-base font-black tracking-tight text-slate-900">SIMS Logistics</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              A professional warehouse management platform built for modern logistics teams and their customers.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Platform</h5>
            <ul className="space-y-2.5">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'How It Works', href: '#how-it-works' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-slate-500 hover:text-primary transition-colors">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">© 2026 SIMS-AI. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>verified</span>
              Built for ISP490 Project
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
