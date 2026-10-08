/* Pure utility functions — ported from theme.js */

import { getHoliday } from './holidays'

export function formatTanggalIndo(tanggal: string | null | undefined): string {
  if (!tanggal) return '-'
  const cleanDate = typeof tanggal === 'string' && tanggal.includes('T') ? tanggal.split('T')[0] : String(tanggal)
  const parts = cleanDate.split('-')
  if (parts.length < 3) return cleanDate
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12) return cleanDate
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${String(d).padStart(2, '0')} ${bulan[m - 1]} ${y}`
}

export function weekRangeLabelClient(mondayKey: string, entries: { tanggal: string }[] = []): string {
  const bulanSingkat = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
  const [y, m, d] = mondayKey.split('-').map(Number)

  let numDays = 5
  if (entries && entries.length > 0) {
    const hasSat = entries.some(e => new Date(e.tanggal).getDay() === 6)
    const hasSun = entries.some(e => new Date(e.tanggal).getDay() === 0)
    if (hasSun) numDays = 7
    else if (hasSat) numDays = 6
  }

  const days: Date[] = []
  for (let i = 0; i < numDays; i++) {
    days.push(new Date(y, m - 1, d + i))
  }

  let startIdx = 0
  while (startIdx < days.length) {
    const dStr = `${days[startIdx].getFullYear()}-${String(days[startIdx].getMonth() + 1).padStart(2, '0')}-${String(days[startIdx].getDate()).padStart(2, '0')}`
    if (getHoliday(dStr)) startIdx++
    else break
  }
  if (startIdx === days.length) startIdx = 0

  let endIdx = days.length - 1
  while (endIdx >= startIdx) {
    const dStr = `${days[endIdx].getFullYear()}-${String(days[endIdx].getMonth() + 1).padStart(2, '0')}-${String(days[endIdx].getDate()).padStart(2, '0')}`
    if (getHoliday(dStr)) endIdx--
    else break
  }

  const startDate = days[startIdx]
  const endDate = days[endIdx]

  if (startDate.getMonth() === endDate.getMonth()) {
    if (startDate.getDate() === endDate.getDate()) {
      return `${startDate.getDate()} ${bulanSingkat[startDate.getMonth()]} ${startDate.getFullYear()}`
    }
    return `${startDate.getDate()} - ${endDate.getDate()} ${bulanSingkat[startDate.getMonth()]} ${startDate.getFullYear()}`
  }
  return `${startDate.getDate()} ${bulanSingkat[startDate.getMonth()]} - ${endDate.getDate()} ${bulanSingkat[endDate.getMonth()]} ${endDate.getFullYear()}`
}

export function getWeekKey(tanggal: string): string {
  const [y, m, d] = tanggal.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const dow = (dateObj.getDay() + 6) % 7
  const monObj = new Date(dateObj)
  monObj.setDate(dateObj.getDate() - dow)
  return `${monObj.getFullYear()}-${String(monObj.getMonth() + 1).padStart(2, '0')}-${String(monObj.getDate()).padStart(2, '0')}`
}

export const DASHBOARD_QUOTES: { text: string; author: string }[] = [
  { text: 'Setiap catatan kecil hari ini adalah bukti kerja kerasmu selama PKL.', author: 'LogBook' },
  { text: 'Kedisiplinan mencatat hari ini memudahkan laporanmu esok hari.', author: 'LogBook' },
  { text: 'Tugas kecil yang selesai hari ini lebih baik daripada rencana besar yang tertunda.', author: 'LogBook' },
  { text: 'PKL bukan sekadar hadir, tapi tentang apa yang kamu pelajari setiap harinya.', author: 'LogBook' },
  { text: 'Progres kecil yang konsisten mengalahkan semangat besar yang sesaat.', author: 'LogBook' },
  { text: 'Jangan menunggu motivasi, mulailah mencatat maka motivasi akan datang.', author: 'LogBook' },
  { text: 'Selesaikan satu tugas hari ini, dan hari esok akan terasa lebih ringan.', author: 'LogBook' },
  { text: 'Catat, kerjakan, selesaikan — ulangi setiap hari selama PKL.', author: 'LogBook' },
  { text: 'Pengalaman PKL terbaik datang dari rasa ingin tahu yang tidak pernah padam.', author: 'LogBook' },
  { text: 'Fokus pada satu langkah kecil hari ini, bukan seluruh perjalanan PKL.', author: 'LogBook' },
  { text: 'Orang rajin bukan yang tidak pernah lelah, tapi yang tetap mencatat meski lelah.', author: 'LogBook' },
  { text: 'Jurnal yang rapi hari ini adalah nilai plus untuk laporan akhir PKL-mu.', author: 'LogBook' },
]

export function getRandomQuote(excludeText?: string): { text: string; author: string } {
  if (DASHBOARD_QUOTES.length === 0) return { text: '', author: '' }
  if (DASHBOARD_QUOTES.length === 1) return DASHBOARD_QUOTES[0]
  let next = DASHBOARD_QUOTES[Math.floor(Math.random() * DASHBOARD_QUOTES.length)]
  let guard = 0
  while (next.text === excludeText && guard < 10) {
    next = DASHBOARD_QUOTES[Math.floor(Math.random() * DASHBOARD_QUOTES.length)]
    guard += 1
  }
  return next
}

export function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

