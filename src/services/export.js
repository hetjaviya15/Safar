import { formatDate, tripDuration } from '@/utils/date';
import { colors } from '@/constants/palette';
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[c]);
}
export function buildTripHtml(trip, data) {
  const e = escapeHtml;
  const days = Array.from({
    length: tripDuration(trip.start_date, trip.end_date)
  }, (_, i) => {
    const rows = data.activities.filter(a => a.day_number === i + 1).sort((a, b) => a.sort_order - b.sort_order);
    return `<section><h2>Day ${i + 1}</h2>${rows.length ? rows.map(a => `<div class="activity"><strong>${e(a.starts_at)} ${e(a.title)}</strong><p>${e(a.location)}</p>${a.notes ? `<p>${e(a.notes).replace(/\n/g, '<br/>')}</p>` : ''}</div>`).join('') : '<p class="muted">A day to make your own.</p>'}</section>`;
  }).join('');
  const totals = {};
  data.expenses.forEach(a => {
    totals[a.currency] = (totals[a.currency] ?? 0) + Number(a.amount);
  });
  return `<!doctype html><html><head><meta charset="utf-8"/><style>@page{margin:24mm 18mm}body{font-family:Arial,sans-serif;color:${colors.text};font-size:12px;line-height:1.6}header{border-bottom:5px solid ${colors.accent};background:${colors.primary};color:white;padding:28px;border-radius:16px}h1{font-size:30px;margin:4px 0}h2{color:${colors.primary};border-bottom:1px solid ${colors.border};padding-bottom:6px;margin-top:28px}p{margin:4px 0}.muted{color:${colors.muted}}.activity{padding:10px 12px;border-left:3px solid ${colors.accent};background:${colors.background};margin:8px 0;break-inside:avoid}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid ${colors.border};padding:8px}tr{break-inside:avoid}.pill{display:inline-block;background:${colors.accentSoft};padding:6px 10px;margin:3px;border-radius:10px}footer{margin-top:36px;color:${colors.muted};font-size:10px}</style></head><body><header><p>SAFAR · YOUR JOURNEY, YOUR WAY</p><h1>${e(trip.title)}</h1><p>${e(trip.destination)}</p><p>${e(formatDate(trip.start_date))} – ${e(formatDate(trip.end_date))} · ${trip.travelers} travelers</p></header>${days}<h2>Bookings</h2>${data.bookings.length ? `<table><tr><th>Type</th><th>Provider</th><th>Reference</th><th>Status</th></tr>${data.bookings.map(b => `<tr><td>${e(b.booking_type)}</td><td>${e(b.provider)}<br/>${e(b.starts_at)}</td><td>${e(b.reference)}</td><td>${e(b.status)}</td></tr>`).join('')}</table>` : '<p>No bookings saved.</p>'}<h2>Budget & expenses</h2><p>Budget: ${trip.budget == null ? 'Not set' : `${e(trip.currency)} ${Number(trip.budget).toLocaleString()}`}</p>${Object.entries(totals).map(([currency, total]) => `<p>Spent: ${e(currency)} ${total.toLocaleString()}</p>`).join('')}<table>${data.expenses.map(a => `<tr><td>${e(a.title)}</td><td>${e(a.category)}</td><td>${e(a.currency)} ${Number(a.amount).toLocaleString()}</td></tr>`).join('')}</table><h2>Packing list</h2>${data.packing.map(p => `<span class="pill">${p.is_packed ? '[x]' : '[ ]'} ${e(p.name)} × ${p.quantity}</span>`).join('') || '<p>No items yet.</p>'}<h2>Notes</h2>${data.notes.map(n => `<h3>${e(n.title)}</h3><p>${e(n.body).replace(/\n/g, '<br/>')}</p>`).join('') || '<p>No notes yet.</p>'}<footer>Created with Safar. This document contains your travel plans and booking details; share it with people you trust.</footer></body></html>`;
}