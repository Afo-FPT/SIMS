
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listContractPackages, type ContractPackage } from '../lib/contract-packages.api';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

export default function LandingPage() {
  const router = useRouter();
  const [isCustomer] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const MAX_PRICING_PACKAGES = 6;
  const packagesPreview = useMemo(() => packages.slice(0, MAX_PRICING_PACKAGES), [packages]);
  const hasMorePackages = packages.length > MAX_PRICING_PACKAGES;

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('sws_persona');
    localStorage.removeItem('sws_email');
    localStorage.removeItem('sws_name');
    localStorage.removeItem('sws_title');
    localStorage.removeItem('sws_avatar');
    localStorage.removeItem('sws_verified');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] size-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] -right-[10%] size-[500px] bg-amber-500/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/70 backdrop-blur-xl border border-slate-200/50 px-6 py-3 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary size-10 rounded-xl text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined !text-2xl">warehouse</span>
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">SIMS-AI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors">Features</a>
            <a href="#solutions" className="text-xs font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors">Solutions</a>
            <a href="#pricing" className="text-xs font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            {isCustomer ? (
              <>
                <span className="hidden sm:block text-sm font-bold text-slate-900">Welcome, Customer</span>
                <button onClick={() => navigateTo('/customer/dashboard')} className="px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl shadow-xl shadow-primary/20 uppercase tracking-widest hover:bg-primary-dark transition-all active:scale-95">
                  My Dashboard
                </button>
                <button onClick={handleLogout} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigateTo('/login')} className="hidden sm:block text-sm font-bold text-slate-900 hover:text-primary transition-colors">Sign In</button>
                <button onClick={() => navigateTo('/request')} className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl shadow-xl shadow-slate-900/20 uppercase tracking-widest hover:bg-primary transition-all active:scale-95">Get Started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 text-center relative">
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
            <span className="size-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Next-Gen Logistics OS v4.0</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-tight">
            The intelligent <span className="text-primary italic">spine</span> for modern commerce.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
            Decentralized per-shelf warehousing powered by Gemini 3. Optimize throughput, minimize travel, and scale your physical footprint with code.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            {isCustomer ? (
              <button onClick={() => navigateTo('/customer/dashboard')} className="w-full sm:w-auto px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 text-lg hover:-translate-y-1 transition-all">
                Go to My Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigateTo('/request')} className="w-full sm:w-auto px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 text-lg hover:-translate-y-1 transition-all">Start Scaling Now</button>
                <button className="w-full sm:w-auto px-10 py-5 bg-white border border-slate-200 text-slate-900 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm">
                  <span className="material-symbols-outlined text-slate-400">play_circle</span>
                  See it in action
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-none md:grid-rows-2 gap-6 h-auto md:h-[800px]">
          
          {/* Large Feature Card: AI Core */}
          <div className="md:col-span-8 md:row-span-1 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group border border-slate-800 shadow-2xl">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 bg-primary/20 text-primary-light border border-primary/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">Engine Core</span>
                <h3 className="text-4xl font-black tracking-tight mb-4">Gemini-Driven<br/>Layout Intelligence</h3>
                <p className="text-slate-400 font-medium max-w-md">Our proprietary AI analyzes real-time throughput to redesign your shelf layout on-the-fly, reducing human travel by up to 42%.</p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest">Dynamic Pathing</div>
                <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest">Bottleneck Prediction</div>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <span className="material-symbols-outlined !text-[240px]">cognition</span>
            </div>
          </div>

          {/* Small Feature Card: Real-time */}
          <div className="md:col-span-4 md:row-span-1 bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative group overflow-hidden">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="size-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl shadow-amber-500/20 group-hover:rotate-12 transition-transform">
                <span className="material-symbols-outlined !text-3xl">barcode_scanner</span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Live SDK Scanner</h4>
                <p className="text-sm text-slate-500 font-medium">Native camera support for instant SKU identification and task verification.</p>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 size-40 bg-amber-50 rounded-full blur-3xl opacity-50"></div>
          </div>

          {/* Medium Feature Card: Per-shelf */}
          <div className="md:col-span-4 md:row-span-1 bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 shadow-inner relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Per-Shelf Rental</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Don't pay for empty square footage. Rent exact shelf units based on your inventory size, scaling up or down daily.</p>
            </div>
            <div className="mt-8 grid grid-cols-4 gap-2 opacity-40">
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`h-8 rounded-lg ${i % 3 === 0 ? 'bg-primary' : 'bg-slate-300'}`}></div>
              ))}
            </div>
          </div>

          {/* Large Feature Card: Global Scale */}
          <div className="md:col-span-8 md:row-span-1 bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden group flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1 space-y-6">
              <h3 className="text-4xl font-black text-slate-900 tracking-tight">Global Fulfillment, Local Presence.</h3>
              <p className="text-slate-500 font-medium">Provision storage space across 42 global hubs with a single API call. Managed cross-docking and regional distribution handled automatically.</p>
              <div className="flex gap-10">
                <div>
                  <p className="text-3xl font-black text-primary tracking-tighter">42</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Hubs</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">0.8s</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provisioning</p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-64 aspect-square bg-slate-100 rounded-3xl overflow-hidden relative border border-slate-200">
               <img src="https://picsum.photos/seed/map/500/500" className="object-cover size-full grayscale hover:grayscale-0 transition-all duration-700" alt="Map" />
               <div className="absolute inset-0 bg-primary/10 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-28 px-6 border-y border-slate-100 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50/80" />
        <div className="pointer-events-none absolute -top-24 right-0 size-[420px] rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 size-[320px] rounded-full bg-amber-400/[0.05] blur-3xl" />

        <div className="relative max-w-7xl mx-auto space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em]">
              Pricing
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Rental packages
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Predefined durations and pricing from your operations team. Pick a package or go custom when you submit a rental request.
            </p>
          </div>

          {pricingLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 shadow-sm space-y-4 ring-1 ring-slate-100"
                >
                  <LoadingSkeleton className="h-5 w-24 rounded-full" />
                  <LoadingSkeleton className="h-8 w-4/5" />
                  <LoadingSkeleton className="h-4 w-full" />
                  <LoadingSkeleton className="h-4 w-2/3" />
                  <div className="pt-6 border-t border-slate-100 space-y-3">
                    <LoadingSkeleton className="h-4 w-20" />
                    <LoadingSkeleton className="h-10 w-40" />
                    <LoadingSkeleton className="h-11 w-full rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : pricingError ? (
            <ErrorState
              title="Failed to load pricing packages"
              message={pricingError}
              onRetry={() => window.location.reload()}
            />
          ) : packages.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="No package available"
              message="No predefined packages have been configured yet. You can still submit a rental request with a Custom time period."
              action={
                <button
                  onClick={() => navigateTo('/request')}
                  className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-colors"
                >
                  Request custom period
                </button>
              }
            />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 text-center">
                {hasMorePackages ? (
                  <p className="text-xs font-bold text-slate-500">
                    Showing <span className="text-slate-900">{MAX_PRICING_PACKAGES}</span> of{' '}
                    <span className="text-slate-900">{packages.length}</span> packages
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {packages.length} {packages.length === 1 ? 'package' : 'packages'} available
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
                {packagesPreview.map((p) => (
                  <article
                    key={p._id}
                    className="group relative flex flex-col rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-900/15">
                            <span className="material-symbols-outlined text-lg">inventory_2</span>
                          </span>
                          <Badge variant="info" size="sm">
                            {p.duration} {p.unit}
                            {p.duration > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                          {p.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500 font-medium mt-3 line-clamp-3 min-h-[3.75rem]">
                      {p.description || 'Warehouse rental package with fixed duration and pricing.'}
                    </p>

                    <div className="mt-auto pt-6">
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Price per zone
                        </p>
                        <p className="text-2xl md:text-3xl font-black text-primary tracking-tight tabular-nums">
                          {Number(p.price).toLocaleString('vi-VN')}{' '}
                          <span className="text-base font-black text-slate-400">VND</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateTo('/customer/rent-requests')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-primary transition-colors active:scale-[0.98]"
                      >
                        Start rental
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {hasMorePackages && (
                <div className="flex flex-col items-center gap-4 pt-4 max-w-lg mx-auto text-center">
                  <p className="text-sm text-slate-500">
                    More packages are available in your rental workspace. Open the full list to compare durations and pricing.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateTo('/customer/rent-requests')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-slate-900 bg-white text-slate-900 text-sm font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors"
                  >
                    View all packages
                    <span className="material-symbols-outlined text-xl">open_in_new</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-24 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Trusted by Infrastructure Leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 grayscale opacity-40">
            <span className="text-2xl font-black italic tracking-tighter">STERLING</span>
            <span className="text-2xl font-black italic tracking-tighter">NEXUS.CORE</span>
            <span className="text-2xl font-black italic tracking-tighter">GLOBAL_LOGS</span>
            <span className="text-2xl font-black italic tracking-tighter">HYPERLINK</span>
            <span className="text-2xl font-black italic tracking-tighter">VELOCITY</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 size-10 rounded-xl text-white flex items-center justify-center">
                <span className="material-symbols-outlined">warehouse</span>
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900">SIMS-AI</span>
            </div>
            <p className="text-sm text-slate-500 font-medium max-w-xs">Building the future of physical resource management with AI and automation.</p>
          </div>
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Platform</h5>
            <ul className="space-y-2 text-sm text-slate-500 font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Company</h5>
            <ul className="space-y-2 text-sm text-slate-500 font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">SLA Agreement</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-50 flex justify-between items-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2024 SIMS-AI Logistics. All rights reserved.</p>
          <div className="flex gap-6">
             <div className="size-5 bg-slate-200 rounded-full"></div>
             <div className="size-5 bg-slate-200 rounded-full"></div>
             <div className="size-5 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
