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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          metadata: Json | null
          module: string
          user_name: string
          user_role: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          module?: string
          user_name?: string
          user_role?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          module?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      buffet_items: {
        Row: {
          ativo: boolean
          created_at: string
          ficha_tecnica_id: string | null
          id: string
          nome: string
          unidade_id: string | null
          updated_at: string
          zona: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          ficha_tecnica_id?: string | null
          id?: string
          nome: string
          unidade_id?: string | null
          updated_at?: string
          zona?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          ficha_tecnica_id?: string | null
          id?: string
          nome?: string
          unidade_id?: string | null
          updated_at?: string
          zona?: string
        }
        Relationships: [
          {
            foreignKeyName: "buffet_items_ficha_tecnica_id_fkey"
            columns: ["ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buffet_items_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_precos: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      ementa_diaria: {
        Row: {
          buffet_item_id: string
          created_at: string
          criado_por: string | null
          data: string
          historico_consumo_kg: number[] | null
          historico_sobra_kg: number[] | null
          id: string
          marca_id: string | null
          notas: string | null
          quantidade_prevista: number
          recipiente_sugerido: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          buffet_item_id: string
          created_at?: string
          criado_por?: string | null
          data: string
          historico_consumo_kg?: number[] | null
          historico_sobra_kg?: number[] | null
          id?: string
          marca_id?: string | null
          notas?: string | null
          quantidade_prevista?: number
          recipiente_sugerido?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          buffet_item_id?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          historico_consumo_kg?: number[] | null
          historico_sobra_kg?: number[] | null
          id?: string
          marca_id?: string | null
          notas?: string | null
          quantidade_prevista?: number
          recipiente_sugerido?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ementa_diaria_buffet_item_id_fkey"
            columns: ["buffet_item_id"]
            isOneToOne: false
            referencedRelation: "buffet_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ementa_diaria_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ementa_diaria_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas_processadas: {
        Row: {
          created_at: string
          data_fatura: string | null
          fornecedor: string | null
          hash_identificador: string
          id: string
          numero_fatura: string | null
          total_itens: number | null
        }
        Insert: {
          created_at?: string
          data_fatura?: string | null
          fornecedor?: string | null
          hash_identificador: string
          id?: string
          numero_fatura?: string | null
          total_itens?: number | null
        }
        Update: {
          created_at?: string
          data_fatura?: string | null
          fornecedor?: string | null
          hash_identificador?: string
          id?: string
          numero_fatura?: string | null
          total_itens?: number | null
        }
        Relationships: []
      }
      fecho_mesas: {
        Row: {
          adults: number
          children2to6: number
          children7to12: number
          created_at: string
          data: string
          funcionario: string | null
          id: string
          mesa_number: number
          periodo: string
          total_pax: number
        }
        Insert: {
          adults?: number
          children2to6?: number
          children7to12?: number
          created_at?: string
          data?: string
          funcionario?: string | null
          id?: string
          mesa_number: number
          periodo?: string
          total_pax?: number
        }
        Update: {
          adults?: number
          children2to6?: number
          children7to12?: number
          created_at?: string
          data?: string
          funcionario?: string | null
          id?: string
          mesa_number?: number
          periodo?: string
          total_pax?: number
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          estado: string
          id: string
          mensagem: string
          resposta: string | null
          tipo: string
          updated_at: string
          user_name: string
          user_role: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          mensagem: string
          resposta?: string | null
          tipo?: string
          updated_at?: string
          user_name?: string
          user_role?: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          mensagem?: string
          resposta?: string | null
          tipo?: string
          updated_at?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
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
      ficha_marca: {
        Row: {
          ativo: boolean
          ficha_tecnica_id: string
          marca_id: string
          nome_comercial: string | null
          preco_venda: number | null
        }
        Insert: {
          ativo?: boolean
          ficha_tecnica_id: string
          marca_id: string
          nome_comercial?: string | null
          preco_venda?: number | null
        }
        Update: {
          ativo?: boolean
          ficha_tecnica_id?: string
          marca_id?: string
          nome_comercial?: string | null
          preco_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_marca_ficha_tecnica_id_fkey"
            columns: ["ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_marca_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_origem: {
        Row: {
          ficha_tecnica_id: string
          origem: string
          unidade_id: string
        }
        Insert: {
          ficha_tecnica_id: string
          origem: string
          unidade_id: string
        }
        Update: {
          ficha_tecnica_id?: string
          origem?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_origem_ficha_tecnica_id_fkey"
            columns: ["ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_origem_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_rotulos: {
        Row: {
          alergenios: string | null
          conservacao: string | null
          created_at: string
          ficha_id: string
          id: string
          ingredientes: string | null
          modo_preparacao: string | null
          nutricional: string | null
          peso: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          alergenios?: string | null
          conservacao?: string | null
          created_at?: string
          ficha_id: string
          id?: string
          ingredientes?: string | null
          modo_preparacao?: string | null
          nutricional?: string | null
          peso?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          alergenios?: string | null
          conservacao?: string | null
          created_at?: string
          ficha_id?: string
          id?: string
          ingredientes?: string | null
          modo_preparacao?: string | null
          nutricional?: string | null
          peso?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_rotulos_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: true
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_tecnicas: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          foto_url: string | null
          id: string
          nome: string
          notas_preparacao: string | null
          porcoes: number
          preco_venda: number
          tempo_preparacao: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          nome: string
          notas_preparacao?: string | null
          porcoes?: number
          preco_venda?: number
          tempo_preparacao?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string
          notas_preparacao?: string | null
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
      funcionarios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          pin_hash: string | null
          role: string
          role_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          pin_hash?: string | null
          role?: string
          role_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          pin_hash?: string | null
          role?: string
          role_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      mesas: {
        Row: {
          adults: number
          beverages: Json
          children2to6: number
          children7to12: number
          created_at: string
          id: string
          number: number
          opened_at: string | null
          status: string
          updated_at: string
          waiter: string
        }
        Insert: {
          adults?: number
          beverages?: Json
          children2to6?: number
          children7to12?: number
          created_at?: string
          id?: string
          number: number
          opened_at?: string | null
          status?: string
          updated_at?: string
          waiter?: string
        }
        Update: {
          adults?: number
          beverages?: Json
          children2to6?: number
          children7to12?: number
          created_at?: string
          id?: string
          number?: number
          opened_at?: string | null
          status?: string
          updated_at?: string
          waiter?: string
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
          unidade_id: string | null
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
          unidade_id?: string | null
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
          unidade_id?: string | null
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
          {
            foreignKeyName: "movimentacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          chave: string
          descricao: string
          id: string | null
        }
        Insert: {
          chave: string
          descricao: string
          id?: string | null
        }
        Update: {
          chave?: string
          descricao?: string
          id?: string | null
        }
        Relationships: []
      }
      pin_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip?: string
          success?: boolean
        }
        Relationships: []
      }
      precario_bebidas: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          dose_ml: number | null
          garrafa_ml: number | null
          id: string
          nome: string
          ordem: number
          preco: number
          produto_id: string | null
          tipo_servico: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          dose_ml?: number | null
          garrafa_ml?: number | null
          id?: string
          nome: string
          ordem?: number
          preco?: number
          produto_id?: string | null
          tipo_servico?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          dose_ml?: number | null
          garrafa_ml?: number | null
          id?: string
          nome?: string
          ordem?: number
          preco?: number
          produto_id?: string | null
          tipo_servico?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precario_bebidas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      precario_takeaway: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          id: string
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nome: string
          preco?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      produto_aliases: {
        Row: {
          alias_nome: string
          alias_sku: string | null
          created_at: string
          fornecedor_id: string | null
          id: string
          produto_id: string
        }
        Insert: {
          alias_nome: string
          alias_sku?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          produto_id: string
        }
        Update: {
          alias_nome?: string
          alias_sku?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_aliases_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_aliases_produto_id_fkey"
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
      registos_producao: {
        Row: {
          aproveitamento_nota: string | null
          buffet_item_id: string | null
          canal: string
          created_at: string
          dish_name: string
          enviado_at: string
          estado: string
          ficha_tecnica_id: string | null
          id: string
          marca_id: string | null
          peso_kg: number
          recipiente: string
          recolhido_at: string | null
          registado_por: string
          sobra_acao: string | null
          sobra_kg: number | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          aproveitamento_nota?: string | null
          buffet_item_id?: string | null
          canal?: string
          created_at?: string
          dish_name: string
          enviado_at?: string
          estado?: string
          ficha_tecnica_id?: string | null
          id?: string
          marca_id?: string | null
          peso_kg?: number
          recipiente?: string
          recolhido_at?: string | null
          registado_por?: string
          sobra_acao?: string | null
          sobra_kg?: number | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          aproveitamento_nota?: string | null
          buffet_item_id?: string | null
          canal?: string
          created_at?: string
          dish_name?: string
          enviado_at?: string
          estado?: string
          ficha_tecnica_id?: string | null
          id?: string
          marca_id?: string | null
          peso_kg?: number
          recipiente?: string
          recolhido_at?: string | null
          registado_por?: string
          sobra_acao?: string | null
          sobra_kg?: number | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registos_producao_buffet_item_id_fkey"
            columns: ["buffet_item_id"]
            isOneToOne: false
            referencedRelation: "buffet_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registos_producao_ficha_tecnica_id_fkey"
            columns: ["ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "fichas_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registos_producao_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registos_producao_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissoes: {
        Row: {
          permissao_chave: string
          role: string
        }
        Insert: {
          permissao_chave: string
          role: string
        }
        Update: {
          permissao_chave?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissoes_permissao_chave_fkey"
            columns: ["permissao_chave"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["chave"]
          },
        ]
      }
      role_permissoes_v2: {
        Row: {
          permissao_id: string
          role_id: string
        }
        Insert: {
          permissao_id: string
          role_id: string
        }
        Update: {
          permissao_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissoes_v2_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissoes_v2_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          ativo: boolean
          chave: string
          created_at: string
          descricao: string | null
          id: string
          is_base: boolean
          nome: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_base?: boolean
          nome: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_base?: boolean
          nome?: string
        }
        Relationships: []
      }
      servico_horarios: {
        Row: {
          ativo: boolean
          created_at: string
          dia_semana: number | null
          hora_fim: string
          hora_inicio: string
          id: string
          marca_id: string
          periodo: string
          servico: string
          unidade_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_semana?: number | null
          hora_fim: string
          hora_inicio: string
          id?: string
          marca_id: string
          periodo: string
          servico: string
          unidade_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_semana?: number | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          marca_id?: string
          periodo?: string
          servico?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_horarios_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_horarios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          categoria: string
          concluida: boolean
          created_at: string
          critica: boolean
          departamento: string
          descricao: string | null
          id: string
          periodicidade: string
          prioridade: string
          responsavel: string
          titulo: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string
          concluida?: boolean
          created_at?: string
          critica?: boolean
          departamento?: string
          descricao?: string | null
          id?: string
          periodicidade?: string
          prioridade?: string
          responsavel?: string
          titulo: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          concluida?: boolean
          created_at?: string
          critica?: boolean
          departamento?: string
          descricao?: string | null
          id?: string
          periodicidade?: string
          prioridade?: string
          responsavel?: string
          titulo?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade_marca_servicos: {
        Row: {
          ativo: boolean
          marca_id: string
          servico: string
          unidade_id: string
        }
        Insert: {
          ativo?: boolean
          marca_id: string
          servico: string
          unidade_id: string
        }
        Update: {
          ativo?: boolean
          marca_id?: string
          servico?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidade_marca_servicos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidade_marca_servicos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade_servicos: {
        Row: {
          ativo: boolean
          servico: string
          unidade_id: string
        }
        Insert: {
          ativo?: boolean
          servico: string
          unidade_id: string
        }
        Update: {
          ativo?: boolean
          servico?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidade_servicos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          ativo: boolean
          created_at: string
          e_central: boolean
          id: string
          nome: string
          slug: string
          tem_cozinha_propria: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          e_central?: boolean
          id?: string
          nome: string
          slug: string
          tem_cozinha_propria?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          e_central?: boolean
          id?: string
          nome?: string
          slug?: string
          tem_cozinha_propria?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          role_id: string | null
          user_id: string
        }
        Insert: {
          role: string
          role_id?: string | null
          user_id: string
        }
        Update: {
          role?: string
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_historico: {
        Row: {
          almoco: number
          created_at: string
          data: string
          dia_festivo: string | null
          id: string
          jantar: number
          total: number
        }
        Insert: {
          almoco?: number
          created_at?: string
          data: string
          dia_festivo?: string | null
          id?: string
          jantar?: number
          total?: number
        }
        Update: {
          almoco?: number
          created_at?: string
          data?: string
          dia_festivo?: string | null
          id?: string
          jantar?: number
          total?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_role: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      is_gerencia: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      set_employee_pin: {
        Args: { p_id: string; p_pin: string }
        Returns: undefined
      }
      tem_permissao: { Args: { p_permissao: string }; Returns: boolean }
      verify_employee_pin: {
        Args: { p_pin: string }
        Returns: {
          id: string
          nome: string
          role: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
