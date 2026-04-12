import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type UserRole } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast-with-sound';

export type Employee = {
  id: string;
  name: string;
  role: UserRole;
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-employees', {
        body: { action: 'list' },
      });
      if (!error && data?.data) {
        setEmployees(data.data.map((d: any) => ({ id: d.id, name: d.nome, role: d.role as UserRole })));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = useCallback(async (emp: { name: string; pin: string; role: UserRole }): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('manage-employees', {
      body: { action: 'add', nome: emp.name, pin: emp.pin, role: emp.role },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao adicionar funcionário');
      return false;
    }
    await fetchEmployees();
    return true;
  }, [fetchEmployees]);

  const removeEmployee = useCallback(async (id: string) => {
    await supabase.functions.invoke('manage-employees', {
      body: { action: 'remove', id },
    });
    await fetchEmployees();
  }, [fetchEmployees]);

  const updateRole = useCallback(async (id: string, role: UserRole) => {
    await supabase.functions.invoke('manage-employees', {
      body: { action: 'update_role', id, role },
    });
    await fetchEmployees();
  }, [fetchEmployees]);

  const updateName = useCallback(async (id: string, name: string) => {
    await supabase.functions.invoke('manage-employees', {
      body: { action: 'update_name', id, nome: name },
    });
    await fetchEmployees();
  }, [fetchEmployees]);

  return { employees, addEmployee, removeEmployee, updateRole, updateName };
}
