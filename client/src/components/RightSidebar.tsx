import { useState } from 'react'
import { useAppStore } from '../store/appStore'

export function RightSidebar() {
  const openAddEntryModal = useAppStore((s) => s.openAddEntryModal)
  const openAddTaskModal = useAppStore((s) => s.openAddTaskModal)
  const openManageSubjectsModal = useAppStore((s) => s.openManageSubjectsModal)
  const isAiChatOpen = useAppStore(s => s.isAiChatOpen)
  const toggleAiChat = useAppStore(s => s.toggleAiChat)
  const [fabOpen, setFabOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(localStorage.getItem('pkl_right_sidebar_closed') === 'true')

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('pkl_right_sidebar_closed', String(next))
    document.body.classList.toggle('right-sidebar-closed', next)
  }

  return (
    <aside className="app-right-sidebar" style={{ position: 'relative' }}>
      <div className="right-sidebar-scroll-area">
        <button className={`right-sidebar-icon ${isAiChatOpen ? 'active' : ''}`} title="AI Chat" onClick={toggleAiChat} style={{ flexShrink: 0, '--active-icon-color': 'var(--accent-green)' } as React.CSSProperties}>
          <span className="material-symbols-outlined" style={{ color: 'var(--accent-green)' }}>smart_toy</span>
        </button>
      </div>
        <hr style={{ width: 24, border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0', flexShrink: 0 }} />
        <div className="fab-wrapper" style={{ position: 'relative', width: 40, height: 40, zIndex: 100, flexShrink: 0, marginBottom: 56 }}>
          <button className={`right-sidebar-icon ${fabOpen ? 'fab-active' : ''}`} title="Tambah Baru" onClick={() => setFabOpen(!fabOpen)} style={{ position: 'relative', zIndex: 2, margin: 0 }}>
            <span className="material-symbols-outlined">add</span>
          </button>
          <div id="fabMenu" className={`custom-select-dropdown ${fabOpen ? 'open' : ''}`} style={{ bottom: 0, right: 'calc(100% - 1px)', paddingRight: 16, left: 'auto', top: 'auto', minWidth: 260, borderRadius: 20, borderBottomRightRadius: 0, zIndex: 1, boxShadow: 'none' }}>
            <div className="custom-select-options">
              <div className="custom-select-option" onClick={() => { setFabOpen(false); openAddEntryModal() }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#4285F4' }}>today</span>
                <div className="option-label">Tambah Catatan Harian</div>
              </div>
              <div className="custom-select-option" onClick={() => { setFabOpen(false); openAddTaskModal() }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0F9D58' }}>task_alt</span>
                <div className="option-label">Tambah Tugas Baru</div>
              </div>
              <div className="custom-select-option" onClick={() => { setFabOpen(false); openManageSubjectsModal() }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--fg-secondary)' }}>library_books</span>
                <div className="option-label">Atur Mata Pelajaran</div>
              </div>
              <div className="mobile-speed-dial-extra">
                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                <div className="custom-select-option" onClick={() => { setFabOpen(false); toggleAiChat() }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--accent-green)' }}>smart_toy</span>
                  <div className="option-label">AI Chat</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      <button className="right-sidebar-toggle" title="Sembunyikan panel samping" style={{ marginTop: 'auto', flexShrink: 0 }} onClick={toggleCollapse}>
        <span className="material-symbols-outlined">{collapsed ? 'chevron_left' : 'chevron_right'}</span>
      </button>
    </aside>
  )
}
