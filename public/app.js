/* ==========================================================
   WHITE GLOVE MONITOR — PROTOTYPE V1.7
   OFFICIAL REPORT ENGINE FRONTEND
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
  reportPeriod: { from: '2026-09-01', to: '2026-09-30' },
  deliveryQueue: [],
  toast: null,
  syncMessage: 'Demo data loaded. Connect Scrin to replace this with live employees.',
  role: localStorage.getItem('wgmRole') || 'owner',
  portalEmployer: localStorage.getItem('wgmPortalEmployer') || '',
  showAddConnection: false,
  releasedReports: [],
  notifications: [],
  selectedReleaseId: '',
};

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
    employer: 'Grider & Peterson Real Estate',
    scrinCompany: 'WGH Scrin Account',
    source: 'WGH Managed',
    role: 'Virtual Assistant',
    timezone: 'UTC-07:00',
    timezoneOffsetMinutes: -420,
    schedule: 'Monday–Friday · 8 hours/day · 40 hours/week',
    expectedHours: 160,
    trackedHours: 161.42,
    activeDays: 20,
    excluded: false,
    reportingStatus: 'Ready',
    context: 'No approved leave or schedule adjustment for the benchmark month.',

    baseline: {
      clientCompany: 'Grider & Peterson Real Estate',
      primaryContact: '',
      startDate: '',
      generalRole: 'Virtual Assistant',
      employmentType: 'Full-time',
      expectedHoursPerWeek: 40,
      expectedHoursPerDay: 8,
      normalWorkingDays: 'Monday–Friday',
      timezone: 'UTC-07:00',
      generalSchedule: 'Monday–Friday · 8 hours/day · 40 hours/week',
      scheduleFlexibility: 'Standard client-approved flexibility',
      coreAvailability: '',
      commonApplications:
        'Outlook, Canva, MLS/property systems, browser research',
      knownOffComputerWork: '',
      recurringMeetings: '',
      broadWorkstreams:
        'Marketing / content; Listings / property; Files / documents; Email & communication; CRM & lead follow-up'
    },

    monthlyContexts: {},

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
      ['Marketing / content', 30],
      ['Listings / property', 22],
      ['Files / documents', 16],
      ['Email & communication', 13],
      ['CRM & lead follow-up', 11],
      ['Research / AI', 8]
    ],

    apps: [
      ['Outlook / Microsoft', 31],
      ['Canva', 20],
      ['NavicaMLS', 18],
      ['Browser research', 14],
      ['WhatsApp', 9],
      ['Other', 8]
    ],

    weeks: [],
    shots: []
  }
];


/* ==========================================================
   LOCAL STORAGE
   ========================================================== */

function loadJson(
  key,
  fallback
) {

  try {

    const value =
      JSON.parse(
        localStorage.getItem(key)
        ||
        'null'
      );

    return value ?? fallback;

  } catch {

    return fallback;
  }
}


function saveJson(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  } catch {}
}


function ensureEmployeeShape(
  e
) {

  if(
    !e.baseline
  ) {

    e.baseline = {
      clientCompany:
        e.employer
        ||
        '',

      primaryContact:
        '',

      startDate:
        '',

      generalRole:
        e.role
        ||
        'Virtual Assistant',

      employmentType:
        'Full-time',

      expectedHoursPerWeek:
        40,

      expectedHoursPerDay:
        8,

      normalWorkingDays:
        'Monday–Friday',

      timezone:
        e.timezone
        ||
        '',

      generalSchedule:
        e.schedule
        ||
        '',

      scheduleFlexibility:
        '',

      coreAvailability:
        '',

      commonApplications:
        (e.apps || [])
          .map(
            x =>
              x[0]
          )
          .join(', '),

      knownOffComputerWork:
        '',

      recurringMeetings:
        '',

      broadWorkstreams:
        (e.workstreams || [])
          .map(
            x =>
              x[0]
          )
          .join('; ')
    };
  }


  if(
    !e.monthlyContexts
    ||
    typeof e.monthlyContexts
    !==
    'object'
  ) {

    e.monthlyContexts = {};
  }


  if(
    !e.monitoringPolicy
  ) {

    e.monitoringPolicy =
      defaultMonitoringPolicy();
  }


  return e;
}


state.employees =
  (
    loadJson(
      'wgmEmployees',
      demoEmployees
    )
    ||
    demoEmployees
  )
  .map(
    ensureEmployeeShape
  );


state.connections =
  loadJson(
    'wgmConnections',
    []
  );


state.releasedReports =
  loadJson(
    'wgmReleasedReports',
    []
  );


state.notifications =
  loadJson(
    'wgmNotifications',
    []
  );


if(
  state.employees.length
) {

  state.selectedEmployeeId =
    state.employees[0].id;
}


function saveEmployees() {

  saveJson(
    'wgmEmployees',
    state.employees
  );
}


function saveConnections() {

  saveJson(
    'wgmConnections',
    state.connections
  );
}


function saveReleasedReports() {

  saveJson(
    'wgmReleasedReports',
    state.releasedReports
  );
}


function saveNotifications() {

  saveJson(
    'wgmNotifications',
    state.notifications
  );
}


/* ==========================================================
   GENERAL HELPERS
   ========================================================== */

function escapeHtml(
  v = ''
) {

  return String(v)
    .replace(
      /[&<>"']/g,
      m => ({
        '&':
          '&amp;',

        '<':
          '&lt;',

        '>':
          '&gt;',

        '"':
          '&quot;',

        "'":
          '&#39;'
      }[m])
    );
}


function initials(
  name = ''
) {

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      x =>
        x[0]
    )
    .join('')
    .toUpperCase()
    ||
    'VA';
}


function hoursLabel(
  decimal = 0
) {

  const total =
    Math.max(
      0,
      Math.round(
        Number(decimal || 0)
        *
        60
      )
    );

  return (
    `${Math.floor(total / 60)}h `
    +
    `${String(total % 60).padStart(2, '0')}m`
  );
}


function percentLabel(
  v
) {

  return (
    v === null
    ||
    v === undefined
    ||
    Number.isNaN(
      Number(v)
    )
  )

    ? '—'

    : `${Number(v).toFixed(
        Number(v) % 1
          ? 1
          : 0
      )}%`;
}


function signedNumber(
  v,
  suffix = ''
) {

  if(
    v === null
    ||
    v === undefined
    ||
    Number.isNaN(
      Number(v)
    )
  ) {

    return '—';
  }


  const n =
    Number(v);


  return (
    `${n > 0 ? '+' : ''}`
    +
    `${n}`
    +
    suffix
  );
}


function deepClone(
  v
) {

  return JSON.parse(
    JSON.stringify(v)
  );
}


function monthKeyFromDate(
  date
) {

  return String(
    date
    ||
    ''
  )
  .slice(
    0,
    7
  );
}


function monthLabel(
  date
) {

  if(
    !date
  ) {

    return 'Reporting period';
  }


  return new Date(
    `${date}T00:00:00Z`
  )
  .toLocaleString(
    'en-US',
    {
      month:
        'long',

      year:
        'numeric',

      timeZone:
        'UTC'
    }
  );
}


function periodLabel(
  period = state.reportPeriod
) {

  return monthLabel(
    period?.from
  );
}


function statusClass(
  s = ''
) {

  if(
    /Released|Approved|Ready|Connected|Paid|Active|Green|Complete/i
      .test(s)
  ) {

    return 'green';
  }


  if(
    /Context|Pending|Review|Queued|Planned|Configured|Yellow|Draft/i
      .test(s)
  ) {

    return 'amber';
  }


  if(
    /Failed|Concern|Hold|Error|Suspended|Red/i
      .test(s)
  ) {

    return 'red';
  }


  return 'blue';
}


function toast(
  message
) {

  state.toast =
    message;

  render();


  setTimeout(
    () => {

      state.toast =
        null;

      render();
    },
    2300
  );
}


function metric(
  label,
  value,
  sub
) {

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
  value
) {

  const pct =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          value
          ||
          0
        )
      )
    );


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
        ${Math.round(pct)}%
      </span>

    </div>
  `;
}


/* ==========================================================
   EMPLOYEE / TENANCY HELPERS
   ========================================================== */

function activeEmployees() {

  return state.employees.filter(
    e =>
      !e.excluded
  );
}


function mappedEmployers() {

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


function employeeById(
  id
) {

  return state.employees.find(
    e =>
      String(e.id)
      ===
      String(id)
  );
}


function latestAnalytics(
  e
) {

  return e?.lastAnalytics
  ||
  null;
}


function employeeScheduleCoverage(
  e
) {

  return (
    latestAnalytics(e)
      ?.metrics
      ?.scheduleCoveragePercent

    ??

    (
      Number(
        e?.expectedHours
      )
      >
      0

        ? Math.min(
            100,

            Math.round(
              Number(
                e.trackedHours
                ||
                0
              )
              /
              Number(
                e.expectedHours
              )
              *
              1000
            )
            /
            10
          )

        : null
    )
  );
}


function employeeEvidenceCoverage(
  e
) {

  return (
    latestAnalytics(e)
      ?.evidence
      ?.evidenceCoveragePercent

    ??

    null
  );
}


function employeeReviewState(
  e
) {

  return (
    latestAnalytics(e)
      ?.review
      ?.status

    ||

    'Green'
  );
}


function ensureEmployerSelection() {

  const employers =
    mappedEmployers();


  if(
    !state.portalEmployer
    ||
    !employers.includes(
      state.portalEmployer
    )
  ) {

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
    activeEmployees()
      .filter(
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
  ) {

    state.selectedEmployeeId =
      team[0].id;
  }
}


function portalEmployees() {

  ensureEmployerSelection();


  return activeEmployees()
    .filter(
      e =>
        e.employer
        ===
        state.portalEmployer
    );
}


function employee() {

  if(
    state.role
    ===
    'employer'
  ) {

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
    state.role
    ===
    'employee'
  ) {

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

      : (
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


function visibleEmployees() {

  if(
    state.role
    ===
    'employer'
  ) {

    return portalEmployees();
  }


  if(
    state.role
    ===
    'employee'
  ) {

    const e =
      employee();

    return e
      ? [e]
      : [];
  }


  return activeEmployees();
}


/* ==========================================================
   ROLE / REPORT HISTORY HELPERS
   ========================================================== */

function roleLabel() {

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


function roleSubLabel() {

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


function setRole(
  role
) {

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
    role
    ===
    'employer'
  ) {

    ensureEmployerSelection();
  }


  if(
    role
    ===
    'employee'
  ) {

    const e =
      employeeById(
        state.selectedEmployeeId
      );


    if(
      !e
      ||
      e.excluded
    ) {

      state.selectedEmployeeId =
        activeEmployees()[0]?.id
        ||
        '';
    }
  }


  render();
}


function unreadNotificationsForEmployer(
  employer
) {

  return state.notifications.filter(
    n =>
      n.employer
      ===
      employer
      &&
      !n.read
  )
  .length;
}


function employerReleasedReports(
  employer
) {

  return state.releasedReports
    .filter(
      r =>
        r.employer
        ===
        employer
    )
    .sort(
      (a, b) =>
        String(
          b.releasedAt
        )
        .localeCompare(
          String(
            a.releasedAt
          )
        )
    );
}


function employeeReleasedReports(
  employeeId
) {

  return state.releasedReports
    .filter(
      r =>
        String(
          r.employeeId
        )
        ===
        String(
          employeeId
        )
    )
    .sort(
      (a, b) =>
        String(
          b.releasedAt
        )
        .localeCompare(
          String(
            a.releasedAt
          )
        )
    );
}


function nextReportVersion(
  employeeId,
  period
) {

  return (
    state.releasedReports
      .filter(
        r =>
          String(
            r.employeeId
          )
          ===
          String(
            employeeId
          )
          &&
          r.period?.from
          ===
          period.from
          &&
          r.period?.to
          ===
          period.to
      )
      .length

    +
    1
  );
}


/* ==========================================================
   NAVIGATION
   ========================================================== */

function navButton(
  id,
  label,
  badge = ''
) {

  return `
    <button
      data-page="${id}"
      class="${
        state.page === id
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


function navMarkup() {

  if(
    state.role
    ===
    'reviewer'
  ) {

    return [
      navButton(
        'dashboard',
        'Reviewer Home'
      ),

      navButton(
        'review',
        'Review Queue',
        state.reportStatus === 'Draft ready'
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
  ) {

    const unread =
      unreadNotificationsForEmployer(
        state.portalEmployer
      );


    return [
      navButton(
        'dashboard',
        'Overview',
        unread
          ? String(unread)
          : ''
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
        'Reports',
        unread
          ? String(unread)
          : ''
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
  ) {

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
      state.reportStatus === 'Draft ready'
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
   SHELL
   ========================================================== */

function shell(
  content,
  title
) {

  const unread =
    state.role
    ===
    'employer'

      ? unreadNotificationsForEmployer(
          state.portalEmployer
        )

      : 0;


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

            ${
              state.role === 'employer'
              &&
              unread

                ? `
                  <span class="status amber">

                    <span class="dot"></span>

                    ${unread}
                    new report${unread === 1 ? '' : 's'}

                  </span>
                  `

                : ''
            }


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
                  state.role === 'owner'
                    ? 'selected'
                    : ''
                }
              >
                WGM Owner
              </option>

              <option
                value="reviewer"
                ${
                  state.role === 'reviewer'
                    ? 'selected'
                    : ''
                }
              >
                White Glove Reviewer
              </option>

              <option
                value="employer"
                ${
                  state.role === 'employer'
                    ? 'selected'
                    : ''
                }
              >
                Employer Portal
              </option>

              <option
                value="employee"
                ${
                  state.role === 'employee'
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
              V1.7

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

function dashboard() {

  if(
    state.role === 'employer'
  ) {

    return employerDashboard();
  }


  if(
    state.role === 'employee'
  ) {

    return employeeDashboard();
  }


  if(
    state.role === 'reviewer'
  ) {

    return reviewerDashboard();
  }


  const emps =
    activeEmployees();


  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          WGM Command Center
        </h2>

        <p>

          Scrin is the current capture source.

          WGM owns the employee baseline,
          monthly context,
          analytics,
          human review,
          release
          and employer-facing report history.

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
          Generate report
        </button>

      </div>

    </div>


    <div class="grid metrics">

      ${
        metric(
          'Scrin connections',
          state.connections.length
          ||
          1,
          'Dedicated + shared'
        )
      }

      ${
        metric(
          'Employers',
          mappedEmployers().length,
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
          'Released reports',
          state.releasedReports.length,
          'Saved report versions'
        )
      }

    </div>


    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          Connected workforce
        </div>


        <table>

          <thead>

            <tr>
              <th>Employee</th>
              <th>Employer</th>
              <th>Schedule</th>
              <th>Evidence</th>
              <th>Review</th>
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
                    ${percentLabel(employeeScheduleCoverage(e))}
                  </td>

                  <td>
                    ${percentLabel(employeeEvidenceCoverage(e))}
                  </td>

                  <td>

                    <span
                      class="status ${statusClass(employeeReviewState(e))}"
                    >

                      <span class="dot"></span>

                      ${employeeReviewState(e)}

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
          Official report flow
        </div>


        <div class="context-box">

          <h4>
            1. Employee baseline
          </h4>

          <p>

            Permanent role,
            schedule,
            normal hours,
            applications,
            workstreams
            and known off-computer work.

          </p>

        </div>


        <div class="context-box">

          <h4>
            2. Monthly context
          </h4>

          <p>

            PTO,
            holidays,
            approved schedule changes,
            business context,
            employer/employee notes
            and White Glove support activity.

          </p>

        </div>


        <div class="context-box">

          <h4>
            3. Release
          </h4>

          <p>

            Reviewer approval creates
            an exact released report snapshot
            and an employer notification.

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

function employerDashboard() {

  const team =
    portalEmployees();


  const unread =
    unreadNotificationsForEmployer(
      state.portalEmployer
    );


  const releases =
    employerReleasedReports(
      state.portalEmployer
    );


  const total =
    team.reduce(
      (s, e) =>
        s
        +
        Number(
          e.trackedHours
          ||
          0
        ),
      0
    );


  const evidenceValues =
    team
      .map(
        employeeEvidenceCoverage
      )
      .filter(
        v =>
          v !== null
      );


  const avgEvidence =
    evidenceValues.length

      ? Math.round(
          evidenceValues.reduce(
            (a,b) =>
              a
              +
              Number(b),
            0
          )
          /
          evidenceValues.length
        )

      : null;


  const latestUnread =
    state.notifications
      .filter(
        n =>
          n.employer
          ===
          state.portalEmployer
          &&
          !n.read
      )
      .sort(
        (a,b) =>
          String(
            b.createdAt
          )
          .localeCompare(
            String(
              a.createdAt
            )
          )
      )[0];


  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          ${escapeHtml(state.portalEmployer||'Employer')}
          Workforce Overview
        </h2>

        <p>

          Released reports are available
          only after White Glove human review.

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
                x === state.portalEmployer
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


    ${
      latestUnread

        ? `
          <div
            class="card panel"
            style="
              margin-bottom:16px;
              border-left:4px solid #C9A84C
            "
          >

            <div
              class="header-row"
              style="margin-bottom:0"
            >

              <div>

                <div class="panel-title">
                  NEW REPORT AVAILABLE
                </div>

                <h3
                  style="margin:6px 0"
                >
                  ${escapeHtml(latestUnread.title)}
                </h3>

                <p>
                  ${escapeHtml(latestUnread.message)}
                </p>

              </div>


              <button
                class="btn gold"
                data-view-release="${escapeHtml(latestUnread.reportId)}"
              >
                View Report
              </button>

            </div>

          </div>
          `

        : ''
    }


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
          'Average evidence coverage',
          avgEvidence === null
            ? '—'
            : `${avgEvidence}%`,
          'Last analyzed periods'
        )
      }

      ${
        metric(
          'Released reports',
          releases.length,
          unread
            ? `${unread} unread`
            : 'All viewed'
        )
      }

    </div>


    <div class="card panel">

      <div class="panel-title">
        My Team
      </div>


      <table>

        <thead>

          <tr>
            <th>Employee</th>
            <th>Tracked</th>
            <th>Schedule</th>
            <th>Evidence</th>
            <th>Latest released report</th>
          </tr>

        </thead>


        <tbody>

          ${
            team.length

              ? team.map(
                  e => {

                    const latest =
                      employeeReleasedReports(
                        e.id
                      )[0];


                    return `
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
                          ${hoursLabel(e.trackedHours)}
                        </td>

                        <td>
                          ${percentLabel(employeeScheduleCoverage(e))}
                        </td>

                        <td>
                          ${percentLabel(employeeEvidenceCoverage(e))}
                        </td>

                        <td>

                          ${
                            latest

                              ? `
                                ${escapeHtml(periodLabel(latest.period))}
                                ·
                                v${latest.version}

                                <button
                                  class="btn"
                                  style="margin-left:8px"
                                  data-view-release="${escapeHtml(latest.id)}"
                                >
                                  View
                                </button>
                                `

                              : 'No released report'
                          }

                        </td>

                      </tr>
                    `;
                  }
                ).join('')

              : `
                <tr>

                  <td colspan="5">
                    No employees mapped to this employer.
                  </td>

                </tr>
                `
          }

        </tbody>

      </table>

    </div>
    `,
    'Employer Portal'
  );
}


/* ==========================================================
   EMPLOYEE DASHBOARD
   ========================================================== */

function employeeDashboard() {

  const e =
    employee();


  if(
    !e
  ) {

    return shell(
      `
      <div class="card empty">
        No employee selected.
      </div>
      `,
      'Employee Portal'
    );
  }


  const latest =
    employeeReleasedReports(
      e.id
    )[0];


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
          percentLabel(employeeScheduleCoverage(e)),
          'Last analyzed period'
        )
      }

      ${
        metric(
          'Evidence coverage',
          percentLabel(employeeEvidenceCoverage(e)),
          'Last analyzed period'
        )
      }

      ${
        metric(
          'Latest report',
          latest
            ? periodLabel(latest.period)
            : 'None',
          latest
            ? 'Released by White Glove'
            : 'No released report'
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
            Monthly context
          </h4>

          <p>
            ${escapeHtml(e.context||'No context entered.')}
          </p>

        </div>

      </div>


      <div class="card panel">

        <div class="panel-title">
          Reports
        </div>


        ${
          latest

            ? `
              <p>
                Your latest White Glove-reviewed report is available.
              </p>

              <button
                class="btn primary"
                data-view-release="${escapeHtml(latest.id)}"
              >
                View
                ${escapeHtml(periodLabel(latest.period))}
                Report
              </button>
              `

            : `
              <div class="empty">
                No released report is available yet.
              </div>
              `
        }

      </div>

    </div>
    `,
    'Employee Portal'
  );
}


/* ==========================================================
   REVIEWER DASHBOARD
   ========================================================== */

function reviewerDashboard() {

  const emps =
    activeEmployees();


  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Reviewer Workspace
        </h2>

        <p>

          Every employer-facing report
          must be reviewed and approved
          before release.

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
          'Employees',
          emps.length,
          'Authorized population'
        )
      }

      ${
        metric(
          'Green',
          emps.filter(
            e =>
              employeeReviewState(e)
              ===
              'Green'
          ).length,
          'Standard review'
        )
      }

      ${
        metric(
          'Needs context',
          emps.filter(
            e =>
              employeeReviewState(e)
              !==
              'Green'
          ).length,
          'Individual review'
        )
      }

      ${
        metric(
          'Released reports',
          state.releasedReports.length,
          'Versioned snapshots'
        )
      }

    </div>


    <div class="card panel">

      <div class="panel-title">
        Queue
      </div>

      ${reviewQueueTable()}

    </div>
    `,
    'Reviewer Home'
  );
}


/* ==========================================================
   COMPANIES / EMPLOYEES
   ========================================================== */

function companies() {

  const groups =
    {};


  activeEmployees().forEach(
    e => {

      const key =
        e.employer
        ||
        'Unassigned';


      (
        groups[key]
        ||=
        []
      )
      .push(e);
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
          Employer mapping is the portal isolation boundary.
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
            <th>Connections</th>
            <th>Released reports</th>
            <th>Status</th>
          </tr>

        </thead>


        <tbody>

          ${
            Object.entries(groups)
              .map(
                ([name, emps]) => `
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
                    ${employerReleasedReports(name).length}
                  </td>

                  <td>

                    <span
                      class="status ${
                        name === 'Unassigned'
                          ? 'amber'
                          : 'green'
                      }"
                    >

                      <span class="dot"></span>

                      ${
                        name === 'Unassigned'
                          ? 'Mapping required'
                          : 'Active'
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
    'Companies'
  );
}


function employees() {

  const emps =
    visibleEmployees();


  const title =
    state.role === 'employer'
      ? 'My Team'
      : 'Employees';


  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          ${title}
        </h2>

        <p>

          ${
            state.role === 'employer'

              ? 'Only employees mapped to your organization are shown.'

              : 'Open an employee to manage baseline, context, monitoring, or reports.'
          }

        </p>

      </div>


      ${
        state.role === 'owner'

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
        state.role === 'owner'

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
            <th>Schedule</th>
            <th>Evidence</th>
            <th>Latest report</th>
          </tr>

        </thead>


        <tbody>

          ${
            emps.map(
              e => {

                const latest =
                  employeeReleasedReports(
                    e.id
                  )[0];


                return `
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
                      ${escapeHtml(e.connectionName||'Scrin')}
                    </td>

                    <td>
                      ${percentLabel(employeeScheduleCoverage(e))}
                    </td>

                    <td>
                      ${percentLabel(employeeEvidenceCoverage(e))}
                    </td>

                    <td>

                      ${
                        latest

                          ? `
                            ${escapeHtml(periodLabel(latest.period))}
                            ·
                            v${latest.version}
                            `

                          : '—'
                      }

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
    title
  );
}


/* ==========================================================
   EMPLOYEE MONITORING
   ========================================================== */

function monitoring() {

  return employeeView();
}


function employeeView() {

  const e =
    employee();


  if(
    !e
  ) {

    return shell(
      `
      <div class="card empty">
        No employee is available in this portal.
      </div>
      `,
      'Employee Monitoring'
    );
  }


  const tabs = [
    'overview',
    'baseline',
    'timeline',
    'screenshots',
    'workstreams',
    'apps',
    'policy'
  ];


  if(
    state.role !== 'employee'
  ) {

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

    baseline:
      'VA Baseline',

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
      'Monthly Context',

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
                state.employeeTab === t
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


      ${
        state.employeeTab === 'baseline'

          ? baselineView(e)

          : state.employeeTab === 'policy'

            ? monitoringPolicyView(e)

            : state.employeeTab === 'context'

              ? monthlyContextView(e)

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

function employeeTabContent(
  e
) {

  if(
    state.employeeTab === 'screenshots'
  ) {

    return screenshotView(e);
  }


  if(
    state.employeeTab === 'workstreams'
  ) {

    return `
      <div class="grid two-col">

        <div>

          ${
            (e.workstreams || [])
              .map(
                x =>
                  mixBar(
                    x[0],
                    x[1]
                  )
              )
              .join('')

            ||

            `
            <div class="empty">

              Generate a report period
              to populate directional work categories.

            </div>
            `
          }

        </div>


        <div class="callout">

          <strong>
            Reporting rule
          </strong>

          Categories combine project,
          note
          and application evidence.

          They are directional —
          not exact task-duration allocation.

        </div>

      </div>
    `;
  }


  if(
    state.employeeTab === 'apps'
  ) {

    return `
      <div class="grid two-col">

        <div>

          ${
            (e.apps || [])
              .map(
                x =>
                  mixBar(
                    x[0],
                    x[1]
                  )
              )
              .join('')

            ||

            `
            <div class="empty">
              Generate or sync evidence to populate applications.
            </div>
            `
          }

        </div>


        <div class="context-box">

          <h4>
            How WGM uses this
          </h4>

          <p>

            Applications help establish
            business relevance
            and repeated work patterns.

            Activity level
            or app switching
            is not a standalone performance score.

          </p>

        </div>

      </div>
    `;
  }


  if(
    state.employeeTab === 'reports'
  ) {

    const releases =
      employeeReleasedReports(
        e.id
      );


    return releases.length

      ? `
        <table>

          <thead>

            <tr>
              <th>Period</th>
              <th>Version</th>
              <th>Released</th>
              <th>Reviewer</th>
              <th></th>
            </tr>

          </thead>


          <tbody>

            ${
              releases.map(
                r => `
                <tr>

                  <td>
                    ${escapeHtml(periodLabel(r.period))}
                  </td>

                  <td>
                    v${r.version}
                  </td>

                  <td>
                    ${new Date(r.releasedAt).toLocaleString()}
                  </td>

                  <td>
                    ${escapeHtml(r.reviewer||'White Glove Reviewer')}
                  </td>

                  <td>

                    <button
                      class="btn"
                      data-view-release="${escapeHtml(r.id)}"
                    >
                      View
                    </button>

                  </td>

                </tr>
                `
              ).join('')
            }

          </tbody>

        </table>
        `

      : `
        <div class="empty">
          No released reports are available for this employee.
        </div>
        `;
  }


  if(
    state.employeeTab === 'timeline'
  ) {

    const s =
      e.daySummary;


    return s

      ? `
        <div class="grid metrics">

          ${
            metric(
              'First tracked',
              escapeHtml(s.firstTracked||'—'),
              'Selected day'
            )
          }

          ${
            metric(
              'Last tracked',
              escapeHtml(s.lastTracked||'—'),
              'Selected day'
            )
          }

          ${
            metric(
              'Recorded time',
              hoursLabel(
                Number(
                  s.trackedSeconds
                  ||
                  0
                )
                /
                3600
              ),
              'Union of tracked intervals'
            )
          }

          ${
            metric(
              'Screenshots',
              Number(
                s.screenshotCount
                ||
                0
              ),
              'Available evidence captures'
            )
          }

        </div>


        <div class="card panel">

          <div class="panel-title">
            Tracked sessions
          </div>

          ${
            (s.sessions || [])
              .map(
                x => `
                <div class="context-box">

                  <h4>
                    ${escapeHtml(x.from)}
                    –
                    ${escapeHtml(x.to)}
                  </h4>

                  <p>
                    ${
                      hoursLabel(
                        Number(
                          x.seconds
                          ||
                          0
                        )
                        /
                        3600
                      )
                    }
                    tracked
                  </p>

                </div>
                `
              )
              .join('')

            ||

            `
            <div class="empty">
              No sessions loaded.
            </div>
            `
          }

        </div>
        `

      : `
        <div class="callout">

          <strong>
            No day loaded yet
          </strong>

          Open Screenshots,
          choose a date
          and load the complete day from Scrin.

        </div>
        `;
  }


  const a =
    latestAnalytics(e);


  return `
    <div class="grid metrics">

      ${
        metric(
          'Tracked time',
          hoursLabel(e.trackedHours),
          'Last analyzed period'
        )
      }

      ${
        metric(
          'Schedule coverage',
          percentLabel(employeeScheduleCoverage(e)),
          'Adjusted monthly expectation'
        )
      }

      ${
        metric(
          'Evidence coverage',
          percentLabel(employeeEvidenceCoverage(e)),
          'Tracked segments with screenshot evidence'
        )
      }

      ${
        metric(
          'Review state',
          a?.review?.status
          ||
          '—',
          a?.review?.reasons?.length
            ? `${a.review.reasons.length} reason(s)`
            : 'Human review still required'
        )
      }

    </div>


    <div class="grid two-col">

      <div>

        <div class="panel-title">
          Weekly analytics
        </div>

        ${
          a?.weeks?.length

            ? a.weeks.map(
                w => `
                <div class="context-box">

                  <h4>

                    ${escapeHtml(w.label)}

                    ·

                    ${hoursLabel(w.trackedHours)}

                  </h4>

                  <p>

                    Evidence
                    ${percentLabel(w.evidenceCoveragePercent)}

                    ·

                    ${w.screenshotCount}
                    screenshots

                    ${
                      w.categories?.[0]?.name

                        ? `
                          ·
                          Leading category:
                          ${escapeHtml(w.categories[0].name)}
                          `

                        : ''
                    }

                  </p>

                </div>
                `
              ).join('')

            : `
              <div class="empty">
                Generate a report to calculate weekly analytics.
              </div>
              `
        }

      </div>


      <div>

        <div class="panel-title">
          Reporting context
        </div>


        <div class="context-box">

          <h4>
            Baseline
          </h4>

          <p>
            ${escapeHtml(
              e.baseline?.generalSchedule
              ||
              e.schedule
              ||
              'Not set'
            )}
          </p>

        </div>


        <div class="context-box">

          <h4>
            Evidence disclosure
          </h4>

          <p>
            ${escapeHtml(
              a?.analysisDisclosure?.note
              ||
              'Generate a report to populate evidence disclosure.'
            )}
          </p>

        </div>

      </div>

    </div>
  `;
}


/* ==========================================================
   PERMANENT VA BASELINE
   ========================================================== */

function baselineView(
  e
) {

  const b =
    e.baseline
    ||
    {};


  const canEdit =
    state.role
    !==
    'employee';


  const disabled =
    canEdit
      ? ''
      : 'disabled';


  return `
    <div class="grid two-col">

      <div>

        <div class="panel-title">
          Permanent VA / Client Baseline
        </div>


        <div class="field">

          <label>
            Client / company
          </label>

          <input
            id="baseClientCompany"
            value="${escapeHtml(b.clientCompany||e.employer||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Primary client contact
          </label>

          <input
            id="basePrimaryContact"
            value="${escapeHtml(b.primaryContact||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            VA start date
          </label>

          <input
            id="baseStartDate"
            type="date"
            value="${escapeHtml(b.startDate||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            General role
          </label>

          <input
            id="baseGeneralRole"
            value="${escapeHtml(b.generalRole||e.role||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Employment type
          </label>

          <select
            id="baseEmploymentType"
            ${disabled}
          >

            <option
              ${
                b.employmentType === 'Full-time'
                  ? 'selected'
                  : ''
              }
            >
              Full-time
            </option>

            <option
              ${
                b.employmentType === 'Part-time'
                  ? 'selected'
                  : ''
              }
            >
              Part-time
            </option>

            <option
              ${
                b.employmentType === 'Flexible'
                  ? 'selected'
                  : ''
              }
            >
              Flexible
            </option>

          </select>

        </div>


        <div class="field">

          <label>
            Expected hours / week
          </label>

          <input
            id="baseHoursWeek"
            type="number"
            min="0"
            step="0.5"
            value="${Number(b.expectedHoursPerWeek||40)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Expected hours / day
          </label>

          <input
            id="baseHoursDay"
            type="number"
            min="0"
            step="0.5"
            value="${Number(b.expectedHoursPerDay||8)}"
            ${disabled}
          >

        </div>

      </div>


      <div>

        <div class="panel-title">
          Schedule & Work Context
        </div>


        <div class="field">

          <label>
            Normal working days
          </label>

          <input
            id="baseWorkingDays"
            value="${escapeHtml(b.normalWorkingDays||'Monday–Friday')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Time zone
          </label>

          <input
            id="baseTimezone"
            value="${escapeHtml(b.timezone||e.timezone||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            General schedule
          </label>

          <input
            id="baseSchedule"
            value="${escapeHtml(b.generalSchedule||e.schedule||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Schedule flexibility
          </label>

          <input
            id="baseFlexibility"
            value="${escapeHtml(b.scheduleFlexibility||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Core availability hours
          </label>

          <input
            id="baseCoreAvailability"
            value="${escapeHtml(b.coreAvailability||'')}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Common applications
          </label>

          <textarea
            id="baseApps"
            ${disabled}
          >${escapeHtml(b.commonApplications||'')}</textarea>

        </div>


        <div class="field">

          <label>
            Known off-computer work
          </label>

          <textarea
            id="baseOffComputer"
            ${disabled}
          >${escapeHtml(b.knownOffComputerWork||'')}</textarea>

        </div>


        <div class="field">

          <label>
            Recurring meetings
          </label>

          <textarea
            id="baseMeetings"
            ${disabled}
          >${escapeHtml(b.recurringMeetings||'')}</textarea>

        </div>


        <div class="field">

          <label>
            Broad workstream categories
          </label>

          <textarea
            id="baseWorkstreams"
            ${disabled}
          >${escapeHtml(b.broadWorkstreams||'')}</textarea>

        </div>


        ${
          canEdit

            ? `
              <button
                class="btn gold"
                id="saveBaseline"
              >
                Save Baseline
              </button>
              `

            : `
              <div class="small">
                This baseline is read-only from the employee role.
              </div>
              `
        }

      </div>

    </div>
  `;
}


function saveBaseline() {

  const e =
    employee();


  if(
    !e
    ||
    state.role === 'employee'
  ) {

    return;
  }


  e.baseline = {
    clientCompany:
      document
        .getElementById('baseClientCompany')
        ?.value
        .trim()
      ||
      e.employer
      ||
      '',

    primaryContact:
      document
        .getElementById('basePrimaryContact')
        ?.value
        .trim()
      ||
      '',

    startDate:
      document
        .getElementById('baseStartDate')
        ?.value
      ||
      '',

    generalRole:
      document
        .getElementById('baseGeneralRole')
        ?.value
        .trim()
      ||
      e.role
      ||
      'Virtual Assistant',

    employmentType:
      document
        .getElementById('baseEmploymentType')
        ?.value
      ||
      'Full-time',

    expectedHoursPerWeek:
      Number(
        document
          .getElementById('baseHoursWeek')
          ?.value
        ||
        0
      ),

    expectedHoursPerDay:
      Number(
        document
          .getElementById('baseHoursDay')
          ?.value
        ||
        0
      ),

    normalWorkingDays:
      document
        .getElementById('baseWorkingDays')
        ?.value
        .trim()
      ||
      '',

    timezone:
      document
        .getElementById('baseTimezone')
        ?.value
        .trim()
      ||
      e.timezone
      ||
      '',

    generalSchedule:
      document
        .getElementById('baseSchedule')
        ?.value
        .trim()
      ||
      e.schedule
      ||
      '',

    scheduleFlexibility:
      document
        .getElementById('baseFlexibility')
        ?.value
        .trim()
      ||
      '',

    coreAvailability:
      document
        .getElementById('baseCoreAvailability')
        ?.value
        .trim()
      ||
      '',

    commonApplications:
      document
        .getElementById('baseApps')
        ?.value
        .trim()
      ||
      '',

    knownOffComputerWork:
      document
        .getElementById('baseOffComputer')
        ?.value
        .trim()
      ||
      '',

    recurringMeetings:
      document
        .getElementById('baseMeetings')
        ?.value
        .trim()
      ||
      '',

    broadWorkstreams:
      document
        .getElementById('baseWorkstreams')
        ?.value
        .trim()
      ||
      ''
  };


  e.role =
    e.baseline.generalRole
    ||
    e.role;


  e.timezone =
    e.baseline.timezone
    ||
    e.timezone;


  e.schedule =
    e.baseline.generalSchedule
    ||
    e.schedule;


  saveEmployees();


  toast(
    'Permanent VA baseline saved.'
  );
}


/* ==========================================================
   MONTHLY REPORT CONTEXT
   ========================================================== */

function getMonthlyContext(
  e,
  key = monthKeyFromDate(
    state.reportPeriod.from
  )
) {

  ensureEmployeeShape(e);


  if(
    !e.monthlyContexts[key]
  ) {

    e.monthlyContexts[key] = {
      month:
        key,

      expectedWorkingDays:
        20,

      expectedMonthlyHours:
        Number(
          e.expectedHours
          ||
          160
        ),

      approvedPTOHours:
        0,

      sickLeaveHours:
        0,

      holidayHours:
        0,

      clientApprovedHoursOff:
        0,

      approvedReductionHours:
        0,

      additionalRequiredHours:
        0,

      materialBusinessContext:
        '',

      employerNotes:
        '',

      employeeNotes:
        '',

      whiteGloveSupportActivity:
        ''
    };
  }


  return e.monthlyContexts[key];
}


function adjustedExpectedHours(
  ctx
) {

  const base =
    Number(
      ctx.expectedMonthlyHours
      ||
      0
    );


  const reductions =
    Number(
      ctx.approvedPTOHours
      ||
      0
    )
    +
    Number(
      ctx.sickLeaveHours
      ||
      0
    )
    +
    Number(
      ctx.holidayHours
      ||
      0
    )
    +
    Number(
      ctx.clientApprovedHoursOff
      ||
      0
    )
    +
    Number(
      ctx.approvedReductionHours
      ||
      0
    );


  const additions =
    Number(
      ctx.additionalRequiredHours
      ||
      0
    );


  return Math.max(
    0,
    base
    -
    reductions
    +
    additions
  );
}


function monthlyContextFields(
  e,
  compact = false
) {

  const key =
    monthKeyFromDate(
      state.reportPeriod.from
    );


  const c =
    getMonthlyContext(
      e,
      key
    );


  const canEdit =
    state.role
    !==
    'employee';


  const disabled =
    canEdit
      ? ''
      : 'disabled';


  return `
    <div class="${compact ? '' : 'grid two-col'}">

      <div>

        <div class="panel-title">
          ${escapeHtml(monthLabel(state.reportPeriod.from))}
          Schedule Context
        </div>


        <div class="field">

          <label>
            Expected working days
          </label>

          <input
            id="ctxWorkingDays"
            type="number"
            min="0"
            step="1"
            value="${Number(c.expectedWorkingDays||0)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Base expected monthly hours
          </label>

          <input
            id="ctxExpectedHours"
            type="number"
            min="0"
            step="0.5"
            value="${Number(c.expectedMonthlyHours||0)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Approved PTO hours
          </label>

          <input
            id="ctxPTO"
            type="number"
            min="0"
            step="0.5"
            value="${Number(c.approvedPTOHours||0)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Sick leave hours
          </label>

          <input
            id="ctxSick"
            type="number"
            min="0"
            step="0.5"
            value="${Number(c.sickLeaveHours||0)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Public holiday hours
          </label>

          <input
            id="ctxHoliday"
            type="number"
            min="0"
            step="0.5"
            value="${Number(c.holidayHours||0)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Client-approved hours off
          </label>

          <input
            id="ctxClientOff"
            type="number"
            min="0"
            step="0.5"
            value="${Number(c.clientApprovedHoursOff||0)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Other approved hour reduction
          </label>

          <input
            id="ctxReduction"
            type="number"
            min="0"
            step="0.5"
            value="${Number(c.approvedReductionHours||0)}"
            ${disabled}
          >

        </div>


        <div class="field">

          <label>
            Additional required / adjusted hours
          </label>

          <input
            id="ctxAdditional"
            type="number"
            min="0"
            step="0.5"
            value="${Number(c.additionalRequiredHours||0)}"
            ${disabled}
          >

        </div>


        <div class="context-box">

          <h4>
            Adjusted expected hours
          </h4>

          <p
            id="adjustedExpectedDisplay"
          >
            ${hoursLabel(adjustedExpectedHours(c))}
          </p>

        </div>

      </div>


      <div>

        <div class="panel-title">
          Business & White Glove Context
        </div>


        <div class="field">

          <label>
            Material business context
          </label>

          <textarea
            id="ctxBusiness"
            ${disabled}
          >${escapeHtml(c.materialBusinessContext||'')}</textarea>

        </div>


        <div class="field">

          <label>
            Employer notes
          </label>

          <textarea
            id="ctxEmployerNotes"
            ${disabled}
          >${escapeHtml(c.employerNotes||'')}</textarea>

        </div>


        <div class="field">

          <label>
            Employee notes / clarification
          </label>

          <textarea
            id="ctxEmployeeNotes"
            ${disabled}
          >${escapeHtml(c.employeeNotes||'')}</textarea>

        </div>


        <div class="field">

          <label>
            White Glove support / coaching activity this month
          </label>

          <textarea
            id="ctxSupport"
            ${disabled}
          >${escapeHtml(c.whiteGloveSupportActivity||'')}</textarea>

        </div>


        ${
          canEdit

            ? `
              <button
                class="btn gold"
                id="saveMonthlyContext"
              >
                Save Monthly Context
              </button>
              `

            : `
              <div class="small">
                Monthly context is read-only from the employee role.
              </div>
              `
        }

      </div>

    </div>
  `;
}


function monthlyContextView(
  e
) {

  return `
    <div class="callout">

      <strong>
        Monthly context applies before WGM judges schedule coverage.
      </strong>

      Approved leave,
      holidays,
      client-approved time off
      and approved schedule changes
      reduce or adjust the monthly expectation
      before report interpretation.

    </div>


    <div style="margin-top:16px">

      ${monthlyContextFields(e)}

    </div>
  `;
}


function collectMonthlyContext(
  e
) {

  const key =
    monthKeyFromDate(
      state.reportPeriod.from
    );


  const existing =
    getMonthlyContext(
      e,
      key
    );


  const readNum =
    (
      id,
      fallback
    ) => {

      const el =
        document.getElementById(id);


      return el
        ? Number(
            el.value
            ||
            0
          )
        : Number(
            fallback
            ||
            0
          );
    };


  const readText =
    (
      id,
      fallback
    ) => {

      const el =
        document.getElementById(id);


      return el
        ? el.value.trim()
        : String(
            fallback
            ||
            ''
          );
    };


  const c = {
    month:
      key,

    expectedWorkingDays:
      readNum(
        'ctxWorkingDays',
        existing.expectedWorkingDays
      ),

    expectedMonthlyHours:
      readNum(
        'ctxExpectedHours',
        existing.expectedMonthlyHours
      ),

    approvedPTOHours:
      readNum(
        'ctxPTO',
        existing.approvedPTOHours
      ),

    sickLeaveHours:
      readNum(
        'ctxSick',
        existing.sickLeaveHours
      ),

    holidayHours:
      readNum(
        'ctxHoliday',
        existing.holidayHours
      ),

    clientApprovedHoursOff:
      readNum(
        'ctxClientOff',
        existing.clientApprovedHoursOff
      ),

    approvedReductionHours:
      readNum(
        'ctxReduction',
        existing.approvedReductionHours
      ),

    additionalRequiredHours:
      readNum(
        'ctxAdditional',
        existing.additionalRequiredHours
      ),

    materialBusinessContext:
      readText(
        'ctxBusiness',
        existing.materialBusinessContext
      ),

    employerNotes:
      readText(
        'ctxEmployerNotes',
        existing.employerNotes
      ),

    employeeNotes:
      readText(
        'ctxEmployeeNotes',
        existing.employeeNotes
      ),

    whiteGloveSupportActivity:
      readText(
        'ctxSupport',
        existing.whiteGloveSupportActivity
      )
  };


  c.adjustedExpectedHours =
    adjustedExpectedHours(c);


  e.monthlyContexts[key] =
    c;


  e.context =
    [
      c.materialBusinessContext,
      c.employerNotes,
      c.employeeNotes
    ]
    .filter(Boolean)
    .join(' | ');


  saveEmployees();


  return c;
}


function saveMonthlyContext() {

  const e =
    employee();


  if(
    !e
    ||
    state.role === 'employee'
  ) {

    return;
  }


  collectMonthlyContext(e);


  toast(
    'Monthly reporting context saved.'
  );
}


function updateAdjustedExpectedDisplay() {

  const fake = {
    expectedMonthlyHours:
      Number(
        document
          .getElementById('ctxExpectedHours')
          ?.value
        ||
        0
      ),

    approvedPTOHours:
      Number(
        document
          .getElementById('ctxPTO')
          ?.value
        ||
        0
      ),

    sickLeaveHours:
      Number(
        document
          .getElementById('ctxSick')
          ?.value
        ||
        0
      ),

    holidayHours:
      Number(
        document
          .getElementById('ctxHoliday')
          ?.value
        ||
        0
      ),

    clientApprovedHoursOff:
      Number(
        document
          .getElementById('ctxClientOff')
          ?.value
        ||
        0
      ),

    approvedReductionHours:
      Number(
        document
          .getElementById('ctxReduction')
          ?.value
        ||
        0
      ),

    additionalRequiredHours:
      Number(
        document
          .getElementById('ctxAdditional')
          ?.value
        ||
        0
      )
  };


  const el =
    document.getElementById(
      'adjustedExpectedDisplay'
    );


  if(
    el
  ) {

    el.textContent =
      hoursLabel(
        adjustedExpectedHours(
          fake
        )
      );
  }
}


/* ==========================================================
   SCREENSHOTS
   ========================================================== */

function screenshotView(
  e
) {

  const s =
    e.daySummary
    ||
    null;


  const date =
    s?.date
    ||
    state.reportPeriod.to
    ||
    '2026-09-18';


  return `
    <div class="toolbar">

      <div class="field">

        <label>
          Date
        </label>

        <input
          id="screenDate"
          type="date"
          value="${escapeHtml(date)}"
        >

      </div>


      <div class="spacer"></div>


      <button
        class="btn primary"
        id="loadLiveDay"
      >
        Load complete day from Scrin
      </button>

    </div>


    ${
      s

        ? `
          <div
            class="grid metrics"
            style="margin:16px 0"
          >

            ${
              metric(
                'First tracked',
                escapeHtml(s.firstTracked||'—'),
                'Start of recorded work'
              )
            }

            ${
              metric(
                'Last tracked',
                escapeHtml(s.lastTracked||'—'),
                'End of recorded work'
              )
            }

            ${
              metric(
                'Recorded time',
                hoursLabel(
                  Number(
                    s.trackedSeconds
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
                  s.screenshotCount
                  ||
                  0
                ),
                'Evidence captures returned'
              )
            }

          </div>


          <div
            class="context-box"
            style="margin:0 0 16px"
          >

            <h4>
              Tracked work sessions
            </h4>

            <p>

              ${
                (s.sessions || [])
                  .map(
                    x =>
                      `${escapeHtml(x.from)}–${escapeHtml(x.to)} (${hoursLabel(Number(x.seconds||0)/3600)})`
                  )
                  .join(' · ')

                ||

                'No sessions returned.'
              }

            </p>

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
            and load the complete day
            to see timeframe,
            sessions
            and all available screenshots.

          </div>
          `
    }


    <div class="banner">

      <div>

        <div class="big">
          Daily screenshot evidence
        </div>

        <div class="muted">

          ${
            s

              ? `${s.screenshotCount} available capture(s) loaded for ${s.date}.`

              : 'Load a workday to inspect screenshot evidence.'
          }

        </div>

      </div>


      <span class="status blue">

        <span class="dot"></span>

        ${escapeHtml(e.connectionName||'Scrin evidence')}

      </span>

    </div>


    <div id="shotArea">

      <div class="shot-grid">

        ${
          (e.shots || [])
            .map(
              x =>
                shotCard(
                  x[0],
                  x[1],
                  x[2],
                  x[3],
                  x[4]
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


function shotCard(
  time,
  app,
  level,
  thumbUrl,
  fullUrl
) {

  const thumb =
    thumbUrl
      ? escapeHtml(thumbUrl)
      : '';


  const full =
    fullUrl
      ? escapeHtml(fullUrl)
      : thumb;


  const image =
    thumb

      ? `
        <a
          href="${full}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <img
            src="${thumb}"
            alt="Scrin screenshot at ${escapeHtml(time)}"
            loading="lazy"
            referrerpolicy="no-referrer"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
              display:block;
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
          · Scrin evidence

        </span>

      </div>

    </div>
  `;
}


async function loadLiveDay() {

  const e =
    employee();


  const date =
    document
      .getElementById('screenDate')
      ?.value;


  if(
    !e
    ||
    !date
  ) {

    return;
  }


  if(
    state.mode !== 'LIVE'
  ) {

    toast(
      'Live Scrin connection is required to load daily evidence.'
    );

    return;
  }


  const area =
    document.getElementById(
      'shotArea'
    );


  if(
    area
  ) {

    area.innerHTML =
      `
      <div class="empty">
        Loading complete Scrin workday…
      </div>
      `;
  }


  try {

    const r =
      await fetch(
        '/api/wgm/day-data',
        {
          method:
            'POST',

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

              date,

              timezoneOffsetMinutes:
                e.timezoneOffsetMinutes
                ||
                0
            })
        }
      );


    const d =
      await r.json();


    if(
      !r.ok
    ) {

      throw new Error(
        d.error
        ||
        'Could not load day data'
      );
    }


    e.shots =
      (d.screenshots || [])
        .map(
          s => [
            s.time,
            s.application,
            s.activityLevel,
            s.thumbUrl,
            s.url
          ]
        );


    e.daySummary = {
      date:
        d.date,

      firstTracked:
        d.firstTracked,

      lastTracked:
        d.lastTracked,

      trackedSeconds:
        d.trackedSeconds,

      screenshotCount:
        d.screenshotCount,

      activityCount:
        d.activityCount,

      sessions:
        d.sessions
        ||
        [],

      timezone:
        e.timezone
        ||
        'Employee timezone'
    };


    saveEmployees();

    render();


  } catch(err) {

    toast(
      `Could not load the complete workday: ${err.message}`
    );
  }
}


/* ==========================================================
   MONITORING POLICY
   ========================================================== */

function defaultMonitoringPolicy() {

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


function monitoringPolicy(
  e
) {

  if(
    !e.monitoringPolicy
  ) {

    e.monitoringPolicy =
      defaultMonitoringPolicy();

    saveEmployees();
  }


  return e.monitoringPolicy;
}


function canEditMonitoringPolicy() {

  return (
    state.role === 'owner'
    ||
    state.role === 'employer'
  );
}


function monitoringPolicyView(
  e
) {

  const p =
    monitoringPolicy(e);


  const editable =
    canEditMonitoringPolicy();


  const disabled =
    editable
      ? ''
      : 'disabled';


  const hours =
    Number(
      p.expectedDayHours
      ||
      8
    );


  const equiv =
    p.mode === 'daily'

      ? Number(
          p.dailyTarget
          ||
          0
        )
        /
        Math.max(
          hours,
          .5
        )

      : Number(
          p.screenshotsPerHour
          ||
          0
        );


  const daily =
    p.mode === 'daily'

      ? Number(
          p.dailyTarget
          ||
          0
        )

      : Math.round(
          Number(
            p.screenshotsPerHour
            ||
            0
          )
          *
          hours
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
                p.enabled
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !p.enabled
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
                p.mode === 'hourly'
                  ? 'selected'
                  : ''
              }
            >
              Screenshots per tracked hour
            </option>

            <option
              value="daily"
              ${
                p.mode === 'daily'
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
            p.mode === 'hourly'
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
            value="${Number(p.screenshotsPerHour||12)}"
            ${disabled}
          >

        </div>


        <div
          class="field"
          id="policyDailyWrap"
          style="${
            p.mode === 'daily'
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
            value="${Number(p.dailyTarget||96)}"
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
            value="${hours}"
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
                p.activityTracking
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !p.activityTracking
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
                p.appUrlTracking
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !p.appUrlTracking
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
            value="${Number(p.autoPauseMinutes||0)}"
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
                p.employeeNotification
                  ? 'selected'
                  : ''
              }
            >
              Enabled
            </option>

            <option
              value="false"
              ${
                !p.employeeNotification
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
              p.mode === 'daily'

                ? `${daily} screenshots/day ≈ ${equiv.toFixed(2)} per tracked hour`

                : `${Number(p.screenshotsPerHour||0)} screenshots/hour ≈ ${daily} over a ${hours}-hour day`
            }

          </p>

        </div>


        <div class="context-box">

          <h4>
            Provider synchronization
          </h4>

          <p>
            ${escapeHtml(p.providerSyncStatus||'Saved in WGM · provider write not connected')}
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
                You can view this policy but cannot change it from this role.
              </div>
              `
        }

      </div>

    </div>
  `;
}


function updatePolicyEstimate() {

  const mode =
    document
      .getElementById('policyMode')
      ?.value
    ||
    'hourly';


  const hw =
    document.getElementById(
      'policyHourlyWrap'
    );


  const dw =
    document.getElementById(
      'policyDailyWrap'
    );


  if(
    hw
  ) {

    hw.style.display =
      mode === 'hourly'
        ? ''
        : 'none';
  }


  if(
    dw
  ) {

    dw.style.display =
      mode === 'daily'
        ? ''
        : 'none';
  }


  const hours =
    Math.max(
      .5,
      Number(
        document
          .getElementById('policyExpectedDayHours')
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
            .getElementById('policyShotsPerHour')
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
          .getElementById('policyDailyTarget')
          ?.value
        ||
        96
      )
    );


  const el =
    document.getElementById(
      'policyEstimate'
    );


  if(
    el
  ) {

    el.textContent =
      mode === 'daily'

        ? `${daily} screenshots/day ≈ ${(daily/hours).toFixed(2)} per tracked hour`

        : `${hourly} screenshots/hour ≈ ${Math.round(hourly*hours)} over a ${hours}-hour day`;
  }
}


function saveMonitoringPolicy() {

  const e =
    employee();


  if(
    !e
    ||
    !canEditMonitoringPolicy()
  ) {

    return;
  }


  e.monitoringPolicy = {
    enabled:
      document
        .getElementById('policyEnabled')
        ?.value
      ===
      'true',

    mode:
      document
        .getElementById('policyMode')
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
              .getElementById('policyShotsPerHour')
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
            .getElementById('policyDailyTarget')
            ?.value
          ||
          96
        )
      ),

    expectedDayHours:
      Math.max(
        .5,
        Number(
          document
            .getElementById('policyExpectedDayHours')
            ?.value
          ||
          8
        )
      ),

    activityTracking:
      document
        .getElementById('policyActivity')
        ?.value
      ===
      'true',

    appUrlTracking:
      document
        .getElementById('policyApps')
        ?.value
      ===
      'true',

    autoPauseMinutes:
      Math.max(
        0,
        Number(
          document
            .getElementById('policyAutoPause')
            ?.value
          ||
          0
        )
      ),

    employeeNotification:
      document
        .getElementById('policyNotification')
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
   REPORT CENTER
   ========================================================== */

function reports() {

  const emps =
    visibleEmployees();


  if(
    state.role === 'employee'
  ) {

    const e =
      employee();


    const releases =
      e
        ? employeeReleasedReports(e.id)
        : [];


    return shell(
      `
      <div class="header-row">

        <div>

          <h2>
            My Reports
          </h2>

          <p>
            Only White Glove-reviewed released reports are shown.
          </p>

        </div>

      </div>


      <div class="card panel">

        ${
          releases.length

            ? releaseHistoryTable(releases)

            : `
              <div class="empty">
                No released report is available yet.
              </div>
              `
        }

      </div>
      `,
      'My Reports'
    );
  }


  if(
    state.role === 'employer'
  ) {

    const releases =
      employerReleasedReports(
        state.portalEmployer
      );


    return shell(
      `
      <div class="header-row">

        <div>

          <h2>
            Reports
          </h2>

          <p>

            Released monthly accountability reports
            for
            ${escapeHtml(state.portalEmployer||'your company')}.

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

        ${
          releases.length

            ? releaseHistoryTable(releases)

            : `
              <div class="empty">
                No released reports are available yet.
              </div>
              `
        }

      </div>
      `,
      'Reports'
    );
  }


  const selected =
    employeeById(
      state.selectedEmployeeId
    )
    ||
    emps[0];


  if(
    selected
  ) {

    ensureEmployeeShape(
      selected
    );
  }


  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Monthly Report Setup
        </h2>

        <p>

          Set the reporting period
          and monthly context first.

          WGM then calculates the month,
          AI fills the approved five-page template,
          and a human reviewer releases the final version.

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
              emps.map(
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

                  ${escapeHtml(x.employer||'Unassigned')}

                </option>
                `
              ).join('')
            }

          </select>

        </div>


        <div class="spacer"></div>


        <button
          id="generateBtn"
          class="btn gold"
        >
          Calculate & Generate Report
        </button>

      </div>

    </div>


    ${
      selected

        ? `
          <div
            class="card panel"
            style="margin-top:16px"
          >

            <div class="header-row">

              <div>

                <div class="panel-title">
                  VA baseline
                </div>

                <div class="panel-sub">

                  ${escapeHtml(selected.baseline?.generalRole||selected.role||'VA')}

                  ·

                  ${escapeHtml(selected.baseline?.generalSchedule||selected.schedule||'Schedule not set')}

                  ·

                  ${escapeHtml(selected.baseline?.timezone||selected.timezone||'Timezone not set')}

                </div>

              </div>


              <button
                class="btn"
                data-open-baseline="${escapeHtml(selected.id)}"
              >
                Edit Baseline
              </button>

            </div>

          </div>


          <div
            class="card panel"
            style="margin-top:16px"
          >

            ${monthlyContextFields(selected)}

          </div>
          `

        : ''
    }


    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Released report history
      </div>

      ${
        state.releasedReports.length

          ? releaseHistoryTable(
              state.releasedReports
            )

          : `
            <div class="empty">
              No released reports yet.
            </div>
            `
      }

    </div>
    `,
    'Reports'
  );
}


function releaseHistoryTable(
  releases
) {

  return `
    <table>

      <thead>

        <tr>
          <th>Employee</th>
          <th>Period</th>
          <th>Version</th>
          <th>Released</th>
          <th>Reviewer</th>
          <th></th>
        </tr>

      </thead>


      <tbody>

        ${
          releases.map(
            r => `
            <tr>

              <td>
                ${escapeHtml(r.employeeName)}
              </td>

              <td>
                ${escapeHtml(periodLabel(r.period))}
              </td>

              <td>
                v${r.version}
              </td>

              <td>
                ${new Date(r.releasedAt).toLocaleString()}
              </td>

              <td>
                ${escapeHtml(r.reviewer||'White Glove Reviewer')}
              </td>

              <td>

                <button
                  class="btn"
                  data-view-release="${escapeHtml(r.id)}"
                >
                  View Report
                </button>

              </td>

            </tr>
            `
          ).join('')
        }

      </tbody>

    </table>
  `;
}


/* ==========================================================
   REPORT GENERATION
   ========================================================== */

async function generateReport() {

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
  ) {

    toast(
      'This employee must be mapped to an employer before report generation.'
    );

    return;
  }


  ensureEmployeeShape(e);


  const monthlyContext =
    collectMonthlyContext(e);


  state.reportEmployeeId =
    e.id;


  state.reportStatus =
    'Calculating analytics';


  state.report =
    null;

  state.reportAnalytics =
    null;

  state.reportPrevious =
    null;

  state.reportComparison =
    null;

  state.reportMetadata =
    null;


  render();


  try {

    const analyticsRes =
      await fetch(
        '/api/wgm/period-analytics',
        {
          method:
            'POST',

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
                  monthlyContext.expectedMonthlyHours
                  ||
                  e.expectedHours
                  ||
                  0
                ),

              adjustedExpectedHours:
                Number(
                  monthlyContext.adjustedExpectedHours
                  ||
                  0
                ),

              monthlyContext,

              includePrevious:
                true,

              maxVisionScreenshots:
                12
            })
        }
      );


    const analyticsData =
      await analyticsRes.json();


    if(
      !analyticsRes.ok
    ) {

      throw new Error(
        analyticsData.error
        ||
        'Period analytics failed'
      );
    }


    state.reportAnalytics =
      analyticsData.current;


    state.reportPrevious =
      analyticsData.previous
      ||
      null;


    state.reportComparison =
      analyticsData.comparison
      ||
      {
        available:
          false
      };


    state.reportMetadata =
      analyticsData.metadata
      ||
      null;


    e.trackedHours =
      Number(
        state.reportAnalytics
          .metrics
          ?.trackedHours
        ||
        0
      );


    e.activeDays =
      Number(
        state.reportAnalytics
          .metrics
          ?.activeDays
        ||
        0
      );


    e.expectedHours =
      Number(
        monthlyContext.adjustedExpectedHours
        ||
        0
      );


    e.workstreams =
      (
        state.reportAnalytics.categories
        ||
        []
      )
      .map(
        x => [
          x.name,
          x.sharePercent
        ]
      );


    e.apps =
      (
        state.reportAnalytics.apps
        ||
        []
      )
      .slice(
        0,
        10
      )
      .map(
        x => [
          x.name,
          x.sharePercent
        ]
      );


    e.lastAnalytics =
      state.reportAnalytics;


    e.reportingStatus =
      'Analytics ready';


    saveEmployees();


    state.reportStatus =
      'Generating official report';


    render();


    const reportRes =
      await fetch(
        '/api/reports/generate',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              employee: {
                id:
                  e.id,

                name:
                  e.name,

                role:
                  e.role,

                employer:
                  e.employer,

                connectionName:
                  e.connectionName
              },

              baseline:
                e.baseline,

              monthlyContext,

              period:
                state.reportPeriod,

              analytics:
                state.reportAnalytics,

              previous:
                state.reportPrevious,

              comparison:
                state.reportComparison,

              context:
                e.context
                ||
                ''
            })
        }
      );


    const reportData =
      await reportRes.json();


    if(
      !reportRes.ok
    ) {

      throw new Error(
        reportData.error
        ||
        'Report generation failed'
      );
    }


    state.report =
      reportData.report;


    state.reportMetadata = {
      ...(
        state.reportMetadata
        ||
        {}
      ),

      ...(
        reportData.metadata
        ||
        {}
      ),

      generatedBy:
        reportData.generatedBy
        ||
        'unknown',

      warning:
        reportData.warning
        ||
        null
    };


    state.reportStatus =
      'Draft ready';


    e.reportingStatus =
      'Draft ready';


    saveEmployees();


    state.page =
      'review';


    render();


  } catch(err) {

    state.reportStatus =
      'Generation failed';


    render();


    toast(
      `Report generation failed: ${err.message}`
    );
  }
}


/* ==========================================================
   REVIEW
   ========================================================== */

function reviewQueueTable() {

  return `
    <table>

      <thead>

        <tr>
          <th>Employer</th>
          <th>Employee</th>
          <th>Period</th>
          <th>Schedule</th>
          <th>Evidence</th>
          <th>Review</th>
          <th>Release</th>
        </tr>

      </thead>


      <tbody>

        ${
          activeEmployees().map(
            e => {

              const current =
                state.reportEmployeeId
                ===
                e.id;


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

                    ${
                      current
                        ? escapeHtml(periodLabel())
                        : '—'
                    }

                  </td>

                  <td>
                    ${percentLabel(employeeScheduleCoverage(e))}
                  </td>

                  <td>
                    ${percentLabel(employeeEvidenceCoverage(e))}
                  </td>

                  <td>

                    <span
                      class="status ${statusClass(employeeReviewState(e))}"
                    >

                      <span class="dot"></span>

                      ${employeeReviewState(e)}

                    </span>

                  </td>

                  <td>

                    ${
                      current
                        ? escapeHtml(state.reportStatus)
                        : escapeHtml(e.reportingStatus||'—')
                    }

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


function review() {

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

          Review the official report draft
          against the calculated analytics
          and monthly context.

          Approval is required
          before employer release.

        </p>

      </div>


      <button
        class="btn primary"
        data-page="reports"
      >
        Generate Report
      </button>

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
      state.reportStatus === 'Not generated'

        ? `
          <div class="card empty">
            Generate a report to open the review console.
          </div>
          `

        : reviewConsole(e)
    }
    `,
    'Review Queue'
  );
}


function reviewConsole(
  e
) {

  if(
    !e
    ||
    !state.report
  ) {

    return `
      <div class="card empty">
        No current report draft.
      </div>
    `;
  }


  const a =
    state.reportAnalytics
    ||
    latestAnalytics(e);


  const r =
    state.report;


  const p1 =
    r.page1
    ||
    {};


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

            ${escapeHtml(periodLabel())}

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
            ${hoursLabel(a?.metrics?.trackedHours||0)}
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Schedule
          </div>

          <div class="v">
            ${percentLabel(a?.metrics?.scheduleCoveragePercent)}
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Evidence
          </div>

          <div class="v">
            ${percentLabel(a?.evidence?.evidenceCoveragePercent)}
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Vision sample
          </div>

          <div class="v">
            ${state.reportMetadata?.visionScreenshotsSent??0}
          </div>

        </div>


        <div class="review-stat">

          <div class="k">
            Review
          </div>

          <div class="v">
            ${a?.review?.status||'—'}
          </div>

        </div>

      </div>


      <div class="grid two-col">

        <div>

          <div class="panel-title">
            Official report draft
          </div>


          <div class="review-text">

            <b>
              ${escapeHtml(p1.monthlyConclusion||'')}
            </b>

            <br><br>

            ${escapeHtml(p1.summarySentence||'')}

            <br><br>

            <b>
              Coaching:
            </b>

            ${escapeHtml(p1.coachingTakeaway||'')}

            <br><br>

            <b>
              Integrity:
            </b>

            ${escapeHtml(p1.integrityStatement||'')}

          </div>


          ${
            state.reportMetadata?.warning

              ? `
                <div class="callout">

                  <strong>
                    Generation note
                  </strong>

                  ${escapeHtml(state.reportMetadata.warning)}

                </div>
                `

              : ''
          }

        </div>


        <div>

          <div class="panel-title">
            Reviewer checklist
          </div>


          <div class="checklist">

            ${
              [
                'Hours and adjusted schedule reconcile',
                'Evidence coverage is correctly represented',
                'Approved monthly context is correctly applied',
                'No unsupported work or misconduct conclusion',
                'Client-facing language is appropriate'
              ]

              .map(
                (c, i) => `
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

            <button
              class="btn"
              id="previewReport"
            >
              Preview Official Report
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
        a?.review?.reasons?.length

          ? `
            <div class="callout">

              <strong>
                Automated review reasons
              </strong>

              ${
                a.review.reasons
                  .map(
                    x => `
                    <div>
                      • ${escapeHtml(x)}
                    </div>
                    `
                  )
                  .join('')
              }

            </div>
            `

          : ''
      }


      ${
        /Approved|Released/
          .test(
            state.reportStatus
          )

          ? `
            <div class="callout">

              <strong>
                Approved for release
              </strong>

              Releasing creates
              an immutable employer-facing snapshot
              of this exact report version.

            </div>


            <div class="actions">

              <button
                class="btn"
                id="previewReport2"
              >
                Preview Official Report
              </button>

              <button
                class="btn primary"
                id="releaseBtn"
              >

                ${
                  state.reportStatus === 'Released'

                    ? 'Released · Employer notified'

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
   OFFICIAL 12 × 8 REPORT
   ========================================================== */

function officialReportStyles() {

  return `
    <style>

      @page{
        size:12in 8in;
        margin:0;
      }

      .wgr-wrap{
        max-width:12in;
        margin:0 auto;
      }

      .wgr-actions{
        display:flex;
        justify-content:space-between;
        gap:12px;
        margin-bottom:18px;
      }

      .wgr-page{
        width:12in;
        height:8in;
        background:white;
        box-sizing:border-box;
        padding:.42in .52in .38in;
        position:relative;
        margin:0 auto 24px;
        box-shadow:0 8px 30px rgba(0,0,0,.10);
        color:#1A2947;
        overflow:hidden;
        font-family:Aptos,Arial,sans-serif;
      }

      .wgr-header{
        display:flex;
        justify-content:space-between;
        gap:20px;
        align-items:flex-start;
      }

      .wgr-eyebrow{
        font-size:10px;
        font-weight:800;
        letter-spacing:.1em;
      }

      .wgr-person{
        font-size:11px;
        font-weight:700;
        margin-top:3px;
        color:#5d6675;
      }

      .wgr-head-right{
        text-align:right;
        font-size:9px;
        line-height:1.5;
        font-weight:700;
      }

      .wgr-rule{
        height:2px;
        background:#C9A84C;
        margin:9px 0 18px;
      }

      .wgr-title{
        font-size:25px;
        line-height:1.03;
        font-weight:800;
        letter-spacing:-.02em;
      }

      .wgr-subtitle{
        font-size:11px;
        line-height:1.45;
        color:#606a79;
        margin-top:5px;
      }

      .wgr-quote{
        font-size:21px;
        line-height:1.18;
        font-weight:750;
        max-width:9.8in;
        margin:12px 0 7px;
      }

      .wgr-coaching{
        font-size:11px;
        color:#5a6473;
        font-weight:700;
      }

      .wgr-badges{
        display:flex;
        gap:8px;
        margin-top:12px;
      }

      .wgr-badge{
        border:1px solid #d9dee6;
        border-radius:999px;
        padding:5px 9px;
        font-size:8px;
        font-weight:800;
      }

      .wgr-grid4{
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:10px;
        margin:15px 0;
      }

      .wgr-metric{
        background:#f5f6f8;
        border-top:3px solid #1A2947;
        padding:10px;
      }

      .wgr-metric strong{
        display:block;
        font-size:20px;
        line-height:1;
      }

      .wgr-metric span{
        display:block;
        font-size:7.5px;
        font-weight:800;
        letter-spacing:.07em;
        margin-top:5px;
      }

      .wgr-metric small{
        display:block;
        font-size:7px;
        color:#707887;
        margin-top:4px;
        line-height:1.3;
      }

      .wgr-section{
        margin-top:13px;
      }

      .wgr-section-title{
        font-size:9px;
        font-weight:800;
        letter-spacing:.09em;
        text-transform:uppercase;
        margin-bottom:7px;
      }

      .wgr-matters{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px;
      }

      .wgr-matter{
        border-top:1px solid #dfe3e8;
        padding-top:8px;
      }

      .wgr-matter b{
        display:block;
        font-size:9px;
      }

      .wgr-matter p{
        font-size:8px;
        line-height:1.35;
        color:#4e596d;
        margin:4px 0 0;
      }

      .wgr-two{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
      }

      .wgr-card{
        background:#f7f8fa;
        border:1px solid #e0e4e9;
        padding:10px;
      }

      .wgr-card h4{
        font-size:8px;
        text-transform:uppercase;
        letter-spacing:.06em;
        margin:0 0 5px;
      }

      .wgr-card p{
        font-size:8px;
        line-height:1.38;
        margin:0;
        color:#4e596d;
      }

      .wgr-callout{
        border-left:4px solid #C9A84C;
        background:#faf8f1;
        padding:9px 11px;
        font-size:8px;
        line-height:1.4;
      }

      .wgr-callout b{
        display:block;
        margin-bottom:3px;
      }

      .wgr-week-grid{
        display:grid;
        grid-template-columns:repeat(5,1fr);
        gap:8px;
      }

      .wgr-week{
        background:#f7f8fa;
        border:1px solid #e0e4e9;
        padding:8px;
        min-height:1.25in;
      }

      .wgr-week b{
        display:block;
        font-size:8px;
      }

      .wgr-week .time{
        font-size:12px;
        font-weight:800;
        margin:6px 0;
      }

      .wgr-week p{
        font-size:7px;
        line-height:1.32;
        margin:0;
        color:#4e596d;
      }

      .wgr-category{
        display:grid;
        grid-template-columns:1.55in 1fr .38in;
        gap:7px;
        align-items:center;
        font-size:7.5px;
        margin:5px 0;
      }

      .wgr-track{
        height:7px;
        border-radius:6px;
        background:#e7e9ed;
        overflow:hidden;
      }

      .wgr-fill{
        height:100%;
        background:#1A2947;
      }

      .wgr-table{
        width:100%;
        border-collapse:collapse;
        font-size:7.5px;
      }

      .wgr-table th{
        text-align:left;
        border-bottom:2px solid #1A2947;
        padding:6px 5px;
        text-transform:uppercase;
        font-size:6.6px;
        letter-spacing:.05em;
      }

      .wgr-table td{
        padding:7px 5px;
        border-bottom:1px solid #e0e4e9;
        vertical-align:top;
        line-height:1.3;
      }

      .wgr-strengths{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px;
      }

      .wgr-strength{
        background:#f7f8fa;
        border:1px solid #e0e4e9;
        padding:10px;
      }

      .wgr-strength b{
        display:block;
        font-size:9px;
      }

      .wgr-strength p{
        font-size:8px;
        line-height:1.35;
        margin:5px 0 0;
        color:#4e596d;
      }

      .wgr-task-grid{
        display:grid;
        grid-template-columns:repeat(5,1fr);
        gap:8px;
      }

      .wgr-task{
        border:1px solid #e0e4e9;
        background:#fafafa;
        padding:8px;
      }

      .wgr-task b{
        font-size:8px;
      }

      .wgr-task small{
        display:block;
        font-size:6.8px;
        color:#6d7584;
        margin:2px 0 6px;
      }

      .wgr-task span{
        display:block;
        font-size:7.3px;
        line-height:1.3;
        margin:3px 0;
      }

      .wgr-evidence{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px;
      }

      .wgr-evidence-card{
        border-top:3px solid #C9A84C;
        background:#f8f8f8;
        padding:9px;
      }

      .wgr-evidence-card b{
        display:block;
        font-size:8px;
      }

      .wgr-evidence-card p{
        font-size:7.5px;
        line-height:1.35;
        margin:5px 0 0;
      }

      .wgr-footer{
        position:absolute;
        left:.52in;
        right:.52in;
        bottom:.22in;
        border-top:1px solid #dfe3e8;
        padding-top:5px;
        display:flex;
        justify-content:space-between;
        font-size:6px;
        letter-spacing:.07em;
        color:#717987;
      }

      .wgr-support{
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:8px;
      }

      .wgr-support .wgr-card{
        padding:8px;
      }

      .wgr-support .wgr-card p{
        font-size:7px;
      }

      .wgr-small{
        font-size:7px;
        line-height:1.3;
        color:#626c7a;
      }


      @media print{

        body{
          background:#fff !important;
        }

        .sidebar,
        .topbar,
        .wgr-actions,
        .no-print{
          display:none !important;
        }

        .main,
        .content{
          margin:0 !important;
          padding:0 !important;
          width:100% !important;
          max-width:none !important;
        }

        .wgr-wrap{
          max-width:none !important;
        }

        .wgr-page{
          margin:0 !important;
          box-shadow:none !important;
          page-break-after:always;
          break-after:page;
        }

        .wgr-page:last-child{
          page-break-after:auto;
          break-after:auto;
        }
      }

    </style>
  `;
}


function reportHeader(
  e,
  period,
  status,
  page,
  total = 5
) {

  return `
    <div class="wgr-header">

      <div>

        <div class="wgr-eyebrow">
          MONTHLY VA ACCOUNTABILITY REPORT
        </div>

        <div class="wgr-person">

          ${escapeHtml(e.name)}

          |

          ${escapeHtml(e.role||'VIRTUAL ASSISTANT')}

        </div>

      </div>


      <div class="wgr-head-right">

        <div>
          ${escapeHtml(periodLabel(period).toUpperCase())}
        </div>

        <div>

          ${
            status === 'Released'

              ? '✓ Human reviewed | Released'

              : status === 'Approved'

                ? '✓ Human reviewed | Approved'

                : 'Human review pending'
          }

        </div>

      </div>

    </div>


    <div class="wgr-rule"></div>
  `;
}


function reportFooter(
  page,
  total = 5
) {

  return `
    <div class="wgr-footer">

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


function reportMetric(
  value,
  label,
  sub = ''
) {

  return `
    <div class="wgr-metric">

      <strong>
        ${value}
      </strong>

      <span>
        ${label}
      </span>

      <small>
        ${sub}
      </small>

    </div>
  `;
}


function officialReportMarkup({
  e,
  report,
  analytics,
  comparisonData,
  metadata,
  period,
  status,
  version,
  releaseInfo,
  monthlyContextOverride
}) {

  const p1 =
    report?.page1
    ||
    {};


  const p2 =
    report?.page2
    ||
    {};


  const p3 =
    report?.page3
    ||
    {};


  const p4 =
    report?.page4
    ||
    {};


  const p5 =
    report?.page5
    ||
    {};


  const weeks =
    p2.weeks
    ||
    [];


  const cats =
    p2.workCategories
    ||
    [];


  const strengths =
    p3.strengths
    ||
    [];


  const consistency =
    p4.weeks
    ||
    [];


  const taskMap =
    p5.taskMap
    ||
    [];


  const verified =
    p5.verifiedEvidence
    ||
    [];


  const monthlyContext =
    monthlyContextOverride
    ||
    getMonthlyContext(
      e,
      monthKeyFromDate(
        period.from
      )
    );


  return `
    ${officialReportStyles()}


    <div class="wgr-wrap">


      <div class="wgr-actions no-print">

        <button
          class="btn"
          data-page="${
            releaseInfo
              ? 'reports'
              : 'review'
          }"
        >
          Back
        </button>


        <div
          style="
            display:flex;
            gap:8px
          "
        >

          <span
            class="status ${statusClass(status)}"
          >

            <span class="dot"></span>

            ${escapeHtml(status)}

            ${
              version
                ? ` · v${version}`
                : ''
            }

          </span>


          <button
            class="btn primary"
            id="printReport"
          >
            Print / Save PDF
          </button>

        </div>

      </div>


      <!-- PAGE 1 -->

      <section class="wgr-page">

        ${
          reportHeader(
            e,
            period,
            status,
            1
          )
        }


        <div class="wgr-quote">
          ${escapeHtml(p1.monthlyConclusion||'Monthly accountability review')}
        </div>


        <div class="wgr-coaching">
          ${escapeHtml(p1.coachingTakeaway||'')}
        </div>


        <div class="wgr-subtitle">
          ${escapeHtml(p1.summarySentence||'')}
        </div>


        <div class="wgr-badges">

          <span class="wgr-badge">

            DILIGENCE ·
            ${escapeHtml(p1.diligenceStatus||'—')}

          </span>

          <span class="wgr-badge">

            INTEGRITY ·
            ${escapeHtml(p1.integrityStatus||'—')}

          </span>

          <span class="wgr-badge">
            WHITE GLOVE HUMAN REVIEW
          </span>

        </div>


        <div class="wgr-grid4">

          ${
            reportMetric(
              hoursLabel(
                analytics?.metrics?.trackedHours
                ||
                0
              ),
              'TRACKED TIME',
              'Selected month'
            )
          }

          ${
            reportMetric(
              percentLabel(
                analytics?.metrics?.scheduleCoveragePercent
              ),
              'SCHEDULE COVERAGE',
              'Adjusted monthly expectation'
            )
          }

          ${
            reportMetric(
              String(
                analytics?.metrics?.activeDays
                ??
                '—'
              ),
              'ACTIVE WORKDAYS',
              'Recorded workdays'
            )
          }

          ${
            reportMetric(
              String(
                analytics?.review?.reasons?.length
                ||
                0
              ),
              'REVIEW ITEMS',
              'Not automated misconduct findings'
            )
          }

        </div>


        <div class="wgr-two">

          <div class="wgr-card">

            <h4>
              Schedule & approved adjustments
            </h4>

            <p>

              Base expected:
              ${hoursLabel(monthlyContext.expectedMonthlyHours||0)}

              ·
              Adjusted expected:
              ${
                hoursLabel(
                  monthlyContext.adjustedExpectedHours
                  ??
                  adjustedExpectedHours(monthlyContext)
                )
              }

              ·
              PTO:
              ${hoursLabel(monthlyContext.approvedPTOHours||0)}

              ·
              Sick:
              ${hoursLabel(monthlyContext.sickLeaveHours||0)}

              ·
              Holiday:
              ${hoursLabel(monthlyContext.holidayHours||0)}

              ·
              Client-approved:
              ${hoursLabel(monthlyContext.clientApprovedHoursOff||0)}

            </p>

          </div>


          <div class="wgr-card">

            <h4>
              Employer / business context
            </h4>

            <p>

              ${escapeHtml(
                monthlyContext.materialBusinessContext
                ||
                monthlyContext.employerNotes
                ||
                'No additional business context was supplied for this month.'
              )}

            </p>

          </div>

        </div>


        <div class="wgr-section">

          <div class="wgr-section-title">
            What matters this month
          </div>


          <div class="wgr-matters">

            ${
              (p1.whatMatters || [])
                .slice(
                  0,
                  3
                )
                .map(
                  x => `
                  <div class="wgr-matter">

                    <b>
                      ${escapeHtml(x.title)}
                    </b>

                    <p>
                      ${escapeHtml(x.explanation)}
                    </p>

                  </div>
                  `
                )
                .join('')
            }

          </div>

        </div>


        <div
          class="wgr-two"
          style="margin-top:12px"
        >

          <div class="wgr-callout">

            <b>
              Positive confirmation
            </b>

            ${escapeHtml(p1.positiveConfirmation||'')}

          </div>


          <div class="wgr-callout">

            <b>
              White Glove action
            </b>

            ${escapeHtml(p1.whiteGloveAction||'')}

          </div>

        </div>


        <div
          class="wgr-small"
          style="margin-top:7px"
        >

          <b>
            Integrity:
          </b>

          ${escapeHtml(p1.integrityStatement||'')}

        </div>


        ${reportFooter(1)}

      </section>


      <!-- PAGE 2 -->

      <section class="wgr-page">

        ${
          reportHeader(
            e,
            period,
            status,
            2
          )
        }


        <div class="wgr-title">
          Monthly Activity & Evidence
        </div>


        <div class="wgr-subtitle">

          Week-by-week work summary,
          directional category mix,
          and evidence review coverage.

        </div>


        <div class="wgr-section">

          <div class="wgr-week-grid">

            ${
              weeks
                .slice(
                  0,
                  5
                )
                .map(
                  w => `
                  <div class="wgr-week">

                    <b>
                      ${escapeHtml(w.label)}
                    </b>

                    <div class="wgr-small">
                      ${escapeHtml(w.dateRange)}
                    </div>

                    <div class="time">
                      ${escapeHtml(w.trackedTime)}
                    </div>

                    <p>
                      ${escapeHtml(w.summary)}
                    </p>

                  </div>
                  `
                )
                .join('')
            }

          </div>

        </div>


        <div
          class="wgr-two"
          style="margin-top:12px"
        >

          <div>

            <div class="wgr-section-title">
              Directional work categories
            </div>

            ${
              cats.length

                ? cats
                    .slice(
                      0,
                      7
                    )
                    .map(
                      x => `
                      <div class="wgr-category">

                        <div>
                          ${escapeHtml(x.name)}
                        </div>

                        <div class="wgr-track">

                          <div
                            class="wgr-fill"
                            style="
                              width:${
                                Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Number(
                                      x.percent
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
                          ${Math.round(Number(x.percent||0))}%
                        </div>

                      </div>
                      `
                    )
                    .join('')

                : `
                  <div class="wgr-small">
                    No reliable category mix was available.
                  </div>
                  `
            }

          </div>


          <div>

            <div class="wgr-card">

              <h4>
                Review coverage
              </h4>

              <p>

                Active days reviewed:
                ${p2.reviewCoverage?.activeDaysReviewed??0}

                <br>

                Tracked time reconciled:
                ${
                  escapeHtml(
                    p2.reviewCoverage?.trackedTimeReconciled
                    ||
                    hoursLabel(analytics?.metrics?.trackedHours||0)
                  )
                }

                <br>

                Screenshot coverage:
                ${escapeHtml(p2.reviewCoverage?.screenshotCoverage||'—')}

                <br>

                Integrity review:
                ${escapeHtml(p2.reviewCoverage?.integrityReview||'—')}

              </p>

            </div>


            <div
              class="wgr-callout"
              style="margin-top:9px"
            >

              <b>
                Tracking context
              </b>

              ${escapeHtml(p2.trackingContext||'')}

            </div>

          </div>

        </div>


        ${reportFooter(2)}

      </section>


      <!-- PAGE 3 -->

      <section class="wgr-page">

        ${
          reportHeader(
            e,
            period,
            status,
            3
          )
        }


        <div class="wgr-title">
          Strengths, Coaching & Client Context
        </div>


        <div class="wgr-subtitle">

          Evidence-backed positives,
          practical coaching,
          and the client context needed
          to interpret the month fairly.

        </div>


        <div class="wgr-section">

          <div class="wgr-strengths">

            ${
              strengths
                .slice(
                  0,
                  3
                )
                .map(
                  x => `
                  <div class="wgr-strength">

                    <b>
                      ✓ ${escapeHtml(x.title)}
                    </b>

                    <p>
                      ${escapeHtml(x.explanation)}
                    </p>

                  </div>
                  `
                )
                .join('')
            }

          </div>

        </div>


        <div
          class="wgr-two"
          style="margin-top:12px"
        >

          <div class="wgr-card">

            <h4>
              Reliability positive
            </h4>

            <p>
              ${escapeHtml(p3.reliabilityPositive||'')}
            </p>

          </div>


          <div class="wgr-card">

            <h4>
              Coaching opportunity
            </h4>

            <p>
              ${escapeHtml(p3.coachingOpportunity||'')}
            </p>

          </div>

        </div>


        <div
          class="wgr-two"
          style="margin-top:10px"
        >

          <div class="wgr-card">

            <h4>
              Why it matters
            </h4>

            <p>
              ${escapeHtml(p3.whyItMatters||'')}
            </p>

          </div>


          <div class="wgr-card">

            <h4>
              Next expectation
            </h4>

            <p>
              ${escapeHtml(p3.nextExpectation||'')}
            </p>

          </div>

        </div>


        <div
          class="wgr-two"
          style="margin-top:10px"
        >

          <div class="wgr-callout">

            <b>
              White Glove coaching completed
            </b>

            ${escapeHtml(p3.coachingCompleted||'')}

          </div>


          <div class="wgr-callout">

            <b>
              Client context
            </b>

            ${escapeHtml(p3.clientContext||'')}

          </div>

        </div>


        <div
          class="wgr-callout"
          style="margin-top:10px"
        >

          <b>
            What White Glove will watch next month
          </b>

          ${escapeHtml(p3.watchingNextMonth||'')}

        </div>


        ${reportFooter(3)}

      </section>


      <!-- PAGE 4 -->

      <section class="wgr-page">

        ${
          reportHeader(
            e,
            period,
            status,
            4
          )
        }


        <div class="wgr-title">
          Monthly Consistency Review
        </div>


        <div class="wgr-subtitle">
          ${escapeHtml(p4.consistencyHeadline||'')}
        </div>


        <div
          class="wgr-small"
          style="margin-top:5px"
        >
          ${escapeHtml(p4.consistencyExplanation||'')}
        </div>


        <div class="wgr-grid4">

          ${
            reportMetric(
              String(p4.weeksMet??0),
              'WEEKS MET',
              'Configured schedule standard'
            )
          }

          ${
            reportMetric(
              String(p4.weeksTotal??consistency.length),
              'WEEKS REVIEWED',
              'Available weekly blocks'
            )
          }

          ${
            reportMetric(
              String(p4.integrityConcernCount??0),
              'INTEGRITY ITEMS',
              'Human review context'
            )
          }

          ${
            reportMetric(
              percentLabel(
                analytics?.evidence?.activeDayCoveragePercent
              ),
              'DAY EVIDENCE',
              'Active days with screenshots'
            )
          }

        </div>


        <table class="wgr-table">

          <thead>

            <tr>
              <th>Week</th>
              <th>Schedule</th>
              <th>Tracked time</th>
              <th>Work pattern</th>
              <th>Work relevance</th>
              <th>Integrity</th>
            </tr>

          </thead>


          <tbody>

            ${
              consistency
                .slice(
                  0,
                  5
                )
                .map(
                  w => `
                  <tr>

                    <td>
                      ${escapeHtml(w.week)}
                    </td>

                    <td>
                      ${escapeHtml(w.schedule)}
                    </td>

                    <td>
                      ${escapeHtml(w.trackedTime)}
                    </td>

                    <td>
                      ${escapeHtml(w.workPattern)}
                    </td>

                    <td>
                      ${escapeHtml(w.workRelevance)}
                    </td>

                    <td>
                      ${escapeHtml(w.integrity)}
                    </td>

                  </tr>
                  `
                )
                .join('')
            }

          </tbody>

        </table>


        <div
          class="wgr-two"
          style="margin-top:12px"
        >

          <div class="wgr-card">

            <h4>
              Recurring patterns
            </h4>

            <p>

              ${
                (p4.recurringPatterns || [])
                  .map(
                    x =>
                      `• ${escapeHtml(x)}`
                  )
                  .join('<br>')
              }

            </p>

          </div>


          <div class="wgr-card">

            <h4>
              Recommended focus
            </h4>

            <p>
              ${escapeHtml(p4.recommendedFocus||'')}
            </p>

            <br>

            <p>

              <b>
                Previous period:
              </b>

              ${
                comparisonData?.available

                  ? `
                    Tracked
                    ${signedNumber(comparisonData.trackedHoursDelta,'h')}

                    ·
                    evidence
                    ${signedNumber(comparisonData.evidenceCoverageDeltaPoints,' pts')}

                    ·
                    active days
                    ${signedNumber(comparisonData.activeDaysDelta)}
                    `

                  : 'Comparison unavailable.'
              }

            </p>

          </div>

        </div>


        ${reportFooter(4)}

      </section>


      <!-- PAGE 5 -->

      <section class="wgr-page">

        ${
          reportHeader(
            e,
            period,
            status,
            5
          )
        }


        <div class="wgr-title">
          Monthly Task Map
        </div>


        <div class="wgr-subtitle">

          Observed category presence by week.

          This is not an exact hour-allocation
          or productivity score.

        </div>


        <div class="wgr-section">

          <div class="wgr-task-grid">

            ${
              taskMap
                .slice(
                  0,
                  5
                )
                .map(
                  x => `
                  <div class="wgr-task">

                    <b>
                      ${escapeHtml(x.week)}
                    </b>

                    <small>
                      ${escapeHtml(x.dateRange)}
                    </small>

                    ${
                      (x.categories || []).length

                        ? x.categories
                            .slice(
                              0,
                              7
                            )
                            .map(
                              c => `
                              <span>
                                • ${escapeHtml(c)}
                              </span>
                              `
                            )
                            .join('')

                        : `
                          <span>
                            No reliable category mix
                          </span>
                          `
                    }

                  </div>
                  `
                )
                .join('')
            }

          </div>

        </div>


        <div class="wgr-section">

          <div class="wgr-section-title">
            What we verified
          </div>


          <div class="wgr-evidence">

            ${
              verified.length

                ? verified
                    .slice(
                      0,
                      3
                    )
                    .map(
                      x => `
                      <div class="wgr-evidence-card">

                        <b>
                          ${escapeHtml(x.dateTime||'Evidence point')}
                        </b>

                        <p>
                          ${escapeHtml(x.activity||'')}
                        </p>

                        <p class="wgr-small">
                          Evidence ID:
                          ${escapeHtml(x.screenshotId||'')}
                        </p>

                      </div>
                      `
                    )
                    .join('')

                : `
                  <div class="wgr-evidence-card">

                    <b>
                      No visual evidence point published
                    </b>

                    <p>

                      The AI did not return
                      a screenshot-specific statement
                      that met the evidence threshold
                      for this report.

                    </p>

                  </div>
                  `
            }

          </div>

        </div>


        <div
          class="wgr-two"
          style="margin-top:12px"
        >

          <div class="wgr-callout">

            <b>
              Client takeaway
            </b>

            ${escapeHtml(p5.clientTakeaway||'')}

          </div>


          <div class="wgr-callout">

            <b>
              White Glove action / next month
            </b>

            ${escapeHtml(p5.whiteGloveActionNextMonth||'')}

          </div>

        </div>


        <div class="wgr-section">

          <div class="wgr-support">

            ${
              [
                'reviewed',
                'interpreted',
                'coached',
                'nextMonth'
              ]
              .map(
                k => `
                <div class="wgr-card">

                  <h4>

                    ${
                      k === 'nextMonth'

                        ? 'Next month'

                        : (
                            k.charAt(0).toUpperCase()
                            +
                            k.slice(1)
                          )
                    }

                  </h4>

                  <p>
                    ${escapeHtml(p5.support?.[k]||'')}
                  </p>

                </div>
                `
              )
              .join('')
            }

          </div>

        </div>


        <div
          class="wgr-small"
          style="margin-top:8px"
        >

          Generated by
          ${escapeHtml(metadata?.generatedBy||'WGM')}

          ·
          model
          ${escapeHtml(metadata?.model||'not configured')}

          ·
          vision sample
          ${metadata?.visionScreenshotsSent??0}
          screenshots

          ·
          analysis
          ${escapeHtml(metadata?.analysisVersion||analytics?.versions?.analysisVersion||'—')}

          ·
          prompt
          ${escapeHtml(metadata?.promptVersion||'—')}

        </div>


        ${reportFooter(5)}

      </section>

    </div>
  `;
}


/* ==========================================================
   CURRENT / RELEASED REPORT VIEW
   ========================================================== */

function reportPreview() {

  const e =
    employeeById(
      state.reportEmployeeId
    )
    ||
    employee();


  if(
    !e
    ||
    !state.report
  ) {

    return shell(
      `
      <div class="card empty">
        No current report selected.
      </div>
      `,
      'Report Preview'
    );
  }


  return shell(
    officialReportMarkup({
      e,

      report:
        state.report,

      analytics:
        state.reportAnalytics
        ||
        latestAnalytics(e),

      comparisonData:
        state.reportComparison,

      metadata:
        state.reportMetadata,

      period:
        state.reportPeriod,

      status:
        state.reportStatus,

      version:
        null,

      releaseInfo:
        null,

      monthlyContextOverride:
        getMonthlyContext(
          e,
          monthKeyFromDate(
            state.reportPeriod.from
          )
        )
    }),
    'Official Report Preview'
  );
}


function releasedReportView() {

  const r =
    state.releasedReports.find(
      x =>
        x.id
        ===
        state.selectedReleaseId
    );


  if(
    !r
  ) {

    return shell(
      `
      <div class="card empty">
        Released report not found.
      </div>
      `,
      'Released Report'
    );
  }


  /*
    Always use snapshot identity/context
    rather than the employee's current profile.
    This keeps released reports immutable.
  */

  const e = {
    id:
      r.employeeId,

    name:
      r.employeeName,

    role:
      r.role,

    employer:
      r.employer,

    baseline:
      r.baseline
      ||
      {},

    monthlyContexts:
      {},

    timezone:
      r.baseline?.timezone
      ||
      '',

    schedule:
      r.baseline?.generalSchedule
      ||
      ''
  };


  return shell(
    officialReportMarkup({
      e,

      report:
        r.report,

      analytics:
        r.analytics,

      comparisonData:
        r.comparison,

      metadata:
        r.metadata,

      period:
        r.period,

      status:
        'Released',

      version:
        r.version,

      releaseInfo:
        r,

      monthlyContextOverride:
        r.monthlyContext
        ||
        {}
    }),
    'Released Report'
  );
}


function markNotificationReadForReport(
  reportId
) {

  let changed =
    false;


  state.notifications.forEach(
    n => {

      if(
        n.reportId
        ===
        reportId
        &&
        !n.read
      ) {

        n.read =
          true;


        n.readAt =
          new Date()
            .toISOString();


        changed =
          true;
      }
    }
  );


  if(
    changed
  ) {

    saveNotifications();
  }
}


function viewReleasedReport(
  id
) {

  state.selectedReleaseId =
    id;


  markNotificationReadForReport(
    id
  );


  state.page =
    'releasedReport';


  render();
}


/* ==========================================================
   APPROVE & RELEASE
   ========================================================== */

async function releaseCurrentReport() {

  if(
    state.reportStatus
    ===
    'Released'
  ) {

    return;
  }


  const e =
    employeeById(
      state.reportEmployeeId
    )
    ||
    employee();


  if(
    !e
    ||
    !state.report
  ) {

    return;
  }


  try {

    const res =
      await fetch(
        '/api/reports/release',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              employeeId:
                e.id,

              employer:
                e.employer,

              period:
                state.reportPeriod
            })
        }
      );


    const data =
      await res.json();


    const releaseId =
      data.releaseId
      ||
      `wgm_${Date.now()}`;


    const version =
      nextReportVersion(
        e.id,
        state.reportPeriod
      );


    const ctx =
      getMonthlyContext(
        e,
        monthKeyFromDate(
          state.reportPeriod.from
        )
      );


    const snapshot = {
      id:
        releaseId,

      employeeId:
        e.id,

      employeeName:
        e.name,

      role:
        e.role,

      employer:
        e.employer,

      period:
        deepClone(
          state.reportPeriod
        ),

      version,

      report:
        deepClone(
          state.report
        ),

      analytics:
        deepClone(
          state.reportAnalytics
          ||
          latestAnalytics(e)
        ),

      comparison:
        deepClone(
          state.reportComparison
          ||
          {
            available:
              false
          }
        ),

      metadata:
        deepClone(
          state.reportMetadata
          ||
          {}
        ),

      baseline:
        deepClone(
          e.baseline
          ||
          {}
        ),

      monthlyContext:
        deepClone(ctx),

      reviewer:
        'White Glove Reviewer',

      approvedAt:
        new Date()
          .toISOString(),

      releasedAt:
        data.releasedAt
        ||
        new Date()
          .toISOString(),

      status:
        'Released'
    };


    state.releasedReports.push(
      snapshot
    );


    saveReleasedReports();


    state.notifications.push({
      id:
        `notice_${releaseId}`,

      employer:
        e.employer,

      employeeId:
        e.id,

      reportId:
        releaseId,

      type:
        'report_released',

      title:
        `${periodLabel(state.reportPeriod)} Monthly Accountability Report — ${e.name}`,

      message:
        `White Glove has completed its review and released the ${periodLabel(state.reportPeriod)} report for ${e.name}.`,

      read:
        false,

      createdAt:
        snapshot.releasedAt
    });


    saveNotifications();


    state.reportStatus =
      'Released';


    e.reportingStatus =
      'Released';


    saveEmployees();


    state.deliveryQueue.push({
      employeeId:
        e.id,

      employer:
        e.employer,

      reportId:
        releaseId,

      status:
        'queued'
    });


    render();


    toast(
      'Report released. Employer notification created.'
    );


  } catch(err) {

    toast(
      `Could not release report: ${err.message}`
    );
  }
}


/* ==========================================================
   DATA SOURCES
   ========================================================== */

function connectionTypeLabel(
  c
) {

  return c.type === 'dedicated'
    ? 'Dedicated Employer'
    : 'WGH Shared';
}


function connectionEmployeeCount(
  id
) {

  return state.employees.filter(
    e =>
      String(e.connectionId)
      ===
      String(id)
  )
  .length;
}


function dataSources() {

  const cs =
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
              state.mode === 'LIVE'
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

          Each Scrin credential
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

              Prototype flow only.

              API credentials remain server-side.

            </div>

          </div>
          `

        : ''
    }


    <div class="card panel">

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
            cs.map(
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
                    c.type === 'dedicated'

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

            Scrin
            →
            WGM Evidence Layer
            →
            Period Analytics
            →
            Selected Visual Review
            →
            Official Report
            →
            Human Approval
            →
            Employer Release

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
   SETTINGS / MAPPINGS
   ========================================================== */

function settings() {

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          Settings & Integrations
        </h2>

        <p>

          Map shared Scrin employees carefully.

          Dedicated-connection employees
          remain employer-locked.

        </p>

      </div>

    </div>


    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          Scrin API v2
        </div>

        <p class="small">

          API credentials stay
          in Cloudflare secrets
          and never enter browser code.

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
          Official Report Engine
        </div>

        <p class="small">

          Permanent baseline
          + monthly context
          + WGM calculations
          + selected screenshot vision review
          + fixed five-page template
          + human approval.

        </p>


        <span class="status green">

          <span class="dot"></span>

          wgm-official-report-prompt-2.0

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


      <table>

        <thead>

          <tr>
            <th>Employee</th>
            <th>Connection</th>
            <th>Type</th>
            <th>Employment ID</th>
            <th>WGM employer</th>
            <th>Exclude</th>
            <th>Base expected hours</th>
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
                  ${escapeHtml(e.connectionName||'Scrin')}
                </td>

                <td>
                  ${e.employerLocked?'Dedicated':'Shared'}
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
                          value="${escapeHtml(e.employer||e.connectionEmployer||'')}"
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
                          N/A
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


function saveMappings() {

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
        ) {

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
        ) {

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


        if(
          e
        ) {

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
      ) {

        e.employer =
          e.connectionEmployer
          ||
          e.employer;


        e.excluded =
          false;
      }


      ensureEmployeeShape(e);


      e.baseline.clientCompany =
        e.employer
        ||
        e.baseline.clientCompany;
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
        )
        .trim()
    );


  saveEmployees();


  if(
    invalid.length
  ) {

    toast(
      `${invalid.length} shared-connection employee(s) still need an employer or exclusion.`
    );

    return;
  }


  ensureEmployerSelection();


  toast(
    'Employer mappings validated and saved.'
  );
}


/* ==========================================================
   BILLING
   ========================================================== */

function subscriptions() {

  if(
    state.role === 'employer'
  ) {

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
            Prototype of the Stripe-backed customer billing entry point.
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
            'Released reports',
            employerReleasedReports(state.portalEmployer).length,
            'Report history'
          )
        }

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
          Prototype states for included WGH seats and standalone paid organizations.
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
              (c, i) => `
              <tr>

                <td>
                  ${escapeHtml(c)}
                </td>

                <td>
                  ${i===0?'WGH Included':'Standalone Paid'}
                </td>

                <td>
                  ${activeEmployees().filter(e=>e.employer===c).length}
                </td>

                <td>

                  <span class="status green">

                    <span class="dot"></span>

                    Active

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
    'Subscriptions'
  );
}


/* ==========================================================
   SCRIN SYNC
   ========================================================== */

function mergeSyncedEmployee(
  x,
  prior
) {

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


  const dedicated =
    x.employerLocked

      ? (
          x.connectionEmployer
          ||
          x.employer
          ||
          ''
        )

      : null;


  return ensureEmployeeShape({
    ...old,
    ...x,

    id:
      x.id
      ||
      `${x.connectionId||'scrin'}::${x.employmentId}`,

    initials:
      initials(x.name),

    employer:
      dedicated !== null

        ? dedicated

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

        : Boolean(
            old.excluded
          ),

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
      '',

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
      '',

    trackedHours:
      Number(
        old.trackedHours
        ??
        0
      ),

    activeDays:
      Number(
        old.activeDays
        ??
        0
      ),

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

    daySummary:
      old.daySummary
      ||
      null,

    baseline:
      old.baseline
      ||
      null,

    monthlyContexts:
      old.monthlyContexts
      ||
      {},

    monitoringPolicy:
      old.monitoringPolicy
      ||
      defaultMonitoringPolicy(),

    lastAnalytics:
      old.lastAnalytics
      ||
      null,

    reportingStatus:
      old.reportingStatus
      ||
      x.reportingStatus
      ||
      'Synced'
  });
}


async function syncScrin() {

  state.syncMessage =
    'Syncing all Scrin connections…';


  render();


  try {

    const r =
      await fetch(
        '/api/scrin/all-common',
        {
          method:
            'POST'
        }
      );


    const j =
      await r.json();


    if(
      !r.ok
    ) {

      throw new Error(
        j.error
        ||
        'Scrin sync failed'
      );
    }


    const prior =
      [
        ...state.employees
      ];


    state.connections =
      Array.isArray(
        j.connections
      )

        ? j.connections

        : state.connections;


    state.employees =
      (
        Array.isArray(
          j.employees
        )

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
    ) {

      throw new Error(
        'No employment records were returned'
      );
    }


    if(
      !state.employees.some(
        e =>
          String(e.id)
          ===
          String(
            state.selectedEmployeeId
          )
      )
    ) {

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


    const errors =
      Array.isArray(
        j.errors
      )

        ? j.errors.length

        : 0;


    const connected =
      state.connections.filter(
        c =>
          c.status === 'connected'
          ||
          c.status === 'demo'
      )
      .length;


    state.syncMessage =
      (
        `Connected ${connected}/${state.connections.length} Scrin connection(s). `
        +
        `${state.employees.length} employment record(s) loaded.`
        +
        (
          errors
            ? ` ${errors} connection error(s).`
            : ''
        )
      );


  } catch(err) {

    state.syncMessage =
      `Connection sync failed: ${err.message}`;
  }


  render();
}


async function refreshConnections() {

  try {

    const r =
      await fetch(
        '/api/scrin/connections'
      );


    const j =
      await r.json();


    if(
      !r.ok
    ) {

      throw new Error(
        j.error
        ||
        'Could not load connections'
      );
    }


    state.connections =
      Array.isArray(
        j.connections
      )

        ? j.connections

        : [];


    saveConnections();


    toast(
      `${state.connections.length} Scrin connection(s) configured.`
    );


  } catch(err) {

    toast(
      `Could not refresh connections: ${err.message}`
    );
  }
}


async function testScrin() {

  const el =
    document.getElementById(
      'scrinResult'
    );


  if(
    el
  ) {

    el.textContent =
      'Testing all connections…';
  }


  try {

    const r =
      await fetch(
        '/api/scrin/all-common',
        {
          method:
            'POST'
        }
      );


    const j =
      await r.json();


    if(
      !r.ok
    ) {

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
      Array.isArray(
        j.connections
      )

        ? j.connections

        : state.connections;


    saveConnections();


    const connected =
      state.connections.filter(
        c =>
          c.status === 'connected'
          ||
          c.status === 'demo'
      )
      .length;


    state.syncMessage =
      (
        `${state.mode} connections responding: `
        +
        `${connected}/${state.connections.length}. `
        +
        `${j.employees?.length||0} employment record(s) available.`
      );


    render();


  } catch(err) {

    if(
      el
    ) {

      el.textContent =
        `Not connected: ${err.message}`;
    }
  }
}


/* ==========================================================
   RENDER
   ========================================================== */

function render() {

  let out =
    '';


  if(
    state.page === 'dashboard'
  ) {

    out =
      dashboard();
  }

  else if(
    state.page === 'companies'
  ) {

    out =
      companies();
  }

  else if(
    state.page === 'employees'
  ) {

    out =
      employees();
  }

  else if(
    state.page === 'monitoring'
  ) {

    out =
      monitoring();
  }

  else if(
    state.page === 'reports'
  ) {

    out =
      reports();
  }

  else if(
    state.page === 'review'
  ) {

    out =
      review();
  }

  else if(
    state.page === 'subscriptions'
  ) {

    out =
      subscriptions();
  }

  else if(
    state.page === 'dataSources'
  ) {

    out =
      dataSources();
  }

  else if(
    state.page === 'settings'
  ) {

    out =
      settings();
  }

  else if(
    state.page === 'reportPreview'
  ) {

    out =
      reportPreview();
  }

  else if(
    state.page === 'releasedReport'
  ) {

    out =
      releasedReportView();
  }


  document
    .getElementById('app')
    .innerHTML =
      out;


  bind();
}


/* ==========================================================
   EVENTS
   ========================================================== */

function bind() {

  document
    .querySelectorAll('[data-page]')
    .forEach(
      x => {

        x.onclick =
          () => {

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

        x.onclick =
          () => {

            const target =
              employeeById(
                x.dataset.openId
              );


            if(
              state.role === 'employer'
              &&
              target?.employer
              !==
              state.portalEmployer
            ) {

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
    .querySelectorAll('[data-tab]')
    .forEach(
      x => {

        x.onclick =
          () => {

            state.employeeTab =
              x.dataset.tab;

            render();
          };
      }
    );


  document
    .querySelectorAll('[data-view-release]')
    .forEach(
      x => {

        x.onclick =
          () =>
            viewReleasedReport(
              x.dataset.viewRelease
            );
      }
    );


  document
    .querySelectorAll('[data-open-baseline]')
    .forEach(
      x => {

        x.onclick =
          () => {

            state.selectedEmployeeId =
              x.dataset.openBaseline;


            state.page =
              'monitoring';


            state.employeeTab =
              'baseline';


            render();
          };
      }
    );


  const role =
    document.getElementById(
      'roleSwitcher'
    );


  if(
    role
  ) {

    role.onchange =
      () =>
        setRole(
          role.value
        );
  }


  const emp =
    document.getElementById(
      'employerSwitcher'
    );


  if(
    emp
  ) {

    emp.onchange =
      () => {

        state.portalEmployer =
          emp.value;


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


  const sync =
    document.getElementById(
      'syncScrin'
    );


  if(
    sync
  ) {

    sync.onclick =
      syncScrin;
  }


  const test =
    document.getElementById(
      'testScrin'
    );


  if(
    test
  ) {

    test.onclick =
      testScrin;
  }


  const refresh =
    document.getElementById(
      'refreshConnections'
    );


  if(
    refresh
  ) {

    refresh.onclick =
      refreshConnections;
  }


  const add =
    document.getElementById(
      'toggleAddConnection'
    );


  if(
    add
  ) {

    add.onclick =
      () => {

        state.showAddConnection =
          !state.showAddConnection;


        render();
      };
  }


  const mappings =
    document.getElementById(
      'saveMappings'
    );


  if(
    mappings
  ) {

    mappings.onclick =
      saveMappings;
  }


  const saveBase =
    document.getElementById(
      'saveBaseline'
    );


  if(
    saveBase
  ) {

    saveBase.onclick =
      saveBaseline;
  }


  const saveCtx =
    document.getElementById(
      'saveMonthlyContext'
    );


  if(
    saveCtx
  ) {

    saveCtx.onclick =
      saveMonthlyContext;
  }


  [
    'ctxExpectedHours',
    'ctxPTO',
    'ctxSick',
    'ctxHoliday',
    'ctxClientOff',
    'ctxReduction',
    'ctxAdditional'
  ]
  .forEach(
    id => {

      const el =
        document.getElementById(id);


      if(
        el
      ) {

        el.oninput =
          updateAdjustedExpectedDisplay;


        el.onchange =
          updateAdjustedExpectedDisplay;
      }
    }
  );


  const day =
    document.getElementById(
      'loadLiveDay'
    );


  if(
    day
  ) {

    day.onclick =
      loadLiveDay;
  }


  const savePolicy =
    document.getElementById(
      'saveMonitoringPolicy'
    );


  if(
    savePolicy
  ) {

    savePolicy.onclick =
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

      const el =
        document.getElementById(id);


      if(
        el
      ) {

        el.onchange =
          updatePolicyEstimate;


        el.oninput =
          updatePolicyEstimate;
      }
    }
  );


  const from =
    document.getElementById(
      'fromDate'
    );


  const to =
    document.getElementById(
      'toDate'
    );


  const selector =
    document.getElementById(
      'reportEmployee'
    );


  if(
    from
  ) {

    from.onchange =
      () => {

        state.reportPeriod.from =
          from.value;


        render();
      };
  }


  if(
    to
  ) {

    to.onchange =
      () => {

        state.reportPeriod.to =
          to.value;


        render();
      };
  }


  if(
    selector
  ) {

    selector.onchange =
      () => {

        state.selectedEmployeeId =
          selector.value;


        render();
      };
  }


  const generate =
    document.getElementById(
      'generateBtn'
    );


  if(
    generate
  ) {

    generate.onclick =
      generateReport;
  }


  const request =
    document.getElementById(
      'requestEmployerReport'
    );


  if(
    request
  ) {

    request.onclick =
      () =>
        toast(
          'Report request queued for White Glove review.'
        );
  }


  document
    .querySelectorAll('[data-check]')
    .forEach(
      x => {

        x.onchange =
          () => {

            state.reviewerChecks[
              Number(
                x.dataset.check
              )
            ]
            =
            x.checked;
          };
      }
    );


  const approve =
    document.getElementById(
      'approveBtn'
    );


  if(
    approve
  ) {

    approve.onclick =
      () => {

        if(
          !state.reviewerChecks.every(
            Boolean
          )
        ) {

          toast(
            'Complete all reviewer checks before approval.'
          );

          return;
        }


        state.reportStatus =
          'Approved';


        const e =
          employeeById(
            state.reportEmployeeId
          );


        if(
          e
        ) {

          e.reportingStatus =
            'Approved';
        }


        saveEmployees();


        render();


        toast(
          'Report approved by White Glove reviewer.'
        );
      };
  }


  const preview =
    document.getElementById(
      'previewReport'
    );


  if(
    preview
  ) {

    preview.onclick =
      () => {

        state.page =
          'reportPreview';


        render();
      };
  }


  const preview2 =
    document.getElementById(
      'previewReport2'
    );


  if(
    preview2
  ) {

    preview2.onclick =
      () => {

        state.page =
          'reportPreview';


        render();
      };
  }


  const release =
    document.getElementById(
      'releaseBtn'
    );


  if(
    release
  ) {

    release.onclick =
      releaseCurrentReport;
  }


  const print =
    document.getElementById(
      'printReport'
    );


  if(
    print
  ) {

    print.onclick =
      () =>
        window.print();
  }
}


/* ==========================================================
   INITIALIZE
   ========================================================== */

async function initializeApp() {

  try {

    const r =
      await fetch(
        '/api/health'
      );


    const h =
      await r.json();


    state.mode =
      h.mode === 'live'
        ? 'LIVE'
        : 'DEMO';


    if(
      state.mode === 'LIVE'
    ) {

      state.syncMessage =
        (
          `Live Scrin configuration detected. `
          +
          `${h.connectionCount??'—'} connection(s) configured. `
          +
          `Analytics ${h.analysisVersion||'unknown'} · `
          +
          `Prompt ${h.promptVersion||'unknown'}.`
        );
    }


  } catch(err) {

    console.error(
      'Could not determine WGM mode:',
      err
    );
  }


  try {

    const r =
      await fetch(
        '/api/scrin/connections'
      );


    const d =
      await r.json();


    if(
      r.ok
      &&
      Array.isArray(
        d.connections
      )
    ) {

      state.connections =
        d.connections;


      saveConnections();
    }


  } catch(err) {

    console.error(
      'Could not load Scrin connections:',
      err
    );
  }


  if(
    state.role === 'employer'
  ) {

    ensureEmployerSelection();
  }


  render();
}


initializeApp();
