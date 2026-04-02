import { useState, useCallback } from 'react';
import { type AppUser, type UserRole, getEmployees, setEmployees } from '@/contexts/AuthContext';

export function useEmployees() {
  const [employees, setLocal] = useState<AppUser[]>(() => getEmployees());

  const refresh = useCallback(() => setLocal(getEmployees()), []);

  const addEmployee = useCallback((emp: AppUser): boolean => {
    const current = getEmployees();
    if (current.some(e => e.pin === emp.pin)) {
      const { toast } = require('sonner');
      toast.error('Já existe um funcionário com este PIN');
      return false;
    }
    const updated = [...current, emp];
    setEmployees(updated);
    setLocal(updated);
    return true;
  }, []);

  const removeEmployee = useCallback((pin: string) => {
    const updated = getEmployees().filter(e => e.pin !== pin);
    setEmployees(updated);
    setLocal(updated);
  }, []);

  const updateRole = useCallback((pin: string, role: UserRole) => {
    const updated = getEmployees().map(e => e.pin === pin ? { ...e, role } : e);
    setEmployees(updated);
    setLocal(updated);
  }, []);

  return { employees, addEmployee, removeEmployee, updateRole, refresh };
}
