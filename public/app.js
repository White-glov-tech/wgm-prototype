/* ==========================================================
   WHITE GLOVE MONITOR — PROTOTYPE V1.6
   Multi-Scrin + Employer Isolation + Complete Daily Evidence
   + Monitoring Policies + Period Analytics + 5-Page Reports
   ========================================================== */

const state = {
  page: 'dashboard',
  employeeTab: 'overview',
  mode: 'DEMO',
  employees: [],
  connections: [],
  selectedEmployeeId: '',
  reportStatus: 'Not generated',
  report: null,
  reportEmployeeId: null,
  reportAnalytics: null,
  reportPrevious: null,
  reportComparison: null,
  reportMetadata: null,
  reviewerChecks: [true, true, true, true, true],
  reportPeriod: { from: '2026-08-01', to: '2026-08-31' },
  deliveryQueue: [],
  toast: null,
  syncMessage: 'Demo data loaded. Connect Scrin to replace this with live employees.',
  role: localStorage.getItem('wgmRole') || 'owner',
  portalEmployer: localStorage.getItem('wgmPortalEmployer') || '',
  showAddConnection: false,
};

const defaultReport = {
  headline: 'The reporting period is ready for human review.',
  executiveSummary: 'Tracked time, available evidence, work categories, and context were reconciled for review.',
  strengths: [
    'Recorded time was reconciled for the selected period.',
    'Available evidence was preserved without inventing work.',
    'Human validation remains part of the WGM release process.'
  ],
  coaching: 'Continue clear project labeling, notes, and context so future reviews remain fast and evidence-based.',
  clientContext: 'No additional client context was supplied for this report run.',
  nextFocus: 'Maintain clear tracking practices and resolve any meaningful evidence or schedule gaps before release.',
  integrity: 'No automated misconduct conclusion has been made.',
  comparisonSummary: 'A comparable preceding period was not available for this report.',
  evidenceSummary: 'WGM uses activity records and screenshot metadata/application data. Screenshot image pixels are not analyzed by the AI in this prototype.',
  recurringPatterns: ['No reliable recurring work category could be derived from the available metadata.'],
  weeklyInsights: []
};

const demoEmployees = [
  {
    id: 'demo-main::477279', connectionId: 'demo-main', connectionName: 'Demo Scrin Connection',
    connectionType: 'shared', connectionEmployer: '', employerLocked: false, employmentId: '477279',
    name: 'Maria Gadin', initials: 'MG', employer: 'Grider & Peterson Real Estate',
    scrinCompany: 'WGH Scrin Account', source: 'WGH Managed', role: 'Virtual Assistant',
    timezone: 'UTC-07:00', timezoneOffsetMinutes: -420,
    schedule: 'Monday–Friday · 8 hours/day · 40 hours/week', expectedHours: 160,
    trackedHours: 161.4167, activeDays: 20, concerns: 0, excluded: false,
    context: 'No approved leave or schedule adjustment for the August benchmark.',
    monitoringPolicy: {
      enabled: true, mode: 'hourly', screenshotsPerHour: 12, dailyTarget: 96, expectedDayHours: 8,
      activityTracking: true, appUrlTracking: true, autoPauseMinutes: 5, employeeNotification: true,
      providerSyncStatus: 'Saved in WGM · provider write not connected'
    },
    workstreams: [['Marketing & content',30],['Property research & listings',22],['Documents & administration',16],['Email & communication',13],['CRM & lead follow-up',11],['Other business activity',8]],
    apps: [['Outlook / Microsoft',31],['Canva',20],['NavicaMLS / property systems',18],['Browser research',14],['WhatsApp / communications',9],['Other business tools',8]],
    weeks: [
      ['Aug 3–9','40h 28m','Marketing, listings, communication, and administrative support.'],
      ['Aug 10–16','40h 32m','Property research, documents, transactions, and communication.'],
      ['Aug 17–23','40h 11m','Document handling, marketing, and operational support.'],
      ['Aug 24–30','40h 14m','Marketing, property research, communication, and administration.']
    ],
    shots: [['8:46 AM','Instagram / marketing',68],['8:52 AM','Outlook',76],['8:53 AM','NavicaMLS',82],['8:56 AM','Canva',73]],
    reportingStatus: 'Ready'
  },
  {
    id: 'demo-main::500002', connectionId: 'demo-main', connectionName: 'Demo Scrin Connection',
    connectionType: 'shared', connectionEmployer: '', employerLocked: false, employmentId: '500002',
    name: 'VA 2 — sync to reveal', initials: 'V2', employer: 'Employer B', scrinCompany: 'WGH Scrin Account',
    source: 'WGH Managed', role: 'Virtual Assistant', timezone: 'UTC-05:00', timezoneOffsetMinutes: -300,
    schedule: 'Monday–Friday · 8 hours/day · 40 hours/week', expectedHours: 160,
    trackedHours: 154.75, activeDays: 20, concerns: 0, excluded: false,
    context: 'Example approved half-day included for prototype testing.',
    monitoringPolicy: {
      enabled: true, mode: 'hourly', screenshotsPerHour: 12, dailyTarget: 96, expectedDayHours: 8,
      activityTracking: true, appUrlTracking: true, autoPauseMinutes: 5, employeeNotification: true,
      providerSyncStatus: 'Saved in WGM · provider write not connected'
    },
    workstreams: [['CRM & lead follow-up',34],['Email & communication',24],['Documents & administration',18],['Other business activity',13],['Meetings & collaboration',7],['Research & browser work',4]],
    apps: [['CRM',35],['Email',27],['Browser',16],['Meetings',12],['Documents',10]],
    weeks: [['Aug 3–9','39h 10m','CRM follow-up and client support.'],['Aug 10–16','40h 02m','Transactions and client coordination.'],['Aug 17–23','36h 30m','Approved schedule adjustment applied.'],['Aug 24–30','39h 03m','CRM and operations.']],
    shots: [['9:05 AM','CRM',72],['9:18 AM','Outlook',65],['9:31 AM','CRM',81]], reportingStatus: 'Context applied'
  }
];

function loadLocalEmployees(){
  try { const v = JSON.parse(localStorage.getItem('wgmEmployees') || 'null'); return Array.isArray(v) && v.length ? v : demoEmployees; }
  catch { return demoEmployees; }
}
function loadLocalConnections(){
  try { const v = JSON.parse(localStorage.getItem('wgmConnections') || 'null'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function saveEmployees(){ try { localStorage.setItem('wgmEmployees', JSON.stringify(state.employees)); } catch {} }
function saveConnections(){ try { localStorage.setItem('wgmConnections', JSON.stringify(state.connections)); } catch {} }

state.employees = loadLocalEmployees();
state.connections = loadLocalConnections();
if (state.employees.length && !state.selectedEmployeeId) state.selectedEmployeeId = state.employees[0].id;

function escapeHtml(v=''){ return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function initials(name=''){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'VA'; }
function hoursLabel(decimal=0){ const total = Math.max(0, Math.round(Number(decimal||0)*60)); return `${Math.floor(total/60)}h ${String(total%60).padStart(2,'0')}m`; }
function percentLabel(v){ return v===null || v===undefined || Number.isNaN(Number(v)) ? '—' : `${Number(v).toFixed(Number(v)%1 ? 1 : 0)}%`; }
function signedNumber(v, suffix=''){ if(v===null || v===undefined || Number.isNaN(Number(v))) return '—'; const n=Number(v); return `${n>0?'+':''}${n}${suffix}`; }
function coverage(e){ return Number(e?.expectedHours) ? Math.min(100, Math.round((Number(e.trackedHours||0)/Number(e.expectedHours))*1000)/10) : null; }
function statusClass(s=''){ if(/Released|Approved|Healthy|Complete|Ready|Connected|Paid|Active|Green/i.test(s)) return 'green'; if(/Context|Pending|Review|Trial|Queued|Planned|Configured|Yellow/i.test(s)) return 'amber'; if(/Past|Failed|Concern|Hold|Error|Suspended|Red/i.test(s)) return 'red'; return 'blue'; }
function toast(msg){ state.toast=msg; render(); setTimeout(()=>{state.toast=null;render();},2300); }
function metric(label,value,sub){ return `<div class="card metric"><div class="label">${label}</div><div class="value">${value}</div><div class="delta">${sub}</div></div>`; }
function mixBar(label,v,total=100){ const pct=total?Math.max(0,Math.min(100,(Number(v||0)/total)*100)):0; return `<div class="work-row"><b>${escapeHtml(label)}</b><div class="progress"><span style="width:${pct}%"></span></div><span>${Math.round(Number(v||0))}${total===100?'%':''}</span></div>`; }
function activeEmployees(){ return state.employees.filter(e=>!e.excluded); }
function mappedEmployers(){ return [...new Set(activeEmployees().map(e=>e.employer).filter(Boolean))]; }
function employeeById(id){ return state.employees.find(e=>String(e.id)===String(id)); }

function ensureEmployerSelection(){
  const employers=mappedEmployers();
  if(!state.portalEmployer || !employers.includes(state.portalEmployer)){
    state.portalEmployer=employers[0]||'';
    localStorage.setItem('wgmPortalEmployer',state.portalEmployer);
  }
  const team=activeEmployees().filter(e=>e.employer===state.portalEmployer);
  if(team.length && !team.some(e=>String(e.id)===String(state.selectedEmployeeId))) state.selectedEmployeeId=team[0].id;
}
function portalEmployees(){ ensureEmployerSelection(); return activeEmployees().filter(e=>e.employer===state.portalEmployer); }
function employee(){
  if(state.role==='employer'){ const team=portalEmployees(); return team.find(e=>String(e.id)===String(state.selectedEmployeeId))||team[0]||null; }
  if(state.role==='employee'){ const e=employeeById(state.selectedEmployeeId); return e && !e.excluded ? e : activeEmployees()[0]||null; }
  return employeeById(state.selectedEmployeeId)||activeEmployees()[0]||state.employees[0]||null;
}
function visibleEmployees(){ if(state.role==='employer') return portalEmployees(); if(state.role==='employee'){ const e=employee(); return e?[e]:[]; } return activeEmployees(); }
function roleLabel(){ return {owner:'WGM Owner',reviewer:'White Glove Reviewer',employer:'Employer Portal',employee:'Employee Portal'}[state.role]||'WGM Owner'; }
function roleSubLabel(){ return {owner:'Super Admin',reviewer:'Assigned Accounts',employer:'Company Owner / Admin',employee:'My Work'}[state.role]||'Super Admin'; }
function setRole(role){
  state.role=role; localStorage.setItem('wgmRole',role); state.page='dashboard'; state.employeeTab='overview';
  if(role==='employer') ensureEmployerSelection();
  if(role==='employee'){ const current=employeeById(state.selectedEmployeeId); if(!current||current.excluded) state.selectedEmployeeId=activeEmployees()[0]?.id||''; }
  render();
}

function navButton(id,label,badge=''){ return `<button data-page="${id}" class="${state.page===id?'active':''}"><span>${label}</span>${badge?`<span class="badge">${badge}</span>`:''}</button>`; }
function navMarkup(){
  if(state.role==='reviewer') return [navButton('dashboard','Reviewer Home'),navButton('review','Review Queue',state.reportStatus==='Draft ready'?'1':''),navButton('monitoring','Evidence Review'),navButton('reports','Reports')].join('');
  if(state.role==='employer') return [navButton('dashboard','Overview'),navButton('employees','My Team'),navButton('monitoring','Monitoring'),navButton('reports','Reports'),navButton('subscriptions','Billing')].join('');
  if(state.role==='employee') return [navButton('dashboard','My Activity'),navButton('monitoring','My Monitoring'),navButton('reports','My Reports')].join('');
  return [navButton('dashboard','Dashboard'),navButton('companies','Companies'),navButton('employees','Employees'),navButton('monitoring','Monitoring'),navButton('reports','Reports'),navButton('review','Review Queue',state.reportStatus==='Draft ready'?'1':''),navButton('subscriptions','Subscriptions'),navButton('dataSources','Data Sources'),navButton('settings','Settings')].join('');
}

function shell(content,title){
  return `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">W</div><div><div class="brand-name">WHITE GLOVE MONITOR</div><div class="brand-sub">WORKFORCE INTELLIGENCE</div></div></div>
      <nav class="nav">${navMarkup()}</nav>
      <div class="sidebar-bottom"><div class="user-chip"><div class="avatar">W</div><div><b>${roleLabel()}</b><div style="font-size:11px;opacity:.7">${roleSubLabel()}</div></div></div></div>
    </aside>
    <main class="main">
      <header class="topbar"><h1>${title}</h1><div style="display:flex;align-items:center;gap:10px">
        <select id="roleSwitcher" class="map-input" style="min-width:190px;padding:8px 10px">
          <option value="owner" ${state.role==='owner'?'selected':''}>WGM Owner</option>
          <option value="reviewer" ${state.role==='reviewer'?'selected':''}>White Glove Reviewer</option>
          <option value="employer" ${state.role==='employer'?'selected':''}>Employer Portal</option>
          <option value="employee" ${state.role==='employee'?'selected':''}>Employee Portal</option>
        </select>
        <div class="mode-pill">${state.mode} MODE · V1.6 Analytics</div>
      </div></header>
      <section class="content">${content}</section>
    </main>
    ${state.toast?`<div class="toast">${escapeHtml(state.toast)}</div>`:''}
  </div>`;
}

function employeeEvidencePercent(e){ return e?.lastAnalytics?.evidence?.evidenceCoveragePercent ?? null; }
function employeeReviewState(e){ return e?.lastAnalytics?.review?.status || (Number(e.concerns||0)>1?'Red':Number(e.concerns||0)===1?'Yellow':'Green'); }

function dashboard(){
  if(state.role==='employer') return employerDashboard();
  if(state.role==='employee') return employeeDashboard();
  if(state.role==='reviewer') return reviewerDashboard();
  const emps=activeEmployees();
  const employerCount=new Set(emps.map(e=>e.employer).filter(Boolean)).size;
  const reviewCount=emps.filter(e=>employeeReviewState(e)!=='Green').length;
  return shell(`<div class="header-row"><div><h2>WGM Command Center</h2><p>Multiple capture connections feed one evidence, analytics, review, and reporting platform while employer data remains isolated.</p></div><div class="actions"><button class="btn" data-page="dataSources">Data sources</button><button class="btn primary" data-page="reports">Generate reports</button></div></div>
  <div class="grid metrics">${metric('Scrin connections',state.connections.length||1,'Dedicated + shared')}${metric('Employers',employerCount,'Mapped organizations')}${metric('Employees monitored',emps.length,'Reportable employees')}${metric('Needs review',reviewCount,'Yellow / Red')}</div>
  <div class="grid two-col"><div class="card panel"><div class="panel-title">Connected workforce</div><table><thead><tr><th>Employee</th><th>Employer</th><th>Connection</th><th>Evidence</th><th>Status</th></tr></thead><tbody>${emps.map(e=>`<tr><td><span class="row-link" data-open-id="${escapeHtml(e.id)}">${escapeHtml(e.name)}</span></td><td>${escapeHtml(e.employer||'Unassigned')}</td><td>${escapeHtml(e.connectionName||'Legacy Scrin')}</td><td>${percentLabel(employeeEvidencePercent(e))}</td><td><span class="status ${statusClass(employeeReviewState(e))}"><span class="dot"></span>${employeeReviewState(e)}</span></td></tr>`).join('')}</tbody></table></div>
  <div class="card panel"><div class="panel-title">V1.6 analytics rules</div><div class="context-box"><h4>Schedule coverage</h4><p>Tracked accountable hours compared with expected hours. It is not evidence coverage.</p></div><div class="context-box"><h4>Evidence coverage</h4><p>Share of tracked activity segments linked to screenshot evidence, plus active-day screenshot coverage.</p></div><div class="context-box"><h4>Review state</h4><p>Green or Yellow is generated from approved prototype rules. No automated misconduct conclusion is made.</p></div></div></div>`, 'Dashboard');
}

function employerDashboard(){
  const team=portalEmployees();
  const total=team.reduce((s,e)=>s+Number(e.trackedHours||0),0);
  const avgCoverage=team.length?Math.round(team.reduce((s,e)=>s+Number(coverage(e)||0),0)/team.length):0;
  const evidenceVals=team.map(employeeEvidencePercent).filter(v=>v!==null);
  const avgEvidence=evidenceVals.length?Math.round(evidenceVals.reduce((a,b)=>a+Number(b),0)/evidenceVals.length):null;
  const released=team.filter(e=>e.reportingStatus==='Released').length;
  return shell(`<div class="header-row"><div><h2>${escapeHtml(state.portalEmployer||'Employer')} Workforce Overview</h2><p>This demo portal is scoped to one employer; production enforcement belongs server-side.</p></div><select id="employerSwitcher" class="map-input">${mappedEmployers().map(x=>`<option value="${escapeHtml(x)}" ${x===state.portalEmployer?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select></div>
  <div class="grid metrics">${metric('Active team members',team.length,'Only this employer')}${metric('Tracked this period',hoursLabel(total),'Visible team')}${metric('Average schedule coverage',`${avgCoverage}%`,'Expected vs tracked')}${metric('Average evidence coverage',avgEvidence===null?'—':`${avgEvidence}%`,'Last analyzed periods')}</div>
  <div class="card panel"><div class="panel-title">My Team</div><table><thead><tr><th>Employee</th><th>Tracked</th><th>Schedule</th><th>Evidence</th><th>Released report</th></tr></thead><tbody>${team.length?team.map(e=>`<tr><td><span class="row-link" data-open-id="${escapeHtml(e.id)}">${escapeHtml(e.name)}</span><div class="small">${escapeHtml(e.role||'Employee')}</div></td><td>${hoursLabel(e.trackedHours)}</td><td>${percentLabel(coverage(e))}</td><td>${percentLabel(employeeEvidencePercent(e))}</td><td>${e.reportingStatus==='Released'?'<span class="status green"><span class="dot"></span>Released</span>':'No released report yet'}</td></tr>`).join(''):`<tr><td colspan="5">No employees mapped to this employer.</td></tr>`}</tbody></table></div>`, 'Employer Portal');
}

function employeeDashboard(){
  const e=employee(); if(!e) return shell('<div class="card empty">No employee selected.</div>','Employee Portal');
  return shell(`<div class="header-row"><div><h2>My Activity</h2><p>${escapeHtml(e.name)} · ${escapeHtml(e.employer||'Employer')}</p></div><span class="status green"><span class="dot"></span>Tracking connected</span></div>
  <div class="grid metrics">${metric('Tracked this period',hoursLabel(e.trackedHours),'My recorded time')}${metric('Schedule coverage',percentLabel(coverage(e)),`${e.expectedHours||'—'} expected hours`)}${metric('Evidence coverage',percentLabel(employeeEvidencePercent(e)),'Last analyzed period')}${metric('Report status',e.reportingStatus==='Released'?'Released':'No released report','My record')}</div>
  <div class="grid two-col"><div class="card panel"><div class="panel-title">My work profile</div><div class="context-box"><h4>Expected schedule</h4><p>${escapeHtml(e.schedule||'Not set')}</p><p>${escapeHtml(e.timezone||'Timezone not set')}</p></div><div class="context-box"><h4>Context on file</h4><p>${escapeHtml(e.context||'No context entered.')}</p></div></div><div class="card panel"><div class="panel-title">Employee access boundary</div><p class="small">This view contains only this employee's authorized information.</p><div class="actions"><button class="btn primary" data-page="monitoring">View my monitoring</button><button class="btn" data-page="reports">View my reports</button></div></div></div>`, 'Employee Portal');
}

function reviewerDashboard(){
  const emps=activeEmployees(); const flagged=emps.filter(e=>employeeReviewState(e)!=='Green');
  return shell(`<div class="header-row"><div><h2>Reviewer Workspace</h2><p>Review evidence coverage, schedule context, and generated narrative before release.</p></div><button class="btn primary" data-page="review">Open review queue</button></div>
  <div class="grid metrics">${metric('Assigned employees',emps.length,'Prototype assignment')}${metric('Green eligible',emps.filter(e=>employeeReviewState(e)==='Green').length,'Standard review')}${metric('Yellow / Red',flagged.length,'Individual review')}${metric('Delivery queue',state.deliveryQueue.length,'Released events')}</div><div class="card panel"><div class="panel-title">Priority review</div>${reviewQueueTable()}</div>`, 'Reviewer Home');
}

function reviewColor(e){ return employeeReviewState(e); }
function reviewQueueTable(){
  return `<table><thead><tr><th>Employer</th><th>Employee</th><th>Period</th><th>Schedule coverage</th><th>Evidence coverage</th><th>Status</th><th>Release</th></tr></thead><tbody>${activeEmployees().map(e=>{const color=reviewColor(e);const release=(state.reportEmployeeId===e.id?state.reportStatus:e.reportingStatus)||'Not generated';return `<tr><td>${escapeHtml(e.employer||'Unassigned')}</td><td><span class="row-link" data-open-id="${escapeHtml(e.id)}">${escapeHtml(e.name)}</span></td><td>${state.reportEmployeeId===e.id?periodLabel():'—'}</td><td>${percentLabel(coverage(e))}</td><td>${percentLabel(employeeEvidencePercent(e))}</td><td><span class="status ${statusClass(color)}"><span class="dot"></span>${color}</span></td><td>${escapeHtml(release)}</td></tr>`;}).join('')}</tbody></table>`;
}

function companies(){
  const groups={}; activeEmployees().forEach(e=>{const k=e.employer||'Unassigned';(groups[k]||=[]).push(e);});
  return shell(`<div class="header-row"><div><h2>Companies</h2><p>WGM employer mapping is the customer isolation boundary.</p></div><button class="btn primary" data-page="settings">Manage mappings</button></div><div class="card panel"><table><thead><tr><th>WGM employer</th><th>Employees</th><th>Connections represented</th><th>Status</th></tr></thead><tbody>${Object.entries(groups).map(([name,emps])=>`<tr><td>${escapeHtml(name)}</td><td>${emps.length}</td><td>${new Set(emps.map(e=>e.connectionId||'legacy')).size}</td><td><span class="status ${name==='Unassigned'?'amber':'green'}"><span class="dot"></span>${name==='Unassigned'?'Mapping required':'Active'}</span></td></tr>`).join('')}</tbody></table></div>`, 'Companies');
}

function employees(){
  const emps=visibleEmployees(); const title=state.role==='employer'?'My Team':'Employees';
  return shell(`<div class="header-row"><div><h2>${title}</h2><p>${state.role==='employer'?'Only employees mapped to your organization are shown.':'Choose a synced employee to inspect monitoring data or generate a report.'}</p></div>${state.role==='owner'?`<div class="actions"><button class="btn" id="syncScrin">Sync all Scrin connections</button><button class="btn" data-page="settings">Map employers</button></div>`:''}</div>
  <div class="card panel">${state.role==='owner'?`<div class="callout"><strong>Current connection status</strong>${escapeHtml(state.syncMessage)}</div>`:''}<table><thead><tr><th>Employee</th><th>Employer</th><th>Connection</th><th>Tracked</th><th>Schedule</th><th>Evidence</th><th>Review</th></tr></thead><tbody>${emps.map(e=>`<tr><td><span class="row-link" data-open-id="${escapeHtml(e.id)}">${escapeHtml(e.name)}</span><div class="small">${escapeHtml(e.role||'Virtual Assistant')}</div></td><td>${escapeHtml(e.employer||'Unassigned')}</td><td>${escapeHtml(e.connectionName||'Legacy Scrin')}</td><td>${hoursLabel(e.trackedHours)}</td><td>${percentLabel(coverage(e))}</td><td>${percentLabel(employeeEvidencePercent(e))}</td><td><span class="status ${statusClass(employeeReviewState(e))}"><span class="dot"></span>${employeeReviewState(e)}</span></td></tr>`).join('')}</tbody></table></div>`, title);
}

function monitoring(){ return employeeView(); }
function employeeView(){
  const e=employee(); if(!e) return shell('<div class="card empty">No employee is available in this portal.</div>','Employee Monitoring');
  const tabs=['overview','timeline','screenshots','workstreams','apps','policy']; if(state.role!=='employee') tabs.push('context'); tabs.push('reports');
  const labels={overview:'Overview',timeline:'Timeline',screenshots:'Screenshots',workstreams:'Workstreams',apps:'Apps & URLs',policy:'Monitoring Settings',context:'Context',reports:'Reports'};
  return shell(`<div class="card panel"><div class="employee-head"><div class="employee-avatar">${escapeHtml(e.initials||initials(e.name))}</div><div><h2 style="margin:0">${escapeHtml(e.name)}</h2><div class="small">${escapeHtml(e.employer||'Unassigned employer')} · ${escapeHtml(e.role||'Virtual Assistant')} · ${escapeHtml(e.connectionName||'Scrin')}</div></div><div class="spacer"></div><span class="status green"><span class="dot"></span>Tracking connected</span></div>
  <div class="tabs">${tabs.map(t=>`<button class="tab ${state.employeeTab===t?'active':''}" data-tab="${t}">${labels[t]}</button>`).join('')}</div>
  ${state.employeeTab==='policy'?monitoringPolicyView(e):employeeTabContent(e)}</div>`, 'Employee Monitoring');
}

function employeeTabContent(e){
  if(state.employeeTab==='screenshots') return screenshotView(e);
  if(state.employeeTab==='workstreams') return `<div class="grid two-col"><div>${(e.workstreams||[]).map(x=>mixBar(x[0],x[1])).join('')||'<div class="empty">Generate a report period to populate directional work categories.</div>'}</div><div class="callout"><strong>Reporting rule</strong>Categories combine available notes and application metadata. They are directional evidence, not exact task-duration accounting.</div></div>`;
  if(state.employeeTab==='apps') return `<div class="grid two-col"><div>${(e.apps||[]).map(x=>mixBar(x[0],x[1])).join('')||'<div class="empty">Generate or sync evidence to populate applications.</div>'}</div><div class="context-box"><h4>How WGM uses this</h4><p>Applications help establish business relevance and repeated patterns. App switching or activity level is not a standalone performance score.</p></div></div>`;
  if(state.employeeTab==='context') return contextView(e);
  if(state.employeeTab==='reports') return `<table><thead><tr><th>Period</th><th>Tracked</th><th>Schedule</th><th>Evidence</th><th>Review</th><th>Release</th></tr></thead><tbody><tr><td>${e.lastAnalytics?.period?`${escapeHtml(e.lastAnalytics.period.from)} → ${escapeHtml(e.lastAnalytics.period.to)}`:periodLabel()}</td><td>${hoursLabel(e.trackedHours)}</td><td>${percentLabel(coverage(e))}</td><td>${percentLabel(employeeEvidencePercent(e))}</td><td>${employeeReviewState(e)}</td><td>${e.reportingStatus==='Released'?'Released':'Not released'}</td></tr></tbody></table>`;
  if(state.employeeTab==='timeline'){
    const s=e.daySummary;
    return s?`<div class="grid metrics">${metric('First tracked',escapeHtml(s.firstTracked||'—'),'Selected day')}${metric('Last tracked',escapeHtml(s.lastTracked||'—'),'Selected day')}${metric('Recorded time',hoursLabel(Number(s.trackedSeconds||0)/3600),'Union of tracked intervals')}${metric('Screenshots',Number(s.screenshotCount||0),'Available evidence captures')}</div><div class="card panel"><div class="panel-title">Tracked sessions</div>${(s.sessions||[]).map(x=>`<div class="context-box"><h4>${escapeHtml(x.from)}–${escapeHtml(x.to)}</h4><p>${hoursLabel(Number(x.seconds||0)/3600)} tracked</p></div>`).join('')||'<div class="empty">No sessions loaded.</div>'}</div>`:`<div class="callout"><strong>No day loaded yet</strong>Open Screenshots, choose a date, and load the complete day from Scrin.</div>`;
  }
  const a=e.lastAnalytics;
  return `<div class="grid metrics">${metric('Tracked time',hoursLabel(e.trackedHours),'Last analyzed period')}${metric('Schedule coverage',percentLabel(coverage(e)),`${e.expectedHours||'—'} expected hours`)}${metric('Evidence coverage',percentLabel(a?.evidence?.evidenceCoveragePercent),'Tracked segments with screenshot evidence')}${metric('Review state',a?.review?.status||employeeReviewState(e),a?.review?.reasons?.length?`${a.review.reasons.length} reason(s)`:'No review-worthy issue detected')}</div>
  <div class="grid two-col"><div><div class="panel-title">Weekly analytics</div>${a?.weeks?.length?a.weeks.map(w=>`<div class="context-box"><h4>${escapeHtml(w.label)} · ${hoursLabel(w.trackedHours)}</h4><p>Evidence ${percentLabel(w.evidenceCoveragePercent)} · ${w.screenshotCount} screenshots${w.categories?.[0]?.name?` · Leading category: ${escapeHtml(w.categories[0].name)}`:''}</p></div>`).join(''):(e.weeks||[]).map(w=>`<div class="context-box"><h4>${escapeHtml(w[0])} · ${escapeHtml(w[1])}</h4><p>${escapeHtml(w[2])}</p></div>`).join('')}</div>
  <div><div class="panel-title">WGM baseline</div><div class="context-box"><h4>Expected schedule</h4><p>${escapeHtml(e.schedule||'Not set')}</p><p>${escapeHtml(e.timezone||'Timezone not set')}</p></div><div class="context-box"><h4>Evidence disclosure</h4><p>${escapeHtml(a?.analysisDisclosure?.note||'Generate a live period report to populate evidence coverage and analysis disclosure.')}</p></div><div class="context-box"><h4>Monthly context</h4><p>${escapeHtml(e.context||'No context entered.')}</p></div></div></div>`;
}

function shotCard(time,app,level,thumbUrl,fullUrl){
  const thumb=thumbUrl?escapeHtml(thumbUrl):''; const full=fullUrl?escapeHtml(fullUrl):thumb;
  const image=thumb?`<a href="${full}" target="_blank" rel="noopener noreferrer"><img src="${thumb}" alt="Scrin screenshot at ${escapeHtml(time)}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=&quot;empty&quot; style=&quot;padding:24px&quot;>Screenshot image could not be loaded.</div>'"></a>`:`<div class="mock-window"><div class="mock-side"></div><div class="mock-main"><div class="mock-line"></div><div class="mock-line short"></div><div class="mock-line"></div><div class="mock-line"></div><div class="mock-line short"></div></div></div>`;
  return `<div class="shot"><div class="shot-img">${image}</div><div class="shot-meta"><strong>${escapeHtml(time)}</strong> ${escapeHtml(app)}<br><span class="small">Activity level ${level??'—'}% · Scrin evidence</span></div></div>`;
}

function screenshotView(e){
  const s=e.daySummary||null; const selectedDate=s?.date||'2026-09-18';
  const summary=s?`<div class="grid metrics" style="margin:16px 0">${metric('First tracked',escapeHtml(s.firstTracked||'—'),'Start of recorded work')}${metric('Last tracked',escapeHtml(s.lastTracked||'—'),'End of recorded work')}${metric('Recorded time',hoursLabel(Number(s.trackedSeconds||0)/3600),'Overlapping intervals reconciled')}${metric('Screenshots',Number(s.screenshotCount||0),'Evidence captures returned')}</div><div class="context-box" style="margin:0 0 16px"><h4>Tracked work sessions</h4><p>${(s.sessions||[]).map(x=>`${escapeHtml(x.from)}–${escapeHtml(x.to)} (${hoursLabel(Number(x.seconds||0)/3600)})`).join(' · ')||'No sessions returned.'}</p></div><div class="small" style="margin-bottom:14px;opacity:.72">Times shown using ${escapeHtml(s.timezone||e.timezone||'employee timezone')}.</div>`:`<div class="callout" style="margin:16px 0"><strong>Workday summary</strong>Select a date and click <b>Load complete day from Scrin</b> to display timeframe, sessions, recorded hours, and all available screenshots.</div>`;
  return `<div class="toolbar"><div class="field"><label>Date</label><input id="screenDate" type="date" value="${escapeHtml(selectedDate)}"></div><div class="spacer"></div><button class="btn primary" id="loadLiveDay">Load complete day from Scrin</button></div>${summary}<div class="banner"><div><div class="big">Daily screenshot evidence</div><div class="muted">${s?`${s.screenshotCount} available evidence capture(s) loaded for ${s.date}.`:'Load a workday to inspect all available captures.'}</div></div><span class="status blue"><span class="dot"></span>${escapeHtml(e.connectionName||'Scrin evidence')}</span></div><div id="shotArea"><div class="shot-grid">${(e.shots||[]).map(x=>shotCard(x[0],x[1],x[2],x[3],x[4])).join('')||'<div class="empty">No screenshot evidence loaded.</div>'}</div></div>`;
}

async function loadLiveDay(){
  const e=employee(); const date=document.getElementById('screenDate')?.value; if(!e||!date) return;
  if(state.mode!=='LIVE'){ toast('Live Scrin connection is required to load daily evidence.'); return; }
  const area=document.getElementById('shotArea'); if(area) area.innerHTML='<div class="empty">Loading the complete Scrin workday…</div>';
  try{
    const r=await fetch('/api/wgm/day-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connectionId:e.connectionId,employmentId:e.employmentId,date,timezoneOffsetMinutes:e.timezoneOffsetMinutes||0})});
    const d=await r.json(); if(!r.ok) throw new Error(d.error||'Could not load day data');
    e.shots=(d.screenshots||[]).map(s=>[s.time,s.application,s.activityLevel,s.thumbUrl,s.url]);
    e.daySummary={date:d.date,firstTracked:d.firstTracked,lastTracked:d.lastTracked,trackedSeconds:d.trackedSeconds,screenshotCount:d.screenshotCount,activityCount:d.activityCount,sessions:d.sessions||[],timezone:e.timezone||'Employee timezone'};
    saveEmployees(); render();
  }catch(err){ toast(`Could not load the complete workday: ${err.message}`); }
}

function defaultMonitoringPolicy(){ return {enabled:true,mode:'hourly',screenshotsPerHour:12,dailyTarget:96,expectedDayHours:8,activityTracking:true,appUrlTracking:true,autoPauseMinutes:5,employeeNotification:true,providerSyncStatus:'Saved in WGM · provider write not connected'}; }
function monitoringPolicy(e){ if(!e.monitoringPolicy){ e.monitoringPolicy=defaultMonitoringPolicy(); saveEmployees(); } return e.monitoringPolicy; }
function canEditMonitoringPolicy(){ return state.role==='owner'||state.role==='employer'; }
function monitoringPolicyView(e){
  const p=monitoringPolicy(e); const editable=canEditMonitoringPolicy(); const disabled=editable?'':'disabled'; const hours=Number(p.expectedDayHours||8); const eq=p.mode==='daily'?Number(p.dailyTarget||0)/Math.max(hours,.5):Number(p.screenshotsPerHour||0); const daily=p.mode==='daily'?Number(p.dailyTarget||0):Math.round(Number(p.screenshotsPerHour||0)*hours);
  return `<div class="grid two-col"><div><div class="panel-title">Monitoring Policy</div><div class="field"><label>Screenshot capture</label><select id="policyEnabled" ${disabled}><option value="true" ${p.enabled?'selected':''}>Enabled</option><option value="false" ${!p.enabled?'selected':''}>Disabled</option></select></div><div class="field"><label>Capture mode</label><select id="policyMode" ${disabled}><option value="hourly" ${p.mode==='hourly'?'selected':''}>Screenshots per tracked hour</option><option value="daily" ${p.mode==='daily'?'selected':''}>Daily screenshot target</option></select></div><div class="field" id="policyHourlyWrap" style="${p.mode==='hourly'?'':'display:none'}"><label>Screenshots per tracked hour</label><input id="policyShotsPerHour" type="number" min="1" max="30" step="1" value="${Number(p.screenshotsPerHour||12)}" ${disabled}></div><div class="field" id="policyDailyWrap" style="${p.mode==='daily'?'':'display:none'}"><label>Desired screenshots per workday</label><input id="policyDailyTarget" type="number" min="1" step="1" value="${Number(p.dailyTarget||96)}" ${disabled}></div><div class="field"><label>Expected workday hours</label><input id="policyExpectedDayHours" type="number" min="0.5" max="24" step="0.5" value="${hours}" ${disabled}></div></div>
  <div><div class="panel-title">Evidence Controls</div><div class="field"><label>Activity level tracking</label><select id="policyActivity" ${disabled}><option value="true" ${p.activityTracking?'selected':''}>Enabled</option><option value="false" ${!p.activityTracking?'selected':''}>Disabled</option></select></div><div class="field"><label>Apps & URLs</label><select id="policyApps" ${disabled}><option value="true" ${p.appUrlTracking?'selected':''}>Enabled</option><option value="false" ${!p.appUrlTracking?'selected':''}>Disabled</option></select></div><div class="field"><label>Auto-pause after inactivity</label><input id="policyAutoPause" type="number" min="0" max="120" step="1" value="${Number(p.autoPauseMinutes||0)}" ${disabled}></div><div class="field"><label>Employee screenshot notification</label><select id="policyNotification" ${disabled}><option value="true" ${p.employeeNotification?'selected':''}>Enabled</option><option value="false" ${!p.employeeNotification?'selected':''}>Disabled</option></select></div><div class="context-box"><h4>Current WGM target</h4><p id="policyEstimate">${p.mode==='daily'?`${daily} screenshots/day ≈ ${eq.toFixed(2)} per tracked hour`:`${Number(p.screenshotsPerHour||0)} screenshots/hour ≈ ${daily} over a ${hours}-hour day`}</p></div><div class="context-box"><h4>Provider synchronization</h4><p>${escapeHtml(p.providerSyncStatus||'Saved in WGM · provider write not connected')}</p><p class="small">WGM stores the desired policy but does not claim Scrin was changed until a supported provider-write integration is connected.</p></div>${editable?'<button class="btn gold" id="saveMonitoringPolicy">Save Monitoring Policy</button>':'<div class="small">You can view this policy but cannot change it from this role.</div>'}</div></div>`;
}
function updatePolicyEstimate(){
  const mode=document.getElementById('policyMode')?.value||'hourly'; const hw=document.getElementById('policyHourlyWrap'); const dw=document.getElementById('policyDailyWrap'); if(hw) hw.style.display=mode==='hourly'?'':'none'; if(dw) dw.style.display=mode==='daily'?'':'none';
  const hours=Math.max(.5,Number(document.getElementById('policyExpectedDayHours')?.value||8)); const hourly=Math.max(1,Math.min(30,Number(document.getElementById('policyShotsPerHour')?.value||12))); const daily=Math.max(1,Number(document.getElementById('policyDailyTarget')?.value||96)); const el=document.getElementById('policyEstimate'); if(el) el.textContent=mode==='daily'?`${daily} screenshots/day ≈ ${(daily/hours).toFixed(2)} per tracked hour`:`${hourly} screenshots/hour ≈ ${Math.round(hourly*hours)} over a ${hours}-hour day`;
}
function saveMonitoringPolicy(){
  const e=employee(); if(!e||!canEditMonitoringPolicy()) return;
  e.monitoringPolicy={enabled:document.getElementById('policyEnabled')?.value==='true',mode:document.getElementById('policyMode')?.value||'hourly',screenshotsPerHour:Math.max(1,Math.min(30,Number(document.getElementById('policyShotsPerHour')?.value||12))),dailyTarget:Math.max(1,Number(document.getElementById('policyDailyTarget')?.value||96)),expectedDayHours:Math.max(.5,Number(document.getElementById('policyExpectedDayHours')?.value||8)),activityTracking:document.getElementById('policyActivity')?.value==='true',appUrlTracking:document.getElementById('policyApps')?.value==='true',autoPauseMinutes:Math.max(0,Number(document.getElementById('policyAutoPause')?.value||0)),employeeNotification:document.getElementById('policyNotification')?.value==='true',providerSyncStatus:'Saved in WGM · provider write not connected'};
  saveEmployees(); toast('Monitoring policy saved in WGM. Scrin provider write is not connected yet.');
}

function contextView(e){
  const employerField=e.employerLocked?`<input id="contextEmployer" value="${escapeHtml(e.employer||'')}" disabled><div class="small">Locked by dedicated Scrin connection.</div>`:`<input id="contextEmployer" value="${escapeHtml(e.employer||'')}">`;
  return `<div class="grid two-col"><div><div class="panel-title">Permanent work profile</div><div class="field"><label>WGM employer</label>${employerField}</div><div class="field"><label>Expected hours for selected month</label><input id="contextExpected" type="number" min="0" step="0.5" value="${Number(e.expectedHours||0)}"></div><div class="field"><label>Timezone</label><input id="contextTimezone" value="${escapeHtml(e.timezone||'')}"></div><div class="field"><label>General schedule</label><input id="contextSchedule" value="${escapeHtml(e.schedule||'')}"></div></div><div><div class="panel-title">Monthly context</div><div class="field"><label>Context / approved adjustments</label><textarea id="contextText">${escapeHtml(e.context||'')}</textarea></div><button class="btn primary" id="saveContext">Save employee baseline</button></div></div>`;
}
function saveContext(){
  const e=employee(); if(!e) return; if(!e.employerLocked) e.employer=document.getElementById('contextEmployer')?.value.trim()||e.employer; e.expectedHours=Number(document.getElementById('contextExpected')?.value||e.expectedHours||0); e.timezone=document.getElementById('contextTimezone')?.value.trim()||e.timezone; e.schedule=document.getElementById('contextSchedule')?.value.trim()||e.schedule; e.context=document.getElementById('contextText')?.value.trim()||''; saveEmployees(); toast('Employee baseline and context saved.');
}

function periodLabel(){ const d=new Date(state.reportPeriod.from+'T00:00:00Z'); return d.toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}); }
function reports(){
  const emps=visibleEmployees();
  if(state.role==='employee'){
    const e=employee();
    return shell(`<div class="header-row"><div><h2>My Reports</h2><p>Only released reports for your own record are visible.</p></div></div><div class="card panel">${e?.reportingStatus==='Released'?`<table><thead><tr><th>Period</th><th>Tracked</th><th>Schedule</th><th>Evidence</th><th>Status</th></tr></thead><tbody><tr><td>${escapeHtml(e.lastAnalytics?.period?.from||state.reportPeriod.from)} → ${escapeHtml(e.lastAnalytics?.period?.to||state.reportPeriod.to)}</td><td>${hoursLabel(e.trackedHours)}</td><td>${percentLabel(coverage(e))}</td><td>${percentLabel(employeeEvidencePercent(e))}</td><td><span class="status green"><span class="dot"></span>Released</span></td></tr></tbody></table>`:'<div class="empty">No released report is available yet.</div>'}</div>`, 'My Reports');
  }
  if(state.role==='employer'){
    return shell(`<div class="header-row"><div><h2>Reports</h2><p>Only released reports for ${escapeHtml(state.portalEmployer||'your company')} are visible here.</p></div><button class="btn primary" id="requestEmployerReport">Request monthly report</button></div><div class="card panel">${emps.some(e=>e.reportingStatus==='Released')?`<table><thead><tr><th>Employee</th><th>Period</th><th>Tracked</th><th>Evidence</th><th>Status</th></tr></thead><tbody>${emps.filter(e=>e.reportingStatus==='Released').map(e=>`<tr><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.lastAnalytics?.period?.from||'—')} → ${escapeHtml(e.lastAnalytics?.period?.to||'—')}</td><td>${hoursLabel(e.trackedHours)}</td><td>${percentLabel(employeeEvidencePercent(e))}</td><td><span class="status green"><span class="dot"></span>Released</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No released reports are available yet.</div>'}</div>`, 'Reports');
  }
  return shell(`<div class="header-row"><div><h2>Report Center</h2><p>V1.6 calculates period analytics first, then AI interprets the verified dataset, then a human reviewer approves release.</p></div><button class="btn" data-page="employees">View employees</button></div>
  <div class="card panel"><div class="panel-title">Create report run</div><div class="toolbar"><div class="field"><label>From</label><input id="fromDate" type="date" value="${state.reportPeriod.from}"></div><div class="field"><label>To</label><input id="toDate" type="date" value="${state.reportPeriod.to}"></div><div class="field"><label>Employee</label><select id="reportEmployee">${emps.map(x=>`<option value="${escapeHtml(x.id)}" ${x.id===state.selectedEmployeeId?'selected':''}>${escapeHtml(x.name)} — ${escapeHtml(x.employer||'Unassigned')} — ${escapeHtml(x.connectionName||'Scrin')}</option>`).join('')}<option value="__ALL__">All mapped employees (${emps.length})</option></select></div><div class="spacer"></div><button id="generateBtn" class="btn gold">Calculate & Generate Report</button></div></div>
  <div class="card panel" style="margin-top:16px"><div class="panel-title">Last analytics snapshot</div>${state.reportAnalytics?analyticsSnapshot(state.reportAnalytics,state.reportComparison):'<div class="empty">Generate a report to calculate real period analytics.</div>'}</div>`, 'Reports');
}

function analyticsSnapshot(a,comparisonData){
  if(!a) return '';
  return `<div class="grid metrics">${metric('Tracked',hoursLabel(a.metrics?.trackedHours||0),'Calculated by WGM')}${metric('Schedule coverage',percentLabel(a.metrics?.scheduleCoveragePercent),'Expected vs tracked')}${metric('Evidence coverage',percentLabel(a.evidence?.evidenceCoveragePercent),'Tracked segments with screenshot evidence')}${metric('Review state',a.review?.status||'—',a.review?.reasons?.length?`${a.review.reasons.length} reason(s)`:'No review-worthy issue')}</div>
  <div class="grid two-col"><div><div class="panel-title">Evidence</div><div class="context-box"><h4>${a.evidence?.screenshotCount||0} screenshots</h4><p>${a.evidence?.daysWithScreenshots||0}/${a.evidence?.activeDays||0} active days with screenshot evidence · ${a.evidence?.activitiesWithScreenshots||0}/${a.evidence?.activityRecords||0} activity records linked to screenshots.</p></div></div><div><div class="panel-title">Previous period</div><div class="context-box"><h4>${comparisonData?.available?'Comparison available':'Unavailable'}</h4><p>${comparisonData?.available?`Tracked ${signedNumber(comparisonData.trackedHoursDelta,'h')} · evidence ${signedNumber(comparisonData.evidenceCoverageDeltaPoints,' pts')} · active days ${signedNumber(comparisonData.activeDaysDelta)}`:'No preceding equal-length comparison was returned.'}</p></div></div></div>`;
}

async function generateReport(){
  const select=document.getElementById('reportEmployee'); const id=select?.value||state.selectedEmployeeId;
  state.reportPeriod={from:document.getElementById('fromDate')?.value||state.reportPeriod.from,to:document.getElementById('toDate')?.value||state.reportPeriod.to};
  if(id==='__ALL__'){ toast('Batch generation is planned for V1.7. V1.6 completes one employee at a time.'); return; }
  state.selectedEmployeeId=id; const e=employeeById(id); if(!e||e.excluded||!e.employer){ toast('This employee must be mapped to an employer before report generation.'); return; }
  state.reportEmployeeId=e.id; state.reportStatus='Calculating analytics'; state.report=null; state.reportAnalytics=null; state.reportPrevious=null; state.reportComparison=null; state.reportMetadata=null; render();
  try{
    const analyticsRes=await fetch('/api/wgm/period-analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connectionId:e.connectionId,employmentId:e.employmentId,from:state.reportPeriod.from,to:state.reportPeriod.to,timezoneOffsetMinutes:e.timezoneOffsetMinutes||0,expectedHours:Number(e.expectedHours||0),includePrevious:true})});
    const analyticsData=await analyticsRes.json(); if(!analyticsRes.ok) throw new Error(analyticsData.error||'Period analytics failed');
    state.reportAnalytics=analyticsData.current; state.reportPrevious=analyticsData.previous||null; state.reportComparison=analyticsData.comparison||{available:false}; state.reportMetadata=analyticsData.metadata||null;
    e.trackedHours=Number(state.reportAnalytics.metrics?.trackedHours||0); e.activeDays=Number(state.reportAnalytics.metrics?.activeDays||0);
    e.workstreams=(state.reportAnalytics.categories||[]).map(x=>[x.name,x.sharePercent]); e.apps=(state.reportAnalytics.apps||[]).slice(0,10).map(x=>[x.name,x.sharePercent]);
    e.weeks=(state.reportAnalytics.weeks||[]).map(w=>[w.label,hoursLabel(w.trackedHours),`${percentLabel(w.evidenceCoveragePercent)} evidence coverage${w.categories?.[0]?.name?` · ${w.categories[0].name}`:''}`]);
    e.lastAnalytics=state.reportAnalytics; e.reportingStatus='Analytics ready'; saveEmployees();

    state.reportStatus='Generating narrative'; render();
    const reportRes=await fetch('/api/reports/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employee:{id:e.id,name:e.name,role:e.role,employer:e.employer,connectionName:e.connectionName},period:state.reportPeriod,analytics:state.reportAnalytics,previous:state.reportPrevious,comparison:state.reportComparison,context:e.context||''})});
    const reportData=await reportRes.json(); if(!reportRes.ok) throw new Error(reportData.error||'Narrative generation failed');
    state.report=reportData.report||defaultReport; state.reportMetadata={...(state.reportMetadata||{}),...(reportData.metadata||{}),generatedBy:reportData.generatedBy||'unknown'}; state.reportStatus='Draft ready'; e.reportingStatus='Draft ready'; saveEmployees(); state.page='review'; render();
  }catch(err){ state.reportStatus='Generation failed'; render(); toast(`Report generation failed: ${err.message}`); }
}

function review(){
  const e=employeeById(state.reportEmployeeId)||employee();
  return shell(`<div class="header-row"><div><h2>Human Review Queue</h2><p>Evidence coverage is separate from schedule coverage. Yellow requires individual review; Green remains human-reviewed before release.</p></div><div class="actions"><button class="btn" id="batchGreen">Approve eligible Greens</button><button class="btn primary" data-page="reports">Generate report</button></div></div>
  <div class="card panel" style="margin-bottom:16px"><div class="panel-title">Queue</div>${reviewQueueTable()}</div>${state.reportStatus==='Not generated'?'<div class="card empty">Generate a report to open the full review console.</div>':reviewConsole(e)}`, 'Review Queue');
}
function reviewConsole(e){
  if(!e) return ''; const r=state.report||defaultReport; const a=state.reportAnalytics||e.lastAnalytics;
  return `<div class="card panel"><div class="employee-head"><div class="employee-avatar">${escapeHtml(e.initials||initials(e.name))}</div><div><h2 style="margin:0">${escapeHtml(e.name)} — ${periodLabel()}</h2><div class="small">${escapeHtml(e.employer||'Unassigned')} · ${escapeHtml(e.connectionName||'Scrin')}</div></div><div class="spacer"></div><span class="status ${statusClass(state.reportStatus)}"><span class="dot"></span>${escapeHtml(state.reportStatus)}</span></div>
  <div class="review-summary"><div class="review-stat"><div class="k">Tracked</div><div class="v">${hoursLabel(a?.metrics?.trackedHours||e.trackedHours)}</div></div><div class="review-stat"><div class="k">Schedule</div><div class="v">${percentLabel(a?.metrics?.scheduleCoveragePercent??coverage(e))}</div></div><div class="review-stat"><div class="k">Evidence</div><div class="v">${percentLabel(a?.evidence?.evidenceCoveragePercent)}</div></div><div class="review-stat"><div class="k">Screenshots</div><div class="v">${a?.evidence?.screenshotCount??'—'}</div></div><div class="review-stat"><div class="k">Review</div><div class="v">${a?.review?.status||employeeReviewState(e)}</div></div></div>
  <div class="grid two-col"><div><div class="panel-title">AI / WGM draft</div><div class="review-text"><b>${escapeHtml(r.headline)}</b><br><br>${escapeHtml(r.executiveSummary||r.summary||'')}<br><br><b>Evidence:</b> ${escapeHtml(r.evidenceSummary||'')}<br><br><b>Integrity:</b> ${escapeHtml(r.integrity)}<br><br><b>Coaching:</b> ${escapeHtml(r.coaching)}</div></div>
  <div><div class="panel-title">Reviewer checklist</div><div class="checklist">${['Hours and schedule reconcile','Evidence coverage is correctly represented','Approved context is correctly applied','No unsupported work or misconduct conclusion','Client-facing language is appropriate'].map((c,i)=>`<label class="check"><input type="checkbox" data-check="${i}" ${state.reviewerChecks[i]?'checked':''}>${c}</label>`).join('')}</div><div class="actions"><button class="btn">Edit report</button><button class="btn">Request context</button><button id="approveBtn" class="btn gold">Approve</button></div></div></div>
  ${a?.review?.reasons?.length?`<div class="callout"><strong>Why this needs review</strong>${a.review.reasons.map(x=>`<div>• ${escapeHtml(x)}</div>`).join('')}</div>`:''}
  ${/Approved|Released/.test(state.reportStatus)?`<div class="callout"><strong>Approved for release</strong>Approval applies to this generated report version and its current analytics snapshot.</div><div class="actions"><button class="btn" id="previewReport">Preview final report</button><button class="btn primary" id="releaseBtn">${state.reportStatus==='Released'?'Released · Delivery queued':'Approve & Release'}</button></div>`:''}</div>`;
}

function connectionTypeLabel(c){ return c.type==='dedicated'?'Dedicated Employer':'WGH Shared'; }
function connectionEmployeeCount(id){ return state.employees.filter(e=>String(e.connectionId)===String(id)).length; }
function dataSources(){
  const cs=state.connections.length?state.connections:[{id:'wgh-main',name:'WGH Main Scrin Account',provider:'scrin',type:'shared',employer:'',status:state.mode==='LIVE'?'connected':'configured'}];
  return shell(`<div class="header-row"><div><h2>Data Sources</h2><p>Each Scrin credential is a separate WGM connection with explicit employer ownership.</p></div><div class="actions"><button class="btn" id="refreshConnections">Refresh</button><button class="btn primary" id="toggleAddConnection">+ Add Scrin Connection</button></div></div>${state.showAddConnection?`<div class="card panel" style="margin-bottom:16px"><div class="panel-title">Add Scrin Connection</div><div class="panel-sub">Prototype flow. Tokens remain server-side in Cloudflare.</div><div class="grid two-col"><div><div class="field"><label>Connection name</label><input value="ABC Realty Scrin Account" disabled></div><div class="field"><label>Connection type</label><select disabled><option>Dedicated Employer</option><option>WGH Shared</option></select></div></div><div><div class="field"><label>Employer</label><input value="ABC Realty" disabled></div><div class="context-box"><h4>Secure credential step</h4><p>Add additional API credentials through the server-side Scrin connection configuration.</p></div></div></div></div>`:''}
  <div class="card panel"><div class="panel-title">Scrin.io Connections</div><table><thead><tr><th>Connection</th><th>Type</th><th>Employer ownership</th><th>Employees</th><th>Status</th></tr></thead><tbody>${cs.map(c=>`<tr><td><b>${escapeHtml(c.name||c.id)}</b><div class="small">${escapeHtml(c.id)}</div></td><td>${connectionTypeLabel(c)}</td><td>${c.type==='dedicated'?escapeHtml(c.employer||'Employer required'):'Employee-level mapping'}</td><td>${c.employeeCount??connectionEmployeeCount(c.id)}</td><td><span class="status ${statusClass(c.status||'configured')}"><span class="dot"></span>${escapeHtml(c.status||'configured')}</span></td></tr>`).join('')}</tbody></table><div class="actions" style="margin-top:16px"><button class="btn gold" id="syncScrin">Sync all Scrin connections</button></div></div>
  <div class="card panel" style="margin-top:16px"><div class="panel-title">Provider-independent architecture</div><div class="banner"><div><div class="big" style="font-size:18px">Scrin Connection(s) → WGM Evidence Layer → Period Analytics → AI Draft → Human Review → Employer Report</div><div class="muted">Future WGM Native Monitor plugs into the same normalized evidence and reporting layer.</div></div></div></div>`, 'Data Sources');
}

function settings(){
  return shell(`<div class="header-row"><div><h2>Settings & Integrations</h2><p>Map shared Scrin employees carefully. Dedicated-connection employees remain employer-locked.</p></div></div><div class="grid two-col"><div class="card panel"><div class="panel-title">Scrin API v2</div><div class="panel-sub">Multiple server-side Scrin connections are supported.</div><p class="small">API credentials stay in Cloudflare secrets and never enter this browser code.</p><div class="actions"><button class="btn primary" id="syncScrin">Sync all connections</button><button class="btn" id="testScrin">Test connections</button></div><div id="scrinResult" class="small" style="margin-top:10px">${escapeHtml(state.syncMessage)}</div></div><div class="card panel"><div class="panel-title">Period Analytics</div><div class="panel-sub">V1.6 server-calculated analytics before AI narrative.</div><p class="small">Schedule coverage, evidence coverage, weekly blocks, categories, application shares, previous-period comparison, and review rules are calculated outside the model.</p><span class="status green"><span class="dot"></span>wgm-period-analytics-1.0</span></div></div>
  <div class="card panel" style="margin-top:16px"><div class="panel-title">Source employee → WGM employer mapping</div><table><thead><tr><th>Employee</th><th>Connection</th><th>Type</th><th>Employment ID</th><th>WGM employer</th><th>Internal / Exclude</th><th>Expected hours</th></tr></thead><tbody>${state.employees.map(e=>`<tr><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.connectionName||'Legacy Scrin')}</td><td>${e.employerLocked?'Dedicated':'Shared'}</td><td>${escapeHtml(e.employmentId||'—')}</td><td>${e.employerLocked?`<input class="map-input" value="${escapeHtml(e.employer||e.connectionEmployer||'')}" disabled>`:`<input class="map-input" data-map-employer="${escapeHtml(e.id)}" value="${escapeHtml(e.employer||'')}">`}</td><td>${e.employerLocked?'<span class="small">Not available</span>':`<input type="checkbox" data-map-excluded="${escapeHtml(e.id)}" ${e.excluded?'checked':''}>`}</td><td><input class="map-input small-input" data-map-hours="${escapeHtml(e.id)}" type="number" min="0" step="0.5" value="${Number(e.expectedHours||0)}"></td></tr>`).join('')}</tbody></table><div class="callout"><strong>Save rule</strong>Every active employee from a shared connection must have a WGM employer. Use Internal / Exclude for records that should never appear in employer reporting.</div><div class="actions" style="margin-top:16px"><button class="btn gold" id="saveMappings">Validate & Save mappings</button></div></div>`, 'Settings');
}

function saveMappings(){
  document.querySelectorAll('[data-map-employer]').forEach(el=>{const e=employeeById(el.dataset.mapEmployer);if(e&&!e.employerLocked)e.employer=el.value.trim();});
  document.querySelectorAll('[data-map-excluded]').forEach(el=>{const e=employeeById(el.dataset.mapExcluded);if(e&&!e.employerLocked)e.excluded=el.checked;});
  document.querySelectorAll('[data-map-hours]').forEach(el=>{const e=employeeById(el.dataset.mapHours);if(e)e.expectedHours=Number(el.value||0);});
  state.employees.forEach(e=>{if(e.employerLocked){e.employer=e.connectionEmployer||e.employer;e.excluded=false;}});
  const invalid=state.employees.filter(e=>!e.excluded&&!e.employerLocked&&!String(e.employer||'').trim()); saveEmployees();
  if(invalid.length){toast(`${invalid.length} shared-connection employee(s) still need an employer or Internal / Exclude selection.`);return;}
  ensureEmployerSelection(); toast('Employer mappings validated and saved.');
}

function subscriptions(){
  if(state.role==='employer'){
    const team=portalEmployees();
    return shell(`<div class="header-row"><div><h2>Billing</h2><p>Prototype of the Stripe-backed customer billing entry point.</p></div><button class="btn primary">Manage payment method</button></div><div class="grid metrics">${metric('Plan','WGM Monthly','Configurable in Stripe')}${metric('Paid seats',Math.max(team.length,1),'Contracted capacity')}${metric('Billing status','Active','Prototype state')}${metric('Next renewal','Oct 1, 2026','Hosted billing')}</div>`, 'Billing');
  }
  return shell(`<div class="header-row"><div><h2>Subscriptions</h2><p>Prototype states for included WGH seats and standalone paid organizations.</p></div></div><div class="card panel"><table><thead><tr><th>Company</th><th>Entitlement</th><th>Seats</th><th>Lifecycle state</th></tr></thead><tbody>${mappedEmployers().map((c,i)=>`<tr><td>${escapeHtml(c)}</td><td>${i===0?'WGH Included':'Standalone Paid'}</td><td>${activeEmployees().filter(e=>e.employer===c).length}</td><td><span class="status green"><span class="dot"></span>Active</span></td></tr>`).join('')}</tbody></table></div>`, 'Subscriptions');
}

function reportHeader(e,page,total=5){ return `<div class="wgm-rpt-header"><div><div class="wgm-rpt-kicker">MONTHLY VA ACCOUNTABILITY REPORT</div><div class="wgm-rpt-person">${escapeHtml(e.name)} | ${escapeHtml(e.role||'VIRTUAL ASSISTANT')}</div></div><div class="wgm-rpt-head-right"><div>${periodLabel().toUpperCase()}</div><div>${state.reportStatus==='Released'?'✓ Human reviewed | Released':/Approved/.test(state.reportStatus)?'✓ Human reviewed | Approved':'Human review pending'}</div></div></div><div class="wgm-rpt-rule"></div>`; }
function reportFooter(page,total=5){ return `<div class="wgm-rpt-footer"><span>WHITE GLOVE MONITOR | CONFIDENTIAL</span><span>${String(page).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>`; }
function reportPreview(){
  const e=employeeById(state.reportEmployeeId)||employee(); if(!e) return shell('<div class="card empty">No report selected.</div>','Report Preview');
  const r=state.report||defaultReport; const a=state.reportAnalytics||e.lastAnalytics||{}; const previous=state.reportPrevious; const comp=state.reportComparison||{available:false};
  const weeks=a.weeks||[]; const categories=a.categories||[]; const strengths=(r.strengths||[]).slice(0,4); const patterns=(r.recurringPatterns||[]).slice(0,5); const weeklyInsights=new Map((r.weeklyInsights||[]).map(x=>[x.label,x.summary]));
  const meta=state.reportMetadata||{};
  const categoryMarkup=categories.length?categories.slice(0,8).map(x=>`<div class="wgm-category"><div>${escapeHtml(x.name)}</div><div class="wgm-category-track"><div class="wgm-category-fill" style="width:${Math.max(0,Math.min(100,Number(x.sharePercent||0)))}%"></div></div><div>${Math.round(Number(x.sharePercent||0))}%</div></div>`).join(''):`<div class="wgm-rpt-callout"><strong>Category limitation</strong>No reliable directional category mix could be derived from the available metadata.</div>`;
  const reportCss=`<style>
    .wgm-report-wrap{max-width:960px;margin:0 auto}.wgm-report-actions{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px}.wgm-page{width:min(100%,210mm);min-height:297mm;margin:0 auto 28px;background:#fff;box-sizing:border-box;padding:16mm 15mm 14mm;position:relative;box-shadow:0 8px 30px rgba(0,0,0,.10);color:#1A2947}.wgm-rpt-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;font-size:10px;letter-spacing:.04em}.wgm-rpt-kicker{font-weight:800;font-size:11px}.wgm-rpt-person{margin-top:4px;color:#5f6879;font-weight:700}.wgm-rpt-head-right{text-align:right;font-weight:700;line-height:1.6}.wgm-rpt-rule{height:2px;background:#C9A84C;margin:12px 0 26px}.wgm-rpt-title{font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-.025em;margin:0 0 8px}.wgm-rpt-subtitle{color:#687287;font-size:12px;line-height:1.55}.wgm-rpt-lead{font-size:19px;line-height:1.42;font-weight:700;margin:28px 0 12px;max-width:720px}.wgm-rpt-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:28px 0}.wgm-rpt-metric{border-top:3px solid #1A2947;background:#f6f7f9;padding:16px 14px}.wgm-rpt-metric strong{display:block;font-size:24px;line-height:1}.wgm-rpt-metric span{display:block;margin-top:7px;font-size:9px;font-weight:800;letter-spacing:.06em}.wgm-rpt-metric small{display:block;margin-top:5px;color:#6f7786;font-size:8.5px;line-height:1.4}.wgm-rpt-section{margin-top:26px}.wgm-rpt-section-title{font-size:11px;letter-spacing:.09em;text-transform:uppercase;font-weight:800;margin-bottom:12px}.wgm-matter{display:grid;grid-template-columns:34px 1fr;gap:12px;padding:12px 0;border-top:1px solid #e4e7ec}.wgm-matter-num{font-size:18px;font-weight:800;color:#C9A84C}.wgm-matter-text{font-size:11px;line-height:1.55;color:#3f4b60}.wgm-rpt-callout{border-left:4px solid #C9A84C;background:#f8f7f2;padding:15px 17px;margin-top:20px;font-size:11px;line-height:1.6}.wgm-rpt-callout strong{display:block;margin-bottom:5px}.wgm-rpt-table{width:100%;border-collapse:collapse;font-size:10px;margin-top:14px}.wgm-rpt-table th{text-align:left;padding:9px 7px;border-bottom:2px solid #1A2947;font-size:8px;text-transform:uppercase;letter-spacing:.05em}.wgm-rpt-table td{vertical-align:top;padding:11px 7px;border-bottom:1px solid #e3e6eb;line-height:1.5}.wgm-category{display:grid;grid-template-columns:170px 1fr 42px;gap:10px;align-items:center;margin:10px 0;font-size:10px}.wgm-category-track{height:8px;border-radius:8px;overflow:hidden;background:#e9ecf0}.wgm-category-fill{height:100%;background:#1A2947}.wgm-two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.wgm-rpt-card{background:#f7f8fa;border:1px solid #e3e6eb;padding:16px}.wgm-rpt-card h4{margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em}.wgm-rpt-card p{margin:0;font-size:10px;line-height:1.55;color:#4c576b}.wgm-check-item{padding:10px 0;border-bottom:1px solid #e4e7ec;font-size:10.5px;line-height:1.55}.wgm-check{color:#C9A84C;font-weight:900;margin-right:6px}.wgm-week-card{padding:13px 0;border-top:1px solid #e4e7ec}.wgm-week-card strong{display:block;font-size:11px}.wgm-week-card span{display:block;margin-top:4px;font-size:10px;line-height:1.5;color:#566176}.wgm-badges{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.wgm-badge{border:1px solid #d8dde5;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:800;background:#fff}.wgm-rpt-footer{position:absolute;left:15mm;right:15mm;bottom:9mm;display:flex;justify-content:space-between;border-top:1px solid #dfe3e8;padding-top:7px;font-size:7px;letter-spacing:.06em;color:#7a8392}@media print{body{background:#fff!important}.sidebar,.topbar,.no-print,.wgm-report-actions{display:none!important}.main,.content{margin:0!important;padding:0!important;width:100%!important;max-width:none!important}.wgm-report-wrap{max-width:none!important}.wgm-page{box-shadow:none!important;margin:0!important;width:210mm!important;height:297mm!important;min-height:297mm!important;page-break-after:always;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}.wgm-page:last-child{page-break-after:auto;break-after:auto}}
  </style>`;
  return shell(`${reportCss}<div class="wgm-report-wrap"><div class="wgm-report-actions no-print"><button class="btn" data-page="review">Back to review</button><button class="btn primary" id="printReport">Print / Save PDF</button></div>
  <section class="wgm-page">${reportHeader(e,1)}<div class="wgm-rpt-title">${escapeHtml(r.headline)}</div><div class="wgm-rpt-subtitle">Prepared exclusively for ${escapeHtml(e.employer||'Employer')}</div><div class="wgm-badges"><span class="wgm-badge">Evidence reconciled</span><span class="wgm-badge">Human review required</span><span class="wgm-badge">Review: ${escapeHtml(a.review?.status||'—')}</span></div><div class="wgm-rpt-lead">${escapeHtml(r.executiveSummary||'')}</div>
  <div class="wgm-rpt-metrics"><div class="wgm-rpt-metric"><strong>${hoursLabel(a.metrics?.trackedHours||0)}</strong><span>TRACKED TIME</span><small>Selected period</small></div><div class="wgm-rpt-metric"><strong>${percentLabel(a.metrics?.scheduleCoveragePercent)}</strong><span>SCHEDULE COVERAGE</span><small>Tracked vs expected</small></div><div class="wgm-rpt-metric"><strong>${percentLabel(a.evidence?.evidenceCoveragePercent)}</strong><span>EVIDENCE COVERAGE</span><small>Tracked segments linked to screenshots</small></div><div class="wgm-rpt-metric"><strong>${a.evidence?.screenshotCount??0}</strong><span>SCREENSHOTS</span><small>${a.evidence?.daysWithScreenshots??0}/${a.evidence?.activeDays??0} active days with evidence</small></div></div>
  <div class="wgm-rpt-section"><div class="wgm-rpt-section-title">What matters this month</div>${strengths.map((x,i)=>`<div class="wgm-matter"><div class="wgm-matter-num">0${i+1}</div><div class="wgm-matter-text">${escapeHtml(x)}</div></div>`).join('')}</div><div class="wgm-rpt-callout"><strong>Previous-period comparison</strong>${escapeHtml(r.comparisonSummary||'')}</div><div class="wgm-rpt-callout"><strong>Review conclusion</strong>${escapeHtml(r.integrity||'')}</div>${reportFooter(1)}</section>

  <section class="wgm-page">${reportHeader(e,2)}<div class="wgm-rpt-title">Monthly Activity & Evidence</div><div class="wgm-rpt-subtitle">Week-by-week tracked time, evidence coverage, and observed work patterns.</div><table class="wgm-rpt-table"><thead><tr><th>Week</th><th>Tracked</th><th>Evidence</th><th>Screenshots</th><th>Observed work</th></tr></thead><tbody>${weeks.length?weeks.map(w=>`<tr><td><b>${escapeHtml(w.label)}</b></td><td>${hoursLabel(w.trackedHours)}</td><td>${percentLabel(w.evidenceCoveragePercent)}</td><td>${w.screenshotCount}</td><td>${escapeHtml(weeklyInsights.get(w.label)||`${w.categories?.[0]?.name?`Leading category: ${w.categories[0].name}. `:''}${w.notes?.slice(0,2).join(' · ')||'Available activity and application evidence reviewed.'}`)}</td></tr>`).join(''):'<tr><td colspan="5">No weekly analytics returned.</td></tr>'}</tbody></table><div class="wgm-rpt-section"><div class="wgm-rpt-section-title">Directional work categories</div>${categoryMarkup}</div><div class="wgm-rpt-callout"><strong>Evidence disclosure</strong>${escapeHtml(r.evidenceSummary||a.analysisDisclosure?.note||'')}</div>${reportFooter(2)}</section>

  <section class="wgm-page">${reportHeader(e,3)}<div class="wgm-rpt-title">Strengths, Coaching & Client Context</div><div class="wgm-rpt-subtitle">Evidence-backed positives and practical review guidance.</div><div class="wgm-rpt-section"><div class="wgm-rpt-section-title">Strengths this month</div>${strengths.map(x=>`<div class="wgm-check-item"><span class="wgm-check">✓</span>${escapeHtml(x)}</div>`).join('')}</div><div class="wgm-two"><div class="wgm-rpt-card"><h4>Coaching moment</h4><p>${escapeHtml(r.coaching||'')}</p></div><div class="wgm-rpt-card"><h4>Why it matters</h4><p>Clear labels, notes, and client context reduce ambiguity and help the reviewer distinguish coverage limitations from genuine follow-up questions.</p></div></div><div class="wgm-two" style="margin-top:18px"><div class="wgm-rpt-card"><h4>Client context</h4><p>${escapeHtml(r.clientContext||e.context||'No additional context supplied.')}</p></div><div class="wgm-rpt-card"><h4>Next expectation</h4><p>${escapeHtml(r.nextFocus||'')}</p></div></div><div class="wgm-rpt-callout"><strong>White Glove review standard</strong>Human review remains mandatory before release. Missing evidence is treated as a coverage limitation, not automatic negative employee behavior.</div>${reportFooter(3)}</section>

  <section class="wgm-page">${reportHeader(e,4)}<div class="wgm-rpt-title">Monthly Consistency Review</div><div class="wgm-rpt-subtitle">Schedule consistency, evidence coverage, recurring patterns, and previous-period movement.</div><div class="wgm-rpt-metrics"><div class="wgm-rpt-metric"><strong>${weeks.length||'—'}</strong><span>WEEKS REVIEWED</span><small>Period blocks</small></div><div class="wgm-rpt-metric"><strong>${a.metrics?.activeDays??'—'}</strong><span>ACTIVE DAYS</span><small>Recorded workdays</small></div><div class="wgm-rpt-metric"><strong>${percentLabel(a.evidence?.activeDayCoveragePercent)}</strong><span>DAY COVERAGE</span><small>Active days with screenshots</small></div><div class="wgm-rpt-metric"><strong>${a.review?.status||'—'}</strong><span>REVIEW STATE</span><small>${a.review?.reasons?.length||0} rule reason(s)</small></div></div>
  <div class="wgm-two"><div class="wgm-rpt-card"><h4>Previous period</h4><p>${comp.available?`Tracked ${signedNumber(comp.trackedHoursDelta,'h')} · evidence ${signedNumber(comp.evidenceCoverageDeltaPoints,' pts')} · screenshots ${signedNumber(comp.screenshotCountDelta)} · active days ${signedNumber(comp.activeDaysDelta)}`:'Comparison unavailable.'}</p></div><div class="wgm-rpt-card"><h4>Current evidence density</h4><p>${a.evidence?.screenshotDensityPerTrackedHour??'—'} screenshots per tracked hour · ${a.evidence?.activitiesWithScreenshots??0}/${a.evidence?.activityRecords??0} activity records linked to screenshot evidence.</p></div></div><div class="wgm-rpt-section"><div class="wgm-rpt-section-title">Recurring patterns</div>${patterns.map(x=>`<div class="wgm-check-item">• ${escapeHtml(x)}</div>`).join('')}</div><div class="wgm-rpt-callout"><strong>Recommended focus</strong>${escapeHtml(r.nextFocus||'')}</div>${reportFooter(4)}</section>

  <section class="wgm-page">${reportHeader(e,5)}<div class="wgm-rpt-title">Monthly Task Map</div><div class="wgm-rpt-subtitle">Directional categories from activity notes and application metadata. These are not exact task-duration allocations.</div><div class="wgm-rpt-section"><div class="wgm-rpt-section-title">Observed categories</div>${categoryMarkup}</div><div class="wgm-rpt-section"><div class="wgm-rpt-section-title">Verified weekly evidence</div>${weeks.length?weeks.map(w=>`<div class="wgm-week-card"><strong>${escapeHtml(w.label)} · ${hoursLabel(w.trackedHours)} · ${percentLabel(w.evidenceCoveragePercent)} evidence</strong><span>${escapeHtml(weeklyInsights.get(w.label)||`${w.screenshotCount} screenshot record(s). ${w.categories?.slice(0,3).map(x=>x.name).join(', ')||'No reliable category mix.'}`)}</span></div>`).join(''):'<div class="wgm-week-card"><strong>Selected period</strong><span>${hoursLabel(a.metrics?.trackedHours||0)} tracked across ${a.metrics?.activeDays||0} active day(s).</span></div>'}</div><div class="wgm-rpt-callout"><strong>Client takeaway</strong>${escapeHtml(r.executiveSummary||'')}</div><div class="wgm-rpt-callout"><strong>Analysis metadata</strong>Generated by ${escapeHtml(meta.generatedBy||'WGM')} · analysis ${escapeHtml(meta.analysisVersion||a.versions?.analysisVersion||'—')} · rules ${escapeHtml(meta.rulesVersion||a.versions?.rulesVersion||'—')} · prompt ${escapeHtml(meta.promptVersion||'—')} · model ${escapeHtml(meta.model||'not configured')}<br><br>${escapeHtml(a.analysisDisclosure?.note||'')}</div>${reportFooter(5)}</section></div>`, 'Report Preview');
}

function mergeSyncedEmployee(x,prior){
  const old=prior.find(o=>String(o.id)===String(x.id))||prior.find(o=>String(o.employmentId)===String(x.employmentId)&&(!o.connectionId||String(o.connectionId)===String(x.connectionId)))||{};
  const dedicated=x.employerLocked?(x.connectionEmployer||x.employer||''):null;
  return {...old,...x,id:x.id||`${x.connectionId||'scrin'}::${x.employmentId}`,initials:initials(x.name),employer:dedicated!==null?dedicated:(old.employer||x.employer||''),excluded:x.employerLocked?false:Boolean(old.excluded),expectedHours:Number(old.expectedHours??x.expectedHours??160),schedule:old.schedule||x.schedule||'Monday–Friday · 8 hours/day · 40 hours/week',timezone:old.timezone||x.timezone||'Set in WGM',timezoneOffsetMinutes:Number(old.timezoneOffsetMinutes??x.timezoneOffsetMinutes??0),context:old.context||x.context||'',trackedHours:Number(old.trackedHours??x.trackedHours??0),activeDays:Number(old.activeDays??x.activeDays??0),concerns:Number(old.concerns??x.concerns??0),workstreams:old.workstreams||x.workstreams||[],apps:old.apps||x.apps||[],weeks:old.weeks||x.weeks||[],shots:old.shots||x.shots||[],daySummary:old.daySummary||x.daySummary||null,monitoringPolicy:old.monitoringPolicy||x.monitoringPolicy||defaultMonitoringPolicy(),lastAnalytics:old.lastAnalytics||null,reportingStatus:old.reportingStatus||x.reportingStatus||'Synced'};
}

async function syncScrin(){
  state.syncMessage='Syncing all Scrin connections…'; render();
  try{
    const r=await fetch('/api/scrin/all-common',{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Scrin connection sync failed');
    const prior=[...state.employees]; state.connections=Array.isArray(j.connections)?j.connections:state.connections; state.employees=(Array.isArray(j.employees)?j.employees:[]).map(x=>mergeSyncedEmployee(x,prior));
    if(!state.employees.length) throw new Error('No employment records were returned');
    if(!state.employees.some(e=>String(e.id)===String(state.selectedEmployeeId))) state.selectedEmployeeId=activeEmployees()[0]?.id||state.employees[0].id;
    saveEmployees(); saveConnections(); state.mode=j.demo?'DEMO':'LIVE'; const errors=Array.isArray(j.errors)?j.errors.length:0; const connected=state.connections.filter(c=>c.status==='connected'||c.status==='demo').length; state.syncMessage=`Connected ${connected}/${state.connections.length} Scrin connection(s). ${state.employees.length} employment record(s) loaded.${errors?` ${errors} connection error(s) require attention.`:''}`;
  }catch(e){state.syncMessage=`Connection sync failed: ${e.message}`;} render();
}
async function refreshConnections(){ try{const r=await fetch('/api/scrin/connections');const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not load connections');state.connections=Array.isArray(j.connections)?j.connections:[];saveConnections();toast(`${state.connections.length} Scrin connection(s) configured.`);}catch(e){toast(`Could not refresh connections: ${e.message}`);} }
async function testScrin(){ const el=document.getElementById('scrinResult'); if(el)el.textContent='Testing all connections…'; try{const r=await fetch('/api/scrin/all-common',{method:'POST'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Not configured');state.mode=j.demo?'DEMO':'LIVE';state.connections=Array.isArray(j.connections)?j.connections:state.connections;saveConnections();const connected=state.connections.filter(c=>c.status==='connected'||c.status==='demo').length;state.syncMessage=`${state.mode} connections responding: ${connected}/${state.connections.length}. ${j.employees?.length||0} employment record(s) available.`;render();}catch(e){if(el)el.textContent=`Not connected: ${e.message}`;} }

function render(){
  let out='';
  if(state.page==='dashboard')out=dashboard(); else if(state.page==='companies')out=companies(); else if(state.page==='employees')out=employees(); else if(state.page==='monitoring')out=monitoring(); else if(state.page==='reports')out=reports(); else if(state.page==='review')out=review(); else if(state.page==='subscriptions')out=subscriptions(); else if(state.page==='dataSources')out=dataSources(); else if(state.page==='settings')out=settings(); else if(state.page==='reportPreview')out=reportPreview();
  document.getElementById('app').innerHTML=out; bind();
}

function bind(){
  document.querySelectorAll('[data-page]').forEach(x=>{x.onclick=()=>{state.page=x.dataset.page;render();};});
  document.querySelectorAll('[data-open-id]').forEach(x=>{x.onclick=()=>{const target=employeeById(x.dataset.openId);if(state.role==='employer'&&target?.employer!==state.portalEmployer){toast('That employee is outside this employer portal.');return;}state.selectedEmployeeId=x.dataset.openId;state.page='monitoring';state.employeeTab='overview';render();};});
  document.querySelectorAll('[data-tab]').forEach(x=>{x.onclick=()=>{state.employeeTab=x.dataset.tab;render();};});
  const role=document.getElementById('roleSwitcher'); if(role)role.onchange=()=>setRole(role.value);
  const emp=document.getElementById('employerSwitcher'); if(emp)emp.onchange=()=>{state.portalEmployer=emp.value;localStorage.setItem('wgmPortalEmployer',state.portalEmployer);const team=portalEmployees();state.selectedEmployeeId=team[0]?.id||'';render();};
  const sync=document.getElementById('syncScrin'); if(sync)sync.onclick=syncScrin;
  const test=document.getElementById('testScrin'); if(test)test.onclick=testScrin;
  const refresh=document.getElementById('refreshConnections'); if(refresh)refresh.onclick=refreshConnections;
  const add=document.getElementById('toggleAddConnection'); if(add)add.onclick=()=>{state.showAddConnection=!state.showAddConnection;render();};
  const mappings=document.getElementById('saveMappings'); if(mappings)mappings.onclick=saveMappings;
  const context=document.getElementById('saveContext'); if(context)context.onclick=saveContext;
  const day=document.getElementById('loadLiveDay'); if(day)day.onclick=loadLiveDay;
  const savePolicy=document.getElementById('saveMonitoringPolicy'); if(savePolicy)savePolicy.onclick=saveMonitoringPolicy;
  ['policyMode','policyShotsPerHour','policyDailyTarget','policyExpectedDayHours'].forEach(id=>{const el=document.getElementById(id);if(el){el.onchange=updatePolicyEstimate;el.oninput=updatePolicyEstimate;}});
  const select=document.getElementById('reportEmployee'); if(select)select.onchange=()=>{if(select.value!=='__ALL__')state.selectedEmployeeId=select.value;};
  const generate=document.getElementById('generateBtn'); if(generate)generate.onclick=generateReport;
  const request=document.getElementById('requestEmployerReport'); if(request)request.onclick=()=>toast('Report request queued for White Glove review.');
  document.querySelectorAll('[data-check]').forEach(x=>{x.onchange=()=>{state.reviewerChecks[Number(x.dataset.check)]=x.checked;};});
  const approve=document.getElementById('approveBtn'); if(approve)approve.onclick=()=>{if(!state.reviewerChecks.every(Boolean)){toast('Complete all reviewer checks before approval.');return;}state.reportStatus='Approved';const e=employeeById(state.reportEmployeeId);if(e)e.reportingStatus='Approved';saveEmployees();render();toast('Report approved by WGM reviewer.');};
  const preview=document.getElementById('previewReport'); if(preview)preview.onclick=()=>{state.page='reportPreview';render();};
  const release=document.getElementById('releaseBtn'); if(release)release.onclick=async()=>{if(state.reportStatus==='Released')return;const e=employeeById(state.reportEmployeeId)||employee();try{await fetch('/api/reports/release',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:e.id,employer:e.employer,period:state.reportPeriod})});}catch{}state.reportStatus='Released';e.reportingStatus='Released';state.deliveryQueue.push({employeeId:e.id,employer:e.employer,connectionId:e.connectionId,period:{...state.reportPeriod},status:'queued'});saveEmployees();render();toast('Released. Future GHL delivery event queued.');};
  const batch=document.getElementById('batchGreen'); if(batch)batch.onclick=()=>{const eligible=activeEmployees().filter(e=>reviewColor(e)==='Green').length;toast(`${eligible} Green report(s) are eligible for batch approval once generated. Yellow/Red remain excluded.`);};
  const print=document.getElementById('printReport'); if(print)print.onclick=()=>window.print();
}

async function initializeApp(){
  try{const r=await fetch('/api/health');const h=await r.json();state.mode=h.mode==='live'?'LIVE':'DEMO';if(state.mode==='LIVE')state.syncMessage=`Live Scrin configuration detected. ${h.connectionCount??'—'} connection(s) configured. Analytics: ${h.analysisVersion||'unknown'}.`;}
  catch(e){console.error('Could not determine WGM connection mode:',e);}
  try{const r=await fetch('/api/scrin/connections');const d=await r.json();if(r.ok&&Array.isArray(d.connections)){state.connections=d.connections;saveConnections();}}
  catch(e){console.error('Could not load Scrin connections:',e);}
  if(state.role==='employer')ensureEmployerSelection(); render();
}

initializeApp();
