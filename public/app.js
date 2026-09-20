const state = {
  page: 'dashboard',
  employeeTab: 'overview',
  mode: 'DEMO',
  employees: [],
  selectedEmployeeId: 'demo-maria',
  reportStatus: 'Not generated',
  report: null,
  reportEmployeeId: null,
  reviewerChecks: [true,true,true,true,true],
  reportPeriod: { from: '2026-08-01', to: '2026-08-31' },
  deliveryQueue: [],
  toast: null,
  syncMessage: 'Demo data loaded. Connect Scrin to replace this with the three live VAs.',
};

const defaultReport = {
  headline: 'The reporting period shows generally consistent, business-relevant work.',
  summary: 'Tracked time, workstreams and available evidence were reconciled against the employee baseline and supplied context. No unsupported conclusion has been added.',
  strengths: [
    'Tracked work is visible across the selected period.',
    'Project and application evidence supports the workstream summary.',
    'The report is ready for human validation before release.'
  ],
  coaching: 'Continue using clear project labels and concise notes so future reports require less evidence escalation.',
  clientContext: 'No additional client clarification is required in this prototype example.',
  nextFocus: 'Maintain clear tracking labels and review any meaningful schedule variance before the next release.',
  integrity: 'No material integrity conclusion should be made unless the available evidence supports it.'
};

const demoEmployees = [
  {
    id:'demo-maria',
    employmentId:'477279',
    name:'Maria Gadin',
    initials:'MG',
    employer:'Grider & Peterson Real Estate',
    scrinCompany:'WGH Scrin Account',
    source:'WGH Managed',
    role:'Virtual Assistant',
    timezone:'UTC-07:00',
    timezoneOffsetMinutes:-420,
    schedule:'Monday–Friday · 8 hours/day · 40 hours/week',
    expectedHours:160,
    trackedHours:161.4167,
    activeDays:20,
    concerns:0,
    context:'No approved leave or schedule adjustment for the August benchmark.',
    workstreams:[
      ['Marketing & content',30],
      ['Listings & research',22],
      ['Transactions',16],
      ['Communication',13],
      ['Admin & operations',11],
      ['Files & documents',8]
    ],
    apps:[
      ['Outlook / Microsoft',31],
      ['Canva',20],
      ['NavicaMLS / property systems',18],
      ['Browser research',14],
      ['WhatsApp / communications',9],
      ['Other business tools',8]
    ],
    weeks:[
      ['Aug 3–7','40h 28m','Listing research, property updates, email coordination, database work, marketing, and general support.'],
      ['Aug 10–14','40h 32m','Marketing content, listing materials, transactions, file work, research, and client-facing communications.'],
      ['Aug 17–21','40h 11m','Marketing reports and assets, transaction support, listing research, document handling, and operations.'],
      ['Aug 24–28','40h 14m','Marketing, transactions, general tasks, property research, communications, and operational support.']
    ],
    shots:[
      ['8:46 AM','Instagram / marketing',68],
      ['8:52 AM','Outlook',76],
      ['8:53 AM','NavicaMLS',82],
      ['8:56 AM','Canva',73],
      ['9:02 AM','Outlook',79],
      ['9:08 AM','Canva',77],
      ['9:12 AM','Zillow',71],
      ['9:17 AM','WhatsApp',66]
    ],
    reportingStatus:'Ready'
  },
  {
    id:'demo-va2',
    employmentId:'SYNC-VA-2',
    name:'VA 2 — sync to reveal',
    initials:'V2',
    employer:'Employer B',
    scrinCompany:'WGH Scrin Account',
    source:'WGH Managed',
    role:'Virtual Assistant',
    timezone:'UTC-05:00',
    timezoneOffsetMinutes:-300,
    schedule:'Monday–Friday · 8 hours/day · 40 hours/week',
    expectedHours:160,
    trackedHours:154.75,
    activeDays:20,
    concerns:0,
    context:'Example approved half-day included for prototype testing.',
    workstreams:[
      ['CRM & follow-up',34],
      ['Client support',24],
      ['Transactions',18],
      ['Operations',13],
      ['Meetings',7],
      ['Other',4]
    ],
    apps:[
      ['CRM',35],
      ['Email',27],
      ['Browser',16],
      ['Meetings',12],
      ['Documents',10]
    ],
    weeks:[
      ['Aug 3–7','39h 10m','CRM follow-up and client support.'],
      ['Aug 10–14','40h 02m','Transactions and client coordination.'],
      ['Aug 17–21','36h 30m','Approved schedule adjustment applied.'],
      ['Aug 24–28','39h 03m','CRM and operations.']
    ],
    shots:[
      ['9:05 AM','CRM',72],
      ['9:18 AM','Outlook',65],
      ['9:31 AM','CRM',81],
      ['10:02 AM','Docs',58]
    ],
    reportingStatus:'Context applied'
  },
  {
    id:'demo-va3',
    employmentId:'SYNC-VA-3',
    name:'VA 3 — sync to reveal',
    initials:'V3',
    employer:'Employer C',
    scrinCompany:'WGH Scrin Account',
    source:'WGH Managed',
    role:'Virtual Assistant',
    timezone:'UTC-08:00',
    timezoneOffsetMinutes:-480,
    schedule:'Monday–Friday · 8 hours/day · 40 hours/week',
    expectedHours:160,
    trackedHours:143.25,
    activeDays:19,
    concerns:1,
    context:'Prototype case with an unexplained variance requiring review.',
    workstreams:[
      ['Operations',31],
      ['Research',23],
      ['CRM',19],
      ['Communication',16],
      ['Documentation',11]
    ],
    apps:[
      ['Browser',29],
      ['Email',24],
      ['CRM',20],
      ['Documents',17],
      ['Other',10]
    ],
    weeks:[
      ['Aug 3–7','39h 40m','Operations and research.'],
      ['Aug 10–14','38h 11m','CRM and documentation.'],
      ['Aug 17–21','31h 14m','Short week; context required.'],
      ['Aug 24–28','34h 10m','Operations and communication.']
    ],
    shots:[
      ['8:57 AM','Browser',55],
      ['9:12 AM','Email',63],
      ['9:26 AM','CRM',61],
      ['10:04 AM','Documents',48]
    ],
    reportingStatus:'Review recommended'
  }
];

state.employees = loadLocalEmployees();

function loadLocalEmployees(){
  try {
    const v = JSON.parse(localStorage.getItem('wgmEmployees') || 'null');
    return Array.isArray(v) && v.length ? v : demoEmployees;
  } catch {
    return demoEmployees;
  }
}

function saveEmployees(){
  try{
    localStorage.setItem('wgmEmployees', JSON.stringify(state.employees));
  }catch{}
}

function employee(){
  return state.employees.find(
    e => String(e.id) === String(state.selectedEmployeeId)
  ) || state.employees[0];
}

function employeeById(id){
  return state.employees.find(
    e => String(e.id) === String(id)
  );
}

function initials(name=''){
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(x => x[0])
    .join('')
    .toUpperCase() || 'VA';
}

function hoursLabel(decimal=0){
  const total = Math.max(
    0,
    Math.round(Number(decimal || 0) * 60)
  );

  return `${Math.floor(total/60)}h ${String(total%60).padStart(2,'0')}m`;
}

function coverage(e){
  return e.expectedHours
    ? Math.min(
        100,
        Math.round((e.trackedHours / e.expectedHours) * 1000) / 10
      )
    : null;
}

function statusClass(s=''){
  if(/Released|Approved|Healthy|Complete|Ready|Connected|Paid/i.test(s)){
    return 'green';
  }

  if(/Context|Pending|Review|Trial|Queued/i.test(s)){
    return 'amber';
  }

  if(/Past|Failed|Concern|Hold|Error/i.test(s)){
    return 'red';
  }

  return 'blue';
}

function escapeHtml(v=''){
  return String(v).replace(
    /[&<>"']/g,
    m => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m])
  );
}

function toast(msg){
  state.toast = msg;
  render();

  setTimeout(() => {
    state.toast = null;
    render();
  }, 2300);
}

function metric(label,value,sub){
  return `
    <div class="card metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="delta">${sub}</div>
    </div>
  `;
}

function mixBar(label,v,total=100){
  const pct = total
    ? Math.max(0, Math.min(100, (v/total)*100))
    : 0;

  return `
    <div class="work-row">
      <b>${escapeHtml(label)}</b>
      <div class="progress">
        <span style="width:${pct}%"></span>
      </div>
      <span>${Math.round(v)}${total===100?'%':''}</span>
    </div>
  `;
}

function navButton(id,label,badge=''){
  return `
    <button
      data-page="${id}"
      class="${state.page===id?'active':''}"
    >
      <span>${label}</span>
      ${
        badge
          ? `<span class="badge">${badge}</span>`
          : ''
      }
    </button>
  `;
}

function shell(content,title){
  return `
    <div class="app-shell">

      <aside class="sidebar">

        <div class="brand">
          <div class="brand-mark">W</div>

          <div>
            <div class="brand-name">
              WHITE GLOVE MONITOR
            </div>

            <div class="brand-sub">
              WORKFORCE INTELLIGENCE
            </div>
          </div>
        </div>

        <nav class="nav">
          ${navButton('dashboard','Dashboard')}
          ${navButton('companies','Companies')}
          ${navButton('employees','Employees')}
          ${navButton('monitoring','Monitoring')}
          ${navButton('reports','Reports')}
          ${
            navButton(
              'review',
              'Review Queue',
              state.reportStatus==='Draft ready' ? '1' : ''
            )
          }
          ${navButton('subscriptions','Subscriptions')}
          ${navButton('settings','Settings')}
        </nav>

        <div class="sidebar-bottom">
          <div class="user-chip">

            <div class="avatar">
              W
            </div>

            <div>
              <b>WGM Owner</b>

              <div style="font-size:11px;opacity:.7">
                Super Admin
              </div>
            </div>

          </div>
        </div>

      </aside>

      <main class="main">

        <header class="topbar">

          <h1>${title}</h1>

          <div class="mode-pill">
            ${state.mode} MODE · Multi-employer V1.1
          </div>

        </header>

        <section class="content">
          ${content}
        </section>

      </main>

      ${
        state.toast
          ? `<div class="toast">${escapeHtml(state.toast)}</div>`
          : ''
      }

    </div>
  `;
}

function dashboard(){

  const employerCount = new Set(
    state.employees
      .map(e => e.employer)
      .filter(Boolean)
  ).size;

  const ready = state.employees.filter(
    e => /Ready|Context applied/i.test(
      e.reportingStatus || ''
    )
  ).length;

  const review = state.employees.filter(
    e => /Review/i.test(
      e.reportingStatus || ''
    )
  ).length;

  return shell(
    `
    <div class="header-row">

      <div>
        <h2>WGM Command Center</h2>

        <p>
          One Scrin connection can feed multiple VAs while
          WGM keeps each employer relationship separate.
        </p>
      </div>

      <div class="actions">
        <button
          class="btn"
          data-page="settings"
        >
          Scrin connection
        </button>

        <button
          class="btn primary"
          data-page="reports"
        >
          Generate reports
        </button>
      </div>

    </div>

    <div class="grid metrics">

      ${metric(
        'Employers',
        employerCount,
        'Mapped in WGM'
      )}

      ${metric(
        'Employees monitored',
        state.employees.length,
        'From one Scrin connection'
      )}

      ${metric(
        'Ready to generate',
        ready,
        'Context complete'
      )}

      ${metric(
        'Needs review',
        review,
        'Before release'
      )}

    </div>

    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          Three-VA demo structure
        </div>

        <div class="panel-sub">
          The Scrin account supplies the people.
          WGM owns the employer mapping and reporting workflow.
        </div>

        <table>

          <thead>
            <tr>
              <th>Employee</th>
              <th>WGM employer</th>
              <th>Scrin employment ID</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            ${
              state.employees.map(
                e => `
                <tr>

                  <td>
                    <span
                      class="row-link"
                      data-open-id="${escapeHtml(e.id)}"
                    >
                      ${escapeHtml(e.name)}
                    </span>
                  </td>

                  <td>
                    ${escapeHtml(e.employer || 'Unassigned')}
                  </td>

                  <td>
                    ${escapeHtml(e.employmentId || '—')}
                  </td>

                  <td>
                    <span class="status ${statusClass(e.reportingStatus)}">
                      <span class="dot"></span>
                      ${escapeHtml(e.reportingStatus || 'Synced')}
                    </span>
                  </td>

                </tr>
                `
              ).join('')
            }

          </tbody>

        </table>

      </div>

      <div class="card panel">

        <div class="panel-title">
          What the demo proves
        </div>

        <div class="context-box">
          <h4>1 API connection</h4>
          <p>
            The WGM backend authenticates to the shared Scrin
            account with one server-side token.
          </p>
        </div>

        <div class="context-box">
          <h4>3 employer relationships</h4>
          <p>
            WGM maps each employment record to the correct client,
            even when Scrin groups them under one account.
          </p>
        </div>

        <div class="context-box">
          <h4>Separate reports</h4>
          <p>
            Each VA gets an independent schedule, context,
            calculations, AI draft and human review record.
          </p>
        </div>

      </div>

    </div>
    `,
    'Dashboard'
  );
}

function companies(){

  const groups = {};

  state.employees.forEach(e => {
    const k = e.employer || 'Unassigned';

    (groups[k] ||= []).push(e);
  });

  return shell(
    `
    <div class="header-row">

      <div>
        <h2>Companies</h2>

        <p>
          Employer separation is controlled by WGM,
          not by the visual structure of the Scrin account.
        </p>
      </div>

      <button
        class="btn primary"
        data-page="settings"
      >
        Manage mappings
      </button>

    </div>

    <div class="card panel">

      <table>

        <thead>
          <tr>
            <th>WGM employer</th>
            <th>Employees</th>
            <th>Source</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          ${
            Object.entries(groups)
              .map(
                ([name,emps]) => `
                <tr>

                  <td class="row-link">
                    ${escapeHtml(name)}
                  </td>

                  <td>
                    ${emps.length}
                  </td>

                  <td>
                    ${escapeHtml(
                      emps[0].source || 'WGH Managed'
                    )}
                  </td>

                  <td>
                    <span class="status green">
                      <span class="dot"></span>
                      Active
                    </span>
                  </td>

                </tr>
                `
              )
              .join('')
          }

        </tbody>

      </table>

    </div>
    `,
    'Companies'
  );
}

function employees(){

  return shell(
    `
    <div class="header-row">

      <div>
        <h2>Employees</h2>

        <p>
          Choose any synced VA to inspect monitoring data
          or generate a report.
        </p>
      </div>

      <div class="actions">

        <button
          class="btn"
          id="syncScrin"
        >
          Sync employees from Scrin
        </button>

        <button
          class="btn"
          data-page="settings"
        >
          Map employers
        </button>

      </div>

    </div>

    <div class="card panel">

      <div class="callout">

        <strong>
          Current connection status
        </strong>

        ${escapeHtml(state.syncMessage)}

      </div>

      <table>

        <thead>
          <tr>
            <th>Employee</th>
            <th>WGM employer</th>
            <th>Employment ID</th>
            <th>Tracked benchmark</th>
            <th>Coverage</th>
            <th>Reporting status</th>
          </tr>
        </thead>

        <tbody>

          ${
            state.employees.map(
              e => `
              <tr>

                <td>

                  <span
                    class="row-link"
                    data-open-id="${escapeHtml(e.id)}"
                  >
                    ${escapeHtml(e.name)}
                  </span>

                  <div class="small">
                    ${escapeHtml(e.role || 'Virtual Assistant')}
                  </div>

                </td>

                <td>
                  ${escapeHtml(e.employer || 'Unassigned')}
                </td>

                <td>
                  ${escapeHtml(e.employmentId || '—')}
                </td>

                <td>
                  ${hoursLabel(e.trackedHours)}
                </td>

                <td>
                  ${coverage(e) ?? '—'}%
                </td>

                <td>
                  <span class="status ${statusClass(e.reportingStatus)}">
                    <span class="dot"></span>
                    ${escapeHtml(e.reportingStatus || 'Synced')}
                  </span>
                </td>

              </tr>
              `
            ).join('')
          }

        </tbody>

      </table>

    </div>
    `,
    'Employees'
  );
}

function monitoring(){
  return employeeView();
}

function employeeView(){

  const e = employee();

  if(!e){
    return shell(
      '<div class="card empty">No employee selected.</div>',
      'Employee Monitoring'
    );
  }

  const tabs = [
    'overview',
    'timeline',
    'screenshots',
    'workstreams',
    'apps',
    'context',
    'reports'
  ];

  const labels = {
    overview:'Overview',
    timeline:'Timeline',
    screenshots:'Screenshots',
    workstreams:'Workstreams',
    apps:'Apps & URLs',
    context:'Context',
    reports:'Reports'
  };

  return shell(
    `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">
          ${escapeHtml(
            e.initials || initials(e.name)
          )}
        </div>

        <div>
          <h2 style="margin:0">
            ${escapeHtml(e.name)}
          </h2>

          <div class="small">
            ${escapeHtml(e.employer || 'Unassigned employer')}
            ·
            ${escapeHtml(e.role || 'Virtual Assistant')}
          </div>
        </div>

        <div class="spacer"></div>

        <span class="status green">
          <span class="dot"></span>
          Tracking connected
        </span>

      </div>

      <div class="tabs">

        ${
          tabs.map(
            t => `
            <button
              class="tab ${state.employeeTab===t?'active':''}"
              data-tab="${t}"
            >
              ${labels[t]}
            </button>
            `
          ).join('')
        }

      </div>

      ${employeeTabContent(e)}

    </div>
    `,
    'Employee Monitoring'
  );
}

function employeeTabContent(e){

  if(state.employeeTab === 'screenshots'){
    return screenshotView(e);
  }

  if(state.employeeTab === 'workstreams'){
    return `
      <div class="grid two-col">

        <div>
          ${
            (e.workstreams || [])
              .map(
                x => mixBar(
                  x[0],
                  x[1]
                )
              )
              .join('')
            ||
            '<div class="empty">Generate/sync period data to populate workstreams.</div>'
          }
        </div>

        <div class="callout">
          <strong>
            Reporting rule
          </strong>

          Project time is the primary allocation signal.
          Screenshots and device activity support interpretation;
          they do not become a standalone productivity verdict.
        </div>

      </div>
    `;
  }

  if(state.employeeTab === 'apps'){
    return `
      <div class="grid two-col">

        <div>
          ${
            (e.apps || [])
              .map(
                x => mixBar(
                  x[0],
                  x[1]
                )
              )
              .join('')
            ||
            '<div class="empty">Sync screenshot metadata to populate apps and URLs.</div>'
          }
        </div>

        <div class="context-box">
          <h4>
            How WGM uses this
          </h4>

          <p>
            Applications and URLs help establish business relevance
            and repeated patterns. They are contextual evidence,
            not a performance score.
          </p>
        </div>

      </div>
    `;
  }

  if(state.employeeTab === 'context'){
    return contextView(e);
  }

  if(state.employeeTab === 'reports'){
    return `
      <table>

        <thead>
          <tr>
            <th>Period</th>
            <th>Tracked</th>
            <th>Coverage</th>
            <th>Review</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          <tr>

            <td>
              August 2026
            </td>

            <td>
              ${hoursLabel(e.trackedHours)}
            </td>

            <td>
              ${coverage(e) ?? '—'}%
            </td>

            <td>
              ${
                state.reportEmployeeId === e.id &&
                /Approved|Released/.test(state.reportStatus)
                  ? 'Human reviewed'
                  : '—'
              }
            </td>

            <td>

              <span
                class="status ${
                  statusClass(
                    state.reportEmployeeId === e.id
                      ? state.reportStatus
                      : e.reportingStatus
                  )
                }"
              >

                <span class="dot"></span>

                ${
                  escapeHtml(
                    state.reportEmployeeId === e.id
                      ? state.reportStatus
                      : e.reportingStatus
                  )
                }

              </span>

            </td>

          </tr>

        </tbody>

      </table>
    `;
  }

  if(state.employeeTab === 'timeline'){

    return `
      <div class="banner">

        <div>

          <div class="big">
            ${
              hoursLabel(
                Math.min(
                  8.1,
                  e.trackedHours /
                  Math.max(
                    e.activeDays || 1,
                    1
                  )
                )
              )
            }
          </div>

          <div class="muted">
            Representative tracked day ·
            ${
              escapeHtml(
                (e.workstreams?.[0]?.[0]) || 'Work'
              )
            }
          </div>

        </div>

        <span class="status green">
          <span class="dot"></span>
          Scrin-linked evidence
        </span>

      </div>

      <div class="small">
        Workday timeline
      </div>

      <div class="timeline">
        <span style="left:27%;width:34%"></span>
      </div>

      <table>

        <thead>
          <tr>
            <th>Block</th>
            <th>Project</th>
            <th>Note</th>
            <th>Evidence</th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>8:45–10:18</td>

            <td>
              ${
                escapeHtml(
                  e.workstreams?.[0]?.[0] || 'Project'
                )
              }
            </td>

            <td>
              Representative work block
            </td>

            <td>
              Scrin activity + screenshots
            </td>
          </tr>

          <tr>
            <td>10:28–12:04</td>

            <td>
              ${
                escapeHtml(
                  e.workstreams?.[1]?.[0] || 'Project'
                )
              }
            </td>

            <td>
              Representative work block
            </td>

            <td>
              Application / URL metadata
            </td>
          </tr>

        </tbody>

      </table>
    `;
  }

  return `
    <div class="grid metrics">

      ${
        metric(
          'Tracked time',
          hoursLabel(e.trackedHours),
          'Selected benchmark'
        )
      }

      ${
        metric(
          'Schedule coverage',
          `${coverage(e) ?? '—'}%`,
          `${e.expectedHours || '—'} expected hours`
        )
      }

      ${
        metric(
          'Active workdays',
          e.activeDays || '—',
          'Reporting period'
        )
      }

      ${
        metric(
          'Review flags',
          e.concerns || 0,
          e.concerns
            ? 'Requires context'
            : 'No material flag'
        )
      }

    </div>

    <div class="grid two-col">

      <div>

        <div class="panel-title">
          Work pattern
        </div>

        ${
          (e.weeks || [])
            .map(
              w => `
              <div class="context-box">

                <h4>
                  ${escapeHtml(w[0])}
                  ·
                  ${escapeHtml(w[1])}
                </h4>

                <p>
                  ${escapeHtml(w[2])}
                </p>

              </div>
              `
            )
            .join('')
        }

      </div>

      <div>

        <div class="panel-title">
          WGM baseline
        </div>

        <div class="context-box">

          <h4>
            Expected schedule
          </h4>

          <p>
            ${escapeHtml(e.schedule || 'Not set')}
          </p>

          <p>
            ${escapeHtml(e.timezone || 'Timezone not set')}
          </p>

        </div>

        <div class="context-box">

          <h4>
            Monthly context
          </h4>

          <p>
            ${escapeHtml(e.context || 'No context entered.')}
          </p>

        </div>

      </div>

    </div>
  `;
}


/* ==========================================================
   LIVE SCRIN SCREENSHOT VIEW
   ========================================================== */

function screenshotView(e){

  return `
    <div class="toolbar">

      <div class="field">
        <label>Date</label>

        <input
          id="screenDate"
          type="date"
          value="2026-09-18"
        >
      </div>

      <div class="field">
        <label>Project</label>

        <select>

          <option>
            All projects
          </option>

          ${
            (e.workstreams || [])
              .map(
                x => `
                <option>
                  ${escapeHtml(x[0])}
                </option>
                `
              )
              .join('')
          }

        </select>
      </div>

      <div class="field">
        <label>Application</label>

        <select>

          <option>
            All apps & URLs
          </option>

          ${
            (e.apps || [])
              .map(
                x => `
                <option>
                  ${escapeHtml(x[0])}
                </option>
                `
              )
              .join('')
          }

        </select>
      </div>

      <div class="spacer"></div>

      <button
        class="btn"
        id="loadLiveDay"
      >
        Load selected day from Scrin
      </button>

    </div>


    <div class="banner">

      <div>

        <div class="big">
          Daily screenshot evidence
        </div>

        <div class="muted">
          Employer can inspect screenshots for any available day.
        </div>

      </div>

      <span class="status blue">
        <span class="dot"></span>
        Evidence view
      </span>

    </div>


    <div id="shotArea">

      <div class="shot-grid">

        ${
          (e.shots || [])
            .map(
              s => shot(
                s[0],
                s[1],
                s[2],
                s[3]
              )
            )
            .join('')
          ||
          '<div class="empty">No screenshot metadata loaded.</div>'
        }

      </div>

    </div>
  `;
}


function shot(time, app, level, imageUrl){

  const safeUrl = imageUrl
    ? escapeHtml(imageUrl)
    : '';

  const image = safeUrl

    ? `
      <a
        href="${safeUrl}"
        target="_blank"
        rel="noopener noreferrer"
      >

        <img
          src="${safeUrl}"
          alt="Scrin screenshot at ${escapeHtml(time)}"
          loading="lazy"
          referrerpolicy="no-referrer"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
            display:block;
          "
          onerror="
            this.style.display='none';
            this.parentElement.innerHTML=
            '<div class=&quot;empty&quot; style=&quot;padding:24px&quot;>
              Screenshot image could not be loaded.
              Open the evidence link or use the WGM proxy
              if Scrin blocks direct image loading.
            </div>';
          "
        >

      </a>
      `

    : `
      <div class="mock-window">

        <div class="mock-side"></div>

        <div class="mock-main">

          <div class="mock-line"></div>

          <div class="mock-line short"></div>

          <div class="mock-line"></div>

          <div class="mock-line"></div>

          <div class="mock-line short"></div>

        </div>

      </div>
      `;


  return `
    <div class="shot">

      <div class="shot-img">
        ${image}
      </div>

      <div class="shot-meta">

        <strong>
          ${escapeHtml(time)}
        </strong>

        ${escapeHtml(app)}

        <br>

        <span class="small">
          Activity level ${level ?? '—'}%
          · Scrin evidence
        </span>

      </div>

    </div>
  `;
}


/* ==========================================================
   CONTEXT
   ========================================================== */

function contextView(e){

  return `
    <div class="grid two-col">

      <div>

        <div class="panel-title">
          Permanent work profile
        </div>

        <div class="field">

          <label>
            WGM employer
          </label>

          <input
            id="contextEmployer"
            value="${escapeHtml(e.employer || '')}"
          >

        </div>

        <div class="field">

          <label>
            Expected hours for selected month
          </label>

          <input
            id="contextExpected"
            type="number"
            min="0"
            step="0.5"
            value="${Number(e.expectedHours || 0)}"
          >

        </div>

        <div class="field">

          <label>
            Timezone
          </label>

          <input
            id="contextTimezone"
            value="${escapeHtml(e.timezone || '')}"
          >

        </div>

        <div class="field">

          <label>
            General schedule
          </label>

          <input
            id="contextSchedule"
            value="${escapeHtml(e.schedule || '')}"
          >

        </div>

      </div>


      <div>

        <div class="panel-title">
          Monthly context
        </div>

        <div class="field">

          <label>
            Context / approved adjustments
          </label>

          <textarea id="contextText">${
            escapeHtml(e.context || '')
          }</textarea>

        </div>

        <button
          class="btn primary"
          id="saveContext"
        >
          Save employee baseline
        </button>

      </div>

    </div>
  `;
}


/* ==========================================================
   REPORT CENTER
   ========================================================== */

function reports(){

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Report Center
        </h2>

        <p>
          Select any synced VA—or all three—to generate
          employer-specific reports.
        </p>

      </div>

      <button
        class="btn"
        data-page="employees"
      >
        View employees
      </button>

    </div>


    <div class="card panel">

      <div class="panel-title">
        Create report run
      </div>

      <div class="panel-sub">
        WGM calculates objective metrics first.
        AI drafts interpretation.
        Human review is required before release.
      </div>


      <div class="toolbar">

        <div class="field">

          <label>
            From
          </label>

          <input
            id="fromDate"
            type="date"
            value="${state.reportPeriod.from}"
          >

        </div>


        <div class="field">

          <label>
            To
          </label>

          <input
            id="toDate"
            type="date"
            value="${state.reportPeriod.to}"
          >

        </div>


        <div class="field">

          <label>
            Employee
          </label>

          <select id="reportEmployee">

            ${
              state.employees.map(
                x => `
                <option
                  value="${escapeHtml(x.id)}"
                  ${
                    x.id === state.selectedEmployeeId
                      ? 'selected'
                      : ''
                  }
                >

                  ${escapeHtml(x.name)}
                  —
                  ${escapeHtml(x.employer || 'Unassigned')}

                </option>
                `
              ).join('')
            }

            <option value="__ALL__">
              All synced employees (${state.employees.length})
            </option>

          </select>

        </div>


        <div class="spacer"></div>


        <button
          id="generateBtn"
          class="btn gold"
        >
          Generate report
        </button>

      </div>

    </div>


    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Current three-VA test set
      </div>

      <div class="panel-sub">
        Use this before scaling to the full WGH VA pool.
      </div>


      <table>

        <thead>
          <tr>
            <th>Employee</th>
            <th>Employer</th>
            <th>Data</th>
            <th>Context</th>
            <th>Human review</th>
            <th>Release</th>
          </tr>
        </thead>

        <tbody>

          ${
            state.employees.map(
              x => `
              <tr>

                <td>
                  ${escapeHtml(x.name)}
                </td>

                <td>
                  ${escapeHtml(x.employer || 'Unassigned')}
                </td>

                <td>

                  <span class="status green">
                    <span class="dot"></span>
                    ${
                      state.mode === 'LIVE'
                        ? 'Scrin'
                        : 'Demo'
                    }
                    ready
                  </span>

                </td>

                <td>

                  <span class="status ${
                    /review/i.test(x.reportingStatus)
                      ? 'amber'
                      : 'green'
                  }">

                    <span class="dot"></span>

                    ${
                      escapeHtml(
                        x.context
                          ? 'Present'
                          : 'Missing'
                      )
                    }

                  </span>

                </td>

                <td>

                  ${
                    state.reportEmployeeId === x.id

                      ? `
                        <span class="status ${
                          statusClass(state.reportStatus)
                        }">

                          <span class="dot"></span>

                          ${escapeHtml(state.reportStatus)}

                        </span>
                        `

                      : '—'
                  }

                </td>

                <td>

                  ${
                    state.reportEmployeeId === x.id &&
                    state.reportStatus === 'Released'

                      ? `
                        <span class="status green">
                          <span class="dot"></span>
                          Released
                        </span>
                        `

                      : '—'
                  }

                </td>

              </tr>
              `
            ).join('')
          }

        </tbody>

      </table>

    </div>
    `,
    'Reports'
  );
}


/* ==========================================================
   HUMAN REVIEW
   ========================================================== */

function review(){

  const e =
    employeeById(state.reportEmployeeId)
    ||
    employee();

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Human Review Queue
        </h2>

        <p>
          Validate the report against the VA's actual schedule,
          context and Scrin evidence.
        </p>

      </div>

    </div>

    ${
      state.reportStatus === 'Not generated'

        ? `
          <div class="card empty">
            Generate a report from the Reports screen first.
          </div>
          `

        : reviewConsole(e)
    }
    `,
    'Review Queue'
  );
}


function reviewConsole(e){

  const r =
    state.report
    ||
    defaultReport;

  const cov = coverage(e);

  return `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">
          ${
            escapeHtml(
              e.initials || initials(e.name)
            )
          }
        </div>

        <div>

          <h2 style="margin:0">
            ${escapeHtml(e.name)}
            —
            ${periodLabel()}
          </h2>

          <div class="small">
            ${escapeHtml(e.employer || 'Unassigned')}
          </div>

        </div>

        <div class="spacer"></div>

        <span class="status ${statusClass(state.reportStatus)}">
          <span class="dot"></span>
          ${escapeHtml(state.reportStatus)}
        </span>

      </div>


      <div class="review-summary">

        <div class="review-stat">
          <div class="k">Tracked</div>
          <div class="v">${hoursLabel(e.trackedHours)}</div>
        </div>

        <div class="review-stat">
          <div class="k">Expected</div>
          <div class="v">${e.expectedHours || '—'}h</div>
        </div>

        <div class="review-stat">
          <div class="k">Coverage</div>
          <div class="v">${cov ?? '—'}%</div>
        </div>

        <div class="review-stat">
          <div class="k">Active days</div>
          <div class="v">${e.activeDays || '—'}</div>
        </div>

        <div class="review-stat">
          <div class="k">Review flags</div>
          <div class="v">${e.concerns || 0}</div>
        </div>

      </div>


      <div class="grid two-col">

        <div>

          <div class="panel-title">
            AI draft
          </div>

          <div class="review-text">

            <b>
              ${escapeHtml(r.headline)}
            </b>

            <br><br>

            ${escapeHtml(r.summary)}

            <br><br>

            <b>
              Integrity:
            </b>

            ${escapeHtml(r.integrity)}

            <br><br>

            <b>
              Coaching:
            </b>

            ${escapeHtml(r.coaching)}

          </div>

        </div>


        <div>

          <div class="panel-title">
            Reviewer checklist
          </div>

          <div class="checklist">

            ${
              [
                'Hours and schedule reconcile',
                'Approved context correctly applied',
                'Workstream narrative is supported',
                'No unsupported performance conclusion',
                'Client-facing language is appropriate'
              ]
              .map(
                (c,i) => `
                <label class="check">

                  <input
                    type="checkbox"
                    data-check="${i}"
                    ${
                      state.reviewerChecks[i]
                        ? 'checked'
                        : ''
                    }
                  >

                  ${c}

                </label>
                `
              )
              .join('')
            }

          </div>


          <div class="actions">

            <button class="btn">
              Edit report
            </button>

            <button class="btn">
              Request context
            </button>

            <button
              id="approveBtn"
              class="btn gold"
            >
              Approve
            </button>

          </div>

        </div>

      </div>


      ${
        /Approved|Released/.test(state.reportStatus)

          ? `
            <div class="callout">

              <strong>
                Approved for release
              </strong>

              Clicking release will lock this WGM report
              and create the future CRM delivery event for
              ${escapeHtml(e.employer || 'the employer')}.

            </div>

            <div class="actions">

              <button
                class="btn"
                id="previewReport"
              >
                Preview final report
              </button>

              <button
                class="btn primary"
                id="releaseBtn"
              >

                ${
                  state.reportStatus === 'Released'
                    ? 'Released · Delivery queued'
                    : 'Approve & Release'
                }

              </button>

            </div>
            `

          : ''
      }

    </div>
  `;
}


function periodLabel(){

  const f =
    new Date(
      state.reportPeriod.from + 'T00:00:00Z'
    );

  return f.toLocaleString(
    'en-US',
    {
      month:'long',
      year:'numeric',
      timeZone:'UTC'
    }
  );
}


/* ==========================================================
   SUBSCRIPTIONS
   ========================================================== */

function subscriptions(){

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Subscriptions
        </h2>

        <p>
          Billing lifecycle is modeled now;
          payment processing remains outside this prototype.
        </p>

      </div>

    </div>


    <div class="card panel">

      <table>

        <thead>
          <tr>
            <th>Company</th>
            <th>Source</th>
            <th>Plan</th>
            <th>Payment state</th>
          </tr>
        </thead>

        <tbody>

          ${
            [
              ...new Set(
                state.employees.map(e => e.employer)
              )
            ]
            .map(
              (c,i) => `
              <tr>

                <td>
                  ${escapeHtml(c)}
                </td>

                <td>
                  WGH Managed
                </td>

                <td>
                  ${
                    i === 0
                      ? 'Included'
                      : 'Prototype'
                  }
                </td>

                <td>

                  <span class="status ${
                    i === 0
                      ? 'green'
                      : 'blue'
                  }">

                    <span class="dot"></span>

                    ${
                      i === 0
                        ? 'Active'
                        : 'Not connected'
                    }

                  </span>

                </td>

              </tr>
              `
            )
            .join('')
          }

        </tbody>

      </table>

    </div>
    `,
    'Subscriptions'
  );
}


/* ==========================================================
   SETTINGS
   ========================================================== */

function settings(){

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Settings & Integrations
        </h2>

        <p>
          Connect the shared Scrin account,
          then map each synced employment
          to its actual WGM employer.
        </p>

      </div>

    </div>


    <div class="grid two-col">


      <div class="card panel">

        <div class="panel-title">
          Scrin API v2
        </div>

        <div class="panel-sub">
          One server-side connection
          for the three-VA test account.
        </div>

        <p class="small">

          Token stays in the Cloudflare Worker secret

          <b>
            SCRIN_TOKEN
          </b>.

          It never goes into browser code or GitHub.

        </p>


        <div class="actions">

          <button
            class="btn primary"
            id="syncScrin"
          >
            Sync employees from Scrin
          </button>

          <button
            class="btn"
            id="testScrin"
          >
            Test connection
          </button>

        </div>


        <div
          id="scrinResult"
          class="small"
          style="margin-top:10px"
        >
          ${escapeHtml(state.syncMessage)}
        </div>

      </div>


      <div class="card panel">

        <div class="panel-title">
          OpenAI reporting engine
        </div>

        <div class="panel-sub">
          Structured narrative from verified
          WGM calculations and context.
        </div>

        <p class="small">

          Set

          <b>
            OPENAI_API_KEY
          </b>

          and

          <b>
            OPENAI_MODEL
          </b>

          as server-side configuration
          when you are ready for live AI generation.

        </p>

        <span class="status blue">
          <span class="dot"></span>
          Scaffold ready
        </span>

      </div>

    </div>


    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Scrin → WGM employer mapping
      </div>

      <div class="panel-sub">
        This is the important layer for your current account
        because the VAs work for different employers.
      </div>


      <table>

        <thead>
          <tr>
            <th>Scrin person</th>
            <th>Employment ID</th>
            <th>Scrin account/company</th>
            <th>WGM employer</th>
            <th>Expected monthly hours</th>
          </tr>
        </thead>

        <tbody>

          ${
            state.employees.map(
              e => `
              <tr>

                <td>
                  ${escapeHtml(e.name)}
                </td>

                <td>
                  ${escapeHtml(e.employmentId || '—')}
                </td>

                <td>
                  ${escapeHtml(e.scrinCompany || '—')}
                </td>

                <td>

                  <input
                    class="map-input"
                    data-map-employer="${escapeHtml(e.id)}"
                    value="${escapeHtml(e.employer || '')}"
                  >

                </td>

                <td>

                  <input
                    class="map-input small-input"
                    data-map-hours="${escapeHtml(e.id)}"
                    type="number"
                    min="0"
                    step="0.5"
                    value="${Number(e.expectedHours || 0)}"
                  >

                </td>

              </tr>
              `
            ).join('')
          }

        </tbody>

      </table>


      <div
        class="actions"
        style="margin-top:16px"
      >

        <button
          class="btn gold"
          id="saveMappings"
        >
          Save WGM mappings
        </button>

      </div>

    </div>


    <div
      class="grid two-col"
      style="margin-top:16px"
    >


      <div class="card panel">

        <div class="panel-title">
          GHL delivery
        </div>

        <div class="panel-sub">
          Not integrated yet.
        </div>

        <p class="small">

          Future trigger:

          WGM report changes

          <b>
            Approved → Released
          </b>.

          Payload will include employer,
          contact, reporting period
          and secure report link.

        </p>

        <span class="status amber">
          <span class="dot"></span>
          Future integration point
        </span>

      </div>


      <div class="card panel">

        <div class="panel-title">
          Payment gateway
        </div>

        <div class="panel-sub">
          Not integrated yet.
        </div>

        <p class="small">

          Trial, active, past-due
          and cancelled states are retained
          in the product architecture.

        </p>

        <span class="status amber">
          <span class="dot"></span>
          Future integration point
        </span>

      </div>

    </div>
    `,
    'Settings'
  );
}


/* ==========================================================
   REPORT PREVIEW
   ========================================================== */

function reportPreview(){

  const e =
    employeeById(state.reportEmployeeId)
    ||
    employee();

  const r =
    state.report
    ||
    defaultReport;

  return shell(
    `
    <div class="header-row no-print">

      <div>

        <h2>
          Final WGM Report
        </h2>

        <p>
          Prototype renderer for ${escapeHtml(e.name)}.
        </p>

      </div>


      <div class="actions">

        <button
          class="btn"
          data-page="review"
        >
          Back to review
        </button>

        <button
          class="btn primary"
          id="printReport"
        >
          Print / Save PDF
        </button>

      </div>

    </div>


    <article class="report-paper print-target">

      <div class="report-top">

        <div>

          <div class="report-brand">
            WHITE GLOVE MONITOR
          </div>

          <div class="small">
            WORKFORCE INTELLIGENCE + HUMAN REVIEW
          </div>

        </div>

        <div class="status green">

          <span class="dot"></span>

          Human reviewed |

          ${
            state.reportStatus === 'Released'
              ? 'Released'
              : 'Approved'
          }

        </div>

      </div>


      <div class="report-kicker">
        Monthly Workforce Accountability Report
      </div>


      <div class="report-title">
        ${escapeHtml(e.name)}
        ·
        ${periodLabel()}
      </div>


      <div class="small">
        Prepared for ${escapeHtml(e.employer || 'Employer')}
      </div>


      <div class="report-grid">

        <div class="report-metric">
          <b>${hoursLabel(e.trackedHours)}</b>
          <span class="small">Tracked time</span>
        </div>

        <div class="report-metric">
          <b>${coverage(e) ?? '—'}%</b>
          <span class="small">Schedule coverage</span>
        </div>

        <div class="report-metric">
          <b>${e.activeDays || '—'}</b>
          <span class="small">Active workdays</span>
        </div>

        <div class="report-metric">
          <b>${e.concerns || 0}</b>
          <span class="small">Review flags</span>
        </div>

      </div>


      <h3 class="section-title">
        Executive overview
      </h3>

      <p>
        <b>${escapeHtml(r.headline)}</b>
        ${escapeHtml(r.summary)}
      </p>


      <h3 class="section-title">
        What matters this month
      </h3>


      <div class="report-list">

        ${
          (r.strengths || [])
            .map(
              x => `
              <div class="report-item">
                ${escapeHtml(x)}
              </div>
              `
            )
            .join('')
        }

      </div>


      <h3 class="section-title">
        Weekly coverage & observed work
      </h3>


      <table>

        <thead>
          <tr>
            <th>Week</th>
            <th>Accountable time</th>
            <th>Observed work</th>
          </tr>
        </thead>

        <tbody>

          ${
            (e.weeks || [])
              .map(
                w => `
                <tr>
                  <td>${escapeHtml(w[0])}</td>
                  <td>${escapeHtml(w[1])}</td>
                  <td>${escapeHtml(w[2])}</td>
                </tr>
                `
              )
              .join('')
          }

        </tbody>

      </table>


      <h3 class="section-title">
        Work categories
      </h3>

      ${
        (e.workstreams || [])
          .map(
            x => mixBar(
              x[0],
              x[1]
            )
          )
          .join('')
      }


      <h3 class="section-title">
        Human review & next focus
      </h3>


      <p>
        <b>Client context:</b>
        ${escapeHtml(r.clientContext)}
      </p>


      <p>
        <b>Coaching:</b>
        ${escapeHtml(r.coaching)}
      </p>


      <p>
        <b>Next-month focus:</b>
        ${escapeHtml(r.nextFocus)}
      </p>


      <div class="callout">

        <strong>
          WGM review principle
        </strong>

        Time tracking and screenshots are evidence inputs,
        not standalone performance verdicts.
        Material conclusions remain human-reviewed
        before release.

      </div>


      <div class="report-footer">

        <span>
          WHITE GLOVE MONITOR · CONFIDENTIAL
        </span>

        <span>
          Prototype V1.1
        </span>

      </div>

    </article>
    `,
    'Report Preview'
  );
}


/* ==========================================================
   SCRIN SYNC
   ========================================================== */

async function syncScrin(){

  state.syncMessage = 'Syncing Scrin…';

  render();

  try{

    const r =
      await fetch(
        '/api/scrin/common',
        {
          method:'POST'
        }
      );

    const j =
      await r.json();

    if(!r.ok){
      throw new Error(
        j.error
        ||
        'Scrin connection failed'
      );
    }


    if(
      Array.isArray(j.employees)
      &&
      j.employees.length
    ){

      const prior =
        Object.fromEntries(
          state.employees.map(
            e => [
              String(e.employmentId),
              e
            ]
          )
        );


      state.employees =
        j.employees.map(
          x => {

            const old =
              prior[
                String(x.employmentId)
              ]
              ||
              {};

            return {
              ...old,
              ...x,

              id:
                x.id
                ||
                `scrin-${x.employmentId}`,

              initials:
                initials(x.name),

              employer:
                old.employer
                ||
                '',

              expectedHours:
                old.expectedHours
                ||
                160,

              schedule:
                old.schedule
                ||
                'Monday–Friday · 8 hours/day · 40 hours/week',

              timezone:
                old.timezone
                ||
                'Set in WGM',

              timezoneOffsetMinutes:
                old.timezoneOffsetMinutes
                ||
                0,

              context:
                old.context
                ||
                '',

              trackedHours:
                old.trackedHours
                ||
                0,

              activeDays:
                old.activeDays
                ||
                0,

              concerns:
                old.concerns
                ||
                0,

              workstreams:
                old.workstreams
                ||
                [],

              apps:
                old.apps
                ||
                [],

              weeks:
                old.weeks
                ||
                [],

              shots:
                old.shots
                ||
                [],

              reportingStatus:
                old.reportingStatus
                ||
                'Synced'
            };
          }
        );


      state.selectedEmployeeId =
        state.employees[0].id;


      saveEmployees();


      state.mode =
        j.demo
          ? 'DEMO'
          : 'LIVE';


      state.syncMessage =
        `Connected. ${state.employees.length} employment record(s) loaded from Scrin.`;

    } else {

      state.syncMessage =
        'Connected, but no employment records were returned.';
    }

  }catch(e){

    state.syncMessage =
      `Connection not live yet: ${e.message}. Add the rotated SCRIN_TOKEN in Cloudflare and set DEMO_MODE=false.`;
  }

  render();
}


async function testScrin(){

  const el =
    document.getElementById('scrinResult');

  if(el){
    el.textContent = 'Testing…';
  }

  try{

    const r =
      await fetch('/api/health');

    await r.json();


    const c =
      await fetch(
        '/api/scrin/common',
        {
          method:'POST'
        }
      );

    const j =
      await c.json();


    if(!c.ok){
      throw new Error(
        j.error
        ||
        'Not configured'
      );
    }


    state.mode =
      j.demo
        ? 'DEMO'
        : 'LIVE';


    state.syncMessage =
      `${state.mode} connection responding. ${j.employees?.length || 0} employment record(s) available.`;


    render();

  }catch(e){

    if(el){
      el.textContent =
        `Not connected: ${e.message}`;
    }
  }
}


/* ==========================================================
   REPORT GENERATION
   ========================================================== */

async function generateReport(){

  const select =
    document.getElementById('reportEmployee');


  const id =
    select?.value
    ||
    state.selectedEmployeeId;


  state.reportPeriod = {

    from:
      document.getElementById('fromDate')?.value
      ||
      state.reportPeriod.from,

    to:
      document.getElementById('toDate')?.value
      ||
      state.reportPeriod.to
  };


  if(id === '__ALL__'){

    toast(
      'Batch generation is modeled, but live three-VA execution will be enabled after the first individual Scrin reconciliation passes.'
    );

    return;
  }


  state.selectedEmployeeId = id;


  const e =
    employee();


  state.reportEmployeeId =
    e.id;


  state.reportStatus =
    'Generating';


  render();


  try{

    let verified = {
      employee:e,
      period:state.reportPeriod
    };


    if(
      state.mode === 'LIVE'
      &&
      e.employmentId
    ){

      const periodRes =
        await fetch(
          '/api/wgm/period-data',
          {
            method:'POST',

            headers:{
              'Content-Type':'application/json'
            },

            body:JSON.stringify({
              employmentId:e.employmentId,
              from:state.reportPeriod.from,
              to:state.reportPeriod.to,
              timezoneOffsetMinutes:e.timezoneOffsetMinutes || 0,
              expectedHours:Number(e.expectedHours || 0),
              includeScreenshots:true
            })
          }
        );


      const p =
        await periodRes.json();


      if(!periodRes.ok){

        throw new Error(
          p.error
          ||
          'Could not load period data'
        );
      }


      e.trackedHours =
        p.metrics.trackedHours;


      e.activeDays =
        p.metrics.activeDays;


      e.workstreams =
        p.workstreams
        ||
        e.workstreams;


      e.apps =
        p.apps
        ||
        e.apps;


      e.shots =
        p.screenshotPreview
        ||
        e.shots;


      saveEmployees();


      verified = {
        ...verified,
        verifiedMetrics:p.metrics,
        workstreams:p.workstreams,
        apps:p.apps,
        context:e.context,
        screenshotEvidence:p.screenshotEvidenceSummary
      };
    }


    const res =
      await fetch(
        '/api/reports/generate',
        {
          method:'POST',

          headers:{
            'Content-Type':'application/json'
          },

          body:JSON.stringify({
            ...verified,

            benchmark:
              e.id === 'demo-maria'
                ? defaultReport
                : null
          })
        }
      );


    const data =
      await res.json();


    if(!res.ok){

      throw new Error(
        data.error
        ||
        'AI generation unavailable'
      );
    }


    state.report =
      data.report
      ||
      defaultReport;

  }catch(err){

    state.report =
      defaultReport;


    toast(
      `Using prototype narrative: ${err.message}`
    );
  }


  state.reportStatus =
    'Draft ready';


  state.page =
    'review';


  render();
}


/* ==========================================================
   LOAD LIVE SCRIN DAY
   ========================================================== */

async function loadLiveDay(){

  const e =
    employee();


  const d =
    document.getElementById('screenDate')?.value;


  if(state.mode !== 'LIVE'){

    toast(
      'Demo mode: connect the rotated Scrin token to load real daily screenshots.'
    );

    return;
  }


  const area =
    document.getElementById('shotArea');


  if(area){

    area.innerHTML =
      '<div class="empty">Loading Scrin evidence…</div>';
  }


  try{

    const r =
      await fetch(
        '/api/wgm/period-data',
        {
          method:'POST',

          headers:{
            'Content-Type':'application/json'
          },

          body:JSON.stringify({
            employmentId:e.employmentId,
            from:d,
            to:d,
            timezoneOffsetMinutes:e.timezoneOffsetMinutes || 0,
            expectedHours:8,
            includeScreenshots:true
          })
        }
      );


    const p =
      await r.json();


    if(!r.ok){

      throw new Error(
        p.error
        ||
        'Failed'
      );
    }


    e.shots =
      p.screenshotPreview
      ||
      [];


    saveEmployees();


    render();

  }catch(err){

    toast(
      `Could not load screenshots: ${err.message}`
    );
  }
}


/* ==========================================================
   SAVE MAPPINGS / CONTEXT
   ========================================================== */

function saveMappings(){

  document
    .querySelectorAll('[data-map-employer]')
    .forEach(
      el => {

        const e =
          employeeById(
            el.dataset.mapEmployer
          );

        if(e){
          e.employer =
            el.value.trim();
        }
      }
    );


  document
    .querySelectorAll('[data-map-hours]')
    .forEach(
      el => {

        const e =
          employeeById(
            el.dataset.mapHours
          );

        if(e){
          e.expectedHours =
            Number(
              el.value || 0
            );
        }
      }
    );


  saveEmployees();


  toast(
    'WGM employer mappings saved in this prototype browser.'
  );
}


function saveContext(){

  const e =
    employee();


  e.employer =
    document
      .getElementById('contextEmployer')
      ?.value
      .trim()
    ||
    e.employer;


  e.expectedHours =
    Number(
      document
        .getElementById('contextExpected')
        ?.value
      ||
      e.expectedHours
      ||
      0
    );


  e.timezone =
    document
      .getElementById('contextTimezone')
      ?.value
      .trim()
    ||
    e.timezone;


  e.schedule =
    document
      .getElementById('contextSchedule')
      ?.value
      .trim()
    ||
    e.schedule;


  e.context =
    document
      .getElementById('contextText')
      ?.value
      .trim()
    ||
    '';


  saveEmployees();


  toast(
    'Employee baseline and context saved.'
  );
}


/* ==========================================================
   RENDER / EVENTS
   ========================================================== */

function render(){

  let out = '';


  if(state.page === 'dashboard'){
    out = dashboard();
  }

  else if(state.page === 'companies'){
    out = companies();
  }

  else if(state.page === 'employees'){
    out = employees();
  }

  else if(state.page === 'monitoring'){
    out = monitoring();
  }

  else if(state.page === 'reports'){
    out = reports();
  }

  else if(state.page === 'review'){
    out = review();
  }

  else if(state.page === 'subscriptions'){
    out = subscriptions();
  }

  else if(state.page === 'settings'){
    out = settings();
  }

  else if(state.page === 'reportPreview'){
    out = reportPreview();
  }


  document
    .getElementById('app')
    .innerHTML =
      out;


  bind();
}


function bind(){

  document
    .querySelectorAll('[data-page]')
    .forEach(
      x => {

        x.onclick = () => {
          state.page =
            x.dataset.page;

          render();
        };

      }
    );


  document
    .querySelectorAll('[data-open-id]')
    .forEach(
      x => {

        x.onclick = () => {

          state.selectedEmployeeId =
            x.dataset.openId;

          state.page =
            'monitoring';

          state.employeeTab =
            'overview';

          render();
        };

      }
    );


  document
    .querySelectorAll('[data-tab]')
    .forEach(
      x => {

        x.onclick = () => {

          state.employeeTab =
            x.dataset.tab;

          render();
        };

      }
    );


  const se =
    document.getElementById('reportEmployee');


  if(se){

    se.onchange = () => {

      if(se.value !== '__ALL__'){
        state.selectedEmployeeId =
          se.value;
      }

    };
  }


  const g =
    document.getElementById('generateBtn');

  if(g){
    g.onclick =
      generateReport;
  }


  const s =
    document.getElementById('syncScrin');

  if(s){
    s.onclick =
      syncScrin;
  }


  const t =
    document.getElementById('testScrin');

  if(t){
    t.onclick =
      testScrin;
  }


  const m =
    document.getElementById('saveMappings');

  if(m){
    m.onclick =
      saveMappings;
  }


  const c =
    document.getElementById('saveContext');

  if(c){
    c.onclick =
      saveContext;
  }


  const l =
    document.getElementById('loadLiveDay');

  if(l){
    l.onclick =
      loadLiveDay;
  }


  const a =
    document.getElementById('approveBtn');


  if(a){

    a.onclick = () => {

      if(
        !state.reviewerChecks.every(Boolean)
      ){

        toast(
          'Complete all reviewer checks before approval.'
        );

        return;
      }


      state.reportStatus =
        'Approved';


      render();


      toast(
        'Report approved by WGM reviewer.'
      );
    };
  }


  document
    .querySelectorAll('[data-check]')
    .forEach(
      x => {

        x.onchange = () => {

          state.reviewerChecks[
            +x.dataset.check
          ] =
            x.checked;
        };

      }
    );


  const p =
    document.getElementById('previewReport');


  if(p){

    p.onclick = () => {

      state.page =
        'reportPreview';

      render();
    };
  }


  const rel =
    document.getElementById('releaseBtn');


  if(rel){

    rel.onclick = () => {

      if(
        state.reportStatus !== 'Released'
      ){

        const e =
          employeeById(
            state.reportEmployeeId
          )
          ||
          employee();


        state.reportStatus =
          'Released';


        state.deliveryQueue.push({
          employeeId:e.id,
          employer:e.employer,
          period:{
            ...state.reportPeriod
          },
          status:'queued'
        });


        render();


        toast(
          'Released. Future GHL delivery event queued.'
        );
      }

    };
  }


  const pr =
    document.getElementById('printReport');


  if(pr){
    pr.onclick =
      () => window.print();
  }
}


/* ==========================================================
   STARTUP
   ========================================================== */

async function initializeApp(){

  try{

    const response =
      await fetch('/api/health');


    const health =
      await response.json();


    state.mode =
      health.mode === 'live'
        ? 'LIVE'
        : 'DEMO';


    if(state.mode === 'LIVE'){

      state.syncMessage =
        'Live Scrin connection configured.';
    }

  }catch(error){

    console.error(
      'Could not determine WGM connection mode:',
      error
    );
  }


  render();
}


initializeApp();
