import { useRef, useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import * as api from '../api/client'

export function Header() {
  const toggleProfilePopover = useAppStore((s) => s.toggleProfilePopover)
  const isProfilePopoverOpen = useAppStore((s) => s.isProfilePopoverOpen)
  const closeProfilePopover = useAppStore((s) => s.closeProfilePopover)
  const popoverRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        isProfilePopoverOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        closeProfilePopover()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isProfilePopoverOpen, closeProfilePopover])

  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="brand">
          <span className="material-symbols-outlined brand-logo">assignment</span>
          <h1 className="brand-title">LogBook</h1>
        </div>



        <div className="header-actions">
          <div className="profile-wrapper" style={{ position: 'relative', width: 48, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <button
              ref={btnRef}
              type="button"
              className={`btn-icon header-icon-btn profile-btn ${isProfilePopoverOpen ? 'profile-active' : ''}`}
              title="Akun Profil"
              onClick={toggleProfilePopover}
              style={{ position: 'relative', zIndex: 2, margin: 0, width: '100%', height: '100%', borderRadius: 20 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>account_circle</span>
            </button>

            <ProfilePopover ref={popoverRef} isOpen={isProfilePopoverOpen} />
          </div>
        </div>
      </div>
    </header>
  )
}

const ProfilePopover = ({ isOpen, ref }: { isOpen: boolean; ref?: React.Ref<HTMLDivElement> }) => {
  const profile = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)
  const closeProfilePopover = useAppStore((s) => s.closeProfilePopover)
  const showToast = useAppStore((s) => s.showToast)

  const [form, setForm] = useState({
    namaPeserta: profile?.namaPeserta || '',
    tempatPkl: profile?.tempatPkl || '',
    namaInstruktur: profile?.namaInstruktur || '',
    namaPembimbing: profile?.namaPembimbing || '',
    nipPembimbing: profile?.nipPembimbing || '',
    nidnInstruktur: profile?.nidnInstruktur || '',
  })
  const [saving, setSaving] = useState(false)

  // Update local form state when profile data arrives from the server
  useEffect(() => {
    if (profile) {
      setForm({
        namaPeserta: profile.namaPeserta || '',
        tempatPkl: profile.tempatPkl || '',
        namaInstruktur: profile.namaInstruktur || '',
        namaPembimbing: profile.namaPembimbing || '',
        nipPembimbing: profile.nipPembimbing || '',
        nidnInstruktur: profile.nidnInstruktur || '',
      })
    }
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await api.updateProfile(form)
      setProfile(updated)
      showToast('Identitas berhasil disimpan')
      closeProfilePopover()
    } catch (err: any) {
      showToast(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className={`profile-popover ${isOpen ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>Identitas Peserta PKL</h3>
          <p className="hint" style={{ marginTop: 2 }}>Otomatis muncul di laporan</p>
        </div>
        <button type="button" className="btn-close" onClick={closeProfilePopover} title="Tutup">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="namaPeserta">Nama Peserta Didik</label>
          <input type="text" id="namaPeserta" required value={form.namaPeserta} onChange={(e) => setForm({ ...form, namaPeserta: e.target.value })} />
        </div>
        <div className="form-row">
          <label htmlFor="tempatPkl">Dunia Kerja / Tempat PKL</label>
          <input type="text" id="tempatPkl" required value={form.tempatPkl} onChange={(e) => setForm({ ...form, tempatPkl: e.target.value })} />
        </div>
        <div className="form-row">
          <label htmlFor="namaInstruktur">Nama Instruktur</label>
          <input type="text" id="namaInstruktur" required value={form.namaInstruktur} onChange={(e) => setForm({ ...form, namaInstruktur: e.target.value })} />
        </div>
        <div className="form-row">
          <label htmlFor="nidnInstruktur">NIDN Instruktur</label>
          <input type="text" id="nidnInstruktur" placeholder="cth. 1234567890" value={form.nidnInstruktur} onChange={(e) => setForm({ ...form, nidnInstruktur: e.target.value })} />
        </div>
        <div className="form-row">
          <label htmlFor="namaPembimbing">Nama Pembimbing</label>
          <input type="text" id="namaPembimbing" required value={form.namaPembimbing} onChange={(e) => setForm({ ...form, namaPembimbing: e.target.value })} />
        </div>
        <div className="form-row">
          <label htmlFor="nipPembimbing">NIP Pembimbing</label>
          <input type="text" id="nipPembimbing" placeholder="cth. 19800101 200501 1 001" value={form.nipPembimbing} onChange={(e) => setForm({ ...form, nipPembimbing: e.target.value })} />
        </div>
        <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={closeProfilePopover}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <span className="material-symbols-outlined">save</span>
            <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
