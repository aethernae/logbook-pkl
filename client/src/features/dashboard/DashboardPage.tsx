import { useRef, useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { formatTanggalIndo, todayStr, getRandomQuote } from '../../utils/format'
import { QuickNoteWidget } from '../../components/QuickNoteWidget'

export function DashboardPage() {
  const tasks = useAppStore((s) => s.tasks)
  const allSubjects = useAppStore((s) => s.subjects)
  const openAddTaskModal = useAppStore((s) => s.openAddTaskModal)
  const dashSubjectFilter = useAppStore((s) => s.dashSubjectFilter)
  const setDashSubjectFilter = useAppStore((s) => s.setDashSubjectFilter)
  const scrollRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const [quote, setQuote] = useState(() => getRandomQuote())

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    
    // Smooth trailing indicator
    const updateIndicator = () => {
      const indicator = indicatorRef.current
      if (indicator && el) {
        const activeBtn = el.querySelector('.dash-filter-btn.active') as HTMLElement | null
        if (activeBtn) {
          indicator.style.opacity = '1'
          indicator.style.width = `${activeBtn.offsetWidth}px`
          indicator.style.height = `${activeBtn.offsetHeight}px`
          indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`
        }
      }
    }
    
    updateIndicator()
    // A small delay to ensure rendering is complete before measuring
    setTimeout(updateIndicator, 50)
    window.addEventListener('resize', updateIndicator)
    
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [dashSubjectFilter])

  const todo = tasks.filter(t => t.status === 'todo').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const done = tasks.filter(t => t.status === 'done').length
  // Bandingkan sebagai string YYYY-MM-DD (bukan Date) agar bebas masalah timezone
  const overdue = tasks.filter(t => {
    if (t.status === 'done' || !t.deadline) return false
    return t.deadline < todayStr()
  }).length

  // Upcoming tasks
  const upcomingAll = tasks
    .filter(t => t.status !== 'done' && t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())

  // Get all created subjects to be available in the filter
  const subjects = ['Semua', ...allSubjects.map(s => s.name)]

  const currentFilter = subjects.includes(dashSubjectFilter) ? dashSubjectFilter : 'Semua'
  const upcomingFiltered = currentFilter === 'Semua'
    ? upcomingAll
    : upcomingAll.filter(t => t.subject === currentFilter)

  return (
    <section id="tab-dashboard" className="tab-panel active" style={{ padding: 24 }}>
      <div className="dashboard-header">
        <h2 className="page-title">Beranda</h2>
        <p className="hint" style={{ marginBottom: 6 }}>Ringkasan aktivitas PKL dan tugas-tugasmu.</p>
        <div
          className="dashboard-quote-inline"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: 640,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--accent-yellow, #F4B400)', flexShrink: 0 }}>
            format_quote
          </span>
          <p key={quote.text} className="dashboard-quote-text" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--fg-secondary)', fontStyle: 'italic', flex: 1, minWidth: 0 }}>
            “{quote.text}” <span style={{ fontStyle: 'normal', color: 'var(--fg-muted)', fontSize: 12 }}>— {quote.author}</span>
          </p>
          <button
            type="button"
            className="btn-icon btn-sm"
            title="Tampilkan kutipan lain"
            onClick={() => setQuote((prev) => getRandomQuote(prev.text))}
            style={{ flexShrink: 0, width: 28, height: 28 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          </button>
        </div>
      </div>

      <div style={{ containerType: 'inline-size', width: '100%' }}>
        <div className="dashboard-grid">
          <StatCard icon="task" label="Total Tugas" value={tasks.length} color="var(--fg-primary)" className="stat-total" />
          <StatCard icon="pending_actions" label="Belum Mulai" value={todo} color="var(--warning)" className="stat-todo" />
          <StatCard icon="cached" label="Proses" value={inProgress} color="var(--primary)" className="stat-progress" />
          <StatCard icon="check_circle" label="Selesai" value={done} color="var(--success)" className="stat-done" />
          <StatCard icon="error" label="Overdue" value={overdue} color="var(--danger)" className="stat-overdue" />
        </div>
      </div>

      <QuickNoteWidget />

      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Tugas Mendatang</h3>
        </div>

        <div 
          ref={scrollRef}
          style={{ position: 'relative', display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'none' }}
        >
          <div className="dash-filter-indicator" ref={indicatorRef} />
          {subjects.map(subj => (
            <button
              key={subj}
              className={`btn btn-sm dash-filter-btn ${currentFilter === subj ? 'active' : ''}`}
              style={{ borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setDashSubjectFilter(subj)}
            >
              {subj}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {upcomingFiltered.length === 0 ? (
            <p className="hint" style={{ gridColumn: '1 / -1' }}>Tidak ada tugas mendatang untuk {currentFilter}.</p>
          ) : (
            upcomingFiltered.map(t => {
              const isOverdue = t.deadline! < todayStr()
              return (
                <div key={t.id} className="dash-list-card" onClick={() => openAddTaskModal(t)} style={{ cursor: 'pointer', height: '96px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="dash-list-card-title" title={t.title}>{t.title}</div>
                  <div className="dash-list-card-meta" style={{ color: isOverdue ? 'var(--danger)' : 'var(--fg-secondary)' }}>
                    Deadline: {formatTanggalIndo(t.deadline)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

function StatCard({ icon, label, value, color, className }: { icon: string; label: string; value: number; color: string; className: string }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-title">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
    </div>
  )
}
