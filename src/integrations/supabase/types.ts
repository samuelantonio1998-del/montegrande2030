export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ficha_ingredientes: {
        Row: {
          ficha_id: string
          id: string
          produto_id: string
          quantidade: number
          unidade: string
        }
        Insert: {
          ficha_id: string
          id?: string
          produto_id: string
          quantidade: number
          unidade?: string
        }
        Update: {
          ficha_id?: string
          id?: string
          produto_id?: string
          quantidade?: number
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_ingredientes_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_ingredientes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_tecnicas: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          id: string
          nome: string
          porcoes: number
          preco_venda: number
          tempo_preparacao: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nome: string
          porcoes?: number
          preco_venda?: number
          tempo_preparacao?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
          porcoes?: number
          preco_venda?: number
          tempo_preparacao?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          created_at: string
          dia_encomenda: string | null
          email: string | null
          id: string
          nome: string
          notas: string | null
          prazo_entrega_dias: number | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_encomenda?: string | null
          email?: string | null
          id?: string
          nome: string
          notas?: string | null
          prazo_entrega_dias?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_encomenda?: string | null
          email?: string | null
          id?: string
          nome?: string
          notas?: string | null
          prazo_entrega_dias?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          created_at: string
          custo_unitario: number | null
          documento_url: string | null
          fornecedor_id: string | null
          funcionario: string | null
          id: string
          motivo: string | null
          produto_id: string
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          documento_url?: string | null
          fornecedor_id?: string | null
          funcionario?: string | null
          id?: string
          motivo?: string | null
          produto_id: string
          quantidade: number
          tipo: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          documento_url?: string | null
          fornecedor_id?: string | null
          funcionario?: string | null
          id?: string
          motivo?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          custo_medio: number
          fornecedor_id: string | null
          id: string
          nome: string
          sku: string | null
          stock_atual: number
          stock_maximo: number
          stock_minimo: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          custo_medio?: number
          fornecedor_id?: string | null
          id?: string
          nome: string
          sku?: string | null
          stock_atual?: number
          stock_maximo?: number
          stock_minimo?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          custo_medio?: number
          fornecedor_id?: string | null
          id?: string
          nome?: string
          sku?: string | null
          stock_atual?: number
          stock_maximo?: number
          stock_minimo?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
