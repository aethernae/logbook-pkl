export interface Profile {
  namaPeserta: string
  tempatPkl: string
  namaInstruktur: string
  namaPembimbing: string
  nipPembimbing?: string
  nidnInstruktur?: string
  geminiApiKey?: string
  apiProvider?: 'gemini' | 'openrouter' | 'ollama'
  openRouterApiKey?: string
  ollamaUrl?: string
}

export interface Entry {
  id: string
  tanggal: string
  hari: string
  kegiatan: string
  photos: string[]
}

export interface Subject {
  id: string
  name: string
}

export interface Task {
  id: string
  title: string
  category: string
  subject: string | null
  deadline: string | null
  description: string
  status: string
  attachmentPath: string | null
  attachmentName: string | null
  referenceUrl: string | null
}

export interface QuickNote {
  id: string
  tanggal: string
  teks: string
  createdAt: string
  isUsed: number
}
