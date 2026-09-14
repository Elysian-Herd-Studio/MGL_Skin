export interface SkinPreset {
  id: number
  name: string
  data: string
  username: string
  isPublic: boolean
  created_at: string
  updated_at: string
}

export interface SkinPresetDetail extends SkinPreset {
  userId: number
  avatarUrl: string | null
}

export interface SkinPresetPage {
  items: SkinPreset[]
  total: number
  page: number
  limit: number
}
