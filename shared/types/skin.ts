export interface SkinPreset {
  id: number
  name: string
  data: string
  username: string
  created_at: string
  updated_at: string
}

export interface SkinPresetDetail extends SkinPreset {
  avatarUrl: string | null
}
