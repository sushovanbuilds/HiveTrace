'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleCheck,
  CloudSun,
  FileCheck2,
  Hexagon,
  LayoutDashboard,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
  Waves,
} from 'lucide-react'

type Risk = 'LOW' | 'MEDIUM' | 'HIGH'

const batches = [
  { id: 'BATCH-2026-001', variety: 'Wild Forest Honey', origin: 'Uttarakhand', volume: '486 kg', stage: 'Lab verified', risk: 'LOW' as Risk, date: '24 Aug 2026' },
  { id: 'BATCH-2026-002', variety: 'Eucalyptus Honey', origin: 'Punjab', volume: '312 kg', stage: 'Processing', risk: 'MEDIUM' as Risk, date: '23 Aug 2026' },
  { id: 'BATCH-2026-003', variety: 'Multifloral Honey', origin: 'Maharashtra', volume: '728 kg', stage: 'Harvest registered', risk: 'LOW' as Risk, date: '21 Aug 2026' },
  { id: 'BATCH-2026-004', variety: 'Coconut Blossom', origin: 'Kerala', volume: '194 kg', stage: 'Review required', risk: 'HIGH' as Risk, date: '20 Aug 2026' },
]

const incidents = [
  { title: 'Common GPS anomaly', scope: '18,420 batches', detail: 'Uttarakhand · 14–24 Aug', confidence: '98.2%', risk: 'HIGH' as Risk },
  { title: 'Moisture drift above threshold', scope: '42 batches', detail: 'Punjab · 22 Aug', confidence: '91.6%', risk: 'MEDIUM' as Risk },
  { title: 'Duplicate harvest attestations', scope: '7 batches', detail: 'Maharashtra · 18 Aug', confidence: '87.4%', risk: 'MEDIUM' as Risk },
]

function RiskBadge({ risk }: { risk: Risk }) {
  return <span className={`risk-badge risk-${risk.toLowerCase()}`}><span className="risk-dot" />{risk}</span>
}

function Metric({ label, value, delta, icon: Icon, tone = 'amber' }: { label: string; value: string; delta: string; icon: typeof Activity; tone?: string }) {
  return <div className="metric-card">
    <div className={`metric-icon tone-${tone}`}><Icon size={18} strokeWidth={1.8} /></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small><TrendingUp size={12} /> {delta}</small></div>
  </div>
}

function MiniChart() {
  const points = '0,92 38,78 76,84 114,51 152,63 190,42 228,48 266,18 304,31 342,8 380,25 418,14'
  return <div className="chart-wrap" aria-label="Verified batch activity over the last 12 weeks">
    <svg viewBox="0 0 418 112" role="img" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c67b2e" stopOpacity=".24" /><stop offset="1" stopColor="#c67b2e" stopOpacity="0" /></linearGradient></defs><polygon points={`0,112 ${points} 418,112`} fill="url(#chartFill)" /><polyline points={points} fill="none" stroke="#b86e24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="342" cy="8" r="4" fill="#fbfaf7" stroke="#b86e24" strokeWidth="2" /></svg>
    <div className="chart-labels"><span>Jun 08</span><span>Jun 22</span><span>Jul 06</span><span>Jul 20</span><span>Aug 03</span><span>Aug 24</span></div>
  </div>
}

function TraceJourney() {
  const stages = ['Hive', 'Harvest', 'Collection', 'Lab', 'Processing', 'Packaging', 'Distribution', 'Retail']
  return <div className="journey">
    {stages.map((stage, i) => <div className="journey-item" key={stage}><div className={`journey-node ${i < 5 ? 'complete' : ''}`}>{i < 5 ? <CircleCheck size={15} /> : <span>{i + 1}</span>}</div><span>{stage}</span>{i < stages.length - 1 && <div className={`journey-line ${i < 4 ? 'complete' : ''}`} />}</div>)}
  </div>
}

export function HiveTraceDashboard({ activeSection = 'Overview' }: { activeSection?: string }) {
  const [active, setActive] = useState(activeSection)
  const [query, setQuery] = useState('')
  const [selectedBatch, setSelectedBatch] = useState(batches[0])
  const filteredBatches = useMemo(() => batches.filter(b => `${b.id} ${b.origin} ${b.variety}`.toLowerCase().includes(query.toLowerCase())), [query])

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Hexagon size={22} strokeWidth={1.7} /></div><div><strong>HiveTrace</strong><span>HoneyChain</span></div></div>
      <div className="workspace"><div className="workspace-avatar">AR</div><div><strong>Aranya Collective</strong><span>Operations workspace</span></div><ChevronDown size={15} /></div>
      <nav className="nav" aria-label="Primary navigation"><p>COMMAND CENTER</p>{[['Overview', LayoutDashboard, '/'], ['Hive intelligence', Sparkles, '/hive-intelligence'], ['Risk & incidents', AlertTriangle, '/risk-incidents'], ['Traceability', Waves, '/traceability']].map(([name, Icon, href]) => <Link href={href as string} className={active === name ? 'nav-item active' : 'nav-item'} onClick={() => setActive(name as string)} key={name as string}><Icon size={17} />{name as string}{name === 'Risk & incidents' && <b>3</b>}</Link>)}<p className="nav-section">OPERATIONS</p>{[['Hives & apiaries', Sprout, '/hives'], ['Batches', Hexagon, '/batches'], ['Quality lab', FileCheck2, '/quality-lab'], ['Supply chain', MapPin, '/supply-chain']].map(([name, Icon, href]) => <Link href={href as string} className={active === name ? 'nav-item active' : 'nav-item'} onClick={() => setActive(name as string)} key={name as string}><Icon size={17} />{name as string}</Link>)}</nav>
      <div className="sidebar-footer"><button className="nav-item"><Users size={17} />Team & roles</button><button className="nav-item"><Bell size={17} />Notifications<span className="notification-dot" /></button><div className="profile"><div className="profile-avatar">AS</div><div><strong>Anika Sharma</strong><span>Administrator</span></div><ChevronDown size={14} /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>Command center</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><label className="search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search batches, hives, incidents" /></label><button className="icon-button" aria-label="Notifications"><Bell size={18} /><span /></button><div className="live-status"><i /> Network live</div></div></header>
      <div className="content-inner">
        <section className="welcome-row"><div><p className="eyebrow">TUESDAY, 26 AUGUST 2026 · 09:42 IST</p><h1>Good morning, Anika.</h1><p className="subhead">Here&apos;s the integrity pulse across your honey network.</p></div><button className="primary-button"><Sparkles size={16} /> Ask Hive Intelligence</button></section>
        <section className="metric-grid"><Metric label="Active hives" value="1,284" delta="8.4% this season" icon={Hexagon} /><Metric label="Harvested honey" value="12,840 kg" delta="12.1% vs last month" icon={Waves} tone="sage" /><Metric label="Verified batches" value="96.8%" delta="2.6% this month" icon={ShieldCheck} tone="blue" /><Metric label="Open incidents" value="3" delta="1 needs review" icon={AlertTriangle} tone="red" /></section>
        <section className="main-grid"><div className="panel chart-panel"><div className="panel-header"><div><p className="eyebrow">NETWORK ACTIVITY</p><h2>Batch verification velocity</h2></div><div className="select-pill">Last 12 weeks <ChevronDown size={14} /></div></div><div className="chart-legend"><span><i className="legend-amber" />Verified batches</span><span><i className="legend-sage" />Harvest volume</span></div><MiniChart /></div><div className="panel intelligence-panel"><div className="panel-header"><div><p className="eyebrow">AI-ASSISTED MONITORING</p><h2>Hive Intelligence</h2></div><span className="ai-pulse"><Sparkles size={14} /> Ready</span></div><div className="ai-question"><Sparkles size={16} /><span>Ask about your network...</span><ArrowUpRight size={16} /></div><div className="ai-result"><div className="result-icon"><CloudSun size={18} /></div><div><strong>Network conditions are stable</strong><p>All active apiaries are within expected production range. One location in Uttarakhand may need a moisture re-check.</p><small>Based on 4,812 measurements · 92% confidence</small></div></div><button className="text-button">View intelligence feed <ArrowUpRight size={14} /></button></div></section>
        <section className="lower-grid"><div className="panel batches-panel"><div className="panel-header"><div><p className="eyebrow">RECENT TRACEABILITY</p><h2>Batch activity</h2></div><button className="text-button">View all <ArrowUpRight size={14} /></button></div><div className="table-wrap"><table><thead><tr><th>Batch</th><th>Origin</th><th>Stage</th><th>Risk</th><th>Updated</th></tr></thead><tbody>{filteredBatches.map(batch => <tr key={batch.id} onClick={() => setSelectedBatch(batch)} className={selectedBatch.id === batch.id ? 'selected-row' : ''}><td><strong>{batch.id}</strong><span>{batch.variety} · {batch.volume}</span></td><td><MapPin size={13} />{batch.origin}</td><td><span className="stage-dot" />{batch.stage}</td><td><RiskBadge risk={batch.risk} /></td><td>{batch.date}</td></tr>)}</tbody></table></div></div><div className="panel risk-panel"><div className="panel-header"><div><p className="eyebrow">TRIAGE QUEUE</p><h2>Risk & incidents</h2></div><span className="count-badge">3 open</span></div><div className="incident-list">{incidents.map(incident => <div className="incident" key={incident.title}><div className={`incident-icon incident-${incident.risk.toLowerCase()}`}><AlertTriangle size={16} /></div><div className="incident-copy"><div><strong>{incident.title}</strong><RiskBadge risk={incident.risk} /></div><span>{incident.scope} · {incident.detail}</span><small>{incident.confidence} confidence</small></div><ArrowUpRight size={15} className="incident-arrow" /></div>)}</div><button className="outline-button">Open investigation queue <ArrowUpRight size={14} /></button></div></section>
        <section className="panel journey-panel"><div className="panel-header"><div><p className="eyebrow">SELECTED BATCH · {selectedBatch.id}</p><h2>Traceability journey</h2></div><div className="batch-summary"><RiskBadge risk={selectedBatch.risk} /><strong>{selectedBatch.origin}</strong><span>{selectedBatch.volume}</span></div></div><TraceJourney /><div className="evidence-row"><div><FileCheck2 size={17} /><span><strong>18 evidence records</strong><small>Cryptographically verified</small></span></div><div><ShieldCheck size={17} /><span><strong>Integrity score 99.4</strong><small>Last verified 8 min ago</small></span></div><button className="text-button">Open batch detail <ArrowUpRight size={14} /></button></div></section>
      </div>
    </main>
  </div>
}
