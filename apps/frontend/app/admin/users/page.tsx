'use client';

import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { AdminUser, ListUsersParams } from '../../../types/admin';
import type { Role, UserStatus } from '../../../types/auth';
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
} from '../../../lib/mockApi/admin.api';
import { useToast } from '../../../lib/toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadingSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Pagination } from '../../../components/ui/Pagination';

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => { } });

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter, page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: ListUsersParams = {
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit,
      };
      const result = await listUsers(params);
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      showToast('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (payload: Omit<AdminUser, 'id' | 'createdAt'>) => {
    try {
      await createUser(payload);
      showToast('success', 'User created successfully');
      setCreateModalOpen(false);
      loadUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdate = async (id: string, payload: Partial<AdminUser>) => {
    try {
      await updateUser(id, payload);
      showToast('success', 'User updated successfully');
      setEditModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      await toggleUserStatus(user.id);
      showToast('success', `User ${user.status === 'ACTIVE' ? 'locked' : 'unlocked'} successfully`);
      loadUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to toggle user status');
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    try {
      await resetUserPassword(user.id);
      showToast('success', 'Password reset email sent');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getRoleVariant = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'error' as const;
      case 'MANAGER':
        return 'info' as const;
      case 'STAFF':
        return 'warning' as const;
      case 'CUSTOMER':
      default:
        return 'success' as const;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Users</h1>
          <p className="text-slate-500 mt-1">User & role management</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>Create user</Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          options={[
            { value: '', label: 'All roles' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'STAFF', label: 'Staff' },
            { value: 'CUSTOMER', label: 'Customer' },
          ]}
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as Role | '');
            setPage(1);
          }}
        />
        <Select
          options={[
            { value: '', label: 'All status' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'LOCKED', label: 'Locked' },
          ]}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as UserStatus | '');
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState title="Failed to load users" message={error} onRetry={loadUsers} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="people"
          title="No users found"
          message="Try adjusting your search or filters"
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeader>Name</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Last login</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar && (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="size-10 rounded-xl object-cover"
                        />
                      )}
                      <div>
                        <p className="font-bold text-slate-900">{user.name}</p>
                        {user.title && <p className="text-xs text-slate-500">{user.title}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'success' : 'error'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-slate-600">more_vert</span>
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="bg-white rounded-xl p-2 shadow-lg border border-slate-200 min-w-[160px] z-50">
                          <DropdownMenu.Item
                            className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditModalOpen(true);
                            }}
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                            Edit
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                            onClick={() => {
                              setConfirmDialog({
                                open: true,
                                title: user.status === 'ACTIVE' ? 'Lock user?' : 'Unlock user?',
                                message: `Are you sure you want to ${user.status === 'ACTIVE' ? 'lock' : 'unlock'} ${user.name}?`,
                                variant: 'warning',
                                onConfirm: () => handleToggleStatus(user),
                              });
                            }}
                          >
                            <span className="material-symbols-outlined text-lg">
                              {user.status === 'ACTIVE' ? 'lock' : 'lock_open'}
                            </span>
                            {user.status === 'ACTIVE' ? 'Lock' : 'Unlock'}
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                            onClick={() => {
                              setConfirmDialog({
                                open: true,
                                title: 'Reset password?',
                                message: `Send password reset email to ${user.email}?`,
                                variant: 'info',
                                onConfirm: () => handleResetPassword(user),
                              });
                            }}
                          >
                            <span className="material-symbols-outlined text-lg">key</span>
                            Reset password
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <UserFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreate}
      />

      {/* Edit Modal */}
      {selectedUser && (
        <UserFormModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setSelectedUser(null);
          }}
          user={selectedUser}
          onSubmit={(payload) => handleUpdate(selectedUser.id, payload)}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}

function UserFormModal({
  open,
  onOpenChange,
  user,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AdminUser;
  onSubmit: (payload: Omit<AdminUser, 'id' | 'createdAt'>) => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<Role>(user?.role || 'CUSTOMER');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'ACTIVE');
  const [title, setTitle] = useState(user?.title || '');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
      setTitle(user.title || '');
    } else {
      setName('');
      setEmail('');
      setRole('CUSTOMER');
      setStatus('ACTIVE');
      setTitle('');
    }
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      email,
      role,
      status,
      title: title || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={user ? 'Edit user' : 'Create user'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={!!user}
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          options={[
            { value: 'ADMIN', label: 'Admin' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'STAFF', label: 'Staff' },
            { value: 'CUSTOMER', label: 'Customer' },
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus)}
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'LOCKED', label: 'Locked' },
          ]}
        />
        <Input
          label="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
