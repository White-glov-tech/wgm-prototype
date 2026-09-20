const state = {
  page: 'dashboard',
  employeeTab: 'overview',
  mode: 'DEMO',
  employees: [],
  connections: [],
  selectedEmployeeId: 'demo-maria',
  reportStatus: 'Not generated',
  report: null,
  reportEmployeeId: null,
  reviewerChecks: [true,true,true,true,true],
  reportPeriod: { from: '2026-08-01', to: '2026-08-31' },
  deliveryQueue: [],
  toast: null,
  syncMessage: 'Demo data loaded. Connect Scrin to replace this with live employees.',
  role: localStorage.getItem('wgmRole') || 'owner',
  portalEmployer: localStorage.getItem('wgmPortalEmployer') || '',
  showAddConnection: false,
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
    id:'demo-main::477279',
    connectionId:'demo-main',
    connectionName:'Demo Scrin Connection',
    connectionType:'shared',
    employerLocked:false,
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
    excluded:false,
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
      ['8:56 AM','Canva',73]
    ],
    reportingStatus:'Ready'
  },
  {
    id:'demo-main::500002',
    connectionId:'demo-main',
    connectionName:'Demo Scrin Connection',
    connectionType:'shared',
    employerLocked:false,
    employmentId:'500002',
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
    excluded:false,
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
      ['9:31 AM','CRM',81]
    ],
    reportingStatus:'Context applied'
  }
];

state.employees = loadLocalEmployees();
state.connections = loadLocalConnections();

function loadLocalEmployees(){
  try {
    const v = JSON.parse(
      localStorage.getItem('wgmEmployees') || 'null'
    );

    return Array.isArray(v) && v.length
      ? v
      : demoEmployees;

  } catch {
    return demoEmployees;
  }
}

function loadLocalConnections(){
  try {
    const v = JSON.parse(
      localStorage.getItem('wgmConnections') || 'null'
    );

    return Array.isArray(v)
      ? v
      : [];

  } catch {
    return [];
  }
}

function saveEmployees(){
  try {
    localStorage.setItem(
      'wgmEmployees',
      JSON.stringify(state.employees)
    );
  } catch {}
}

function saveConnections(){
  try {
    localStorage.setItem(
      'wgmConnections',
      JSON.stringify(state.connections)
    );
  } catch {}
}

function initials(name=''){
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(x=>x[0])
    .join('')
    .toUpperCase()
    ||
    'VA';
}

function hoursLabel(decimal=0){

  const total = Math.max(
    0,
    Math.round(
      Number(decimal || 0) * 60
    )
  );

  return `${Math.floor(total/60)}h ${String(total%60).padStart(2,'0')}m`;
}

function coverage(e){

  return e.expectedHours

    ? Math.min(
        100,
        Math.round(
          (
            Number(e.trackedHours||0)
            /
            Number(e.expectedHours)
          )
          *
          1000
        )
        /
        10
      )

    : null;
}

function statusClass(s=''){

  if(
    /Released|Approved|Healthy|Complete|Ready|Connected|Paid|Active/i.test(s)
  ){
    return 'green';
  }

  if(
    /Context|Pending|Review|Trial|Queued|Planned|Configured/i.test(s)
  ){
    return 'amber';
  }

  if(
    /Past|Failed|Concern|Hold|Error|Suspended/i.test(s)
  ){
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

  setTimeout(
    ()=>{
      state.toast = null;
      render();
    },
    2300
  );
}

function metric(label,value,sub){

  return `
    <div class="card metric">

      <div class="label">
        ${label}
      </div>

      <div class="value">
        ${value}
      </div>

      <div class="delta">
        ${sub}
      </div>

    </div>
  `;
}

function mixBar(label,v,total=100){

  const pct = total
    ? Math.max(
        0,
        Math.min(
          100,
          (v/total)*100
        )
      )
    : 0;

  return `
    <div class="work-row">

      <b>
        ${escapeHtml(label)}
      </b>

      <div class="progress">
        <span style="width:${pct}%"></span>
      </div>

      <span>
        ${Math.round(v)}
        ${total===100?'%':''}
      </span>

    </div>
  `;
}

function navButton(id,label,badge=''){

  return `
    <button
      data-page="${id}"
      class="${state.page===id?'active':''}"
    >

      <span>
        ${label}
      </span>

      ${
        badge
          ? `<span class="badge">${badge}</span>`
          : ''
      }

    </button>
  `;
}

function activeEmployees(){

  return state.employees.filter(
    e => !e.excluded
  );
}

function mappedEmployers(){

  return [
    ...new Set(
      activeEmployees()
        .map(e=>e.employer)
        .filter(Boolean)
    )
  ];
}

function employeeById(id){

  return state.employees.find(
    e =>
      String(e.id)
      ===
      String(id)
  );
}

function ensureEmployerSelection(){

  const employers =
    mappedEmployers();

  if(
    !state.portalEmployer
    ||
    !employers.includes(
      state.portalEmployer
    )
  ){

    state.portalEmployer =
      employers[0]
      ||
      '';

    localStorage.setItem(
      'wgmPortalEmployer',
      state.portalEmployer
    );
  }

  const team =
    activeEmployees().filter(
      e =>
        e.employer
        ===
        state.portalEmployer
    );

  if(
    team.length
    &&
    !team.some(
      e =>
        String(e.id)
        ===
        String(state.selectedEmployeeId)
    )
  ){

    state.selectedEmployeeId =
      team[0].id;
  }
}

function portalEmployees(){

  ensureEmployerSelection();

  return activeEmployees().filter(
    e =>
      e.employer
      ===
      state.portalEmployer
  );
}

function employee(){

  if(
    state.role
    ===
    'employer'
  ){

    const team =
      portalEmployees();

    return (
      team.find(
        e =>
          String(e.id)
          ===
          String(state.selectedEmployeeId)
      )
      ||
      team[0]
      ||
      null
    );
  }

  if(
    state.role
    ===
    'employee'
  ){

    const e =
      employeeById(
        state.selectedEmployeeId
      );

    return (
      e
      &&
      !e.excluded
    )
      ? e
      : activeEmployees()[0]
        ||
        null;
  }

  return (
    employeeById(
      state.selectedEmployeeId
    )
    ||
    activeEmployees()[0]
    ||
    state.employees[0]
    ||
    null
  );
}

function visibleEmployees(){

  if(
    state.role
    ===
    'employer'
  ){
    return portalEmployees();
  }

  if(
    state.role
    ===
    'employee'
  ){

    const e =
      employee();

    return e
      ? [e]
      : [];
  }

  return activeEmployees();
}

function roleLabel(){

  return {
    owner:'WGM Owner',
    reviewer:'White Glove Reviewer',
    employer:'Employer Portal',
    employee:'Employee Portal'
  }[state.role]
  ||
  'WGM Owner';
}

function roleSubLabel(){

  return {
    owner:'Super Admin',
    reviewer:'Assigned Accounts',
    employer:'Company Owner / Admin',
    employee:'My Work'
  }[state.role]
  ||
  'Super Admin';
}

function setRole(role){

  state.role =
    role;

  localStorage.setItem(
    'wgmRole',
    role
  );

  state.page =
    'dashboard';

  if(
    role
    ===
    'employer'
  ){
    ensureEmployerSelection();
  }

  if(
    role
    ===
    'employee'
    &&
    (
      !employeeById(
        state.selectedEmployeeId
      )
      ||
      employeeById(
        state.selectedEmployeeId
      )?.excluded
    )
  ){

    state.selectedEmployeeId =
      activeEmployees()[0]?.id
      ||
      '';
  }

  render();
}

function navMarkup(){

  if(
    state.role
    ===
    'reviewer'
  ){

    return [
      navButton(
        'dashboard',
        'Reviewer Home'
      ),

      navButton(
        'review',
        'Review Queue',
        state.reportStatus==='Draft ready'
          ? '1'
          : ''
      ),

      navButton(
        'monitoring',
        'Evidence Review'
      ),

      navButton(
        'reports',
        'Reports'
      )
    ].join('');
  }

  if(
    state.role
    ===
    'employer'
  ){

    return [
      navButton(
        'dashboard',
        'Overview'
      ),

      navButton(
        'employees',
        'My Team'
      ),

      navButton(
        'monitoring',
        'Monitoring'
      ),

      navButton(
        'reports',
        'Reports'
      ),

      navButton(
        'subscriptions',
        'Billing'
      )
    ].join('');
  }

  if(
    state.role
    ===
    'employee'
  ){

    return [
      navButton(
        'dashboard',
        'My Activity'
      ),

      navButton(
        'monitoring',
        'My Monitoring'
      ),

      navButton(
        'reports',
        'My Reports'
      )
    ].join('');
  }

  return [
    navButton(
      'dashboard',
      'Dashboard'
    ),

    navButton(
      'companies',
      'Companies'
    ),

    navButton(
      'employees',
      'Employees'
    ),

    navButton(
      'monitoring',
      'Monitoring'
    ),

    navButton(
      'reports',
      'Reports'
    ),

    navButton(
      'review',
      'Review Queue',
      state.reportStatus==='Draft ready'
        ? '1'
        : ''
    ),

    navButton(
      'subscriptions',
      'Subscriptions'
    ),

    navButton(
      'dataSources',
      'Data Sources'
    ),

    navButton(
      'settings',
      'Settings'
    )
  ].join('');
}

function shell(content,title){

  return `
    <div class="app-shell">

      <aside class="sidebar">

        <div class="brand">

          <div class="brand-mark">
            W
          </div>

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
          ${navMarkup()}
        </nav>

        <div class="sidebar-bottom">

          <div class="user-chip">

            <div class="avatar">
              W
            </div>

            <div>

              <b>
                ${roleLabel()}
              </b>

              <div style="font-size:11px;opacity:.7">
                ${roleSubLabel()}
              </div>

            </div>

          </div>

        </div>

      </aside>

      <main class="main">

        <header class="topbar">

          <h1>
            ${title}
          </h1>

          <div
            style="
              display:flex;
              align-items:center;
              gap:10px
            "
          >

            <select
              id="roleSwitcher"
              class="map-input"
              style="
                min-width:190px;
                padding:8px 10px
              "
            >

              <option
                value="owner"
                ${
                  state.role==='owner'
                    ? 'selected'
                    : ''
                }
              >
                WGM Owner
              </option>

              <option
                value="reviewer"
                ${
                  state.role==='reviewer'
                    ? 'selected'
                    : ''
                }
              >
                White Glove Reviewer
              </option>

              <option
                value="employer"
                ${
                  state.role==='employer'
                    ? 'selected'
                    : ''
                }
              >
                Employer Portal
              </option>

              <option
                value="employee"
                ${
                  state.role==='employee'
                    ? 'selected'
                    : ''
                }
              >
                Employee Portal
              </option>

            </select>

            <div class="mode-pill">
              ${state.mode} MODE · Multi-source V1.3
            </div>

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

  if(
    state.role
    ===
    'employer'
  ){
    return employerDashboard();
  }

  if(
    state.role
    ===
    'employee'
  ){
    return employeeDashboard();
  }

  if(
    state.role
    ===
    'reviewer'
  ){
    return reviewerDashboard();
  }

  const emps =
    activeEmployees();

  const employerCount =
    new Set(
      emps
        .map(e=>e.employer)
        .filter(Boolean)
    ).size;

  const review =
    emps.filter(
      e =>
        /Review/i.test(
          e.reportingStatus
          ||
          ''
        )
    ).length;

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          WGM Command Center
        </h2>

        <p>
          Multiple capture connections feed one WGM evidence,
          review and reporting platform while customer data stays separated.
        </p>

      </div>

      <div class="actions">

        <button
          class="btn"
          data-page="dataSources"
        >
          Data sources
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

      ${
        metric(
          'Scrin connections',
          state.connections.length || 1,
          'Dedicated + shared'
        )
      }

      ${
        metric(
          'Employers',
          employerCount,
          'Mapped organizations'
        )
      }

      ${
        metric(
          'Employees monitored',
          emps.length,
          'Reportable employees'
        )
      }

      ${
        metric(
          'Needs review',
          review,
          'Before release'
        )
      }

    </div>

    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          Connected workforce
        </div>

        <div class="panel-sub">
          Every source employee is bound to a connection
          and a WGM employer before customer access.
        </div>

        <table>

          <thead>

            <tr>
              <th>Employee</th>
              <th>Employer</th>
              <th>Connection</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            ${
              emps.map(
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
                    ${escapeHtml(e.employer||'Unassigned')}
                  </td>

                  <td>
                    ${escapeHtml(e.connectionName||'Legacy Scrin')}
                  </td>

                  <td>

                    <span class="status ${statusClass(e.reportingStatus)}">

                      <span class="dot"></span>

                      ${escapeHtml(e.reportingStatus||'Synced')}

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
          Isolation rules
        </div>

        <div class="context-box">

          <h4>
            Dedicated employer connection
          </h4>

          <p>
            Every employee discovered through that Scrin token
            is locked to the employer that owns the connection.
          </p>

        </div>

        <div class="context-box">

          <h4>
            WGH shared connection
          </h4>

          <p>
            Each employee must be mapped to an employer
            or explicitly marked Internal / Excluded
            before customer access.
          </p>

        </div>

        <div class="context-box">

          <h4>
            Employer portal
          </h4>

          <p>
            Only employees whose WGM employer matches
            the signed-in employer are returned
            to that customer experience.
          </p>

        </div>

      </div>

    </div>
    `,
    'Dashboard'
  );
}

function employerDashboard(){

  const team =
    portalEmployees();

  const total =
    team.reduce(
      (sum,e) =>
        sum
        +
        Number(e.trackedHours||0),
      0
    );

  const avgCoverage =
    team.length

      ? Math.round(
          team.reduce(
            (sum,e) =>
              sum
              +
              Number(
                coverage(e)
                ||
                0
              ),
            0
          )
          /
          team.length
        )

      : 0;

  const released =
    team.filter(
      e =>
        e.reportingStatus==='Released'
        ||
        (
          state.reportEmployeeId===e.id
          &&
          state.reportStatus==='Released'
        )
    ).length;

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          ${escapeHtml(state.portalEmployer||'Employer')}
          Workforce Overview
        </h2>

        <p>
          This portal is scoped to one employer.
          Employees mapped to any other organization are excluded.
        </p>

      </div>

      <select
        id="employerSwitcher"
        class="map-input"
      >

        ${
          mappedEmployers().map(
            x => `
            <option
              value="${escapeHtml(x)}"
              ${
                x===state.portalEmployer
                  ? 'selected'
                  : ''
              }
            >
              ${escapeHtml(x)}
            </option>
            `
          ).join('')
        }

      </select>

    </div>

    <div class="grid metrics">

      ${
        metric(
          'Active team members',
          team.length,
          'Only this employer'
        )
      }

      ${
        metric(
          'Tracked this period',
          hoursLabel(total),
          'Visible team'
        )
      }

      ${
        metric(
          'Average coverage',
          `${avgCoverage}%`,
          'Schedule benchmark'
        )
      }

      ${
        metric(
          'Released reports',
          released,
          'Human reviewed'
        )
      }

    </div>

    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          My Team
        </div>

        <table>

          <thead>

            <tr>
              <th>Employee</th>
              <th>Source</th>
              <th>Tracked</th>
              <th>Report</th>
            </tr>

          </thead>

          <tbody>

            ${
              team.map(
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
                      ${escapeHtml(e.role||'Employee')}
                    </div>

                  </td>

                  <td>
                    ${escapeHtml(e.connectionName||'Scrin')}
                  </td>

                  <td>
                    ${hoursLabel(e.trackedHours)}
                  </td>

                  <td>

                    <span class="status ${statusClass(e.reportingStatus)}">

                      <span class="dot"></span>

                      ${escapeHtml(e.reportingStatus||'Synced')}

                    </span>

                  </td>

                </tr>
                `
              ).join('')
              ||
              `
              <tr>
                <td colspan="4">
                  No employees mapped to this employer.
                </td>
              </tr>
              `
            }

          </tbody>

        </table>

      </div>

      <div class="card panel">

        <div class="panel-title">
          Employer data boundary
        </div>

        <div class="context-box">

          <h4>
            Visible
          </h4>

          <p>
            Your own roster, hours, screenshots, workstreams,
            released reports and billing.
          </p>

        </div>

        <div class="context-box">

          <h4>
            Not visible
          </h4>

          <p>
            Other employers, their employees,
            unreleased drafts, reviewer notes
            or unrelated source connections.
          </p>

        </div>

      </div>

    </div>
    `,
    'Employer Portal'
  );
}

function employeeDashboard(){

  const e =
    employee();

  if(!e){

    return shell(
      '<div class="card empty">No employee selected.</div>',
      'Employee Portal'
    );
  }

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          My Activity
        </h2>

        <p>
          ${escapeHtml(e.name)}
          ·
          ${escapeHtml(e.employer||'Employer')}
        </p>

      </div>

      <span class="status green">
        <span class="dot"></span>
        Tracking connected
      </span>

    </div>

    <div class="grid metrics">

      ${
        metric(
          'Tracked this period',
          hoursLabel(e.trackedHours),
          'My recorded time'
        )
      }

      ${
        metric(
          'Schedule coverage',
          `${coverage(e)??'—'}%`,
          `${e.expectedHours||'—'} expected hours`
        )
      }

      ${
        metric(
          'Active workdays',
          e.activeDays||'—',
          'Reporting period'
        )
      }

      ${
        metric(
          'Report status',
          escapeHtml(e.reportingStatus||'Synced'),
          'My record'
        )
      }

    </div>

    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          My work profile
        </div>

        <div class="context-box">

          <h4>
            Expected schedule
          </h4>

          <p>
            ${escapeHtml(e.schedule||'Not set')}
          </p>

          <p>
            ${escapeHtml(e.timezone||'Timezone not set')}
          </p>

        </div>

        <div class="context-box">

          <h4>
            Context on file
          </h4>

          <p>
            ${escapeHtml(e.context||'No context entered.')}
          </p>

        </div>

      </div>

      <div class="card panel">

        <div class="panel-title">
          Employee access boundary
        </div>

        <p class="small">
          This view contains only this employee's
          own authorized information.
        </p>

        <div class="actions">

          <button
            class="btn primary"
            data-page="monitoring"
          >
            View my monitoring
          </button>

          <button
            class="btn"
            data-page="reports"
          >
            View my reports
          </button>

        </div>

      </div>

    </div>
    `,
    'Employee Portal'
  );
}

function reviewerDashboard(){

  const emps =
    activeEmployees();

  const needsReview =
    emps.filter(
      e =>
        reviewColor(e)
        !==
        'Green'
    );

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Reviewer Workspace
        </h2>

        <p>
          Assigned reports are triaged by evidence coverage
          and review state before release.
        </p>

      </div>

      <button
        class="btn primary"
        data-page="review"
      >
        Open review queue
      </button>

    </div>

    <div class="grid metrics">

      ${
        metric(
          'Assigned employees',
          emps.length,
          'Across authorized employers'
        )
      }

      ${
        metric(
          'Green eligible',
          emps.filter(
            e =>
              reviewColor(e)
              ===
              'Green'
          ).length,
          'Can be batch approved'
        )
      }

      ${
        metric(
          'Yellow / Red',
          needsReview.length,
          'Individual review'
        )
      }

      ${
        metric(
          'Delivery queue',
          state.deliveryQueue.length,
          'Released events'
        )
      }

    </div>

    <div class="card panel">

      <div class="panel-title">
        Priority review
      </div>

      ${reviewQueueTable()}

    </div>
    `,
    'Reviewer Home'
  );
}

function reviewColor(e){

  const cov =
    coverage(e);

  if(
    Number(e.concerns||0)
    >
    1
  ){
    return 'Red';
  }

  if(
    Number(e.concerns||0)
    ===
    1
    ||
    (
      cov!==null
      &&
      cov<90
    )
  ){
    return 'Yellow';
  }

  return 'Green';
}

function reviewQueueTable(){

  return `
    <table>

      <thead>

        <tr>
          <th>Employer</th>
          <th>Employee</th>
          <th>Source</th>
          <th>Period</th>
          <th>Coverage</th>
          <th>Status</th>
          <th>Release</th>
        </tr>

      </thead>

      <tbody>

        ${
          activeEmployees().map(
            e => {

              const color =
                reviewColor(e);

              const release =
                (
                  state.reportEmployeeId===e.id
                    ? state.reportStatus
                    : e.reportingStatus
                )
                ||
                'Not generated';

              return `
                <tr>

                  <td>
                    ${escapeHtml(e.employer||'Unassigned')}
                  </td>

                  <td>

                    <span
                      class="row-link"
                      data-open-id="${escapeHtml(e.id)}"
                    >
                      ${escapeHtml(e.name)}
                    </span>

                  </td>

                  <td>
                    ${escapeHtml(e.connectionName||'Scrin')}
                  </td>

                  <td>
                    ${periodLabel()}
                  </td>

                  <td>
                    ${coverage(e)??'—'}%
                  </td>

                  <td>

                    <span
                      class="status ${
                        color==='Green'
                          ? 'green'
                          : color==='Yellow'
                            ? 'amber'
                            : 'red'
                      }"
                    >

                      <span class="dot"></span>

                      ${color}

                    </span>

                  </td>

                  <td>
                    ${escapeHtml(release)}
                  </td>

                </tr>
              `;
            }
          ).join('')
        }

      </tbody>

    </table>
  `;
}

function companies(){

  const groups = {};

  activeEmployees().forEach(
    e => {

      const k =
        e.employer
        ||
        'Unassigned';

      (
        groups[k]
        ||=
        []
      ).push(e);
    }
  );

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Companies
        </h2>

        <p>
          WGM employer mapping is the customer isolation boundary.
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
            <th>Connections represented</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          ${
            Object.entries(groups).map(
              ([name,emps]) => `
              <tr>

                <td>
                  ${escapeHtml(name)}
                </td>

                <td>
                  ${emps.length}
                </td>

                <td>
                  ${
                    new Set(
                      emps.map(
                        e =>
                          e.connectionId
                          ||
                          'legacy'
                      )
                    ).size
                  }
                </td>

                <td>

                  <span
                    class="status ${
                      name==='Unassigned'
                        ? 'amber'
                        : 'green'
                    }"
                  >

                    <span class="dot"></span>

                    ${
                      name==='Unassigned'
                        ? 'Mapping required'
                        : 'Active'
                    }

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
    'Companies'
  );
}

function employees(){

  const emps =
    visibleEmployees();

  const title =
    state.role==='employer'
      ? 'My Team'
      : 'Employees';

  const intro =
    state.role==='employer'
      ? 'Only employees mapped to your organization are shown.'
      : 'Choose any synced employee to inspect monitoring data or generate a report.';

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          ${title}
        </h2>

        <p>
          ${intro}
        </p>

      </div>

      ${
        state.role==='owner'

          ? `
            <div class="actions">

              <button
                class="btn"
                id="syncScrin"
              >
                Sync all Scrin connections
              </button>

              <button
                class="btn"
                data-page="settings"
              >
                Map employers
              </button>

            </div>
            `

          : ''
      }

    </div>

    <div class="card panel">

      ${
        state.role==='owner'

          ? `
            <div class="callout">

              <strong>
                Current connection status
              </strong>

              ${escapeHtml(state.syncMessage)}

            </div>
            `

          : ''
      }

      <table>

        <thead>

          <tr>
            <th>Employee</th>
            <th>Employer</th>
            <th>Connection</th>
            <th>Employment ID</th>
            <th>Tracked</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          ${
            emps.map(
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
                    ${escapeHtml(e.role||'Virtual Assistant')}
                  </div>

                </td>

                <td>
                  ${escapeHtml(e.employer||'Unassigned')}
                </td>

                <td>
                  ${escapeHtml(e.connectionName||'Legacy Scrin')}
                </td>

                <td>
                  ${escapeHtml(e.employmentId||'—')}
                </td>

                <td>
                  ${hoursLabel(e.trackedHours)}
                </td>

                <td>

                  <span class="status ${statusClass(e.reportingStatus)}">

                    <span class="dot"></span>

                    ${escapeHtml(e.reportingStatus||'Synced')}

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
    title
  );
}

function monitoring(){

  return employeeView();
}

function employeeView(){

  const e =
    employee();

  if(!e){

    return shell(
      '<div class="card empty">No employee is available in this portal.</div>',
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

          ${
            escapeHtml(
              e.initials
              ||
              initials(e.name)
            )
          }

        </div>

        <div>

          <h2 style="margin:0">
            ${escapeHtml(e.name)}
          </h2>

          <div class="small">

            ${escapeHtml(e.employer||'Unassigned employer')}

            ·

            ${escapeHtml(e.role||'Virtual Assistant')}

            ·

            ${escapeHtml(e.connectionName||'Scrin')}

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
              class="tab ${
                state.employeeTab===t
                  ? 'active'
                  : ''
              }"
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

  if(
    state.employeeTab==='screenshots'
  ){
    return screenshotView(e);
  }

  if(
    state.employeeTab==='workstreams'
  ){

    return `
      <div class="grid two-col">

        <div>

          ${
            (e.workstreams||[])
              .map(
                x =>
                  mixBar(
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

  if(
    state.employeeTab==='apps'
  ){

    return `
      <div class="grid two-col">

        <div>

          ${
            (e.apps||[])
              .map(
                x =>
                  mixBar(
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
            and repeated patterns.
            They are contextual evidence,
            not a performance score.
          </p>

        </div>

      </div>
    `;
  }

  if(
    state.employeeTab==='context'
  ){
    return contextView(e);
  }

  if(
    state.employeeTab==='reports'
  ){

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
              ${periodLabel()}
            </td>

            <td>
              ${hoursLabel(e.trackedHours)}
            </td>

            <td>
              ${coverage(e)??'—'}%
            </td>

            <td>

              ${
                state.reportEmployeeId===e.id
                &&
                /Approved|Released/.test(
                  state.reportStatus
                )

                  ? 'Human reviewed'

                  : '—'
              }

            </td>

            <td>

              <span
                class="status ${
                  statusClass(
                    state.reportEmployeeId===e.id
                      ? state.reportStatus
                      : e.reportingStatus
                  )
                }"
              >

                <span class="dot"></span>

                ${
                  escapeHtml(
                    state.reportEmployeeId===e.id
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

  if(
    state.employeeTab==='timeline'
  ){

    return `
      <div class="banner">

        <div>

          <div class="big">

            ${
              hoursLabel(
                Math.min(
                  8.1,
                  Number(e.trackedHours||0)
                  /
                  Math.max(
                    Number(e.activeDays||1),
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
                e.workstreams?.[0]?.[0]
                ||
                'Work'
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

            <td>
              8:45–10:18
            </td>

            <td>
              ${escapeHtml(e.workstreams?.[0]?.[0]||'Project')}
            </td>

            <td>
              Representative work block
            </td>

            <td>
              Activity + screenshots
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
          `${coverage(e)??'—'}%`,
          `${e.expectedHours||'—'} expected hours`
        )
      }

      ${
        metric(
          'Active workdays',
          e.activeDays||'—',
          'Reporting period'
        )
      }

      ${
        metric(
          'Review flags',
          e.concerns||0,
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
          (e.weeks||[])
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
            ${escapeHtml(e.schedule||'Not set')}
          </p>

          <p>
            ${escapeHtml(e.timezone||'Timezone not set')}
          </p>

        </div>

        <div class="context-box">

          <h4>
            Source connection
          </h4>

          <p>
            ${escapeHtml(e.connectionName||'Scrin')}
          </p>

          <p>
            ${
              e.employerLocked
                ? 'Dedicated employer connection'
                : 'Shared / individually mapped connection'
            }
          </p>

        </div>

        <div class="context-box">

          <h4>
            Monthly context
          </h4>

          <p>
            ${escapeHtml(e.context||'No context entered.')}
          </p>

        </div>

      </div>

    </div>
  `;
}

function screenshotView(e){

  return `
    <div class="toolbar">

      <div class="field">

        <label>
          Date
        </label>

        <input
          id="screenDate"
          type="date"
          value="2026-09-18"
        >

      </div>

      <div class="field">

        <label>
          Project
        </label>

        <select>

          <option>
            All projects
          </option>

          ${
            (e.workstreams||[])
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

        <label>
          Application
        </label>

        <select>

          <option>
            All apps & URLs
          </option>

          ${
            (e.apps||[])
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
          Evidence is loaded only from this employee's source connection.
        </div>

      </div>

      <span class="status blue">

        <span class="dot"></span>

        ${escapeHtml(e.connectionName||'Evidence view')}

      </span>

    </div>

    <div id="shotArea">

      <div class="shot-grid">

        ${
          (e.shots||[])
            .map(
              s =>
                shot(
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

function shot(time,app,level,imageUrl){

  const safeUrl =
    imageUrl
      ? escapeHtml(imageUrl)
      : '';

  const image =
    safeUrl

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

          Activity level
          ${level??'—'}%
          · Scrin evidence

        </span>

      </div>

    </div>
  `;
}

function contextView(e){

  const employerControl =
    e.employerLocked

      ? `
        <input
          id="contextEmployer"
          value="${escapeHtml(e.employer||'')}"
          disabled
        >

        <div class="small">
          Locked by dedicated Scrin connection.
        </div>
        `

      : `
        <input
          id="contextEmployer"
          value="${escapeHtml(e.employer||'')}"
        >
        `;

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

          ${employerControl}

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
            value="${Number(e.expectedHours||0)}"
          >

        </div>

        <div class="field">

          <label>
            Timezone
          </label>

          <input
            id="contextTimezone"
            value="${escapeHtml(e.timezone||'')}"
          >

        </div>

        <div class="field">

          <label>
            General schedule
          </label>

          <input
            id="contextSchedule"
            value="${escapeHtml(e.schedule||'')}"
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
            escapeHtml(e.context||'')
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

function reports(){

  const emps =
    visibleEmployees();

  if(
    state.role==='employee'
  ){

    const e =
      employee();

    return shell(
      `
      <div class="header-row">

        <div>

          <h2>
            My Reports
          </h2>

          <p>
            Only reports released for your own record are shown.
          </p>

        </div>

      </div>

      <div class="card panel">

        <table>

          <thead>

            <tr>
              <th>Period</th>
              <th>Tracked</th>
              <th>Coverage</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            <tr>

              <td>
                ${periodLabel()}
              </td>

              <td>
                ${e?hoursLabel(e.trackedHours):'—'}
              </td>

              <td>
                ${e?(coverage(e)??'—'):'—'}%
              </td>

              <td>
                ${e?escapeHtml(e.reportingStatus||'Synced'):'—'}
              </td>

            </tr>

          </tbody>

        </table>

      </div>
      `,
      'My Reports'
    );
  }

  if(
    state.role==='employer'
  ){

    return shell(
      `
      <div class="header-row">

        <div>

          <h2>
            Reports
          </h2>

          <p>
            Released reports for
            ${escapeHtml(state.portalEmployer||'your company')}
            are shown here.
            New report requests still pass through White Glove review.
          </p>

        </div>

        <button
          class="btn primary"
          id="requestEmployerReport"
        >
          Request monthly report
        </button>

      </div>

      <div class="card panel">

        <table>

          <thead>

            <tr>
              <th>Employee</th>
              <th>Period</th>
              <th>Tracked</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            ${
              emps.map(
                e => `
                <tr>

                  <td>
                    ${escapeHtml(e.name)}
                  </td>

                  <td>
                    ${periodLabel()}
                  </td>

                  <td>
                    ${hoursLabel(e.trackedHours)}
                  </td>

                  <td>

                    <span class="status ${statusClass(e.reportingStatus)}">

                      <span class="dot"></span>

                      ${escapeHtml(e.reportingStatus||'Synced')}

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
      'Reports'
    );
  }

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Report Center
        </h2>

        <p>
          Generate reports across any connected source
          after employer mapping and evidence reconciliation.
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
        Objective metrics come from the employee's own source connection.
        AI drafts interpretation.
        Human review remains mandatory.
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
              emps.map(
                x => `
                <option
                  value="${escapeHtml(x.id)}"
                  ${
                    x.id===state.selectedEmployeeId
                      ? 'selected'
                      : ''
                  }
                >
                  ${escapeHtml(x.name)}
                  —
                  ${escapeHtml(x.employer||'Unassigned')}
                  —
                  ${escapeHtml(x.connectionName||'Scrin')}
                </option>
                `
              ).join('')
            }

            <option value="__ALL__">
              All mapped employees (${emps.length})
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
        Current reportable population
      </div>

      <table>

        <thead>

          <tr>
            <th>Employee</th>
            <th>Employer</th>
            <th>Source</th>
            <th>Data</th>
            <th>Human review</th>
          </tr>

        </thead>

        <tbody>

          ${
            emps.map(
              x => `
              <tr>

                <td>
                  ${escapeHtml(x.name)}
                </td>

                <td>
                  ${escapeHtml(x.employer||'Unassigned')}
                </td>

                <td>
                  ${escapeHtml(x.connectionName||'Scrin')}
                </td>

                <td>

                  <span class="status green">

                    <span class="dot"></span>

                    ${
                      state.mode==='LIVE'
                        ? 'Live'
                        : 'Demo'
                    }
                    ready

                  </span>

                </td>

                <td>

                  ${
                    state.reportEmployeeId===x.id

                      ? `
                        <span class="status ${statusClass(state.reportStatus)}">

                          <span class="dot"></span>

                          ${escapeHtml(state.reportStatus)}

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
          Green reports may be batch approved;
          Yellow and Red require individual review.
        </p>

      </div>

      <div class="actions">

        <button
          class="btn"
          id="batchGreen"
        >
          Approve eligible Greens
        </button>

        <button
          class="btn primary"
          data-page="reports"
        >
          Generate report
        </button>

      </div>

    </div>

    <div
      class="card panel"
      style="margin-bottom:16px"
    >

      <div class="panel-title">
        Queue
      </div>

      ${reviewQueueTable()}

    </div>

    ${
      state.reportStatus==='Not generated'

        ? `
          <div class="card empty">
            Generate a report to open the full review console.
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

  const cov =
    coverage(e);

  return `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">
          ${
            escapeHtml(
              e.initials
              ||
              initials(e.name)
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

            ${escapeHtml(e.employer||'Unassigned')}

            ·

            ${escapeHtml(e.connectionName||'Scrin')}

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
          <div class="v">${e.expectedHours||'—'}h</div>
        </div>

        <div class="review-stat">
          <div class="k">Coverage</div>
          <div class="v">${cov??'—'}%</div>
        </div>

        <div class="review-stat">
          <div class="k">Active days</div>
          <div class="v">${e.activeDays||'—'}</div>
        </div>

        <div class="review-stat">
          <div class="k">Review flags</div>
          <div class="v">${e.concerns||0}</div>
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
        /Approved|Released/.test(
          state.reportStatus
        )

          ? `
            <div class="callout">

              <strong>
                Approved for release
              </strong>

              Release is bound to this employee,
              employer and report version.

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
                  state.reportStatus==='Released'
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
      state.reportPeriod.from
      +
      'T00:00:00Z'
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

function subscriptions(){

  if(
    state.role==='employer'
  ){

    const team =
      portalEmployees();

    return shell(
      `
      <div class="header-row">

        <div>

          <h2>
            Billing
          </h2>

          <p>
            Prototype of the Stripe-backed billing entry point.
          </p>

        </div>

        <button class="btn primary">
          Manage payment method
        </button>

      </div>

      <div class="grid metrics">

        ${
          metric(
            'Plan',
            'WGM Monthly',
            'Configurable in Stripe'
          )
        }

        ${
          metric(
            'Paid seats',
            Math.max(team.length,1),
            'Contracted capacity'
          )
        }

        ${
          metric(
            'Billing status',
            'Active',
            'Prototype state'
          )
        }

        ${
          metric(
            'Next renewal',
            'Oct 1, 2026',
            'Hosted billing'
          )
        }

      </div>

      <div class="grid two-col">

        <div class="card panel">

          <div class="panel-title">
            Subscription
          </div>

          <table>

            <tbody>

              <tr>
                <th>Organization</th>
                <td>${escapeHtml(state.portalEmployer||'Employer')}</td>
              </tr>

              <tr>
                <th>Assigned employees</th>
                <td>${team.length}</td>
              </tr>

              <tr>
                <th>Payment method</th>
                <td>•••• 4242</td>
              </tr>

              <tr>
                <th>Cancellation</th>
                <td>Not scheduled</td>
              </tr>

            </tbody>

          </table>

        </div>

        <div class="card panel">

          <div class="panel-title">
            Invoice history
          </div>

          <table>

            <thead>

              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              <tr>

                <td>
                  WGM-0003
                </td>

                <td>
                  Sep 1, 2026
                </td>

                <td>

                  <span class="status green">
                    <span class="dot"></span>
                    Paid
                  </span>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>
      `,
      'Billing'
    );
  }

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Subscriptions
        </h2>

        <p>
          Prototype states for included WGH seats
          and standalone paid organizations.
        </p>

      </div>

    </div>

    <div class="card panel">

      <table>

        <thead>

          <tr>
            <th>Company</th>
            <th>Entitlement</th>
            <th>Seats</th>
            <th>Lifecycle state</th>
          </tr>

        </thead>

        <tbody>

          ${
            mappedEmployers().map(
              (c,i) => {

                const count =
                  activeEmployees().filter(
                    e =>
                      e.employer===c
                  ).length;

                return `
                  <tr>

                    <td>
                      ${escapeHtml(c)}
                    </td>

                    <td>
                      ${
                        i===0
                          ? 'WGH Included'
                          : 'Standalone Paid'
                      }
                    </td>

                    <td>
                      ${count}
                    </td>

                    <td>

                      <span class="status green">

                        <span class="dot"></span>

                        Active

                      </span>

                    </td>

                  </tr>
                `;
              }
            ).join('')
          }

        </tbody>

      </table>

    </div>
    `,
    'Subscriptions'
  );
}

function connectionTypeLabel(c){

  return c.type==='dedicated'
    ? 'Dedicated Employer'
    : 'WGH Shared';
}

function connectionEmployeeCount(id){

  return state.employees.filter(
    e =>
      String(e.connectionId)
      ===
      String(id)
  ).length;
}

function dataSources(){

  const connections =
    state.connections.length

      ? state.connections

      : [
          {
            id:'wgh-main',
            name:'WGH Main Scrin Account',
            provider:'scrin',
            type:'shared',
            employer:'',
            status:
              state.mode==='LIVE'
                ? 'connected'
                : 'configured'
          }
        ];

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Data Sources
        </h2>

        <p>
          Each Scrin API credential is a separate WGM connection
          with an explicit ownership type.
        </p>

      </div>

      <div class="actions">

        <button
          class="btn"
          id="refreshConnections"
        >
          Refresh
        </button>

        <button
          class="btn primary"
          id="toggleAddConnection"
        >
          + Add Scrin Connection
        </button>

      </div>

    </div>

    ${
      state.showAddConnection

        ? `
          <div
            class="card panel"
            style="margin-bottom:16px"
          >

            <div class="panel-title">
              Add Scrin Connection
            </div>

            <div class="panel-sub">
              Prototype workflow.
              API tokens remain server-side in Cloudflare
              and are never entered into browser code.
            </div>

            <div class="grid two-col">

              <div>

                <div class="field">

                  <label>
                    Connection name
                  </label>

                  <input
                    value="ABC Realty Scrin Account"
                    disabled
                  >

                </div>

                <div class="field">

                  <label>
                    Connection type
                  </label>

                  <select disabled>

                    <option>
                      Dedicated Employer
                    </option>

                    <option>
                      WGH Shared
                    </option>

                  </select>

                </div>

              </div>

              <div>

                <div class="field">

                  <label>
                    Employer
                  </label>

                  <input
                    value="ABC Realty"
                    disabled
                  >

                </div>

                <div class="context-box">

                  <h4>
                    Secure credential step
                  </h4>

                  <p>
                    Add the new token to the Cloudflare secret
                    <b>SCRIN_CONNECTIONS_JSON</b>,
                    then click Refresh / Sync All.
                  </p>

                </div>

              </div>

            </div>

          </div>
          `

        : ''
    }

    <div class="card panel">

      <div class="panel-title">
        Scrin.io Connections
      </div>

      <div class="panel-sub">
        Dedicated connections automatically lock every discovered employee
        to one employer.
        Shared WGH connections require employee-level mapping.
      </div>

      <table>

        <thead>

          <tr>
            <th>Connection</th>
            <th>Type</th>
            <th>Employer ownership</th>
            <th>Employees</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          ${
            connections.map(
              c => `
              <tr>

                <td>

                  <b>
                    ${escapeHtml(c.name||c.id)}
                  </b>

                  <div class="small">
                    ${escapeHtml(c.id)}
                  </div>

                </td>

                <td>
                  ${connectionTypeLabel(c)}
                </td>

                <td>

                  ${
                    c.type==='dedicated'
                      ? escapeHtml(c.employer||'Employer required')
                      : 'Employee-level mapping'
                  }

                </td>

                <td>
                  ${
                    c.employeeCount
                    ??
                    connectionEmployeeCount(c.id)
                  }
                </td>

                <td>

                  <span
                    class="status ${statusClass(c.status||'configured')}"
                  >

                    <span class="dot"></span>

                    ${escapeHtml(c.status||'configured')}

                  </span>

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
          id="syncScrin"
        >
          Sync all Scrin connections
        </button>

      </div>

    </div>

    <div
      class="grid two-col"
      style="margin-top:16px"
    >

      <div class="card panel">

        <div class="panel-title">
          Dedicated employer rule
        </div>

        <p class="small">
          Example:
          a Michael Green Fine Homes Scrin connection
          is permanently bound to Michael Green Fine Homes.
          All employees imported from that connection
          inherit that employer
          and the mapping control is locked.
        </p>

      </div>

      <div class="card panel">

        <div class="panel-title">
          Shared WGH rule
        </div>

        <p class="small">
          A WGH master Scrin account can contain employees
          serving different clients.
          Every reportable employee must be mapped
          to one employer
          or marked Internal / Excluded.
        </p>

      </div>

    </div>

    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Provider-independent evidence architecture
      </div>

      <div class="banner">

        <div>

          <div
            class="big"
            style="font-size:18px"
          >

            Scrin Connection(s)
            →
            WGM Evidence Layer
            →
            Analysis
            →
            AI Draft
            →
            Human Review
            →
            Employer Report

          </div>

          <div class="muted">
            Future WGM Native Monitor uses the same evidence contract,
            employer mapping and report engine.
          </div>

        </div>

      </div>

    </div>
    `,
    'Data Sources'
  );
}

function settings(){

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Settings & Integrations
        </h2>

        <p>
          Map shared Scrin employees carefully.
          Dedicated-connection employees are employer-locked.
        </p>

      </div>

    </div>

    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          Scrin API v2
        </div>

        <div class="panel-sub">
          Multiple server-side Scrin connections are supported.
        </div>

        <p class="small">

          Current single-token fallback:

          <b>
            SCRIN_TOKEN
          </b>.

          Multi-account configuration:

          <b>
            SCRIN_CONNECTIONS_JSON
          </b>.

          Tokens never enter browser code or GitHub.

        </p>

        <div class="actions">

          <button
            class="btn primary"
            id="syncScrin"
          >
            Sync all connections
          </button>

          <button
            class="btn"
            id="testScrin"
          >
            Test connections
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
          Structured narrative from verified WGM calculations and context.
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

          server-side when ready for live AI generation.

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
        Source employee → WGM employer mapping
      </div>

      <div class="panel-sub">
        This is the tenancy safety layer.
        A shared connection needs employee-level mapping.
        A dedicated connection is locked to its owner.
      </div>

      <table>

        <thead>

          <tr>
            <th>Employee</th>
            <th>Scrin connection</th>
            <th>Type</th>
            <th>Employment ID</th>
            <th>WGM employer</th>
            <th>Internal / Exclude</th>
            <th>Expected hours</th>
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
                  ${escapeHtml(e.connectionName||'Legacy Scrin')}
                </td>

                <td>
                  ${
                    e.employerLocked
                      ? 'Dedicated'
                      : 'Shared'
                  }
                </td>

                <td>
                  ${escapeHtml(e.employmentId||'—')}
                </td>

                <td>

                  ${
                    e.employerLocked

                      ? `
                        <input
                          class="map-input"
                          value="${
                            escapeHtml(
                              e.employer
                              ||
                              e.connectionEmployer
                              ||
                              ''
                            )
                          }"
                          disabled
                        >
                        `

                      : `
                        <input
                          class="map-input"
                          data-map-employer="${escapeHtml(e.id)}"
                          value="${escapeHtml(e.employer||'')}"
                        >
                        `
                  }

                </td>

                <td>

                  ${
                    e.employerLocked

                      ? `
                        <span class="small">
                          Not available
                        </span>
                        `

                      : `
                        <input
                          type="checkbox"
                          data-map-excluded="${escapeHtml(e.id)}"
                          ${
                            e.excluded
                              ? 'checked'
                              : ''
                          }
                        >
                        `
                  }

                </td>

                <td>

                  <input
                    class="map-input small-input"
                    data-map-hours="${escapeHtml(e.id)}"
                    type="number"
                    min="0"
                    step="0.5"
                    value="${Number(e.expectedHours||0)}"
                  >

                </td>

              </tr>
              `
            ).join('')
          }

        </tbody>

      </table>

      <div class="callout">

        <strong>
          Save rule
        </strong>

        Every active employee from a shared connection
        must have a WGM employer.

        Use Internal / Exclude for the Scrin account owner
        or any record that should never appear
        in an employer portal or report run.

      </div>

      <div
        class="actions"
        style="margin-top:16px"
      >

        <button
          class="btn gold"
          id="saveMappings"
        >
          Validate & Save mappings
        </button>

      </div>

    </div>
    `,
    'Settings'
  );
}

function reportPreview(){

  const e =
    employeeById(state.reportEmployeeId)
    ||
    employee();

  const r =
    state.report
    ||
    defaultReport;

  if(!e){

    return shell(
      '<div class="card empty">No report selected.</div>',
      'Report Preview'
    );
  }

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
            state.reportStatus==='Released'
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

        Prepared for
        ${escapeHtml(e.employer||'Employer')}

        ·

        Source:
        ${escapeHtml(e.connectionName||'Scrin')}

      </div>

      <div class="report-grid">

        <div class="report-metric">
          <b>${hoursLabel(e.trackedHours)}</b>
          <span class="small">Tracked time</span>
        </div>

        <div class="report-metric">
          <b>${coverage(e)??'—'}%</b>
          <span class="small">Schedule coverage</span>
        </div>

        <div class="report-metric">
          <b>${e.activeDays||'—'}</b>
          <span class="small">Active workdays</span>
        </div>

        <div class="report-metric">
          <b>${e.concerns||0}</b>
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
          (r.strengths||[])
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
            (e.weeks||[])
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
        (e.workstreams||[])
          .map(
            x =>
              mixBar(
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
          Prototype V1.3
        </span>

      </div>

    </article>
    `,
    'Report Preview'
  );
}

function mergeSyncedEmployee(x,prior){

  const old =
    prior.find(
      o =>
        String(o.id)
        ===
        String(x.id)
    )
    ||
    prior.find(
      o =>
        String(o.employmentId)
        ===
        String(x.employmentId)
        &&
        (
          !o.connectionId
          ||
          String(o.connectionId)
          ===
          String(x.connectionId)
        )
    )
    ||
    {};

  const dedicatedEmployer =
    x.employerLocked

      ? (
          x.connectionEmployer
          ||
          x.employer
          ||
          ''
        )

      : null;

  return {
    ...old,
    ...x,

    id:
      x.id
      ||
      `${
        x.connectionId
        ||
        'scrin'
      }::${x.employmentId}`,

    initials:
      initials(x.name),

    employer:
      dedicatedEmployer !== null
        ? dedicatedEmployer
        : (
            old.employer
            ||
            x.employer
            ||
            ''
          ),

    excluded:
      x.employerLocked
        ? false
        : Boolean(old.excluded),

    expectedHours:
      Number(
        old.expectedHours
        ??
        x.expectedHours
        ??
        160
      ),

    schedule:
      old.schedule
      ||
      x.schedule
      ||
      'Monday–Friday · 8 hours/day · 40 hours/week',

    timezone:
      old.timezone
      ||
      x.timezone
      ||
      'Set in WGM',

    timezoneOffsetMinutes:
      Number(
        old.timezoneOffsetMinutes
        ??
        x.timezoneOffsetMinutes
        ??
        0
      ),

    context:
      old.context
      ||
      x.context
      ||
      '',

    trackedHours:
      Number(
        old.trackedHours
        ??
        x.trackedHours
        ??
        0
      ),

    activeDays:
      Number(
        old.activeDays
        ??
        x.activeDays
        ??
        0
      ),

    concerns:
      Number(
        old.concerns
        ??
        x.concerns
        ??
        0
      ),

    workstreams:
      old.workstreams
      ||
      x.workstreams
      ||
      [],

    apps:
      old.apps
      ||
      x.apps
      ||
      [],

    weeks:
      old.weeks
      ||
      x.weeks
      ||
      [],

    shots:
      old.shots
      ||
      x.shots
      ||
      [],

    reportingStatus:
      old.reportingStatus
      ||
      x.reportingStatus
      ||
      'Synced'
  };
}

async function syncScrin(){

  state.syncMessage =
    'Syncing all Scrin connections…';

  render();

  try{

    const r =
      await fetch(
        '/api/scrin/all-common',
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
        'Scrin connection sync failed'
      );
    }

    const prior =
      [...state.employees];

    state.connections =
      Array.isArray(j.connections)
        ? j.connections
        : state.connections;

    state.employees =
      (
        Array.isArray(j.employees)
          ? j.employees
          : []
      )
      .map(
        x =>
          mergeSyncedEmployee(
            x,
            prior
          )
      );

    if(
      !state.employees.length
    ){

      throw new Error(
        'No employment records were returned'
      );
    }

    const currentStillExists =
      state.employees.some(
        e =>
          String(e.id)
          ===
          String(state.selectedEmployeeId)
      );

    if(
      !currentStillExists
    ){

      state.selectedEmployeeId =
        activeEmployees()[0]?.id
        ||
        state.employees[0].id;
    }

    saveEmployees();
    saveConnections();

    state.mode =
      j.demo
        ? 'DEMO'
        : 'LIVE';

    const errorCount =
      Array.isArray(j.errors)
        ? j.errors.length
        : 0;

    state.syncMessage =
      `Connected ${
        state.connections.filter(
          c =>
            c.status==='connected'
            ||
            c.status==='demo'
        ).length
      }/${state.connections.length} Scrin connection(s). ${
        state.employees.length
      } employment record(s) loaded.${
        errorCount
          ? ` ${errorCount} connection error(s) require attention.`
          : ''
      }`;

  }catch(e){

    state.syncMessage =
      `Connection sync failed: ${e.message}`;
  }

  render();
}

async function refreshConnections(){

  try{

    const r =
      await fetch(
        '/api/scrin/connections'
      );

    const j =
      await r.json();

    if(!r.ok){

      throw new Error(
        j.error
        ||
        'Could not load connections'
      );
    }

    state.connections =
      Array.isArray(j.connections)
        ? j.connections
        : [];

    saveConnections();

    toast(
      `${state.connections.length} Scrin connection(s) configured.`
    );

  }catch(e){

    toast(
      `Could not refresh connections: ${e.message}`
    );
  }
}

async function testScrin(){

  const el =
    document.getElementById(
      'scrinResult'
    );

  if(el){

    el.textContent =
      'Testing all connections…';
  }

  try{

    const r =
      await fetch(
        '/api/scrin/all-common',
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
        'Not configured'
      );
    }

    state.mode =
      j.demo
        ? 'DEMO'
        : 'LIVE';

    state.connections =
      Array.isArray(j.connections)
        ? j.connections
        : state.connections;

    saveConnections();

    const connected =
      state.connections.filter(
        c =>
          c.status==='connected'
          ||
          c.status==='demo'
      ).length;

    state.syncMessage =
      `${state.mode} connections responding: ${
        connected
      }/${state.connections.length}. ${
        j.employees?.length||0
      } employment record(s) available.`;

    render();

  }catch(e){

    if(el){

      el.textContent =
        `Not connected: ${e.message}`;
    }
  }
}

async function generateReport(){

  const select =
    document.getElementById(
      'reportEmployee'
    );

  const id =
    select?.value
    ||
    state.selectedEmployeeId;

  state.reportPeriod = {

    from:
      document
        .getElementById('fromDate')
        ?.value
      ||
      state.reportPeriod.from,

    to:
      document
        .getElementById('toDate')
        ?.value
      ||
      state.reportPeriod.to
  };

  if(
    id==='__ALL__'
  ){

    toast(
      'Batch generation is the next report-engine milestone. Multi-source employee selection is now ready.'
    );

    return;
  }

  state.selectedEmployeeId =
    id;

  const e =
    employeeById(id);

  if(
    !e
    ||
    e.excluded
    ||
    !e.employer
  ){

    toast(
      'This employee must be mapped to an employer before report generation.'
    );

    return;
  }

  state.reportEmployeeId =
    e.id;

  state.reportStatus =
    'Generating';

  render();

  try{

    let verified = {

      employee:e,

      period:
        state.reportPeriod,

      source:{
        provider:'scrin',
        connectionId:e.connectionId,
        connectionName:e.connectionName
      }
    };

    if(
      state.mode==='LIVE'
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
              connectionId:e.connectionId,
              employmentId:e.employmentId,
              from:state.reportPeriod.from,
              to:state.reportPeriod.to,
              timezoneOffsetMinutes:e.timezoneOffsetMinutes||0,
              expectedHours:Number(e.expectedHours||0),
              includeScreenshots:true
            })
          }
        );

      const p =
        await periodRes.json();

      if(
        !periodRes.ok
      ){

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
              e.id==='demo-main::477279'
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

async function loadLiveDay(){

  const e =
    employee();

  const d =
    document
      .getElementById('screenDate')
      ?.value;

  if(!e){
    return;
  }

  if(
    state.mode!=='LIVE'
  ){

    toast(
      'Demo mode: connect Scrin to load real daily screenshots.'
    );

    return;
  }

  const area =
    document.getElementById(
      'shotArea'
    );

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
            connectionId:e.connectionId,
            employmentId:e.employmentId,
            from:d,
            to:d,
            timezoneOffsetMinutes:e.timezoneOffsetMinutes||0,
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

function saveMappings(){

  document
    .querySelectorAll(
      '[data-map-employer]'
    )
    .forEach(
      el => {

        const e =
          employeeById(
            el.dataset.mapEmployer
          );

        if(
          e
          &&
          !e.employerLocked
        ){

          e.employer =
            el.value.trim();
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-excluded]'
    )
    .forEach(
      el => {

        const e =
          employeeById(
            el.dataset.mapExcluded
          );

        if(
          e
          &&
          !e.employerLocked
        ){

          e.excluded =
            el.checked;
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-hours]'
    )
    .forEach(
      el => {

        const e =
          employeeById(
            el.dataset.mapHours
          );

        if(e){

          e.expectedHours =
            Number(
              el.value
              ||
              0
            );
        }
      }
    );

  state.employees.forEach(
    e => {

      if(
        e.employerLocked
      ){

        e.employer =
          e.connectionEmployer
          ||
          e.employer;

        e.excluded =
          false;
      }
    }
  );

  const invalid =
    state.employees.filter(
      e =>
        !e.excluded
        &&
        !e.employerLocked
        &&
        !String(
          e.employer
          ||
          ''
        ).trim()
    );

  if(
    invalid.length
  ){

    saveEmployees();

    toast(
      `${invalid.length} shared-connection employee(s) still need an employer or Internal / Exclude selection.`
    );

    return;
  }

  saveEmployees();

  ensureEmployerSelection();

  toast(
    'Employer mappings validated and saved for this prototype browser.'
  );
}

function saveContext(){

  const e =
    employee();

  if(!e){
    return;
  }

  if(
    !e.employerLocked
  ){

    e.employer =
      document
        .getElementById('contextEmployer')
        ?.value
        .trim()
      ||
      e.employer;
  }

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

function render(){

  let out =
    '';

  if(
    state.page==='dashboard'
  ){
    out=dashboard();
  }

  else if(
    state.page==='companies'
  ){
    out=companies();
  }

  else if(
    state.page==='employees'
  ){
    out=employees();
  }

  else if(
    state.page==='monitoring'
  ){
    out=monitoring();
  }

  else if(
    state.page==='reports'
  ){
    out=reports();
  }

  else if(
    state.page==='review'
  ){
    out=review();
  }

  else if(
    state.page==='subscriptions'
  ){
    out=subscriptions();
  }

  else if(
    state.page==='settings'
  ){
    out=settings();
  }

  else if(
    state.page==='dataSources'
  ){
    out=dataSources();
  }

  else if(
    state.page==='reportPreview'
  ){
    out=reportPreview();
  }

  document
    .getElementById('app')
    .innerHTML =
      out;

  bind();
}

function bind(){

  document
    .querySelectorAll(
      '[data-page]'
    )
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
    .querySelectorAll(
      '[data-open-id]'
    )
    .forEach(
      x => {

        x.onclick = () => {

          const target =
            employeeById(
              x.dataset.openId
            );

          if(
            state.role==='employer'
            &&
            target?.employer!==state.portalEmployer
          ){

            toast(
              'That employee is outside this employer portal.'
            );

            return;
          }

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
    .querySelectorAll(
      '[data-tab]'
    )
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
    document.getElementById(
      'reportEmployee'
    );

  if(se){

    se.onchange = () => {

      if(
        se.value!=='__ALL__'
      ){

        state.selectedEmployeeId =
          se.value;
      }
    };
  }

  const g =
    document.getElementById(
      'generateBtn'
    );

  if(g){
    g.onclick =
      generateReport;
  }

  const s =
    document.getElementById(
      'syncScrin'
    );

  if(s){
    s.onclick =
      syncScrin;
  }

  const t =
    document.getElementById(
      'testScrin'
    );

  if(t){
    t.onclick =
      testScrin;
  }

  const m =
    document.getElementById(
      'saveMappings'
    );

  if(m){
    m.onclick =
      saveMappings;
  }

  const c =
    document.getElementById(
      'saveContext'
    );

  if(c){
    c.onclick =
      saveContext;
  }

  const l =
    document.getElementById(
      'loadLiveDay'
    );

  if(l){
    l.onclick =
      loadLiveDay;
  }

  const rc =
    document.getElementById(
      'refreshConnections'
    );

  if(rc){
    rc.onclick =
      refreshConnections;
  }

  const add =
    document.getElementById(
      'toggleAddConnection'
    );

  if(add){

    add.onclick = () => {

      state.showAddConnection =
        !state.showAddConnection;

      render();
    };
  }

  const req =
    document.getElementById(
      'requestEmployerReport'
    );

  if(req){

    req.onclick = () =>
      toast(
        'Report request queued for White Glove review.'
      );
  }

  const a =
    document.getElementById(
      'approveBtn'
    );

  if(a){

    a.onclick = () => {

      if(
        !state.reviewerChecks.every(
          Boolean
        )
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
    .querySelectorAll(
      '[data-check]'
    )
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
    document.getElementById(
      'previewReport'
    );

  if(p){

    p.onclick = () => {

      state.page =
        'reportPreview';

      render();
    };
  }

  const rel =
    document.getElementById(
      'releaseBtn'
    );

  if(rel){

    rel.onclick = () => {

      if(
        state.reportStatus!=='Released'
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
          connectionId:e.connectionId,
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

  const role =
    document.getElementById(
      'roleSwitcher'
    );

  if(role){

    role.onchange = () =>
      setRole(
        role.value
      );
  }

  const empSwitch =
    document.getElementById(
      'employerSwitcher'
    );

  if(empSwitch){

    empSwitch.onchange = () => {

      state.portalEmployer =
        empSwitch.value;

      localStorage.setItem(
        'wgmPortalEmployer',
        state.portalEmployer
      );

      const team =
        portalEmployees();

      state.selectedEmployeeId =
        team[0]?.id
        ||
        '';

      render();
    };
  }

  const batch =
    document.getElementById(
      'batchGreen'
    );

  if(batch){

    batch.onclick = () => {

      const eligible =
        activeEmployees().filter(
          e =>
            reviewColor(e)
            ===
            'Green'
        ).length;

      toast(
        `${eligible} Green report(s) selected for batch approval. Yellow/Red reports remain excluded.`
      );
    };
  }

  const pr =
    document.getElementById(
      'printReport'
    );

  if(pr){

    pr.onclick =
      () =>
        window.print();
  }
}

async function initializeApp(){

  try{

    const response =
      await fetch(
        '/api/health'
      );

    const health =
      await response.json();

    state.mode =
      health.mode==='live'
        ? 'LIVE'
        : 'DEMO';

    if(
      state.mode==='LIVE'
    ){

      state.syncMessage =
        `Live Scrin configuration detected. ${
          health.connectionCount??'—'
        } connection(s) configured.`;
    }

  }catch(error){

    console.error(
      'Could not determine WGM connection mode:',
      error
    );
  }

  try{

    const response =
      await fetch(
        '/api/scrin/connections'
      );

    const data =
      await response.json();

    if(
      response.ok
      &&
      Array.isArray(
        data.connections
      )
    ){

      state.connections =
        data.connections;

      saveConnections();
    }

  }catch(error){

    console.error(
      'Could not load Scrin connections:',
      error
    );
  }

  if(
    state.role==='employer'
  ){
    ensureEmployerSelection();
  }

  render();
}

initializeApp();
