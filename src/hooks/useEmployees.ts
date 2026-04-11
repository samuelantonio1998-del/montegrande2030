import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type AppUser, type UserRole } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast-with-sound';

export function useEmployees() {
  const [employees, setEmployees] = useState<AppUser[]>([]);

  const fetchEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('ativo', true)
      .order('created_at');
    if (!error && data) {
      setEmployees(data.map(d => ({ name: d.nome, role: d.role as UserRole, pin: d.pin })));
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    const channel = supabase
      .channel('funcionarios-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, () => {
        fetchEmployees();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEmployees]);

  const addEmployee = useCallback(async (emp: AppUser): Promise<boolean> => {
    // Check duplicate PIN
    const { data: existing } = await supabase
      .from('funcionarios')
      .select('id')
      .eq('pin', emp.pin)
      .eq('ativo', true)
      .maybeSingle();
    if (existing) {
      toast.error('Já existe um funcionário com este PIN');
      return false;
    }
    const { error } = await supabase
      .from('funcionarios')
      .insert({ nome: emp.name, role: emp.role, pin: emp.pin });
    if (error) {
      toast.error('Erro ao adicionar funcionário');
      return false;
    }
    await fetchEmployees();
    return true;
  }, [fetchEmployees]);

  const removeEmployee = useCallback(async (pin: string) => {
    await supabase.from('funcionarios').delete().eq('pin', pin);
    await fetchEmployees();
  }, [fetchEmployees]);

  const updateRole = useCallback(async (pin: string, role: UserRole) => {
    await supabase.from('funcionarios').update({ role }).eq('pin', pin);
    await fetchEmployees();
  }, [fetchEmployees]);

  const updateName = useCallback(async (pin: string, name: string) => {
    await supabase.from('funcionarios').update({ nome: name }).eq('pin', pin);
    await fetchEmployees();
  }, [fetchEmployees]);

  return { employees, addEmployee, removeEmployee, updateRole, updateName };
}
