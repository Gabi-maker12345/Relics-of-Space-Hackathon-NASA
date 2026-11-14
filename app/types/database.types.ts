export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      media_translations: {
        Row: {
          audio_url: string | null
          caption: string | null
          created_at: string
          kicker: string | null
          lang: string
          media_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          caption?: string | null
          created_at?: string
          kicker?: string | null
          lang: string
          media_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          caption?: string | null
          created_at?: string
          kicker?: string | null
          lang?: string
          media_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_question_translations: {
        Row: {
          created_at: string
          explanation: string | null
          lang: string
          options: Json | null
          question: string | null
          question_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          lang: string
          options?: Json | null
          question?: string | null
          question_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          lang?: string
          options?: Json | null
          question?: string | null
          question_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string
          id: string
          options: Json
          position: number
          question: string
          relic_id: string
          updated_at: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string
          id?: string
          options: Json
          position?: number
          question: string
          relic_id: string
          updated_at?: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string
          id?: string
          options?: Json
          position?: number
          question?: string
          relic_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      relic_facts: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          relic_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          relic_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          relic_id?: string
          value?: string
        }
        Relationships: []
      }
      relic_media: {
        Row: {
          audio_url: string | null
          caption: string
          created_at: string
          credit: string
          id: string
          kicker: string
          mute_video: boolean
          position: number
          poster_url: string | null
          relic_id: string
          source_url: string | null
          title: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          audio_url?: string | null
          caption?: string
          created_at?: string
          credit?: string
          id?: string
          kicker?: string
          mute_video?: boolean
          position?: number
          poster_url?: string | null
          relic_id: string
          source_url?: string | null
          title?: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          audio_url?: string | null
          caption?: string
          created_at?: string
          credit?: string
          id?: string
          kicker?: string
          mute_video?: boolean
          position?: number
          poster_url?: string | null
          relic_id?: string
          source_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      relic_translations: {
        Row: {
          alt: string | null
          created_at: string
          intro_audio_url: string | null
          lang: string
          mission: string | null
          name: string | null
          relic_id: string
          story_text: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          intro_audio_url?: string | null
          lang: string
          mission?: string | null
          name?: string | null
          relic_id: string
          story_text?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          intro_audio_url?: string | null
          lang?: string
          mission?: string | null
          name?: string | null
          relic_id?: string
          story_text?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      relics: {
        Row: {
          alt: string
          cover_media_id: string | null
          created_at: string
          id: string
          intro_audio_url: string | null
          is_extra: boolean
          location: string
          mission: string
          name: string
          published: boolean
          published_at: string | null
          ratio: string
          reference_url: string | null
          slug: string
          status: string
          story_text: string
          summary: string
          updated_at: string
        }
        Insert: {
          alt?: string
          cover_media_id?: string | null
          created_at?: string
          id?: string
          intro_audio_url?: string | null
          is_extra?: boolean
          location?: string
          mission?: string
          name: string
          published?: boolean
          published_at?: string | null
          ratio?: string
          reference_url?: string | null
          slug: string
          status?: string
          story_text?: string
          summary?: string
          updated_at?: string
        }
        Update: {
          alt?: string
          cover_media_id?: string | null
          created_at?: string
          id?: string
          intro_audio_url?: string | null
          is_extra?: boolean
          location?: string
          mission?: string
          name?: string
          published?: boolean
          published_at?: string | null
          ratio?: string
          reference_url?: string | null
          slug?: string
          status?: string
          story_text?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: never
        Returns: boolean
      }
      set_updated_at: {
        Args: never
        Returns: unknown
      }
      sync_published_at: {
        Args: never
        Returns: unknown
      }
      validate_cover_media: {
        Args: never
        Returns: unknown
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

type PublicSchema = Database['public']

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never
