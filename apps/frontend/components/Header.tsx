import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Persona } from '../types';
import { deleteReadNotifications, listMyNotifications, markNotificationRead, type AppNotification, getMyUnreadCount, markAllNotificationsRead } from '../lib/notifications.api';
import { getNotificationSocket } from '../lib/notifications.socket';
import { Badge } from './ui/Badge';

interface HeaderProps {
  activeView: string;
  persona: Persona;
}

const Header: React.FC<HeaderProps> = ({ activeView, persona }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [res, count] = await Promise.all([
          listMyNotifications({ page: 1, limit: 10 }),
          getMyUnreadCount(),
        ]);
        if (cancelled) return;
        setRows(res.notifications || []);
        setPage(res.pagination?.page || 1);
        setTotalPages(res.pagination?.totalPages || 1);
        setUnread(count.unread ?? (res.notifications || []).filter((n) => !n.read).length);
      } catch {
        if (!cancelled) {
          setRows([]);
          setUnread(0);
          setPage(1);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const s = getNotificationSocket();
    if (!s) return;

    const onNew = (n: any) => {
      setRows((prev) => [normalizeNotification(n), ...prev].slice(0, 50));
      setUnread((u) => u + 1);
    };

    s.on('notification:new', onNew);
    return () => {
      s.off('notification:new', onNew);
    };
  }, []);

  // Show all notifications fetched so far (page 1 + loaded pages).
  const items = useMemo(() => rows, [rows]);

  const loadMore = async () => {
    if (loadingMore) return;
    if (page >= totalPages) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await listMyNotifications({ page: nextPage, limit: 10 });
      setRows((prev) => {
        const next = [...prev, ...(res.notifications || [])];
        // de-dupe by id on the client as well
        const map = new Map(next.map((x) => [x.id, x]));
        return Array.from(map.values());
      });
      setPage(res.pagination?.page || nextPage);
      setTotalPages(res.pagination?.totalPages || totalPages);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setRows((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  const handleDeleteRead = async () => {
    try {
      await deleteReadNotifications();
      setRows((prev) => prev.filter((n) => !n.read));
      setTotalPages(1);
      setPage(1);
    } catch {
      // ignore
    }
  };

  const handleClickNotification = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setRows((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        // ignore
      }
    }

    const requestId = n.relatedEntityId || (n.meta as any)?.request_id;
    if (requestId) {
      const prefix = persona.toLowerCase();
      router.push(`/${prefix}/service-requests?requestId=${encodeURIComponent(requestId)}`);
    }
  };

  const getTitle = () => {
    switch (activeView) {
      case 'DASHBOARD': return persona === 'ADMIN' ? 'Overview' : persona === 'CUSTOMER' ? 'Overview' : persona === 'MANAGER' ? 'Dashboard' : 'Operational Status';
      case 'RENT_REQUESTS': return 'Rent Requests';
      case 'CONTRACTS': return 'Contracts';
      case 'SERVICE_REQUESTS': return 'Service Requests';
      case 'INVENTORY': return persona === 'CUSTOMER' ? 'My Inventory' : persona === 'MANAGER' ? 'Inventory' : 'Global Inventory';
      case 'INVENTORY_CHECKING': return 'Inventory Checking';
      case 'CYCLE_COUNT': return 'Cycle Count';
      case 'SETTINGS': return 'Settings';
      case 'USERS': return persona === 'ADMIN' ? 'Users' : 'User Control';
      case 'LOGS': return persona === 'ADMIN' ? 'Logs' : 'Audit Logs';
      case 'HISTORY': return 'History';
      case 'CONFIG': return 'AI Parameters';
      case 'WAREHOUSES': return persona === 'MANAGER' ? 'Warehouses' : 'Facilities';
      case 'AI_LAYOUT': return 'Layout Optimization';
      case 'AI_CHAT': return 'AI Intelligence';
      case 'REPORTS': return 'Reports';
      default: return 'Management';
    }
  };

  return (
    <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
      <div className="flex flex-col">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">{getTitle()}</h2>
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Online • v4.0.12</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-2.5 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-2xl relative transition-all group"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute right-8 top-[76px] w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Notifications</p>
            <div className="flex items-center gap-2">
              <Badge variant={unread > 0 ? 'info' : 'neutral'} size="sm">
                {unread} unread
              </Badge>
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-black text-primary hover:underline"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={handleDeleteRead}
                className="text-xs font-black text-rose-600 hover:underline"
              >
                Delete read
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-6 text-sm text-slate-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">No notifications.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClickNotification(n)}
                      className="w-full text-left px-5 py-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 size-2 rounded-full ${n.read ? 'bg-slate-300' : 'bg-primary'}`} />
                        <div className="size-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-slate-600">
                            {iconForNotificationType(n.type)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{n.title}</p>
                          <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-bold">
              Page {page} / {totalPages}
            </p>
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore || page >= totalPages}
              className="text-xs font-black text-primary disabled:text-slate-400 disabled:cursor-not-allowed hover:underline"
            >
              {loadingMore ? 'Loading…' : page >= totalPages ? 'No more' : 'Load more'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

function normalizeNotification(n: any): AppNotification {
  return {
    id: String(n.id || n._id),
    type: String(n.type || ''),
    title: String(n.title || ''),
    message: String(n.message || ''),
    relatedEntityType: n.relatedEntityType,
    relatedEntityId: n.relatedEntityId,
    read: !!n.read,
    readAt: n.readAt,
    createdAt: n.createdAt ? String(n.createdAt) : new Date().toISOString(),
    meta: n.meta || {},
  };
}

function iconForNotificationType(type: string): string {
  switch (type) {
    case 'REQUEST_CREATED':
      return 'add_circle';
    case 'REQUEST_ASSIGNED':
      return 'assignment_ind';
    case 'REQUEST_APPROVED':
      return 'check_circle';
    case 'REQUEST_REJECTED':
      return 'cancel';
    case 'REQUEST_DONE_BY_STAFF':
      return 'local_shipping';
    case 'REQUEST_COMPLETED':
      return 'verified';
    case 'REQUEST_STATUS_CHANGED':
      return 'sync_alt';
    case 'REQUEST_UPDATED':
      return 'edit';
    default:
      return 'notifications';
  }
}
