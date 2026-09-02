import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AuditTrail } from '../../components/AuditTrail';
import type { Employee } from '../../types';

export function EmployeesPage() {
  const { state, dispatch, showToast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);

  // A staff member's trail: everything they did, plus events targeting them.
  const scopedActivity = (emp: Employee) =>
    state.auditLog.filter(e => e.actorId === emp.id || e.actorName === emp.name || (e.targetType === 'employee' && e.targetId === emp.id));

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const newEmployee: Employee = {
      id: `e${Date.now()}`,
      name: data.name as string,
      email: data.email as string,
      role: data.role as 'employee' | 'supervisor' | 'admin',
      phone: data.phone as string,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    dispatch({ type: 'ADD_EMPLOYEE', employee: newEmployee });
    showToast('success', `Staff account for ${newEmployee.name} created.`);
    setShowAdd(false);
  };

  const toggleStatus = (employee: Employee) => {
    const updated = { ...employee, status: employee.status === 'active' ? 'inactive' as const : 'active' as const };
    dispatch({ type: 'UPDATE_EMPLOYEE', employee: updated });
    showToast('success', `${employee.name} ${updated.status === 'active' ? 'enabled' : 'disabled'}.`);
  };

  const roleColor: Record<string, 'green' | 'navy' | 'orange'> = { admin: 'navy', supervisor: 'orange', employee: 'green' };

  return (
    <InternalLayout title="Employees">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {['admin', 'supervisor', 'employee'].map(role => (
            <div key={role} className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
              <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider capitalize">{role}s</div>
              <div className="text-[#0D2B45] font-800 text-2xl mt-1">{state.employees.filter(e => e.role === role).length}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all">+ Create Staff</button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Name</th>
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
                        <div className="font-600 text-sm text-[#10212B]">{emp.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{emp.email}</td>
                    <td className="px-5 py-3 text-sm text-[#65727A]">{emp.phone}</td>
                    <td className="px-5 py-3"><Badge variant={roleColor[emp.role] || 'gray'} className="capitalize">{emp.role}</Badge></td>
                    <td className="px-5 py-3"><Badge variant={emp.status === 'active' ? 'green' : 'gray'}>{emp.status}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setHistoryEmployee(emp)}
                          className="text-xs text-[#65727A] font-600 hover:text-[#0D2B45] hover:underline"
                        >
                          History
                        </button>
                        {emp.id !== state.employees[0]?.id && (
                          <button
                            onClick={() => toggleStatus(emp)}
                            className={`text-xs font-600 hover:underline ${emp.status === 'active' ? 'text-red-500' : 'text-[#1E7D3B]'}`}
                          >
                            {emp.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff History Modal */}
      <Modal open={historyEmployee !== null} onClose={() => setHistoryEmployee(null)} title={historyEmployee ? `Activity — ${historyEmployee.name}` : 'Activity'} size="lg">
        {historyEmployee && (
          <div className="max-h-[65vh] overflow-y-auto -mx-1 px-1">
            <div className="flex items-center gap-3 bg-[#F7F8F6] rounded-xl p-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[#1a3d5c] to-[#0D2B45] rounded-xl flex items-center justify-center text-white font-700 text-sm">{historyEmployee.name.charAt(0)}</div>
              <div>
                <div className="font-700 text-sm text-[#10212B]">{historyEmployee.name}</div>
                <div className="text-xs text-[#65727A] capitalize">{historyEmployee.role} · {historyEmployee.email}</div>
              </div>
            </div>
            <AuditTrail entries={scopedActivity(historyEmployee)} showFilters={false} pageSize={20} emptyLabel="No recorded activity for this staff member yet." />
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Staff Account" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'name', label: 'Full Name', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'phone', label: 'Phone' },
            ].map(f => (
              <div key={f.name}>
                <label className="text-xs font-600 text-[#65727A]">{f.label}</label>
                <input name={f.name} type={f.type || 'text'} required={f.required} className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
              </div>
            ))}
            <div>
              <label className="text-xs font-600 text-[#65727A]">Role</label>
              <select name="role" className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]">
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all">Create Staff Account</button>
        </form>
      </Modal>
    </InternalLayout>
  );
}
