import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import * as apiClient from '../api/client'
import type { QuickNote } from '../types/index'
import { todayStr } from '../utils/format'

export function QuickNoteWidget() {
  const showToast = useAppStore((s) => s.showToast)
  const [inputText, setInputText] = useState('')
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.getQuickNotes(todayStr())
      .then(setNotes)
      .catch(() => {/* silently ignore on load */})
  }, [])

  // Refresh otomatis kalau AI Chat baru saja membuat quick note baru (lihat AiChatPanel.tsx)
  useEffect(() => {
    function handleQuickNoteCreated() {
      apiClient.getQuickNotes(todayStr())
        .then(setNotes)
        .catch(() => {/* silently ignore */})
    }
    window.addEventListener('quicknote:created', handleQuickNoteCreated)
    return () => window.removeEventListener('quicknote:created', handleQuickNoteCreated)
  }, [])

  // Refresh otomatis kalau catatan cepat baru saja ditandai terpakai (dari AddEntryModal saat submit)
  useEffect(() => {
    function handleQuickNoteUsed() {
      apiClient.getQuickNotes(todayStr())
        .then(setNotes)
        .catch(() => {/* silently ignore */})
    }
    window.addEventListener('quicknote:used', handleQuickNoteUsed)
    return () => window.removeEventListener('quicknote:used', handleQuickNoteUsed)
  }, [])

  async function handleSave() {
    if (!inputText.trim()) return
    setSaving(true)
    try {
      const newNote = await apiClient.createQuickNote({ tanggal: todayStr(), teks: inputText.trim() })
      setNotes(prev => [...prev, newNote])
      setInputText('')
    } catch (e: any) {
      showToast(e.message, true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.deleteQuickNote(id)
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (e: any) {
      showToast(e.message, true)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="quick-note-widget m3-quick-note">
      <div className="quick-note-header m3-quick-note-headline-row">
        <div className="m3-quick-note-headline-icon" aria-hidden="true">
          <span className="material-symbols-outlined">
            bolt
          </span>
        </div>
        <div className="m3-quick-note-headline-text">
          <p className="m3-quick-note-eyebrow">Hari ini · {notes.length} catatan</p>
          <h3 className="quick-note-title m3-quick-note-title">Catatan Cepat</h3>
          <p className="m3-quick-note-supporting">Tangkap ide PKL dalam sekali ketuk — AI bantu merangkumnya jadi jurnal.</p>
        </div>
      </div>

      <form
        className="quick-note-input-row m3-quick-note-searchbar"
        onSubmit={(e) => { e.preventDefault(); handleSave() }}
      >
        <span className="material-symbols-outlined m3-quick-note-searchbar-leading" aria-hidden="true">
          {saving ? 'progress_activity' : 'edit_note'}
        </span>
        <input
          id="quick-note-input"
          type="text"
          className="quick-note-input"
          placeholder="Tulis kegiatan singkat hari ini..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          autoComplete="off"
        />
        {inputText.trim() ? (
          <button
            type="button"
            className="btn-icon btn-sm m3-quick-note-clear-btn"
            title="Bersihkan"
            onClick={() => setInputText('')}
            disabled={saving}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        ) : null}
        <button
          id="quick-note-save-btn"
          type="submit"
          className="btn btn-primary btn-sm m3-quick-note-send-btn"
          disabled={saving || !inputText.trim()}
          title="Simpan catatan"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{saving ? 'progress_activity' : 'arrow_upward'}</span>
          <span className="m3-quick-note-send-label">{saving ? 'Menyimpan...' : 'Simpan'}</span>
        </button>
      </form>

      {notes.length > 0 ? (
        <ul className="quick-note-list m3-quick-note-list">
          {notes.map((note, idx) => (
            <li
              key={note.id}
              className="quick-note-item m3-quick-note-item"
              style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}
            >
              <span className="m3-quick-note-item-avatar" aria-hidden="true">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  streak
                </span>
              </span>
              <span className="quick-note-item-text">{note.teks}</span>
              <span className="m3-quick-note-item-trailing">
                <span className="m3-quick-note-item-count">{String(idx + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="btn-icon quick-note-delete-btn m3-quick-note-delete-btn"
                  title="Hapus catatan ini"
                  onClick={() => handleDelete(note.id)}
                  style={{ flexShrink: 0 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="hint quick-note-empty m3-quick-note-empty">
          <div className="m3-quick-note-empty-icon" aria-hidden="true">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div>
            <p className="m3-quick-note-empty-title">Belum ada catatan hari ini</p>
            <p className="m3-quick-note-empty-sub">Tulis satu kegiatan kecil di atas, tekan Enter — sisanya biar AI yang merangkum.</p>
          </div>
        </div>
      )}
    </div>
  )
}
