import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { AuditTrail } from '../../components/AuditTrail';
import type { Employee } from '../../types';
import { saveRecord, updateRecord, deleteRecord } from '../../services/firebase/rtdbService';

interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  role: 'employee' | 'supervisor' | 'admin';
  password: string;
}

export function EmployeesPage() {
  const { state, dispatch, showToast, logAudit } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for Create
  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCreatePass, setShowCreatePass] = useState(false);

  // Form state for Edit
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: 'employee' | 'supervisor' | 'admin';
    password: string;
    status: 'active' | 'inactive';
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    password: '',
    status: 'active',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showEditPass, setShowEditPass] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirmation state
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null);

  const isSubmittingRef = useRef(false);

  // A staff member's trail: everything they did, plus events targeting them.
  const scopedActivity = (emp: Employee) =>
    state.auditLog.filter(e => e.actorId === emp.id || e.actorName === emp.name || (e.targetType === 'employee' && e.targetId === emp.id));

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'employee',
      password: '',
    });
    setErrors({});
    setShowCreatePass(false);
    setShowAdd(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    if (!cleanName) errs.name = 'Full name is required';
    if (!cleanEmail) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Enter a valid email address';
    } else if (state.employees.some(e => e.email && e.email.toLowerCase() === cleanEmail)) {
      errs.email = 'A staff account with this email already exists';
    }

    if (!cleanPassword) {
      errs.password = 'Password is required';
    } else if (cleanPassword.length < 4) {
      errs.password = 'Password must be at least 4 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('error', 'Please resolve the highlighted fields.');
      return;
    }

    const empId = `e${Date.now()}`;
    const newEmployee: Employee = {
      id: empId,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password.trim(),
      role: formData.role,
      phone: formData.phone.trim(),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setPendingEmployee(newEmployee);
  };

  const executeSaveEmployee = async () => {
    if (!pendingEmployee || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);

    try {
      await saveRecord('employees', pendingEmployee);
      // Register user profile and credentials in RTDB users
      await saveRecord('users', {
        id: pendingEmployee.id,
        name: pendingEmployee.name,
        email: pendingEmployee.email,
        password: pendingEmployee.password,
        role: pendingEmployee.role,
        employeeId: pendingEmployee.id,
        createdAt: new Date().toISOString(),
      });

      await logAudit({
        category: 'employee',
        action: 'employee.create',
        summary: `Created staff account for ${pendingEmployee.name} (${pendingEmployee.role})`,
        targetType: 'employee',
        targetId: pendingEmployee.id,
        targetLabel: pendingEmployee.name,
      });

      showToast('success', `Staff account for ${pendingEmployee.name} registered!`);
      setShowAdd(false);
      setPendingEmployee(null);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to save staff account: ' + err.message);
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  // Edit Staff Handlers
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      role: emp.role,
      password: emp.password || '',
      status: emp.status,
    });
    setEditErrors({});
    setShowEditPass(false);
  };

  const validateEdit = (): boolean => {
    const errs: Record<string, string> = {};
    if (!editFormData.name.trim()) errs.name = 'Full name is required';
    if (!editFormData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email.trim().toLowerCase())) {
      errs.email = 'Enter a valid email address';
    } else if (
      state.employees.some(
        e => e.id !== editingEmployee?.id && e.email && e.email.toLowerCase() === editFormData.email.trim().toLowerCase()
      )
    ) {
      errs.email = 'Another staff account already uses this email';
    }

    if (!editFormData.password.trim()) {
      errs.password = 'Password is required';
    } else if (editFormData.password.trim().length < 4) {
      errs.password = 'Password must be at least 4 characters';
    }

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !validateEdit()) {
      showToast('error', 'Please resolve the highlighted fields.');
      return;
    }

    setSavingEdit(true);
    const updatedEmp: Employee = {
      ...editingEmployee,
      name: editFormData.name.trim(),
      email: editFormData.email.trim().toLowerCase(),
      phone: editFormData.phone.trim(),
      role: editFormData.role,
      password: editFormData.password.trim(),
      status: editFormData.status,
    };

    try {
      await saveRecord('employees', updatedEmp);
      await updateRecord('users', updatedEmp.id, {
        name: updatedEmp.name,
        email: updatedEmp.email,
        role: updatedEmp.role,
        password: updatedEmp.password,
      });

      dispatch({ type: 'UPDATE_EMPLOYEE', employee: updatedEmp });

      await logAudit({
        category: 'employee',
        action: 'employee.update',
        summary: `Updated staff details and credentials for ${updatedEmp.name} (${updatedEmp.role})`,
        targetType: 'employee',
        targetId: updatedEmp.id,
        targetLabel: updatedEmp.name,
      });

      showToast('success', `Staff account for ${updatedEmp.name} updated!`);
      setEditingEmployee(null);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to update staff account: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleStatus = async (employee: Employee) => {
    const updated = { ...employee, status: employee.status === 'active' ? ('inactive' as const) : ('active' as const) };
    try {
      await saveRecord('employees', updated);
      dispatch({ type: 'UPDATE_EMPLOYEE', employee: updated });
      await logAudit({
        category: 'employee',
        action: 'employee.update',
        summary: `${updated.status === 'active' ? 'Enabled' : 'Disabled'} staff account ${employee.name}`,
        targetType: 'employee',
        targetId: employee.id,
        targetLabel: employee.name,
      });
      showToast('success', `${employee.name} ${updated.status === 'active' ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      showToast('error', 'Failed to update employee status: ' + err.message);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRecord('employees', deleteConfirm.id);
      await deleteRecord('users', deleteConfirm.id);
      dispatch({ type: 'DELETE_EMPLOYEE', employeeId: deleteConfirm.id });
      await logAudit({
        category: 'employee',
        action: 'employee.delete',
        summary: `Deleted staff account ${deleteConfirm.name} (${deleteConfirm.email})`,
        targetType: 'employee',
        targetId: deleteConfirm.id,
        targetLabel: deleteConfirm.name,
      });
      showToast('info', `Staff ${deleteConfirm.name} removed.`);
      setDeleteConfirm(null);
    } catch (err: any) {
      showToast('error', 'Failed to delete staff: ' + err.message);
    }
  };

  const roleColor: Record<string, 'green' | 'navy' | 'orange'> = { admin: 'navy', supervisor: 'orange', employee: 'green' };

  return (
    <InternalLayout title="Employees">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              role: 'admin',
              label: 'Administrators',
              sub: 'Full system privileges & settings',
              iconBg: 'bg-slate-100 text-[#0D2B45]',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
            },
            {
              role: 'supervisor',
              label: 'Supervisors',
              sub: 'Financing review & operations',
              iconBg: 'bg-amber-50 text-amber-700',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
            },
            {
              role: 'employee',
              label: 'Cashiers & Staff',
              sub: 'Frontline POS order desk',
              iconBg: 'bg-emerald-50 text-[#1E7D3B]',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
          ].map(r => (
            <div key={r.role} className="bg-white rounded-2xl border border-[#E4E8E6] p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">{r.label}</span>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${r.iconBg}`}>
                  {r.icon}
                </span>
              </div>
              <div>
                <div className="text-[#0D2B45] font-800 text-2xl mt-1">
                  {state.employees.filter(e => e.role === r.role).length}
                </div>
                <div className="text-[#65727A] text-[11px] mt-0.5">{r.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E8E6]">
            <div>
              <h2 className="font-800 text-base text-[#10212B]">Staff Members</h2>
              <p className="text-xs text-[#65727A] mt-0.5">Manage permissions, login credentials, and roles</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#1E7D3B] hover:bg-[#22913f] text-white text-xs font-700 rounded-xl transition-all shadow-sm shadow-[#1E7D3B]/20 cursor-pointer self-start sm:self-auto"
            >
              + Create Staff
            </button>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[#F7F8F6]">
            {state.employees.map(emp => (
              <div key={emp.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#0D2B45] rounded-xl flex items-center justify-center text-white font-700 text-sm shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-700 text-sm text-[#10212B]">{emp.name}</div>
                      <div className="text-xs text-[#65727A]">{emp.email}</div>
                      {emp.password && (
                        <span className="text-[10px] text-[#65727A]/70 flex items-center gap-1 mt-0.5">
                          <span>PW:</span>
                          <span className="font-mono">••••••••</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={roleColor[emp.role] || 'gray'} className="capitalize" size="sm">
                      {emp.role}
                    </Badge>
                    <Badge variant={emp.status === 'active' ? 'green' : 'gray'} size="sm">
                      {emp.status}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-[#65727A] bg-[#F7F8F6] px-3 py-2 rounded-xl flex justify-between">
                  <span>Phone:</span>
                  <span className="font-600 text-[#10212B]">{emp.phone || '—'}</span>
                </div>

                <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-[#F7F8F6]">
                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="px-2.5 py-1.5 bg-[#F7F8F6] hover:bg-[#E4E8E6] text-[#1E7D3B] text-xs font-600 rounded-lg cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setHistoryEmployee(emp)}
                    className="px-2.5 py-1.5 bg-[#F7F8F6] hover:bg-[#E4E8E6] text-[#65727A] text-xs font-600 rounded-lg cursor-pointer"
                  >
                    History
                  </button>
                  <button
                    onClick={() => toggleStatus(emp)}
                    className={`px-2.5 py-1.5 bg-[#F7F8F6] hover:bg-[#E4E8E6] text-xs font-600 rounded-lg cursor-pointer ${
                      emp.status === 'active' ? 'text-amber-600' : 'text-[#1E7D3B]'
                    }`}
                  >
                    {emp.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(emp)}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-600 rounded-lg cursor-pointer ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {state.employees.length === 0 && (
              <div className="p-8 text-center text-xs text-[#65727A]">
                No staff registered yet. Click "+ Create Staff" to add one.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-xs">
              <thead className="bg-[#F7F8F6] border-b border-[#E4E8E6] text-[#65727A] font-600">
                <tr>
                  <th className="text-left px-5 py-3">Employee</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Phone</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {state.employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#0D2B45] rounded-xl flex items-center justify-center text-white font-700 text-xs shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-600 text-sm text-[#10212B]">{emp.name}</div>
                          {emp.password && (
                            <span className="text-[10px] text-[#65727A]/70 flex items-center gap-1 mt-0.5">
                              <span>PW:</span>
                              <span className="font-mono">••••••••</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{emp.email}</td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{emp.phone || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge variant={roleColor[emp.role] || 'gray'} className="capitalize">
                        {emp.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={emp.status === 'active' ? 'green' : 'gray'}>{emp.status}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="text-xs text-[#1E7D3B] font-600 hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setHistoryEmployee(emp)}
                          className="text-xs text-[#65727A] font-600 hover:text-[#0D2B45] hover:underline cursor-pointer"
                        >
                          History
                        </button>
                        <button
                          onClick={() => toggleStatus(emp)}
                          className={`text-xs font-600 hover:underline cursor-pointer ${
                            emp.status === 'active' ? 'text-amber-600' : 'text-[#1E7D3B]'
                          }`}
                        >
                          {emp.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(emp)}
                          className="text-xs font-600 text-red-600 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {state.employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="text-[#65727A] text-sm font-600">No employees registered yet</div>
                      <p className="text-xs text-[#65727A]/70 mt-1">Click "+ Create Staff" to register a staff account.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff History Modal */}
      <Modal
        open={historyEmployee !== null}
        onClose={() => setHistoryEmployee(null)}
        title={historyEmployee ? `Activity — ${historyEmployee.name}` : 'Activity'}
        size="lg"
      >
        {historyEmployee && (
          <div className="max-h-[65vh] overflow-y-auto -mx-1 px-1">
            <div className="flex items-center gap-3 bg-[#F7F8F6] rounded-xl p-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[#1a3d5c] to-[#0D2B45] rounded-xl flex items-center justify-center text-white font-700 text-sm">
                {historyEmployee.name.charAt(0)}
              </div>
              <div>
                <div className="font-700 text-sm text-[#10212B]">{historyEmployee.name}</div>
                <div className="text-xs text-[#65727A] capitalize">{historyEmployee.role} · {historyEmployee.email}</div>
              </div>
            </div>
            <AuditTrail
              entries={scopedActivity(historyEmployee)}
              showFilters={false}
              pageSize={20}
              emptyLabel="No recorded activity for this staff member yet."
            />
          </div>
        )}
      </Modal>

      {/* Add Staff Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Staff Account" size="md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="e.g. Maria Santos"
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.name ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.name && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.name}</span>}
            </div>

            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">
                Email Address (Login Username) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder="staff@sarifi.ph"
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  errors.email ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {errors.email && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.email}</span>}
            </div>

            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showCreatePass ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="At least 4 characters"
                  className={`w-full px-3 py-2 pr-10 border rounded-xl text-sm focus:outline-none transition-all ${
                    errors.password ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePass(!showCreatePass)}
                  className="absolute right-3 top-2.5 text-[#65727A] hover:text-[#10212B] text-xs font-600 cursor-pointer"
                >
                  {showCreatePass ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <span className="text-[11px] text-red-500 font-500 mt-1 block">{errors.password}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">Phone (Optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0917-xxx-xxxx"
                className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]"
              />
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B] cursor-pointer"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer disabled:opacity-60 shadow-sm shadow-[#1E7D3B]/20 mt-2"
          >
            {saving ? 'Registering…' : 'Save'}
          </button>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        open={editingEmployee !== null}
        onClose={() => setEditingEmployee(null)}
        title={editingEmployee ? `Edit Staff — ${editingEmployee.name}` : 'Edit Staff'}
        size="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={e => {
                  setEditFormData({ ...editFormData, name: e.target.value });
                  if (editErrors.name) setEditErrors({ ...editErrors, name: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.name ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.name && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.name}</span>}
            </div>

            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">
                Email Address (Login) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={editFormData.email}
                onChange={e => {
                  setEditFormData({ ...editFormData, email: e.target.value });
                  if (editErrors.email) setEditErrors({ ...editErrors, email: '' });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all ${
                  editErrors.email ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                }`}
              />
              {editErrors.email && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.email}</span>}
            </div>

            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showEditPass ? 'text' : 'password'}
                  value={editFormData.password}
                  onChange={e => {
                    setEditFormData({ ...editFormData, password: e.target.value });
                    if (editErrors.password) setEditErrors({ ...editErrors, password: '' });
                  }}
                  placeholder="Enter new password"
                  className={`w-full px-3 py-2 pr-10 border rounded-xl text-sm focus:outline-none transition-all ${
                    editErrors.password ? 'border-red-500 bg-red-50/30' : 'border-[#E4E8E6] focus:border-[#1E7D3B]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPass(!showEditPass)}
                  className="absolute right-3 top-2.5 text-[#65727A] hover:text-[#10212B] text-xs font-600 cursor-pointer"
                >
                  {showEditPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="text-[11px] text-[#65727A] mt-1 block">
                Admin can edit this password at any time. User can immediately sign in with this password.
              </span>
              {editErrors.password && <span className="text-[11px] text-red-500 font-500 mt-1 block">{editErrors.password}</span>}
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">Phone</label>
              <input
                type="tel"
                value={editFormData.phone}
                onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]"
              />
            </div>

            <div>
              <label className="text-xs font-600 text-[#65727A]">Role</label>
              <select
                value={editFormData.role}
                onChange={e => setEditFormData({ ...editFormData, role: e.target.value as any })}
                className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B] cursor-pointer"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-600 text-[#65727A]">Status</label>
              <select
                value={editFormData.status}
                onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B] cursor-pointer"
              >
                <option value="active">Active (Can Login)</option>
                <option value="inactive">Inactive (Disabled)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingEdit}
            className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer disabled:opacity-60 shadow-sm shadow-[#1E7D3B]/20 mt-2"
          >
            {savingEdit ? 'Saving Changes…' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      {/* Confirm Add Staff Modal */}
      <ConfirmDialog
        open={pendingEmployee !== null}
        onClose={() => setPendingEmployee(null)}
        onConfirm={executeSaveEmployee}
        title="Confirm Register Staff"
        message={`Are you sure you want to register ${pendingEmployee?.name} as a ${pendingEmployee?.role}?`}
        confirmLabel="Save"
      />

      {/* Confirm Delete Staff Modal */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteStaff}
        title="Delete Staff Account"
        message={`Are you sure you want to remove staff member "${deleteConfirm?.name}" (${deleteConfirm?.email})? This action cannot be undone.`}
        danger
      />
    </InternalLayout>
  );
}
