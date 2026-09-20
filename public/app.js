/* ==========================================================
   WHITE GLOVE MONITOR
   PROTOTYPE V1.5
   ==========================================================

   Includes:
   - Multi-Scrin source connections
   - Dedicated vs WGH Shared connections
   - Employer isolation
   - Complete daily screenshot evidence
   - Workday timeframe / sessions
   - Monitoring policies
   - Reviewer workflow
   - Premium five-page monthly report

   IMPORTANT:
   API credentials remain server-side.
   Never place Scrin or OpenAI API keys in this file.
   ========================================================== */


/* ==========================================================
   STATE
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

  reviewerChecks: [
    true,
    true,
    true,
    true,
    true
  ],

  reportPeriod: {
    from: '2026-08-01',
    to: '2026-08-31'
  },

  deliveryQueue: [],

  toast: null,

  syncMessage:
    'Demo data loaded. Connect Scrin to replace this with live employees.',

  role:
    localStorage.getItem('wgmRole')
    ||
    'owner',

  portalEmployer:
    localStorage.getItem('wgmPortalEmployer')
    ||
    '',

  showAddConnection: false
};


/* ==========================================================
   DEFAULT REPORT
   ========================================================== */

const defaultReport = {
  headline:
    'The reporting period shows generally consistent, business-relevant work.',

  summary:
    'Tracked time, workstreams and available evidence were reconciled against the employee baseline and supplied context. No unsupported conclusion has been added.',

  strengths: [
    'Tracked work is visible across the selected period.',
    'Available application and screenshot evidence supports the work summary.',
    'The report is ready for human validation before release.'
  ],

  coaching:
    'Continue using clear project labels and concise notes so future reports require less evidence escalation.',

  clientContext:
    'No additional client clarification is required in this prototype example.',

  nextFocus:
    'Maintain clear tracking labels and review any meaningful schedule variance before the next release.',

  integrity:
    'No material integrity conclusion should be made unless the available evidence supports it.'
};


/* ==========================================================
   DEMO EMPLOYEES
   ========================================================== */

const demoEmployees = [
  {
    id: 'demo-main::477279',

    connectionId: 'demo-main',
    connectionName: 'Demo Scrin Connection',
    connectionType: 'shared',
    connectionEmployer: '',
    employerLocked: false,

    employmentId: '477279',

    name: 'Maria Gadin',
    initials: 'MG',

    employer:
      'Grider & Peterson Real Estate',

    scrinCompany:
      'WGH Scrin Account',

    source:
      'WGH Managed',

    role:
      'Virtual Assistant',

    timezone:
      'UTC-07:00',

    timezoneOffsetMinutes:
      -420,

    schedule:
      'Monday–Friday · 8 hours/day · 40 hours/week',

    expectedHours:
      160,

    trackedHours:
      161.4167,

    activeDays:
      20,

    concerns:
      0,

    excluded:
      false,

    context:
      'No approved leave or schedule adjustment for the August benchmark.',

    monitoringPolicy: {
      enabled: true,
      mode: 'hourly',
      screenshotsPerHour: 12,
      dailyTarget: 96,
      expectedDayHours: 8,
      activityTracking: true,
      appUrlTracking: true,
      autoPauseMinutes: 5,
      employeeNotification: true,
      providerSyncStatus:
        'Saved in WGM · provider write not connected'
    },

    workstreams: [
      ['Marketing & content',30],
      ['Listings & research',22],
      ['Transactions',16],
      ['Communication',13],
      ['Admin & operations',11],
      ['Files & documents',8]
    ],

    apps: [
      ['Outlook / Microsoft',31],
      ['Canva',20],
      ['NavicaMLS / property systems',18],
      ['Browser research',14],
      ['WhatsApp / communications',9],
      ['Other business tools',8]
    ],

    weeks: [
      [
        'Aug 3–7',
        '40h 28m',
        'Listing research, property updates, email coordination, database work, marketing, and general support.'
      ],
      [
        'Aug 10–14',
        '40h 32m',
        'Marketing content, listing materials, transactions, file work, research, and client-facing communications.'
      ],
      [
        'Aug 17–21',
        '40h 11m',
        'Marketing reports and assets, transaction support, listing research, document handling, and operations.'
      ],
      [
        'Aug 24–28',
        '40h 14m',
        'Marketing, transactions, general tasks, property research, communications, and operational support.'
      ]
    ],

    shots: [
      [
        '8:46 AM',
        'Instagram / marketing',
        68
      ],
      [
        '8:52 AM',
        'Outlook',
        76
      ],
      [
        '8:53 AM',
        'NavicaMLS',
        82
      ],
      [
        '8:56 AM',
        'Canva',
        73
      ]
    ],

    reportingStatus:
      'Ready'
  },

  {
    id: 'demo-main::500002',

    connectionId: 'demo-main',
    connectionName: 'Demo Scrin Connection',
    connectionType: 'shared',
    connectionEmployer: '',
    employerLocked: false,

    employmentId: '500002',

    name: 'VA 2 — sync to reveal',
    initials: 'V2',

    employer:
      'Employer B',

    scrinCompany:
      'WGH Scrin Account',

    source:
      'WGH Managed',

    role:
      'Virtual Assistant',

    timezone:
      'UTC-05:00',

    timezoneOffsetMinutes:
      -300,

    schedule:
      'Monday–Friday · 8 hours/day · 40 hours/week',

    expectedHours:
      160,

    trackedHours:
      154.75,

    activeDays:
      20,

    concerns:
      0,

    excluded:
      false,

    context:
      'Example approved half-day included for prototype testing.',

    monitoringPolicy: {
      enabled: true,
      mode: 'hourly',
      screenshotsPerHour: 12,
      dailyTarget: 96,
      expectedDayHours: 8,
      activityTracking: true,
      appUrlTracking: true,
      autoPauseMinutes: 5,
      employeeNotification: true,
      providerSyncStatus:
        'Saved in WGM · provider write not connected'
    },

    workstreams: [
      ['CRM & follow-up',34],
      ['Client support',24],
      ['Transactions',18],
      ['Operations',13],
      ['Meetings',7],
      ['Other',4]
    ],

    apps: [
      ['CRM',35],
      ['Email',27],
      ['Browser',16],
      ['Meetings',12],
      ['Documents',10]
    ],

    weeks: [
      [
        'Aug 3–7',
        '39h 10m',
        'CRM follow-up and client support.'
      ],
      [
        'Aug 10–14',
        '40h 02m',
        'Transactions and client coordination.'
      ],
      [
        'Aug 17–21',
        '36h 30m',
        'Approved schedule adjustment applied.'
      ],
      [
        'Aug 24–28',
        '39h 03m',
        'CRM and operations.'
      ]
    ],

    shots: [
      ['9:05 AM','CRM',72],
      ['9:18 AM','Outlook',65],
      ['9:31 AM','CRM',81]
    ],

    reportingStatus:
      'Context applied'
  }
];


/* ==========================================================
   LOCAL STORAGE
   ========================================================== */

function loadLocalEmployees(){

  try {

    const value =
      JSON.parse(
        localStorage.getItem(
          'wgmEmployees'
        )
        ||
        'null'
      );

    return (
      Array.isArray(value)
      &&
      value.length
    )
      ? value
      : demoEmployees;

  } catch {

    return demoEmployees;
  }
}


function loadLocalConnections(){

  try {

    const value =
      JSON.parse(
        localStorage.getItem(
          'wgmConnections'
        )
        ||
        'null'
      );

    return Array.isArray(value)
      ? value
      : [];

  } catch {

    return [];
  }
}


function saveEmployees(){

  try {

    localStorage.setItem(
      'wgmEmployees',
      JSON.stringify(
        state.employees
      )
    );

  } catch {}
}


function saveConnections(){

  try {

    localStorage.setItem(
      'wgmConnections',
      JSON.stringify(
        state.connections
      )
    );

  } catch {}
}


state.employees =
  loadLocalEmployees();

state.connections =
  loadLocalConnections();

if(
  state.employees.length
  &&
  !state.selectedEmployeeId
){

  state.selectedEmployeeId =
    state.employees[0].id;
}


/* ==========================================================
   GENERAL HELPERS
   ========================================================== */

function escapeHtml(value=''){

  return String(value).replace(
    /[&<>"']/g,
    char => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char])
  );
}


function initials(name=''){

  return name

    .split(/\s+/)

    .filter(Boolean)

    .slice(0,2)

    .map(
      part =>
        part[0]
    )

    .join('')

    .toUpperCase()

    ||
    'VA';
}


function hoursLabel(decimal=0){

  const totalMinutes =
    Math.max(
      0,
      Math.round(
        Number(decimal || 0)
        *
        60
      )
    );

  return (
    `${Math.floor(totalMinutes/60)}h `
    +
    `${String(totalMinutes%60).padStart(2,'0')}m`
  );
}


function coverage(e){

  if(
    !Number(
      e?.expectedHours
    )
  ){
    return null;
  }

  return Math.min(
    100,
    Math.round(
      (
        Number(
          e.trackedHours
          ||
          0
        )
        /
        Number(
          e.expectedHours
        )
      )
      *
      1000
    )
    /
    10
  );
}


function statusClass(status=''){

  if(
    /Released|Approved|Healthy|Complete|Ready|Connected|Paid|Active/i
      .test(status)
  ){
    return 'green';
  }

  if(
    /Context|Pending|Review|Trial|Queued|Planned|Configured/i
      .test(status)
  ){
    return 'amber';
  }

  if(
    /Past|Failed|Concern|Hold|Error|Suspended/i
      .test(status)
  ){
    return 'red';
  }

  return 'blue';
}


function toast(message){

  state.toast =
    message;

  render();

  setTimeout(
    ()=>{
      state.toast = null;
      render();
    },
    2300
  );
}


function metric(
  label,
  value,
  sub
){

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


function mixBar(
  label,
  value,
  total=100
){

  const pct =
    total

      ? Math.max(
          0,
          Math.min(
            100,
            (
              value
              /
              total
            )
            *
            100
          )
        )

      : 0;

  return `
    <div class="work-row">

      <b>
        ${escapeHtml(label)}
      </b>

      <div class="progress">

        <span
          style="width:${pct}%"
        ></span>

      </div>

      <span>

        ${Math.round(value)}

        ${
          total===100
            ? '%'
            : ''
        }

      </span>

    </div>
  `;
}


/* ==========================================================
   EMPLOYEE / TENANCY HELPERS
   ========================================================== */

function activeEmployees(){

  return state.employees.filter(
    e =>
      !e.excluded
  );
}


function mappedEmployers(){

  return [
    ...new Set(
      activeEmployees()

        .map(
          e =>
            e.employer
        )

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
        String(
          state.selectedEmployeeId
        )
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
    state.role === 'employer'
  ){

    const team =
      portalEmployees();

    return (
      team.find(
        e =>
          String(e.id)
          ===
          String(
            state.selectedEmployeeId
          )
      )
      ||
      team[0]
      ||
      null
    );
  }


  if(
    state.role === 'employee'
  ){

    const selected =
      employeeById(
        state.selectedEmployeeId
      );

    if(
      selected
      &&
      !selected.excluded
    ){
      return selected;
    }

    return (
      activeEmployees()[0]
      ||
      null
    );
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
    state.role === 'employer'
  ){
    return portalEmployees();
  }

  if(
    state.role === 'employee'
  ){

    const e =
      employee();

    return e
      ? [e]
      : [];
  }

  return activeEmployees();
}


/* ==========================================================
   ROLE HELPERS
   ========================================================== */

function roleLabel(){

  return {
    owner:
      'WGM Owner',

    reviewer:
      'White Glove Reviewer',

    employer:
      'Employer Portal',

    employee:
      'Employee Portal'

  }[state.role]

  ||

  'WGM Owner';
}


function roleSubLabel(){

  return {
    owner:
      'Super Admin',

    reviewer:
      'Assigned Accounts',

    employer:
      'Company Owner / Admin',

    employee:
      'My Work'

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

  state.employeeTab =
    'overview';


  if(
    role === 'employer'
  ){
    ensureEmployerSelection();
  }


  if(
    role === 'employee'
  ){

    const current =
      employeeById(
        state.selectedEmployeeId
      );

    if(
      !current
      ||
      current.excluded
    ){

      state.selectedEmployeeId =
        activeEmployees()[0]?.id
        ||
        '';
    }
  }

  render();
}


/* ==========================================================
   NAVIGATION
   ========================================================== */

function navButton(
  id,
  label,
  badge=''
){

  return `
    <button
      data-page="${id}"
      class="${
        state.page===id
          ? 'active'
          : ''
      }"
    >

      <span>
        ${label}
      </span>

      ${
        badge

          ? `
            <span class="badge">
              ${badge}
            </span>
            `

          : ''
      }

    </button>
  `;
}


function navMarkup(){

  if(
    state.role === 'reviewer'
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
    state.role === 'employer'
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
    state.role === 'employee'
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


/* ==========================================================
   PAGE SHELL
   ========================================================== */

function shell(
  content,
  title
){

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

              <div
                style="
                  font-size:11px;
                  opacity:.7
                "
              >
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

              ${state.mode}
              MODE
              ·
              Multi-source V1.5

            </div>

          </div>

        </header>


        <section class="content">
          ${content}
        </section>

      </main>


      ${
        state.toast

          ? `
            <div class="toast">
              ${escapeHtml(state.toast)}
            </div>
            `

          : ''
      }

    </div>
  `;
}


/* ==========================================================
   OWNER DASHBOARD
   ========================================================== */

function dashboard(){

  if(
    state.role === 'employer'
  ){
    return employerDashboard();
  }

  if(
    state.role === 'employee'
  ){
    return employeeDashboard();
  }

  if(
    state.role === 'reviewer'
  ){
    return reviewerDashboard();
  }


  const employees =
    activeEmployees();


  const employerCount =
    new Set(
      employees

        .map(
          e =>
            e.employer
        )

        .filter(Boolean)
    ).size;


  const reviewCount =
    employees.filter(
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

          Multiple capture connections feed one
          WGM evidence, review and reporting platform
          while employer data remains isolated.

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
          employees.length,
          'Reportable employees'
        )
      }

      ${
        metric(
          'Needs review',
          reviewCount,
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

          Every source employee
          is bound to a connection
          and a WGM employer
          before customer access.

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
              employees.map(
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

                    <span
                      class="status ${statusClass(e.reportingStatus)}"
                    >

                      <span class="dot"></span>

                      ${escapeHtml(
                        e.reportingStatus
                        ||
                        'Synced'
                      )}

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

            Every employee discovered
            through that Scrin connection
            is locked to the employer
            that owns the connection.

          </p>

        </div>


        <div class="context-box">

          <h4>
            WGH shared connection
          </h4>

          <p>

            Each employee must be mapped
            to an employer
            or explicitly marked
            Internal / Excluded.

          </p>

        </div>


        <div class="context-box">

          <h4>
            Employer portal
          </h4>

          <p>

            Employers see only employees
            belonging to their organization.

          </p>

        </div>

      </div>

    </div>
    `,
    'Dashboard'
  );
}


/* ==========================================================
   EMPLOYER DASHBOARD
   ========================================================== */

function employerDashboard(){

  const team =
    portalEmployees();


  const tracked =
    team.reduce(
      (sum,e) =>
        sum
        +
        Number(
          e.trackedHours
          ||
          0
        ),
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
        e.reportingStatus === 'Released'
        ||
        (
          state.reportEmployeeId === e.id
          &&
          state.reportStatus === 'Released'
        )
    ).length;


  return shell(
    `
    <div class="header-row">

      <div>

        <h2>

          ${escapeHtml(
            state.portalEmployer
            ||
            'Employer'
          )}

          Workforce Overview

        </h2>

        <p>

          This portal is scoped
          to one employer only.

        </p>

      </div>


      <select
        id="employerSwitcher"
        class="map-input"
      >

        ${
          mappedEmployers().map(
            employer => `
            <option
              value="${escapeHtml(employer)}"
              ${
                employer===state.portalEmployer
                  ? 'selected'
                  : ''
              }
            >
              ${escapeHtml(employer)}
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
          hoursLabel(tracked),
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
              team.length

                ? team.map(
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

                        <span
                          class="status ${statusClass(e.reportingStatus)}"
                        >

                          <span class="dot"></span>

                          ${escapeHtml(
                            e.reportingStatus
                            ||
                            'Synced'
                          )}

                        </span>

                      </td>

                    </tr>
                    `
                  ).join('')

                : `
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

            Your roster,
            hours,
            screenshots,
            monitoring policies,
            workstreams,
            released reports
            and billing.

          </p>

        </div>


        <div class="context-box">

          <h4>
            Not visible
          </h4>

          <p>

            Other employers,
            their employees,
            unreleased reports,
            reviewer notes
            or unrelated Scrin connections.

          </p>

        </div>

      </div>

    </div>
    `,
    'Employer Portal'
  );
}


/* ==========================================================
   EMPLOYEE DASHBOARD
   ========================================================== */

function employeeDashboard(){

  const e =
    employee();


  if(!e){

    return shell(
      `
      <div class="card empty">
        No employee selected.
      </div>
      `,
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

          ${escapeHtml(
            e.employer
            ||
            'Employer'
          )}

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
          escapeHtml(
            e.reportingStatus
            ||
            'Synced'
          ),
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

          This view contains only
          this employee's own
          authorized information.

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


/* ==========================================================
   REVIEWER DASHBOARD
   ========================================================== */

function reviewerDashboard(){

  const employees =
    activeEmployees();


  const flagged =
    employees.filter(
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

          Assigned reports are triaged
          before customer release.

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
          employees.length,
          'Across authorized employers'
        )
      }

      ${
        metric(
          'Green eligible',
          employees.filter(
            e =>
              reviewColor(e)==='Green'
          ).length,
          'Can be batch approved'
        )
      }

      ${
        metric(
          'Yellow / Red',
          flagged.length,
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


/* ==========================================================
   REVIEW STATUS
   ========================================================== */

function reviewColor(e){

  const cov =
    coverage(e);


  if(
    Number(
      e.concerns
      ||
      0
    )
    >
    1
  ){
    return 'Red';
  }


  if(
    Number(
      e.concerns
      ||
      0
    )
    ===
    1
    ||
    (
      cov !== null
      &&
      cov < 90
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


/* ==========================================================
   COMPANIES
   ========================================================== */

function companies(){

  const groups = {};


  activeEmployees().forEach(
    e => {

      const employer =
        e.employer
        ||
        'Unassigned';

      (
        groups[employer]
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

          WGM employer mapping
          is the customer isolation boundary.

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
              ([name,employees]) => `
              <tr>

                <td>
                  ${escapeHtml(name)}
                </td>

                <td>
                  ${employees.length}
                </td>

                <td>

                  ${
                    new Set(
                      employees.map(
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


/* ==========================================================
   EMPLOYEES / MY TEAM
   ========================================================== */

function employees(){

  const employees =
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
            employees.map(
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

                  <span
                    class="status ${statusClass(e.reportingStatus)}"
                  >

                    <span class="dot"></span>

                    ${escapeHtml(
                      e.reportingStatus
                      ||
                      'Synced'
                    )}

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


/* ==========================================================
   MONITORING
   ========================================================== */

function monitoring(){

  return employeeView();
}


function employeeView(){

  const e =
    employee();


  if(!e){

    return shell(
      `
      <div class="card empty">

        No employee is available
        in this portal.

      </div>
      `,
      'Employee Monitoring'
    );
  }


  const tabs = [
    'overview',
    'timeline',
    'screenshots',
    'workstreams',
    'apps',
    'policy'
  ];


  if(
    state.role !== 'employee'
  ){
    tabs.push(
      'context'
    );
  }


  tabs.push(
    'reports'
  );


  const labels = {
    overview:
      'Overview',

    timeline:
      'Timeline',

    screenshots:
      'Screenshots',

    workstreams:
      'Workstreams',

    apps:
      'Apps & URLs',

    policy:
      'Monitoring Settings',

    context:
      'Context',

    reports:
      'Reports'
  };


  return shell(
    `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">

          ${escapeHtml(
            e.initials
            ||
            initials(e.name)
          )}

        </div>


        <div>

          <h2 style="margin:0">
            ${escapeHtml(e.name)}
          </h2>

          <div class="small">

            ${escapeHtml(
              e.employer
              ||
              'Unassigned employer'
            )}

            ·

            ${escapeHtml(
              e.role
              ||
              'Virtual Assistant'
            )}

            ·

            ${escapeHtml(
              e.connectionName
              ||
              'Scrin'
            )}

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
            tab => `
            <button
              class="tab ${
                state.employeeTab===tab
                  ? 'active'
                  : ''
              }"
              data-tab="${tab}"
            >
              ${labels[tab]}
            </button>
            `
          ).join('')
        }

      </div>


      ${
        state.employeeTab==='policy'

          ? monitoringPolicyView(e)

          : employeeTabContent(e)
      }

    </div>
    `,
    'Employee Monitoring'
  );
}


/* ==========================================================
   EMPLOYEE TAB CONTENT
   ========================================================== */

function employeeTabContent(e){

  if(
    state.employeeTab === 'screenshots'
  ){
    return screenshotView(e);
  }


  if(
    state.employeeTab === 'workstreams'
  ){

    return `
      <div class="grid two-col">

        <div>

          ${
            (e.workstreams||[])
              .map(
                item =>
                  mixBar(
                    item[0],
                    item[1]
                  )
              )
              .join('')

            ||

            `
            <div class="empty">

              Generate or sync period data
              to populate workstreams.

            </div>
            `
          }

        </div>


        <div class="callout">

          <strong>
            Reporting rule
          </strong>

          Project and application evidence
          supports interpretation.

          It is not a standalone
          productivity verdict.

        </div>

      </div>
    `;
  }


  if(
    state.employeeTab === 'apps'
  ){

    return `
      <div class="grid two-col">

        <div>

          ${
            (e.apps||[])
              .map(
                item =>
                  mixBar(
                    item[0],
                    item[1]
                  )
              )
              .join('')

            ||

            `
            <div class="empty">

              Sync screenshot metadata
              to populate apps and URLs.

            </div>
            `
          }

        </div>


        <div class="context-box">

          <h4>
            How WGM uses this
          </h4>

          <p>

            Applications and URLs
            help establish business relevance
            and repeated work patterns.

            They are contextual evidence,
            not a performance score.

          </p>

        </div>

      </div>
    `;
  }


  if(
    state.employeeTab === 'context'
  ){
    return contextView(e);
  }


  if(
    state.employeeTab === 'reports'
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
    state.employeeTab === 'timeline'
  ){

    return `
      <div class="banner">

        <div>

          <div class="big">

            ${
              hoursLabel(
                Math.min(
                  8.1,

                  Number(
                    e.trackedHours
                    ||
                    0
                  )
                  /
                  Math.max(
                    Number(
                      e.activeDays
                      ||
                      1
                    ),
                    1
                  )
                )
              )
            }

          </div>

          <div class="muted">

            Representative tracked day

            ·

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

        <span
          style="
            left:27%;
            width:34%
          "
        ></span>

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
              ${escapeHtml(
                e.workstreams?.[0]?.[0]
                ||
                'Project'
              )}
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
              week => `
              <div class="context-box">

                <h4>

                  ${escapeHtml(week[0])}

                  ·

                  ${escapeHtml(week[1])}

                </h4>

                <p>
                  ${escapeHtml(week[2])}
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


/* ==========================================================
   DAILY TIME HELPERS
   ========================================================== */

function dayEpochRange(
  dateString,
  offsetMinutes=0
){

  const startMilliseconds =
    Date.parse(
      `${dateString}T00:00:00Z`
    )
    -
    (
      Number(offsetMinutes||0)
      *
      60
      *
      1000
    );


  const endMilliseconds =
    startMilliseconds
    +
    (24 * 60 * 60 * 1000)
    -
    1000;


  return {
    from:
      Math.floor(
        startMilliseconds
        /
        1000
      ),

    to:
      Math.floor(
        endMilliseconds
        /
        1000
      )
  };
}


function timeLabel(
  epochSeconds,
  offsetMinutes=0
){

  if(
    epochSeconds === null
    ||
    epochSeconds === undefined
  ){
    return '—';
  }


  const adjusted =
    new Date(
      (
        Number(epochSeconds)
        +
        (
          Number(offsetMinutes||0)
          *
          60
        )
      )
      *
      1000
    );


  let hours =
    adjusted.getUTCHours();


  const minutes =
    String(
      adjusted.getUTCMinutes()
    ).padStart(
      2,
      '0'
    );


  const suffix =
    hours >= 12
      ? 'PM'
      : 'AM';


  hours =
    hours % 12;


  if(
    hours === 0
  ){
    hours = 12;
  }


  return (
    `${hours}:`
    +
    `${minutes} `
    +
    suffix
  );
}


function validIntervals(
  activities=[]
){

  return activities

    .map(
      activity => [
        Number(activity.from),
        Number(activity.to)
      ]
    )

    .filter(
      interval =>
        Number.isFinite(
          interval[0]
        )
        &&
        Number.isFinite(
          interval[1]
        )
        &&
        interval[1]
        >
        interval[0]
    )

    .sort(
      (a,b) =>
        a[0]
        -
        b[0]
    );
}


function unionTrackedSeconds(
  activities=[]
){

  const intervals =
    validIntervals(
      activities
    );


  if(
    !intervals.length
  ){
    return 0;
  }


  let total =
    0;


  let currentStart =
    intervals[0][0];


  let currentEnd =
    intervals[0][1];


  for(
    let i=1;
    i<intervals.length;
    i++
  ){

    const [
      start,
      end
    ] =
      intervals[i];


    if(
      start
      <=
      currentEnd
    ){

      currentEnd =
        Math.max(
          currentEnd,
          end
        );

    } else {

      total +=
        currentEnd
        -
        currentStart;


      currentStart =
        start;


      currentEnd =
        end;
    }
  }


  total +=
    currentEnd
    -
    currentStart;


  return total;
}


function workSessions(
  activities=[],
  gapToleranceSeconds=90
){

  const intervals =
    validIntervals(
      activities
    );


  if(
    !intervals.length
  ){
    return [];
  }


  const sessions =
    [];


  let currentStart =
    intervals[0][0];


  let currentEnd =
    intervals[0][1];


  for(
    let i=1;
    i<intervals.length;
    i++
  ){

    const [
      start,
      end
    ] =
      intervals[i];


    if(
      start
      <=
      currentEnd
      +
      gapToleranceSeconds
    ){

      currentEnd =
        Math.max(
          currentEnd,
          end
        );

    } else {

      sessions.push(
        [
          currentStart,
          currentEnd
        ]
      );


      currentStart =
        start;


      currentEnd =
        end;
    }
  }


  sessions.push(
    [
      currentStart,
      currentEnd
    ]
  );


  return sessions;
}


function screenshotApplication(
  screenshot
){

  const applications =
    Array.isArray(
      screenshot?.applications
    )
      ? screenshot.applications
      : [];


  return (
    applications.find(
      app =>
        app.fromScreen
    )?.applicationName

    ||

    applications[0]
      ?.applicationName

    ||

    'Screenshot'
  );
}


/* ==========================================================
   SCREENSHOT CARD
   ========================================================== */

function shotCard(
  time,
  app,
  level,
  thumbUrl,
  fullUrl
){

  const thumbnail =
    thumbUrl
      ? escapeHtml(thumbUrl)
      : '';


  const full =
    fullUrl
      ? escapeHtml(fullUrl)
      : thumbnail;


  const image =
    thumbnail

      ? `
        <a
          href="${full}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <img
            src="${thumbnail}"
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
              '<div class=&quot;empty&quot; style=&quot;padding:24px&quot;>Screenshot image could not be loaded.</div>';
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
          ${level ?? '—'}%

          ·

          Scrin evidence

        </span>

      </div>

    </div>
  `;
}


/* ==========================================================
   SCREENSHOT VIEW
   ========================================================== */

function screenshotView(e){

  const summary =
    e.daySummary
    ||
    null;


  const selectedDate =
    summary?.date
    ||
    '2026-09-18';


  const sessionsMarkup =
    summary?.sessions?.length

      ? `
        <div
          class="context-box"
          style="margin:0 0 16px"
        >

          <h4>
            Tracked work sessions
          </h4>

          <p>

            ${
              summary.sessions

                .map(
                  session =>
                    `${escapeHtml(session.from)}–${escapeHtml(session.to)} (${hoursLabel(session.seconds/3600)})`
                )

                .join(' · ')
            }

          </p>

        </div>
        `

      : '';


  const summaryMarkup =
    summary

      ? `
        <div
          class="grid metrics"
          style="margin:16px 0"
        >

          ${
            metric(
              'First tracked',
              escapeHtml(
                summary.firstTracked
                ||
                '—'
              ),
              'Start of recorded work'
            )
          }

          ${
            metric(
              'Last tracked',
              escapeHtml(
                summary.lastTracked
                ||
                '—'
              ),
              'End of recorded work'
            )
          }

          ${
            metric(
              'Recorded time',

              hoursLabel(
                Number(
                  summary.trackedSeconds
                  ||
                  0
                )
                /
                3600
              ),

              'Overlapping intervals reconciled'
            )
          }

          ${
            metric(
              'Screenshots',

              Number(
                summary.screenshotCount
                ||
                0
              ),

              'Evidence captures returned'
            )
          }

        </div>

        ${sessionsMarkup}

        <div
          class="small"
          style="
            margin-bottom:14px;
            opacity:.72
          "
        >

          Times shown using

          ${escapeHtml(
            summary.timezone
            ||
            e.timezone
            ||
            'the employee timezone'
          )}.

        </div>
        `

      : `
        <div
          class="callout"
          style="margin:16px 0"
        >

          <strong>
            Workday summary
          </strong>

          Select a date
          and click

          <b>
            Load complete day from Scrin
          </b>

          to display first tracked time,
          last tracked time,
          recorded hours,
          tracked sessions
          and all available screenshots.

        </div>
        `;


  return `
    <div class="toolbar">

      <div class="field">

        <label>
          Date
        </label>

        <input
          id="screenDate"
          type="date"
          value="${escapeHtml(selectedDate)}"
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
            (e.workstreams||[]).map(
              item => `
              <option>
                ${escapeHtml(item[0])}
              </option>
              `
            ).join('')
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
            (e.apps||[]).map(
              item => `
              <option>
                ${escapeHtml(item[0])}
              </option>
              `
            ).join('')
          }

        </select>

      </div>


      <div class="spacer"></div>


      <button
        class="btn primary"
        id="loadLiveDay"
      >
        Load complete day from Scrin
      </button>

    </div>


    ${summaryMarkup}


    <div class="banner">

      <div>

        <div class="big">
          Daily screenshot evidence
        </div>

        <div class="muted">

          ${
            summary

              ? `${summary.screenshotCount} available evidence capture(s) loaded for ${summary.date}.`

              : 'Load a workday to inspect all available evidence captures.'
          }

        </div>

      </div>


      <span class="status blue">

        <span class="dot"></span>

        ${escapeHtml(
          e.connectionName
          ||
          'Scrin evidence'
        )}

      </span>

    </div>


    <div id="shotArea">

      <div class="shot-grid">

        ${
          (e.shots||[])

            .map(
              screenshot =>
                shotCard(
                  screenshot[0],
                  screenshot[1],
                  screenshot[2],
                  screenshot[3],
                  screenshot[4]
                )
            )

            .join('')

          ||

          `
          <div class="empty">
            No screenshot evidence loaded.
          </div>
          `
        }

      </div>

    </div>
  `;
}


/* ==========================================================
   LOAD COMPLETE DAY
   ========================================================== */

async function loadLiveDay(){

  const e =
    employee();


  const date =
    document
      .getElementById(
        'screenDate'
      )
      ?.value;


  if(
    !e
    ||
    !date
  ){
    return;
  }


  if(
    state.mode !== 'LIVE'
  ){

    toast(
      'Live Scrin connection is required to load daily evidence.'
    );

    return;
  }


  const area =
    document.getElementById(
      'shotArea'
    );


  if(area){

    area.innerHTML =
      `
      <div class="empty">
        Loading the complete Scrin workday…
      </div>
      `;
  }


  try {

    const offset =
      Number(
        e.timezoneOffsetMinutes
        ||
        0
      );


    const range =
      dayEpochRange(
        date,
        offset
      );


    /* ----------------------------------
       LOAD ALL ACTIVITIES
       ---------------------------------- */

    const activityResponse =
      await fetch(
        '/api/scrin/activities',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({

              connectionId:
                e.connectionId,

              ranges: [
                {
                  employmentId:
                    String(
                      e.employmentId
                    ),

                  from:
                    range.from,

                  to:
                    range.to
                }
              ]
            })
        }
      );


    const activityData =
      await activityResponse.json();


    if(
      !activityResponse.ok
    ){

      throw new Error(
        activityData.error
        ||
        'Could not load activities'
      );
    }


    const activities =
      Array.isArray(
        activityData.activities
      )
        ? activityData.activities
        : [];


    const activityIds =
      [
        ...new Set(
          activities

            .map(
              activity =>
                activity.id
            )

            .filter(Boolean)
        )
      ];


    /* ----------------------------------
       LOAD ALL SCREENSHOTS IN BATCHES
       ---------------------------------- */

    let screenshots =
      [];


    for(
      let i=0;
      i<activityIds.length;
      i+=100
    ){

      const batch =
        activityIds.slice(
          i,
          i+100
        );


      const screenshotResponse =
        await fetch(
          '/api/scrin/screenshots',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                connectionId:
                  e.connectionId,

                activityIds:
                  batch
              })
          }
        );


      const screenshotData =
        await screenshotResponse.json();


      if(
        !screenshotResponse.ok
      ){

        throw new Error(
          screenshotData.error
          ||
          'Could not load screenshots'
        );
      }


      if(
        Array.isArray(
          screenshotData.screenshots
        )
      ){

        screenshots.push(
          ...screenshotData.screenshots
        );
      }
    }


    /* ----------------------------------
       REMOVE DUPLICATES
       ---------------------------------- */

    const unique =
      new Map();


    screenshots.forEach(
      screenshot => {

        const key =
          screenshot.id

          ||

          (
            `${screenshot.activityId}-`
            +
            `${screenshot.taken}`
          );


        unique.set(
          key,
          screenshot
        );
      }
    );


    screenshots =
      [
        ...unique.values()
      ]

      .sort(
        (a,b) =>
          Number(
            a.taken
            ||
            0
          )
          -
          Number(
            b.taken
            ||
            0
          )
      );


    /* ----------------------------------
       STORE FULL SCREENSHOT GALLERY
       ---------------------------------- */

    e.shots =
      screenshots.map(
        screenshot => [

          timeLabel(
            screenshot.taken,
            offset
          ),

          screenshotApplication(
            screenshot
          ),

          Number(
            screenshot.activityLevel
          )
          ||
          null,

          screenshot.thumbUrl
          ||
          screenshot.url
          ||
          null,

          screenshot.url
          ||
          screenshot.thumbUrl
          ||
          null
        ]
      );


    /* ----------------------------------
       WORKDAY SUMMARY
       ---------------------------------- */

    const intervals =
      validIntervals(
        activities
      );


    const firstTracked =
      intervals.length
        ? intervals[0][0]
        : null;


    const lastTracked =
      intervals.length

        ? Math.max(
            ...intervals.map(
              interval =>
                interval[1]
            )
          )

        : null;


    const sessions =
      workSessions(
        activities
      )

      .map(
        session => ({

          from:
            timeLabel(
              session[0],
              offset
            ),

          to:
            timeLabel(
              session[1],
              offset
            ),

          seconds:
            session[1]
            -
            session[0]
        })
      );


    e.daySummary = {

      date,

      firstTracked:
        timeLabel(
          firstTracked,
          offset
        ),

      lastTracked:
        timeLabel(
          lastTracked,
          offset
        ),

      trackedSeconds:
        unionTrackedSeconds(
          activities
        ),

      screenshotCount:
        screenshots.length,

      activityCount:
        intervals.length,

      sessions,

      timezone:
        e.timezone
        ||
        'Employee timezone'
    };


    saveEmployees();

    render();


  } catch(error){

    toast(
      `Could not load the complete workday: ${error.message}`
    );
  }
}


/* ==========================================================
   MONITORING POLICY
   ========================================================== */

function defaultMonitoringPolicy(){

  return {
    enabled:
      true,

    mode:
      'hourly',

    screenshotsPerHour:
      12,

    dailyTarget:
      96,

    expectedDayHours:
      8,

    activityTracking:
      true,

    appUrlTracking:
      true,

    autoPauseMinutes:
      5,

    employeeNotification:
      true,

    providerSyncStatus:
      'Saved in WGM · provider write not connected'
  };
}


function monitoringPolicy(e){

  if(
    !e.monitoringPolicy
  ){

    e.monitoringPolicy =
      defaultMonitoringPolicy();

    saveEmployees();
  }

  return e.monitoringPolicy;
}


function canEditMonitoringPolicy(){

  return (
    state.role === 'owner'
    ||
    state.role === 'employer'
  );
}


function monitoringPolicyView(e){

  const policy =
    monitoringPolicy(e);


  const editable =
    canEditMonitoringPolicy();


  const disabled =
    editable
      ? ''
      : 'disabled';


  const expectedDayHours =
    Number(
      policy.expectedDayHours
      ||
      8
    );


  const hourlyEquivalent =
    policy.mode === 'daily'

      ? (
          Number(
            policy.dailyTarget
            ||
            0
          )
          /
          Math.max(
            expectedDayHours,
            0.5
          )
        )

      : Number(
          policy.screenshotsPerHour
          ||
          0
        );


  const estimatedDaily =
    policy.mode === 'daily'

      ? Number(
          policy.dailyTarget
          ||
          0
        )

      : Math.round(
          Number(
            policy.screenshotsPerHour
            ||
            0
          )
          *
          expectedDayHours
        );


  return `
    <div class="grid two-col">

      <div>

        <div class="panel-title">
          Monitoring Policy
        </div>


        <div class="field">

          <label>
            Screenshot capture
          </label>

          <select
            id="policyEnabled"
            ${disabled}
          >

            <option
              value="true"
              ${
                policy.enabled
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !policy.enabled
                  ? 'selected'
                  : ''
              }
            >
              Disabled
            </option>

          </select>

        </div>


        <div class="field">

          <label>
            Capture mode
          </label>

          <select
            id="policyMode"
            ${disabled}
          >

            <option
              value="hourly"
              ${
                policy.mode==='hourly'
                  ? 'selected'
                  : ''
              }
            >
              Screenshots per tracked hour
            </option>

            <option
              value="daily"
              ${
                policy.mode==='daily'
                  ? 'selected'
                  : ''
              }
            >
              Daily screenshot target
            </option>

          </select>

        </div>


        <div
          class="field"
          id="policyHourlyWrap"
          style="${
            policy.mode==='hourly'
              ? ''
              : 'display:none'
          }"
        >

          <label>
            Screenshots per tracked hour
          </label>

          <input
            id="policyShotsPerHour"
            type="number"
            min="1"
            max="30"
            step="1"
            value="${
              Number(
                policy.screenshotsPerHour
                ||
                12
              )
            }"
            ${disabled}
          >

        </div>


        <div
          class="field"
          id="policyDailyWrap"
          style="${
            policy.mode==='daily'
              ? ''
              : 'display:none'
          }"
        >

          <label>
            Desired screenshots per workday
          </label>

          <input
            id="policyDailyTarget"
            type="number"
            min="1"
            step="1"
            value="${
              Number(
                policy.dailyTarget
                ||
                96
              )
            }"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Expected workday hours
          </label>

          <input
            id="policyExpectedDayHours"
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value="${
              Number(
                policy.expectedDayHours
                ||
                8
              )
            }"
            ${disabled}
          >

        </div>

      </div>


      <div>

        <div class="panel-title">
          Evidence Controls
        </div>


        <div class="field">

          <label>
            Activity level tracking
          </label>

          <select
            id="policyActivity"
            ${disabled}
          >

            <option
              value="true"
              ${
                policy.activityTracking
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !policy.activityTracking
                  ? 'selected'
                  : ''
              }
            >
              Disabled
            </option>

          </select>

        </div>


        <div class="field">

          <label>
            Apps & URLs
          </label>

          <select
            id="policyApps"
            ${disabled}
          >

            <option
              value="true"
              ${
                policy.appUrlTracking
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !policy.appUrlTracking
                  ? 'selected'
                  : ''
              }
            >
              Disabled
            </option>

          </select>

        </div>


        <div class="field">

          <label>
            Auto-pause after inactivity
          </label>

          <input
            id="policyAutoPause"
            type="number"
            min="0"
            max="120"
            step="1"
            value="${
              Number(
                policy.autoPauseMinutes
                ||
                0
              )
            }"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Employee screenshot notification
          </label>

          <select
            id="policyNotification"
            ${disabled}
          >

            <option
              value="true"
              ${
                policy.employeeNotification
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !policy.employeeNotification
                  ? 'selected'
                  : ''
              }
            >
              Disabled
            </option>

          </select>

        </div>


        <div class="context-box">

          <h4>
            Current WGM target
          </h4>

          <p
            id="policyEstimate"
          >

            ${
              policy.mode==='daily'

                ? (
                    `${estimatedDaily} screenshots/day`
                    +
                    ` ≈ ${hourlyEquivalent.toFixed(2)} per tracked hour`
                  )

                : (
                    `${Number(policy.screenshotsPerHour||0)} screenshots/hour`
                    +
                    ` ≈ ${estimatedDaily} over a ${expectedDayHours}-hour day`
                  )
            }

          </p>

        </div>


        <div class="context-box">

          <h4>
            Provider synchronization
          </h4>

          <p>

            ${escapeHtml(
              policy.providerSyncStatus
              ||
              'Saved in WGM · provider write not connected'
            )}

          </p>

          <p class="small">

            WGM currently stores
            the desired monitoring policy.

            It does not claim
            that Scrin has been changed
            until a supported provider-write
            integration is connected.

          </p>

        </div>


        ${
          editable

            ? `
              <button
                class="btn gold"
                id="saveMonitoringPolicy"
              >
                Save Monitoring Policy
              </button>
              `

            : `
              <div class="small">

                You can view this policy
                but cannot change it
                from this role.

              </div>
              `
        }

      </div>

    </div>
  `;
}


function updatePolicyEstimate(){

  const mode =
    document
      .getElementById(
        'policyMode'
      )
      ?.value

    ||

    'hourly';


  const hourlyWrap =
    document.getElementById(
      'policyHourlyWrap'
    );


  const dailyWrap =
    document.getElementById(
      'policyDailyWrap'
    );


  if(hourlyWrap){

    hourlyWrap.style.display =
      mode==='hourly'
        ? ''
        : 'none';
  }


  if(dailyWrap){

    dailyWrap.style.display =
      mode==='daily'
        ? ''
        : 'none';
  }


  const hours =
    Math.max(
      0.5,

      Number(
        document
          .getElementById(
            'policyExpectedDayHours'
          )
          ?.value
        ||
        8
      )
    );


  const hourly =
    Math.max(
      1,

      Math.min(
        30,

        Number(
          document
            .getElementById(
              'policyShotsPerHour'
            )
            ?.value
          ||
          12
        )
      )
    );


  const daily =
    Math.max(
      1,

      Number(
        document
          .getElementById(
            'policyDailyTarget'
          )
          ?.value
        ||
        96
      )
    );


  const estimate =
    document.getElementById(
      'policyEstimate'
    );


  if(!estimate){
    return;
  }


  estimate.textContent =
    mode==='daily'

      ? (
          `${daily} screenshots/day`
          +
          ` ≈ ${(daily/hours).toFixed(2)} per tracked hour`
        )

      : (
          `${hourly} screenshots/hour`
          +
          ` ≈ ${Math.round(hourly*hours)} over a ${hours}-hour day`
        );
}


function saveMonitoringPolicy(){

  const e =
    employee();


  if(
    !e
    ||
    !canEditMonitoringPolicy()
  ){
    return;
  }


  e.monitoringPolicy = {

    enabled:
      document
        .getElementById(
          'policyEnabled'
        )
        ?.value
      ===
      'true',

    mode:
      document
        .getElementById(
          'policyMode'
        )
        ?.value
      ||
      'hourly',

    screenshotsPerHour:
      Math.max(
        1,

        Math.min(
          30,

          Number(
            document
              .getElementById(
                'policyShotsPerHour'
              )
              ?.value
            ||
            12
          )
        )
      ),

    dailyTarget:
      Math.max(
        1,

        Number(
          document
            .getElementById(
              'policyDailyTarget'
            )
            ?.value
          ||
          96
        )
      ),

    expectedDayHours:
      Math.max(
        0.5,

        Number(
          document
            .getElementById(
              'policyExpectedDayHours'
            )
            ?.value
          ||
          8
        )
      ),

    activityTracking:
      document
        .getElementById(
          'policyActivity'
        )
        ?.value
      ===
      'true',

    appUrlTracking:
      document
        .getElementById(
          'policyApps'
        )
        ?.value
      ===
      'true',

    autoPauseMinutes:
      Math.max(
        0,

        Number(
          document
            .getElementById(
              'policyAutoPause'
            )
            ?.value
          ||
          0
        )
      ),

    employeeNotification:
      document
        .getElementById(
          'policyNotification'
        )
        ?.value
      ===
      'true',

    providerSyncStatus:
      'Saved in WGM · provider write not connected'
  };


  saveEmployees();


  toast(
    'Monitoring policy saved in WGM. Scrin provider write is not connected yet.'
  );
}


/* ==========================================================
   CONTEXT
   ========================================================== */

function contextView(e){

  const employerField =
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

          ${employerField}

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

          <textarea
            id="contextText"
          >${escapeHtml(e.context||'')}</textarea>

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
        .getElementById(
          'contextEmployer'
        )
        ?.value
        .trim()

      ||

      e.employer;
  }


  e.expectedHours =
    Number(
      document
        .getElementById(
          'contextExpected'
        )
        ?.value

      ||

      e.expectedHours

      ||

      0
    );


  e.timezone =
    document
      .getElementById(
        'contextTimezone'
      )
      ?.value
      .trim()

    ||

    e.timezone;


  e.schedule =
    document
      .getElementById(
        'contextSchedule'
      )
      ?.value
      .trim()

    ||

    e.schedule;


  e.context =
    document
      .getElementById(
        'contextText'
      )
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
   REPORT CENTER
   ========================================================== */

function periodLabel(){

  const date =
    new Date(
      state.reportPeriod.from
      +
      'T00:00:00Z'
    );


  return date.toLocaleString(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }
  );
}


function reports(){

  const employees =
    visibleEmployees();


  if(
    state.role === 'employee'
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

            Only reports available
            for your own record
            are shown.

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
    state.role === 'employer'
  ){

    return shell(
      `
      <div class="header-row">

        <div>

          <h2>
            Reports
          </h2>

          <p>

            Reports for

            ${escapeHtml(
              state.portalEmployer
              ||
              'your company'
            )}

            appear here.

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
              employees.map(
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

                    <span
                      class="status ${statusClass(e.reportingStatus)}"
                    >

                      <span class="dot"></span>

                      ${escapeHtml(
                        e.reportingStatus
                        ||
                        'Synced'
                      )}

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

          Generate reports
          across connected sources
          after employer mapping
          and evidence reconciliation.

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

        Objective metrics come
        from the employee's source connection.

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

          <select
            id="reportEmployee"
          >

            ${
              employees.map(
                e => `
                <option
                  value="${escapeHtml(e.id)}"
                  ${
                    e.id===state.selectedEmployeeId
                      ? 'selected'
                      : ''
                  }
                >

                  ${escapeHtml(e.name)}

                  —

                  ${escapeHtml(e.employer||'Unassigned')}

                  —

                  ${escapeHtml(e.connectionName||'Scrin')}

                </option>
                `
              ).join('')
            }


            <option value="__ALL__">

              All mapped employees
              (${employees.length})

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
            employees.map(
              e => `
              <tr>

                <td>
                  ${escapeHtml(e.name)}
                </td>

                <td>
                  ${escapeHtml(e.employer||'Unassigned')}
                </td>

                <td>
                  ${escapeHtml(e.connectionName||'Scrin')}
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
                    state.reportEmployeeId===e.id

                      ? `
                        <span
                          class="status ${statusClass(state.reportStatus)}"
                        >

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


/* ==========================================================
   GENERATE REPORT
   ========================================================== */

async function generateReport(){

  const selector =
    document.getElementById(
      'reportEmployee'
    );


  const id =
    selector?.value
    ||
    state.selectedEmployeeId;


  state.reportPeriod = {

    from:
      document
        .getElementById(
          'fromDate'
        )
        ?.value
      ||
      state.reportPeriod.from,

    to:
      document
        .getElementById(
          'toDate'
        )
        ?.value
      ||
      state.reportPeriod.to
  };


  if(
    id === '__ALL__'
  ){

    toast(
      'Batch report generation is the next reporting milestone. Multi-source population selection is ready.'
    );

    return;
  }


  state.selectedEmployeeId =
    id;


  const e =
    employeeById(
      id
    );


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


  try {

    let verified = {

      employee:
        e,

      period:
        state.reportPeriod,

      source: {
        provider:
          'scrin',

        connectionId:
          e.connectionId,

        connectionName:
          e.connectionName
      }
    };


    if(
      state.mode === 'LIVE'
      &&
      e.employmentId
    ){

      const periodResponse =
        await fetch(
          '/api/wgm/period-data',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                connectionId:
                  e.connectionId,

                employmentId:
                  e.employmentId,

                from:
                  state.reportPeriod.from,

                to:
                  state.reportPeriod.to,

                timezoneOffsetMinutes:
                  e.timezoneOffsetMinutes
                  ||
                  0,

                expectedHours:
                  Number(
                    e.expectedHours
                    ||
                    0
                  ),

                includeScreenshots:
                  true
              })
          }
        );


      const periodData =
        await periodResponse.json();


      if(
        !periodResponse.ok
      ){

        throw new Error(
          periodData.error
          ||
          'Could not load period data'
        );
      }


      e.trackedHours =
        periodData.metrics.trackedHours;


      e.activeDays =
        periodData.metrics.activeDays;


      e.workstreams =
        periodData.workstreams
        ||
        e.workstreams;


      e.apps =
        periodData.apps
        ||
        e.apps;


      saveEmployees();


      verified = {
        ...verified,

        verifiedMetrics:
          periodData.metrics,

        workstreams:
          periodData.workstreams,

        apps:
          periodData.apps,

        context:
          e.context,

        screenshotEvidence:
          periodData.screenshotEvidenceSummary
      };
    }


    const response =
      await fetch(
        '/api/reports/generate',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(
              verified
            )
        }
      );


    const data =
      await response.json();


    if(
      !response.ok
    ){

      throw new Error(
        data.error
        ||
        'Report generation unavailable'
      );
    }


    state.report =
      data.report
      ||
      defaultReport;


  } catch(error){

    state.report =
      defaultReport;


    toast(
      `Using prototype narrative: ${error.message}`
    );
  }


  state.reportStatus =
    'Draft ready';


  state.page =
    'review';


  render();
}


/* ==========================================================
   REVIEW QUEUE
   ========================================================== */

function review(){

  const e =
    employeeById(
      state.reportEmployeeId
    )
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

          Green reports may be batch approved.

          Yellow and Red
          require individual review.

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

            Generate a report
            to open the full review console.

          </div>
          `

        : reviewConsole(e)
    }
    `,
    'Review Queue'
  );
}


function reviewConsole(e){

  if(!e){
    return '';
  }


  const report =
    state.report
    ||
    defaultReport;


  return `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">

          ${escapeHtml(
            e.initials
            ||
            initials(e.name)
          )}

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


        <span
          class="status ${statusClass(state.reportStatus)}"
        >

          <span class="dot"></span>

          ${escapeHtml(state.reportStatus)}

        </span>

      </div>


      <div class="review-summary">

        <div class="review-stat">

          <div class="k">
            Tracked
          </div>

          <div class="v">
            ${hoursLabel(e.trackedHours)}
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Expected
          </div>

          <div class="v">
            ${e.expectedHours||'—'}h
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Coverage
          </div>

          <div class="v">
            ${coverage(e)??'—'}%
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Active days
          </div>

          <div class="v">
            ${e.activeDays||'—'}
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Review flags
          </div>

          <div class="v">
            ${e.concerns||0}
          </div>

        </div>

      </div>


      <div class="grid two-col">

        <div>

          <div class="panel-title">
            AI draft
          </div>


          <div class="review-text">

            <b>
              ${escapeHtml(report.headline)}
            </b>

            <br><br>

            ${escapeHtml(report.summary)}

            <br><br>

            <b>
              Integrity:
            </b>

            ${escapeHtml(report.integrity)}

            <br><br>

            <b>
              Coaching:
            </b>

            ${escapeHtml(report.coaching)}

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
                (check,index) => `
                <label class="check">

                  <input
                    type="checkbox"
                    data-check="${index}"
                    ${
                      state.reviewerChecks[index]
                        ? 'checked'
                        : ''
                    }
                  >

                  ${check}

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

              Release is bound
              to this employee,
              employer
              and report version.

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


/* ==========================================================
   DATA SOURCES
   ========================================================== */

function connectionTypeLabel(connection){

  return connection.type==='dedicated'
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
            id:
              'wgh-main',

            name:
              'WGH Main Scrin Account',

            provider:
              'scrin',

            type:
              'shared',

            employer:
              '',

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

          Each Scrin API credential
          is a separate WGM connection
          with explicit employer ownership.

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

              API tokens remain
              server-side in Cloudflare.

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

                    Add additional API credentials
                    through the server-side
                    Scrin connection configuration.

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

        Dedicated connections
        automatically lock employees
        to one employer.

        Shared WGH connections
        require employee-level mapping.

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
              connection => `
              <tr>

                <td>

                  <b>
                    ${escapeHtml(connection.name||connection.id)}
                  </b>

                  <div class="small">
                    ${escapeHtml(connection.id)}
                  </div>

                </td>

                <td>
                  ${connectionTypeLabel(connection)}
                </td>

                <td>

                  ${
                    connection.type==='dedicated'

                      ? escapeHtml(
                          connection.employer
                          ||
                          'Employer required'
                        )

                      : 'Employee-level mapping'
                  }

                </td>

                <td>

                  ${
                    connection.employeeCount

                    ??

                    connectionEmployeeCount(
                      connection.id
                    )
                  }

                </td>

                <td>

                  <span
                    class="status ${statusClass(connection.status||'configured')}"
                  >

                    <span class="dot"></span>

                    ${escapeHtml(
                      connection.status
                      ||
                      'configured'
                    )}

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

          Every employee discovered
          through a dedicated employer connection
          inherits that employer automatically.

        </p>

      </div>


      <div class="card panel">

        <div class="panel-title">
          Shared WGH rule
        </div>

        <p class="small">

          Every employee
          in a shared White Glove account
          must be mapped to one employer
          or explicitly excluded.

        </p>

      </div>

    </div>


    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Provider-independent architecture
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

            Future WGM Native Monitor
            plugs into the same evidence
            and reporting layer.

          </div>

        </div>

      </div>

    </div>
    `,
    'Data Sources'
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

          Map shared Scrin employees carefully.

          Dedicated connection employees
          remain employer-locked.

        </p>

      </div>

    </div>


    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          Scrin API v2
        </div>

        <div class="panel-sub">

          Multiple server-side
          Scrin connections are supported.

        </div>


        <p class="small">

          API credentials stay
          in Cloudflare secrets
          and never enter
          this browser code.

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

          Structured narrative
          from verified WGM calculations
          and context.

        </div>


        <p class="small">

          OPENAI_API_KEY
          and OPENAI_MODEL
          remain server-side.

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

        Shared connections need
        employee-level mapping.

        Dedicated connections are locked.

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
                          value="${escapeHtml(
                            e.employer
                            ||
                            e.connectionEmployer
                            ||
                            ''
                          )}"
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

        Every active employee
        from a shared connection
        must have a WGM employer.

        Use Internal / Exclude
        for account-owner records
        or records that should never
        appear in employer reporting.

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


/* ==========================================================
   SAVE EMPLOYER MAPPINGS
   ========================================================== */

function saveMappings(){

  document

    .querySelectorAll(
      '[data-map-employer]'
    )

    .forEach(
      field => {

        const e =
          employeeById(
            field.dataset.mapEmployer
          );


        if(
          e
          &&
          !e.employerLocked
        ){

          e.employer =
            field.value.trim();
        }
      }
    );


  document

    .querySelectorAll(
      '[data-map-excluded]'
    )

    .forEach(
      field => {

        const e =
          employeeById(
            field.dataset.mapExcluded
          );


        if(
          e
          &&
          !e.employerLocked
        ){

          e.excluded =
            field.checked;
        }
      }
    );


  document

    .querySelectorAll(
      '[data-map-hours]'
    )

    .forEach(
      field => {

        const e =
          employeeById(
            field.dataset.mapHours
          );


        if(e){

          e.expectedHours =
            Number(
              field.value
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


  saveEmployees();


  if(
    invalid.length
  ){

    toast(
      `${invalid.length} shared-connection employee(s) still need an employer or Internal / Exclude selection.`
    );

    return;
  }


  ensureEmployerSelection();


  toast(
    'Employer mappings validated and saved.'
  );
}


/* ==========================================================
   SUBSCRIPTIONS / BILLING
   ========================================================== */

function subscriptions(){

  if(
    state.role === 'employer'
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

            Prototype
            of the Stripe-backed
            customer billing entry point.

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

                <th>
                  Organization
                </th>

                <td>
                  ${escapeHtml(state.portalEmployer||'Employer')}
                </td>

              </tr>

              <tr>

                <th>
                  Assigned employees
                </th>

                <td>
                  ${team.length}
                </td>

              </tr>

              <tr>

                <th>
                  Payment method
                </th>

                <td>
                  •••• 4242
                </td>

              </tr>

              <tr>

                <th>
                  Cancellation
                </th>

                <td>
                  Not scheduled
                </td>

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

          Prototype states
          for included WGH seats
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
              (company,index) => {

                const seatCount =
                  activeEmployees().filter(
                    e =>
                      e.employer===company
                  ).length;


                return `
                  <tr>

                    <td>
                      ${escapeHtml(company)}
                    </td>

                    <td>

                      ${
                        index===0

                          ? 'WGH Included'

                          : 'Standalone Paid'
                      }

                    </td>

                    <td>
                      ${seatCount}
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


/* ==========================================================
   REPORT PREVIEW — FIVE PAGES
   ========================================================== */

function reportHeader(
  e,
  page,
  total=5
){

  return `
    <div class="wgm-rpt-header">

      <div>

        <div class="wgm-rpt-kicker">
          MONTHLY VA ACCOUNTABILITY REPORT
        </div>

        <div class="wgm-rpt-person">

          ${escapeHtml(e.name)}

          |

          ${escapeHtml(
            e.role
            ||
            'VIRTUAL ASSISTANT'
          )}

        </div>

      </div>


      <div class="wgm-rpt-head-right">

        <div>
          ${periodLabel().toUpperCase()}
        </div>

        <div>

          ${
            state.reportStatus==='Released'

              ? '✓ Human reviewed | Released'

              : /Approved/.test(
                  state.reportStatus
                )

                ? '✓ Human reviewed | Approved'

                : 'Human review pending'
          }

        </div>

      </div>

    </div>


    <div class="wgm-rpt-rule"></div>
  `;
}


function reportFooter(
  page,
  total=5
){

  return `
    <div class="wgm-rpt-footer">

      <span>
        WHITE GLOVE MONITOR | CONFIDENTIAL
      </span>

      <span>

        ${String(page).padStart(2,'0')}

        /

        ${String(total).padStart(2,'0')}

      </span>

    </div>
  `;
}


function reportPreview(){

  const e =
    employeeById(
      state.reportEmployeeId
    )
    ||
    employee();


  if(!e){

    return shell(
      `
      <div class="card empty">
        No report selected.
      </div>
      `,
      'Report Preview'
    );
  }


  const report =
    state.report
    ||
    defaultReport;


  const matters =
    Array.isArray(
      report.strengths
    )
    &&
    report.strengths.length

      ? report.strengths.slice(
          0,
          3
        )

      : [
          'Recorded hours were reconciled against the available tracking period.',
          'Available evidence was reviewed for business relevance.',
          'Human validation remains part of the WGM release process.'
        ];


  const weeks =
    Array.isArray(
      e.weeks
    )
      ? e.weeks
      : [];


  const workstreams =
    Array.isArray(
      e.workstreams
    )
      ? e.workstreams.slice(
          0,
          6
        )
      : [];


  const currentCoverage =
    coverage(e);


  const headline =
    report.headline
    ||
    `${e.name} completed the selected reporting period.`;


  const categoryMarkup =
    workstreams.length

      ? workstreams.map(
          item => `
          <div class="wgm-category">

            <div>
              ${escapeHtml(item[0])}
            </div>

            <div class="wgm-category-track">

              <div
                class="wgm-category-fill"
                style="
                  width:${
                    Math.max(
                      0,
                      Math.min(
                        100,
                        Number(
                          item[1]
                          ||
                          0
                        )
                      )
                    )
                  }%
                "
              ></div>

            </div>

            <div>

              ${
                Math.round(
                  Number(
                    item[1]
                    ||
                    0
                  )
                )
              }%

            </div>

          </div>
          `
        ).join('')

      : `
        <div class="wgm-rpt-callout">

          <strong>
            Workstream limitation
          </strong>

          Detailed project-based
          category allocation
          was not available
          for this period.

        </div>
        `;


  return shell(
    `
    <style>

      .wgm-report-wrap{
        max-width:960px;
        margin:0 auto;
      }

      .wgm-report-actions{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:18px;
        gap:12px;
      }

      .wgm-page{
        width:min(100%,210mm);
        min-height:297mm;
        margin:0 auto 28px;
        background:#fff;
        box-sizing:border-box;
        padding:16mm 15mm 14mm;
        position:relative;
        box-shadow:
          0 8px 30px rgba(0,0,0,.10);
        color:#1A2947;
      }

      .wgm-rpt-header{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:24px;
        font-size:10px;
        letter-spacing:.04em;
      }

      .wgm-rpt-kicker{
        font-weight:800;
        font-size:11px;
      }

      .wgm-rpt-person{
        margin-top:4px;
        color:#5f6879;
        font-weight:700;
      }

      .wgm-rpt-head-right{
        text-align:right;
        font-weight:700;
        line-height:1.6;
      }

      .wgm-rpt-rule{
        height:2px;
        background:#C9A84C;
        margin:12px 0 26px;
      }

      .wgm-rpt-title{
        font-size:30px;
        line-height:1.1;
        font-weight:800;
        letter-spacing:-.025em;
        margin:0 0 8px;
      }

      .wgm-rpt-subtitle{
        color:#687287;
        font-size:12px;
        line-height:1.55;
      }

      .wgm-rpt-lead{
        font-size:19px;
        line-height:1.42;
        font-weight:700;
        margin:28px 0 12px;
        max-width:720px;
      }

      .wgm-rpt-metrics{
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:12px;
        margin:28px 0;
      }

      .wgm-rpt-metric{
        border-top:3px solid #1A2947;
        background:#f6f7f9;
        padding:16px 14px;
      }

      .wgm-rpt-metric strong{
        display:block;
        font-size:24px;
        line-height:1;
      }

      .wgm-rpt-metric span{
        display:block;
        margin-top:7px;
        font-size:9px;
        font-weight:800;
        letter-spacing:.06em;
      }

      .wgm-rpt-metric small{
        display:block;
        margin-top:5px;
        color:#6f7786;
        font-size:8.5px;
        line-height:1.4;
      }

      .wgm-rpt-section{
        margin-top:26px;
      }

      .wgm-rpt-section-title{
        font-size:11px;
        letter-spacing:.09em;
        text-transform:uppercase;
        font-weight:800;
        margin-bottom:12px;
      }

      .wgm-matter{
        display:grid;
        grid-template-columns:34px 1fr;
        gap:12px;
        padding:12px 0;
        border-top:1px solid #e4e7ec;
      }

      .wgm-matter-num{
        font-size:18px;
        font-weight:800;
        color:#C9A84C;
      }

      .wgm-matter-text{
        font-size:11px;
        line-height:1.55;
        color:#3f4b60;
      }

      .wgm-rpt-callout{
        border-left:4px solid #C9A84C;
        background:#f8f7f2;
        padding:15px 17px;
        margin-top:20px;
        font-size:11px;
        line-height:1.6;
      }

      .wgm-rpt-callout strong{
        display:block;
        margin-bottom:5px;
      }

      .wgm-rpt-table{
        width:100%;
        border-collapse:collapse;
        font-size:10px;
        margin-top:14px;
      }

      .wgm-rpt-table th{
        text-align:left;
        padding:9px 7px;
        border-bottom:2px solid #1A2947;
        font-size:8px;
        text-transform:uppercase;
        letter-spacing:.05em;
      }

      .wgm-rpt-table td{
        vertical-align:top;
        padding:11px 7px;
        border-bottom:1px solid #e3e6eb;
        line-height:1.5;
      }

      .wgm-category{
        display:grid;
        grid-template-columns:170px 1fr 42px;
        gap:10px;
        align-items:center;
        margin:10px 0;
        font-size:10px;
      }

      .wgm-category-track{
        height:8px;
        border-radius:8px;
        overflow:hidden;
        background:#e9ecf0;
      }

      .wgm-category-fill{
        height:100%;
        background:#1A2947;
      }

      .wgm-two{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:18px;
      }

      .wgm-rpt-card{
        background:#f7f8fa;
        border:1px solid #e3e6eb;
        padding:16px;
      }

      .wgm-rpt-card h4{
        margin:0 0 8px;
        font-size:10px;
        text-transform:uppercase;
        letter-spacing:.06em;
      }

      .wgm-rpt-card p{
        margin:0;
        font-size:10px;
        line-height:1.55;
        color:#4c576b;
      }

      .wgm-check-item{
        padding:10px 0;
        border-bottom:1px solid #e4e7ec;
        font-size:10.5px;
        line-height:1.55;
      }

      .wgm-check{
        color:#C9A84C;
        font-weight:900;
        margin-right:6px;
      }

      .wgm-week-card{
        padding:13px 0;
        border-top:1px solid #e4e7ec;
      }

      .wgm-week-card strong{
        display:block;
        font-size:11px;
      }

      .wgm-week-card span{
        display:block;
        margin-top:4px;
        font-size:10px;
        line-height:1.5;
        color:#566176;
      }

      .wgm-badges{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin:18px 0;
      }

      .wgm-badge{
        border:1px solid #d8dde5;
        border-radius:999px;
        padding:7px 10px;
        font-size:9px;
        font-weight:800;
        background:#fff;
      }

      .wgm-rpt-footer{
        position:absolute;
        left:15mm;
        right:15mm;
        bottom:9mm;
        display:flex;
        justify-content:space-between;
        border-top:1px solid #dfe3e8;
        padding-top:7px;
        font-size:7px;
        letter-spacing:.06em;
        color:#7a8392;
      }

      @media print{

        body{
          background:#fff !important;
        }

        .sidebar,
        .topbar,
        .no-print,
        .wgm-report-actions{
          display:none !important;
        }

        .main,
        .content{
          margin:0 !important;
          padding:0 !important;
          width:100% !important;
          max-width:none !important;
        }

        .wgm-report-wrap{
          max-width:none !important;
        }

        .wgm-page{
          box-shadow:none !important;
          margin:0 !important;
          width:210mm !important;
          height:297mm !important;
          min-height:297mm !important;
          page-break-after:always;
          break-after:page;
          -webkit-print-color-adjust:exact;
          print-color-adjust:exact;
        }

        .wgm-page:last-child{
          page-break-after:auto;
          break-after:auto;
        }
      }

    </style>


    <div class="wgm-report-wrap">

      <div class="wgm-report-actions no-print">

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


      <!-- PAGE 1 -->

      <section class="wgm-page">

        ${reportHeader(e,1)}


        <div class="wgm-rpt-title">
          ${escapeHtml(headline)}
        </div>


        <div class="wgm-rpt-subtitle">

          Prepared exclusively for

          ${escapeHtml(
            e.employer
            ||
            'Employer'
          )}

        </div>


        <div class="wgm-badges">

          <span class="wgm-badge">
            Evidence reconciled
          </span>

          <span class="wgm-badge">
            Human reviewed
          </span>

          <span class="wgm-badge">

            ${escapeHtml(
              e.connectionName
              ||
              'Scrin'
            )}

          </span>

        </div>


        <div class="wgm-rpt-lead">

          ${escapeHtml(
            report.summary
            ||
            'Recorded time, available evidence and employee context were reconciled for human review.'
          )}

        </div>


        <div class="wgm-rpt-metrics">

          <div class="wgm-rpt-metric">

            <strong>
              ${hoursLabel(e.trackedHours)}
            </strong>

            <span>
              TRACKED TIME
            </span>

            <small>
              Selected reporting period
            </small>

          </div>


          <div class="wgm-rpt-metric">

            <strong>
              ${currentCoverage??'—'}%
            </strong>

            <span>
              SCHEDULE COVERAGE
            </span>

            <small>
              Reporting capped at 100%
            </small>

          </div>


          <div class="wgm-rpt-metric">

            <strong>
              ${e.activeDays||'—'}
            </strong>

            <span>
              ACTIVE WORKDAYS
            </span>

            <small>
              Days containing recorded work
            </small>

          </div>


          <div class="wgm-rpt-metric">

            <strong>
              ${e.concerns||0}
            </strong>

            <span>
              REVIEW FLAGS
            </span>

            <small>
              Human review determines significance
            </small>

          </div>

        </div>


        <div class="wgm-rpt-section">

          <div class="wgm-rpt-section-title">
            What matters this month
          </div>

          ${
            matters.map(
              (item,index) => `
              <div class="wgm-matter">

                <div class="wgm-matter-num">
                  0${index+1}
                </div>

                <div class="wgm-matter-text">
                  ${escapeHtml(item)}
                </div>

              </div>
              `
            ).join('')
          }

        </div>


        <div class="wgm-rpt-callout">

          <strong>
            Review conclusion
          </strong>

          ${escapeHtml(
            report.integrity
            ||
            'No unsupported integrity conclusion has been added.'
          )}

        </div>


        <div class="wgm-rpt-callout">

          <strong>
            White Glove action completed
          </strong>

          ${escapeHtml(
            report.coaching
            ||
            'Monthly evidence review and schedule reconciliation completed.'
          )}

        </div>


        ${reportFooter(1)}

      </section>


      <!-- PAGE 2 -->

      <section class="wgm-page">

        ${reportHeader(e,2)}


        <div class="wgm-rpt-title">
          Monthly Activity & Evidence
        </div>


        <div class="wgm-rpt-subtitle">

          Week-by-week recorded time,
          observed work
          and supporting evidence.

        </div>


        <div class="wgm-rpt-section">

          <table class="wgm-rpt-table">

            <thead>

              <tr>
                <th>Week</th>
                <th>Accountable time</th>
                <th>Observed work</th>
              </tr>

            </thead>


            <tbody>

              ${
                weeks.length

                  ? weeks.map(
                      week => `
                      <tr>

                        <td>
                          <b>
                            ${escapeHtml(week[0]||'Week')}
                          </b>
                        </td>

                        <td>
                          ${escapeHtml(week[1]||'—')}
                        </td>

                        <td>
                          ${escapeHtml(week[2]||'Tracked work recorded.')}
                        </td>

                      </tr>
                      `
                    ).join('')

                  : `
                    <tr>

                      <td colspan="3">

                        Weekly totals
                        have not yet been calculated
                        for this live period.

                      </td>

                    </tr>
                    `
              }

            </tbody>

          </table>

        </div>


        <div class="wgm-rpt-section">

          <div class="wgm-rpt-section-title">
            Work categories
          </div>

          ${categoryMarkup}

        </div>


        <div class="wgm-two">

          <div class="wgm-rpt-card">

            <h4>
              Review coverage
            </h4>

            <p>

              ${e.activeDays||'—'}
              active workday(s).

              <br><br>

              ${hoursLabel(e.trackedHours)}
              recorded time reconciled.

            </p>

          </div>


          <div class="wgm-rpt-card">

            <h4>
              Evidence interpretation
            </h4>

            <p>

              Screenshots,
              applications
              and source metadata
              support interpretation.

              Category shares remain directional.

            </p>

          </div>

        </div>


        ${reportFooter(2)}

      </section>


      <!-- PAGE 3 -->

      <section class="wgm-page">

        ${reportHeader(e,3)}


        <div class="wgm-rpt-title">
          Strengths, Coaching & Client Context
        </div>


        <div class="wgm-rpt-subtitle">

          Evidence-backed positives
          and practical guidance.

        </div>


        <div class="wgm-rpt-section">

          <div class="wgm-rpt-section-title">
            Strengths this month
          </div>

          ${
            matters.map(
              item => `
              <div class="wgm-check-item">

                <span class="wgm-check">
                  ✓
                </span>

                ${escapeHtml(item)}

              </div>
              `
            ).join('')
          }

        </div>


        <div class="wgm-two">

          <div class="wgm-rpt-card">

            <h4>
              Coaching moment
            </h4>

            <p>
              ${escapeHtml(report.coaching)}
            </p>

          </div>


          <div class="wgm-rpt-card">

            <h4>
              Why it matters
            </h4>

            <p>

              Clear project labels,
              notes and context
              make reporting easier
              to interpret
              without relying
              on screenshots alone.

            </p>

          </div>

        </div>


        <div
          class="wgm-two"
          style="margin-top:18px"
        >

          <div class="wgm-rpt-card">

            <h4>
              Client context
            </h4>

            <p>

              ${escapeHtml(
                report.clientContext
                ||
                e.context
                ||
                'No additional clarification recorded.'
              )}

            </p>

          </div>


          <div class="wgm-rpt-card">

            <h4>
              Next expectation
            </h4>

            <p>
              ${escapeHtml(report.nextFocus)}
            </p>

          </div>

        </div>


        <div class="wgm-rpt-callout">

          <strong>
            White Glove coaching completed
          </strong>

          Monthly evidence
          and schedule review completed.

        </div>


        <div class="wgm-rpt-callout">

          <strong>
            Next-month monitoring
          </strong>

          Continue reviewing
          schedule consistency,
          business relevance,
          context,
          project labels
          and evidence-supported indicators.

        </div>


        ${reportFooter(3)}

      </section>


      <!-- PAGE 4 -->

      <section class="wgm-page">

        ${reportHeader(e,4)}


        <div class="wgm-rpt-title">
          Monthly Consistency Review
        </div>


        <div class="wgm-rpt-subtitle">

          Schedule coverage,
          work patterns
          and review indicators.

        </div>


        <div class="wgm-rpt-metrics">

          <div class="wgm-rpt-metric">

            <strong>
              ${weeks.length||'—'}
            </strong>

            <span>
              WEEKS REVIEWED
            </span>

            <small>
              Available weekly blocks
            </small>

          </div>


          <div class="wgm-rpt-metric">

            <strong>
              ${currentCoverage??'—'}%
            </strong>

            <span>
              MONTHLY COVERAGE
            </span>

            <small>
              Capped at 100%
            </small>

          </div>


          <div class="wgm-rpt-metric">

            <strong>
              ${e.activeDays||'—'}
            </strong>

            <span>
              ACTIVE DAYS
            </span>

            <small>
              Recorded workdays
            </small>

          </div>


          <div class="wgm-rpt-metric">

            <strong>
              ${e.concerns||0}
            </strong>

            <span>
              REVIEW FLAGS
            </span>

            <small>
              Not misconduct findings
            </small>

          </div>

        </div>


        <table class="wgm-rpt-table">

          <thead>

            <tr>
              <th>Week</th>
              <th>Accountable time</th>
              <th>Work pattern</th>
              <th>Relevance</th>
              <th>Integrity</th>
            </tr>

          </thead>


          <tbody>

            ${
              weeks.length

                ? weeks.map(
                    week => `
                    <tr>

                      <td>
                        ${escapeHtml(week[0]||'Week')}
                      </td>

                      <td>
                        ${escapeHtml(week[1]||'—')}
                      </td>

                      <td>
                        ${escapeHtml(week[2]||'Evidence available.')}
                      </td>

                      <td>
                        Evidence-supported
                      </td>

                      <td>

                        ${
                          Number(
                            e.concerns
                            ||
                            0
                          )

                            ? 'Review required'

                            : 'No review flag'
                        }

                      </td>

                    </tr>
                    `
                  ).join('')

                : `
                  <tr>

                    <td colspan="5">

                      Weekly consistency analytics
                      will populate
                      after the live period
                      has been fully calculated.

                    </td>

                  </tr>
                  `
            }

          </tbody>

        </table>


        <div class="wgm-rpt-section">

          <div class="wgm-rpt-section-title">
            Recurring patterns
          </div>

          ${
            matters.map(
              item => `
              <div class="wgm-check-item">
                • ${escapeHtml(item)}
              </div>
              `
            ).join('')
          }

        </div>


        <div class="wgm-rpt-callout">

          <strong>
            Recommended focus
          </strong>

          ${escapeHtml(
            report.nextFocus
            ||
            report.coaching
          )}

        </div>


        ${reportFooter(4)}

      </section>


      <!-- PAGE 5 -->

      <section class="wgm-page">

        ${reportHeader(e,5)}


        <div class="wgm-rpt-title">
          Monthly Task Map
        </div>


        <div class="wgm-rpt-subtitle">

          Observed business activity
          across the reporting period.

          Category shares
          are evidence indicators,
          not standalone productivity scores.

        </div>


        <div class="wgm-rpt-section">

          <div class="wgm-rpt-section-title">
            Observed work categories
          </div>

          ${categoryMarkup}

        </div>


        <div class="wgm-rpt-section">

          <div class="wgm-rpt-section-title">
            What we verified
          </div>

          ${
            weeks.length

              ? weeks.map(
                  week => `
                  <div class="wgm-week-card">

                    <strong>

                      ${escapeHtml(week[0]||'Week')}

                      ·

                      ${escapeHtml(week[1]||'—')}

                    </strong>

                    <span>
                      ${escapeHtml(week[2]||'Tracked work recorded.')}
                    </span>

                  </div>
                  `
                ).join('')

              : `
                <div class="wgm-week-card">

                  <strong>
                    Selected period
                  </strong>

                  <span>

                    ${hoursLabel(e.trackedHours)}
                    recorded time
                    across
                    ${e.activeDays||'—'}
                    active workday(s).

                  </span>

                </div>
                `
          }

        </div>


        <div class="wgm-rpt-callout">

          <strong>
            Client takeaway
          </strong>

          ${escapeHtml(
            report.summary
            ||
            headline
          )}

        </div>


        <div class="wgm-rpt-callout">

          <strong>
            White Glove review & support
          </strong>

          Reviewed recorded time,
          available screenshot evidence,
          applications,
          context
          and evidence-supported indicators.

          <br><br>

          Next:

          ${escapeHtml(
            report.nextFocus
            ||
            'continue monitoring the next reporting period.'
          )}

        </div>


        ${reportFooter(5)}

      </section>

    </div>
    `,
    'Report Preview'
  );
}


/* ==========================================================
   MERGE SCRIN EMPLOYEE
   ========================================================== */

function mergeSyncedEmployee(
  incoming,
  prior
){

  const old =
    prior.find(
      e =>
        String(e.id)
        ===
        String(incoming.id)
    )

    ||

    prior.find(
      e =>
        String(e.employmentId)
        ===
        String(
          incoming.employmentId
        )
        &&
        (
          !e.connectionId
          ||
          String(e.connectionId)
          ===
          String(
            incoming.connectionId
          )
        )
    )

    ||

    {};


  const dedicatedEmployer =
    incoming.employerLocked

      ? (
          incoming.connectionEmployer
          ||
          incoming.employer
          ||
          ''
        )

      : null;


  return {
    ...old,
    ...incoming,

    id:
      incoming.id
      ||
      (
        `${incoming.connectionId||'scrin'}`
        +
        '::'
        +
        `${incoming.employmentId}`
      ),

    initials:
      initials(
        incoming.name
      ),

    employer:
      dedicatedEmployer !== null

        ? dedicatedEmployer

        : (
            old.employer
            ||
            incoming.employer
            ||
            ''
          ),

    excluded:
      incoming.employerLocked

        ? false

        : Boolean(
            old.excluded
          ),

    expectedHours:
      Number(
        old.expectedHours
        ??
        incoming.expectedHours
        ??
        160
      ),

    schedule:
      old.schedule
      ||
      incoming.schedule
      ||
      'Monday–Friday · 8 hours/day · 40 hours/week',

    timezone:
      old.timezone
      ||
      incoming.timezone
      ||
      'Set in WGM',

    timezoneOffsetMinutes:
      Number(
        old.timezoneOffsetMinutes
        ??
        incoming.timezoneOffsetMinutes
        ??
        0
      ),

    context:
      old.context
      ||
      incoming.context
      ||
      '',

    trackedHours:
      Number(
        old.trackedHours
        ??
        incoming.trackedHours
        ??
        0
      ),

    activeDays:
      Number(
        old.activeDays
        ??
        incoming.activeDays
        ??
        0
      ),

    concerns:
      Number(
        old.concerns
        ??
        incoming.concerns
        ??
        0
      ),

    workstreams:
      old.workstreams
      ||
      incoming.workstreams
      ||
      [],

    apps:
      old.apps
      ||
      incoming.apps
      ||
      [],

    weeks:
      old.weeks
      ||
      incoming.weeks
      ||
      [],

    shots:
      old.shots
      ||
      incoming.shots
      ||
      [],

    daySummary:
      old.daySummary
      ||
      incoming.daySummary
      ||
      null,

    monitoringPolicy:
      old.monitoringPolicy
      ||
      incoming.monitoringPolicy
      ||
      defaultMonitoringPolicy(),

    reportingStatus:
      old.reportingStatus
      ||
      incoming.reportingStatus
      ||
      'Synced'
  };
}


/* ==========================================================
   SYNC SCRIN
   ========================================================== */

async function syncScrin(){

  state.syncMessage =
    'Syncing all Scrin connections…';


  render();


  try {

    const response =
      await fetch(
        '/api/scrin/all-common',
        {
          method: 'POST'
        }
      );


    const data =
      await response.json();


    if(
      !response.ok
    ){

      throw new Error(
        data.error
        ||
        'Scrin connection sync failed'
      );
    }


    const prior =
      [...state.employees];


    state.connections =
      Array.isArray(
        data.connections
      )
        ? data.connections
        : state.connections;


    state.employees =
      (
        Array.isArray(
          data.employees
        )
          ? data.employees
          : []
      )

      .map(
        e =>
          mergeSyncedEmployee(
            e,
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


    const selectedExists =
      state.employees.some(
        e =>
          String(e.id)
          ===
          String(
            state.selectedEmployeeId
          )
      );


    if(
      !selectedExists
    ){

      state.selectedEmployeeId =
        activeEmployees()[0]?.id
        ||
        state.employees[0].id;
    }


    saveEmployees();

    saveConnections();


    state.mode =
      data.demo
        ? 'DEMO'
        : 'LIVE';


    const errorCount =
      Array.isArray(
        data.errors
      )
        ? data.errors.length
        : 0;


    const connected =
      state.connections.filter(
        connection =>
          connection.status==='connected'
          ||
          connection.status==='demo'
      ).length;


    state.syncMessage =
      (
        `Connected ${connected}/${state.connections.length} Scrin connection(s). `
        +
        `${state.employees.length} employment record(s) loaded.`
        +
        (
          errorCount
            ? ` ${errorCount} connection error(s) require attention.`
            : ''
        )
      );


  } catch(error){

    state.syncMessage =
      `Connection sync failed: ${error.message}`;
  }


  render();
}


/* ==========================================================
   CONNECTIONS
   ========================================================== */

async function refreshConnections(){

  try {

    const response =
      await fetch(
        '/api/scrin/connections'
      );


    const data =
      await response.json();


    if(
      !response.ok
    ){

      throw new Error(
        data.error
        ||
        'Could not load connections'
      );
    }


    state.connections =
      Array.isArray(
        data.connections
      )
        ? data.connections
        : [];


    saveConnections();


    toast(
      `${state.connections.length} Scrin connection(s) configured.`
    );


  } catch(error){

    toast(
      `Could not refresh connections: ${error.message}`
    );
  }
}


async function testScrin(){

  const result =
    document.getElementById(
      'scrinResult'
    );


  if(result){

    result.textContent =
      'Testing all connections…';
  }


  try {

    const response =
      await fetch(
        '/api/scrin/all-common',
        {
          method: 'POST'
        }
      );


    const data =
      await response.json();


    if(
      !response.ok
    ){

      throw new Error(
        data.error
        ||
        'Not configured'
      );
    }


    state.mode =
      data.demo
        ? 'DEMO'
        : 'LIVE';


    state.connections =
      Array.isArray(
        data.connections
      )
        ? data.connections
        : state.connections;


    saveConnections();


    const connected =
      state.connections.filter(
        connection =>
          connection.status==='connected'
          ||
          connection.status==='demo'
      ).length;


    state.syncMessage =
      (
        `${state.mode} connections responding: `
        +
        `${connected}/${state.connections.length}. `
        +
        `${data.employees?.length||0} employment record(s) available.`
      );


    render();


  } catch(error){

    if(result){

      result.textContent =
        `Not connected: ${error.message}`;
    }
  }
}


/* ==========================================================
   RENDER
   ========================================================== */

function render(){

  let output =
    '';


  if(
    state.page === 'dashboard'
  ){
    output = dashboard();
  }

  else if(
    state.page === 'companies'
  ){
    output = companies();
  }

  else if(
    state.page === 'employees'
  ){
    output = employees();
  }

  else if(
    state.page === 'monitoring'
  ){
    output = monitoring();
  }

  else if(
    state.page === 'reports'
  ){
    output = reports();
  }

  else if(
    state.page === 'review'
  ){
    output = review();
  }

  else if(
    state.page === 'subscriptions'
  ){
    output = subscriptions();
  }

  else if(
    state.page === 'dataSources'
  ){
    output = dataSources();
  }

  else if(
    state.page === 'settings'
  ){
    output = settings();
  }

  else if(
    state.page === 'reportPreview'
  ){
    output = reportPreview();
  }


  document
    .getElementById(
      'app'
    )
    .innerHTML =
      output;


  bind();
}


/* ==========================================================
   EVENT BINDINGS
   ========================================================== */

function bind(){

  document

    .querySelectorAll(
      '[data-page]'
    )

    .forEach(
      element => {

        element.onclick =
          () => {

            state.page =
              element.dataset.page;

            render();
          };
      }
    );


  document

    .querySelectorAll(
      '[data-open-id]'
    )

    .forEach(
      element => {

        element.onclick =
          () => {

            const target =
              employeeById(
                element.dataset.openId
              );


            if(
              state.role==='employer'
              &&
              target?.employer
              !==
              state.portalEmployer
            ){

              toast(
                'That employee is outside this employer portal.'
              );

              return;
            }


            state.selectedEmployeeId =
              element.dataset.openId;


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
      element => {

        element.onclick =
          () => {

            state.employeeTab =
              element.dataset.tab;

            render();
          };
      }
    );


  const roleSwitcher =
    document.getElementById(
      'roleSwitcher'
    );


  if(roleSwitcher){

    roleSwitcher.onchange =
      () =>
        setRole(
          roleSwitcher.value
        );
  }


  const employerSwitcher =
    document.getElementById(
      'employerSwitcher'
    );


  if(employerSwitcher){

    employerSwitcher.onchange =
      () => {

        state.portalEmployer =
          employerSwitcher.value;


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


  const syncButton =
    document.getElementById(
      'syncScrin'
    );


  if(syncButton){

    syncButton.onclick =
      syncScrin;
  }


  const testButton =
    document.getElementById(
      'testScrin'
    );


  if(testButton){

    testButton.onclick =
      testScrin;
  }


  const refreshButton =
    document.getElementById(
      'refreshConnections'
    );


  if(refreshButton){

    refreshButton.onclick =
      refreshConnections;
  }


  const addConnection =
    document.getElementById(
      'toggleAddConnection'
    );


  if(addConnection){

    addConnection.onclick =
      () => {

        state.showAddConnection =
          !state.showAddConnection;

        render();
      };
  }


  const saveMappingsButton =
    document.getElementById(
      'saveMappings'
    );


  if(saveMappingsButton){

    saveMappingsButton.onclick =
      saveMappings;
  }


  const saveContextButton =
    document.getElementById(
      'saveContext'
    );


  if(saveContextButton){

    saveContextButton.onclick =
      saveContext;
  }


  const loadDayButton =
    document.getElementById(
      'loadLiveDay'
    );


  if(loadDayButton){

    loadDayButton.onclick =
      loadLiveDay;
  }


  const savePolicyButton =
    document.getElementById(
      'saveMonitoringPolicy'
    );


  if(savePolicyButton){

    savePolicyButton.onclick =
      saveMonitoringPolicy;
  }


  [
    'policyMode',
    'policyShotsPerHour',
    'policyDailyTarget',
    'policyExpectedDayHours'
  ]

  .forEach(
    id => {

      const element =
        document.getElementById(
          id
        );


      if(element){

        element.onchange =
          updatePolicyEstimate;


        element.oninput =
          updatePolicyEstimate;
      }
    }
  );


  const reportSelector =
    document.getElementById(
      'reportEmployee'
    );


  if(reportSelector){

    reportSelector.onchange =
      () => {

        if(
          reportSelector.value
          !==
          '__ALL__'
        ){

          state.selectedEmployeeId =
            reportSelector.value;
        }
      };
  }


  const generateButton =
    document.getElementById(
      'generateBtn'
    );


  if(generateButton){

    generateButton.onclick =
      generateReport;
  }


  const requestReportButton =
    document.getElementById(
      'requestEmployerReport'
    );


  if(requestReportButton){

    requestReportButton.onclick =
      () =>
        toast(
          'Report request queued for White Glove review.'
        );
  }


  document

    .querySelectorAll(
      '[data-check]'
    )

    .forEach(
      element => {

        element.onchange =
          () => {

            state.reviewerChecks[
              Number(
                element.dataset.check
              )
            ]
            =
            element.checked;
          };
      }
    );


  const approveButton =
    document.getElementById(
      'approveBtn'
    );


  if(approveButton){

    approveButton.onclick =
      () => {

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


  const previewButton =
    document.getElementById(
      'previewReport'
    );


  if(previewButton){

    previewButton.onclick =
      () => {

        state.page =
          'reportPreview';

        render();
      };
  }


  const releaseButton =
    document.getElementById(
      'releaseBtn'
    );


  if(releaseButton){

    releaseButton.onclick =
      () => {

        if(
          state.reportStatus
          ===
          'Released'
        ){
          return;
        }


        const e =
          employeeById(
            state.reportEmployeeId
          )
          ||
          employee();


        state.reportStatus =
          'Released';


        state.deliveryQueue.push({

          employeeId:
            e.id,

          employer:
            e.employer,

          connectionId:
            e.connectionId,

          period:
            {
              ...state.reportPeriod
            },

          status:
            'queued'
        });


        render();


        toast(
          'Released. Future GHL delivery event queued.'
        );
      };
  }


  const batchGreen =
    document.getElementById(
      'batchGreen'
    );


  if(batchGreen){

    batchGreen.onclick =
      () => {

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


  const printButton =
    document.getElementById(
      'printReport'
    );


  if(printButton){

    printButton.onclick =
      () =>
        window.print();
  }
}


/* ==========================================================
   INITIALIZE
   ========================================================== */

async function initializeApp(){

  try {

    const healthResponse =
      await fetch(
        '/api/health'
      );


    const health =
      await healthResponse.json();


    state.mode =
      health.mode==='live'
        ? 'LIVE'
        : 'DEMO';


    if(
      state.mode==='LIVE'
    ){

      state.syncMessage =
        (
          'Live Scrin configuration detected. '
          +
          `${health.connectionCount??'—'} connection(s) configured.`
        );
    }


  } catch(error){

    console.error(
      'Could not determine WGM connection mode:',
      error
    );
  }


  try {

    const connectionResponse =
      await fetch(
        '/api/scrin/connections'
      );


    const connectionData =
      await connectionResponse.json();


    if(
      connectionResponse.ok
      &&
      Array.isArray(
        connectionData.connections
      )
    ){

      state.connections =
        connectionData.connections;


      saveConnections();
    }


  } catch(error){

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
