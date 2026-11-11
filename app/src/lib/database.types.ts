// Tipos do banco no formato do gerador do Supabase.
// Regenerar depois de mudar o banco: npx supabase gen types typescript --local > app/src/lib/database.types.ts
// A CI regenera este arquivo a partir das migrações e roda o typecheck: se o banco mudar e o código não, ela acusa.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_device_id: string | null;
          actor_user_id: string | null;
          company_id: string | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: number;
          metadata: Json;
        };
        Insert: {
          action: string;
          actor_device_id?: string | null;
          actor_user_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: never;
          metadata?: Json;
        };
        Update: {
          action?: string;
          actor_device_id?: string | null;
          actor_user_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          metadata?: Json;
        };
        Relationships: [];
      };
      boardings: {
        Row: {
          boarded_at: string;
          card_id: string | null;
          company_id: string;
          device_id: string | null;
          id: number;
          student_id: string;
          van_id: string;
        };
        Insert: {
          boarded_at?: string;
          card_id?: string | null;
          company_id: string;
          device_id?: string | null;
          id?: never;
          student_id: string;
          van_id: string;
        };
        Update: {
          boarded_at?: string;
          card_id?: string | null;
          company_id?: string;
          device_id?: string | null;
          id?: never;
          student_id?: string;
          van_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'boardings_card_id_company_id_fkey';
            columns: ['card_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'cards';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'boardings_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'boardings_device_id_company_id_fkey';
            columns: ['device_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'devices';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'boardings_student_id_company_id_fkey';
            columns: ['student_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'boardings_van_id_company_id_fkey';
            columns: ['van_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'vans';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      cards: {
        Row: {
          active: boolean;
          company_id: string;
          created_at: string;
          id: string;
          student_id: string;
          uid: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          company_id: string;
          created_at?: string;
          id?: string;
          student_id: string;
          uid: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          company_id?: string;
          created_at?: string;
          id?: string;
          student_id?: string;
          uid?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cards_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cards_student_id_company_id_fkey';
            columns: ['student_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      companies: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          company_id: string;
          created_at: string;
          email: string;
          id: string;
          role: Database['public']['Enums']['member_role'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          email: string;
          id?: string;
          role: Database['public']['Enums']['member_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          role?: Database['public']['Enums']['member_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'company_members_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      devices: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          last_seen_at: string | null;
          name: string;
          token_hash: string;
          updated_at: string;
          van_id: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          last_seen_at?: string | null;
          name: string;
          token_hash: string;
          updated_at?: string;
          van_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          last_seen_at?: string | null;
          name?: string;
          token_hash?: string;
          updated_at?: string;
          van_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'devices_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'devices_van_id_company_id_fkey';
            columns: ['van_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'vans';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      students: {
        Row: {
          city: string | null;
          company_id: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          city?: string | null;
          company_id: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'students_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      van_drivers: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
          van_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
          van_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
          van_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'van_drivers_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'van_drivers_company_id_user_id_fkey';
            columns: ['company_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'company_members';
            referencedColumns: ['company_id', 'user_id'];
          },
          {
            foreignKeyName: 'van_drivers_van_id_company_id_fkey';
            columns: ['van_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'vans';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      vans: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vans_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_company_member: {
        Args: {
          p_company_id: string;
          p_email: string;
          p_role: Database['public']['Enums']['member_role'];
        };
        Returns: string;
      };
      create_company: { Args: { p_name: string }; Returns: string };
      create_device: {
        Args: { p_company_id: string; p_name: string; p_van_id?: string };
        Returns: {
          device_id: string;
          token: string;
        }[];
      };
      register_boarding: {
        Args: { p_device_token: string; p_read_at?: string; p_uid: string };
        Returns: Json;
      };
      rotate_device_token: { Args: { p_device_id: string }; Returns: string };
    };
    Enums: {
      member_role: 'owner' | 'driver';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
