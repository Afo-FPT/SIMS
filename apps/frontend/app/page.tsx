'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listContractPackages, type ContractPackage } from '../lib/contract-packages.api';
import { clearAuth, getAuthState } from '../lib/auth';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

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

  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [packages, setPackages] = useState<ContractPackage[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPackages() {
      try {
        setPricingLoading(true);
        setPricingError(null);
        const list = await listContractPackages();
        if (cancelled) return;
        setPackages(list);
      } catch (e) {
        if (cancelled) return;
        setPricingError(e instanceof Error ? e.message : 'Failed to load pricing packages');
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }
    loadPackages();
    return () => { cancelled = true; };
  }, []);

  const MAX_PRICING_PACKAGES = 6;
  const packagesPreview = useMemo(() => packages.slice(0, MAX_PRICING_PACKAGES), [packages]);
  const hasMorePackages = packages.length > MAX_PRICING_PACKAGES;

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
            {(['Features', 'How It Works', 'Pricing'] as const).map((label, i) => (
              <a
                key={label}
                href={['#features', '#how-it-works', '#pricing'][i]}
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
            Intelligent Warehouse Management System
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
            SIMS connects warehouse managers, customers, and on-floor staff on a single unified platform — with real-time inventory, AI insights, and complete contract visibility.
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
              From inbound receiving to scheduled audits, SIMS provides purpose-built tools for every role in your logistics chain.
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

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <section id="pricing" className="relative py-28 px-6 bg-slate-50/70 border-y border-slate-100 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.4]" />
        <div className="pointer-events-none absolute -top-32 right-0 size-[500px] rounded-full bg-primary/[0.06] blur-3xl" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Flexible storage packages
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-base leading-relaxed">
              Choose from predefined packages or submit a custom request tailored to your business needs.
            </p>
          </div>

          {pricingLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                  <LoadingSkeleton className="h-5 w-24 rounded-full" />
                  <LoadingSkeleton className="h-7 w-4/5" />
                  <LoadingSkeleton className="h-4 w-full" />
                  <LoadingSkeleton className="h-4 w-2/3" />
                  <div className="pt-5 border-t border-slate-100 space-y-3">
                    <LoadingSkeleton className="h-14 w-full rounded-xl" />
                    <LoadingSkeleton className="h-11 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : pricingError ? (
            <ErrorState
              title="Failed to load storage packages"
              message={pricingError}
              onRetry={() => window.location.reload()}
            />
          ) : packages.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="No packages available yet"
              message="No predefined packages have been configured. You can still submit a rental request with a custom duration."
              action={
                <Button variant="primary" onClick={() => navigateTo('/request')}>
                  Request Custom Period
                </Button>
              }
            />
          ) : (
            <>
              {hasMorePackages && (
                <p className="text-center text-xs text-slate-400 mb-8">
                  Showing <span className="font-bold text-slate-700">{MAX_PRICING_PACKAGES}</span> of{' '}
                  <span className="font-bold text-slate-700">{packages.length}</span> packages
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {packagesPreview.map((p, idx) => {
                  const isFeatured = idx === 1 && packagesPreview.length >= 3;
                  return (
                    <article
                      key={p._id}
                      className={cn(
                        'group relative flex flex-col rounded-2xl p-6 transition-all duration-300',
                        isFeatured
                          ? 'pricing-featured bg-primary text-white shadow-xl shadow-primary/25 hover:-translate-y-1.5'
                          : 'bg-white border border-slate-200 shadow-card hover:shadow-elevated hover:-translate-y-1 hover:border-primary/30',
                      )}
                    >
                      {isFeatured && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                          <span className="px-3.5 py-1 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm">
                            Most Popular
                          </span>
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className={cn(
                          'size-10 rounded-xl flex items-center justify-center shadow-sm shrink-0',
                          isFeatured ? 'bg-white/20' : 'bg-primary-light',
                        )}>
                          <span
                            className={cn('material-symbols-outlined', isFeatured ? 'text-white' : 'text-primary')}
                            style={{ fontSize: 20 }}
                          >
                            inventory_2
                          </span>
                        </div>
                        <Badge variant={isFeatured ? 'neutral' : 'info'} size="sm">
                          {p.duration} {p.unit}{p.duration > 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <h3 className={cn('text-lg font-bold leading-snug mb-2', isFeatured ? 'text-white' : 'text-slate-900')}>
                        {p.name}
                      </h3>

                      <p className={cn('text-sm leading-relaxed mb-5 line-clamp-2 flex-1', isFeatured ? 'text-white/70' : 'text-slate-500')}>
                        {p.description || 'Storage rental package with a fixed duration and transparent pricing.'}
                      </p>

                      {/* Price block */}
                      <div className={cn(
                        'rounded-xl px-4 py-3 mb-4',
                        isFeatured ? 'bg-white/15' : 'bg-slate-50 border border-slate-100',
                      )}>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1', isFeatured ? 'text-white/60' : 'text-slate-400')}>
                          Pricing basis
                        </p>
                        <p className={cn('text-base font-black tabular-nums', isFeatured ? 'text-white' : 'text-primary')}>
                          {Number(p.pricePerM2 ?? 0).toLocaleString('vi-VN')} ₫/m²
                        </p>
                        <p className={cn('text-xs mt-0.5', isFeatured ? 'text-white/60' : 'text-slate-400')}>
                          + {Number(p.pricePerDay ?? 0).toLocaleString('vi-VN')} ₫/day
                        </p>
                      </div>

                      {/* CTA */}
                      <button
                        type="button"
                        onClick={() => navigateTo('/customer/rent-requests')}
                        className={cn(
                          'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
                          isFeatured
                            ? 'bg-white text-primary hover:bg-slate-50 shadow'
                            : 'bg-primary text-white hover:bg-primary-700',
                        )}
                      >
                        Choose this package
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                      </button>
                    </article>
                  );
                })}
              </div>

              {hasMorePackages && (
                <div className="mt-12 text-center">
                  <Button
                    variant="outline" size="md"
                    onClick={() => navigateTo('/customer/rent-requests')}
                    rightIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>}
                  >
                    View all packages
                  </Button>
                </div>
              )}
            </>
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
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
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

          <div className="space-y-4">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Support</h5>
            <ul className="space-y-2.5">
              {['Privacy Policy', 'Terms of Service', 'Contact Support'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-slate-500 hover:text-primary transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">© 2025 SIMS Logistics. All rights reserved.</p>
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
