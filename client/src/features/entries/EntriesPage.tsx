import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { getMonthKey } from '../../utils/format'
import * as api from '../../api/client'
import { MonthGroup } from '../../components/entries/MonthGroup'
import type { Task, Entry } from '../../types/index'

function SelectionToolbar() {
  const selectedEntries = useAppStore((s) => s.selectedEntries)
  const clearSelectedEntries = useAppStore((s) => s.clearSelectedEntries)
  const showToast = useAppStore((s) => s.showToast)
  const [loading, setLoading] = useState(false)

  const isActive = selectedEntries.length > 0

  async function handlePreview() {
    if (selectedEntries.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/export/batch/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedEntries }),
      })
      if (!res.ok) throw new Error('Gagal memuat pratinjau')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Note: We don't revokeObjectURL immediately because the new tab needs time to load it.
      // The browser will clean it up when the document unloads.
    } catch (e: any) {
      showToast(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch('/api/export/batch/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedEntries }),
      })
      if (!res.ok) {
        let msg = 'Gagal mengunduh'
        try {
          const errData = await res.json()
          if (errData.error) msg = errData.error
        } catch(e) {}
        throw new Error(msg)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Catatan-PKL-${selectedEntries.length}-entri.zip`
      a.click()
      URL.revokeObjectURL(url)
      showToast(`${selectedEntries.length} catatan berhasil diunduh`)
    } catch (e: any) {
      showToast(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`selection-toolbar ${isActive ? 'active' : ''}`}>
      <div className="selection-toolbar-left">
        <button className="btn-icon" onClick={clearSelectedEntries} title="Batalkan Pilihan">
          <span className="material-symbols-outlined">close</span>
        </button>
        <span className="selection-count">{selectedEntries.length} dipilih</span>
      </div>
      <div className="selection-toolbar-right">
        <button className="btn btn-outline-primary btn-sm" onClick={handlePreview} title="Pratinjau Semua">
          <span className="material-symbols-outlined">visibility</span>
          <span>Pratinjau</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleDownload} disabled={loading} title="Unduh Semua sebagai ZIP">
          <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'download'}</span>
          <span>{loading ? 'Mengunduh...' : 'Unduh ZIP'}</span>
        </button>
      </div>
    </div>
  )
}

export function EntriesPage() {
  const entries = useAppStore((s) => s.entries)
  const trashedEntries = useAppStore((s) => s.trashedEntries)
  const currentView = useAppStore((s) => s.currentView)
  const isTrash = currentView === 'trash'
  
  const currentEntries = isTrash ? trashedEntries : entries
  const clearSelectedEntries = useAppStore((s) => s.clearSelectedEntries)

  useEffect(() => {
    clearSelectedEntries()
  }, [currentView, clearSelectedEntries])

  const entriesViewMode = useAppStore((s) => s.entriesViewMode)
  const setEntriesViewMode = useAppStore((s) => s.setEntriesViewMode)
  const selectedEntries = useAppStore((s) => s.selectedEntries)
  const toggleSelectedEntry = useAppStore((s) => s.toggleSelectedEntry)
  const selectAllWeekEntries = useAppStore((s) => s.selectAllWeekEntries)
  const showToast = useAppStore((s) => s.showToast)
  const setEntries = useAppStore((s) => s.setEntries)
  const setTrashedEntries = useAppStore((s) => s.setTrashedEntries)
  const openAddEntryModal = useAppStore((s) => s.openAddEntryModal)
  const setEditingId = useAppStore((s) => s.setEditingId)
  const trashedTasks = useAppStore((s) => s.trashedTasks)

  // 1. Daftar entri (tanpa filter — fitur pencarian tidak digunakan)
  const filteredEntries = currentEntries

  // 2. Memoize pengelompokan bulan & pengurutan (Month Grouping)
  const { monthMap, sortedMonthKeys } = useMemo(() => {
    const map: Record<string, Entry[]> = {}
    filteredEntries.forEach(entry => {
      const mKey = getMonthKey(entry.tanggal)
      if (!map[mKey]) map[mKey] = []
      map[mKey].push(entry)
    })

    const keys = Object.keys(map).sort((a, b) => b.localeCompare(a))

    // Sortir entri di dalam bulan tersebut agar tidak dilakukan ulang saat Render
    keys.forEach(key => {
      map[key].sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    })

    return { monthMap: map, sortedMonthKeys: keys }
  }, [filteredEntries])

  // 3. Daftar item Tempat Sampah (tanpa filter — fitur pencarian tidak digunakan)
  const filteredTrashedTasks = trashedTasks || []

  async function handleDeleteEntry(id: string, force = false) {
    try {
      await api.deleteEntry(id, force)
      if (force) {
        if (isTrash) setTrashedEntries(trashedEntries.filter(e => e.id !== id))
        else setEntries(entries.filter(e => e.id !== id))
      } else {
        setEntries(entries.filter(e => e.id !== id))
        showToast('Catatan dipindahkan ke Tempat Sampah', false, {
          label: 'Urungkan',
          onClick: async () => {
            try {
              await api.restoreEntry(id)
              // Reload entries
              const data = await api.getEntries()
              setEntries(data)
              showToast('Penghapusan dibatalkan')
            } catch (e: any) { showToast(e.message, true) }
          }
        })
      }
    } catch (e: any) { showToast(e.message, true) }
  }

  async function handleRestoreEntry(id: string) {
    try {
      await api.restoreEntry(id)
      showToast('Catatan berhasil dipulihkan')
      setTrashedEntries(trashedEntries.filter(e => e.id !== id))
    } catch (e: any) { showToast(e.message, true) }
  }

  function handleEdit(entry: typeof entries[0]) {
    setEditingId(entry.id)
    openAddEntryModal()
  }

  return (
    <section id="tab-entries" className="tab-panel active">
      <div style={{ padding: '16px 32px', width: '100%' }}>
        <div className="page-header">
          <div>
            <h2 className="page-title">{isTrash ? 'Tempat Sampah' : 'Daftar Catatan'}</h2>
            <p className="hint" style={{ margin: 0 }}>
              {isTrash ? 'Lihat dan pulihkan catatan yang telah dihapus.' : 'Catat dan kelola aktivitas harianmu selama PKL di sini.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <SelectionToolbar />
            {!isTrash && (
              <div className="m3-segmented-btn">
                <button className={`seg-btn ${entriesViewMode === 'list' ? 'active' : ''}`} onClick={() => setEntriesViewMode('list')} title="Tampilan Daftar">
                  <span className="material-symbols-outlined check-icon">check</span>
                  <span className="material-symbols-outlined">view_list</span>
                </button>
                <button className={`seg-btn ${entriesViewMode === 'grid' ? 'active' : ''}`} onClick={() => setEntriesViewMode('grid')} title="Tampilan Grid">
                  <span className="material-symbols-outlined check-icon">check</span>
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
              </div>
            )}
            <span className="badge">{filteredEntries.length}</span>
          </div>
        </div>

        <div className="entry-list" style={{ maxHeight: 'none' }}>
          {filteredEntries.length === 0 && !isTrash && (
            <p className="empty-state">Belum ada catatan. Tambahkan catatan harian dengan tombol Plus di pojok kanan.</p>
          )}
          {filteredEntries.length === 0 && isTrash && filteredTrashedTasks.length === 0 && (
            <p className="empty-state">Tempat sampah kosong.</p>
          )}

          {sortedMonthKeys.map(mKey => {
            const entriesInMonth = monthMap[mKey] // Telah di-sort dari useMemo

            return (
              <MonthGroup
                key={mKey}
                mKey={mKey}
                entries={entriesInMonth}
                isTrash={isTrash}
                entriesViewMode={entriesViewMode}
                selectedEntries={selectedEntries}
                onToggleSelect={toggleSelectedEntry}
                onSelectAllMonth={selectAllWeekEntries}
                onEdit={handleEdit}
                onDelete={handleDeleteEntry}
                onRestore={handleRestoreEntry}
              />
            )
          })}

          {/* Trashed tasks */}
          {isTrash && filteredTrashedTasks.length > 0 && (
            <div className="week-group-item expanded">
              <div className="week-group-header" style={{ background: 'var(--bg-surface)' }}>
                <div className="week-group-title" style={{ color: 'var(--warning)' }}>
                  <span className="material-symbols-outlined">task</span>
                  Tugas Terhapus ({filteredTrashedTasks.length})
                </div>
              </div>
              <div className="week-group-body">
                {filteredTrashedTasks.map(t => (
                  <TrashedTaskItem key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function TrashedTaskItem({ task }: { task: Task }) {
  const showToast = useAppStore((s) => s.showToast)
  const setTrashedTasks = useAppStore((s) => s.setTrashedTasks)
  const setTasks = useAppStore((s) => s.setTasks)

  async function handleRestore() {
    try {
      await api.restoreTask(task.id)
      showToast('Tugas dipulihkan')
      const updatedTrash = await api.getTrashedTasks()
      setTrashedTasks(updatedTrash)
      // Sinkronkan store utama agar task langsung muncul di halaman Manajemen Tugas
      const freshTasks = await api.getTasks()
      setTasks(freshTasks)
    } catch (e: any) { showToast(e.message, true) }
  }
  async function handleDeleteForever() {
    try {
      await api.deleteTaskForever(task.id)
      showToast('Tugas permanen dihapus')
      const updatedTrash = await api.getTrashedTasks()
      setTrashedTasks(updatedTrash)
    } catch (e: any) { showToast(e.message, true) }
  }
  return (
    <div className="entry-day-item">
      <div className="entry-header-row">
        <div className="entry-header-left">
          <h4 style={{ margin: 0, fontSize: 15, color: 'var(--fg-primary)' }}>{task.title}</h4>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 4 }}>Kategori: {task.category}</div>
        </div>
        <div className="entry-header-right" style={{ gap: 8 }}>
          <button className="btn btn-outline-primary btn-sm" onClick={handleRestore} title="Pulihkan">
            <span className="material-symbols-outlined">restore_from_trash</span>
            <span className="btn-label-desktop"> Pulihkan</span>
          </button>
          <button className="btn-icon btn-icon-danger" onClick={handleDeleteForever} title="Hapus Permanen">
            <span className="material-symbols-outlined">delete_forever</span>
          </button>
        </div>
      </div>
    </div>
  )
}
