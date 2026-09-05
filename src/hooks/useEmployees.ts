import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';

export type Employee = {
  id: string;
  name: string;
  role: string;
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-employees', {
        body: { action: 'lista_simples' },
      });
      if (!error && data?.data) {
        setEmployees(data.data
          .map((d: any) => ({ id: d.id, name: d.nome, role: d.role_nome ?? '' })));
      }

    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = useCallback(async (emp: { name: string; pin: string; role: string }): Promise<boolean> => {
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

  const updateRole = useCallback(async (id: string, role: string) => {
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

  const updatePin = useCallback(async (id: string, pin: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('manage-employees', {
      body: { action: 'update_pin', id, pin },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao atualizar PIN');
      return false;
    }
    return true;
  }, []);

  return { employees, addEmployee, removeEmployee, updateRole, updateName, updatePin };
}
