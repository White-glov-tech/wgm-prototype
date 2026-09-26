/* ==========================================================
   WHITE GLOVE MONITOR — PROTOTYPE V2.2
   SELECTED-PERIOD AI SCREENING + HUMAN REVIEW + EMPLOYER REPORTS
   ========================================================== */

const WGM_LOGO_URL = '/wgm-logo.png';
const AI_CONCURRENCY = 3;
const AI_BATCH_SIZE = 24;
const AI_BATCH_OVERLAP = 4;

const CHECK_KEYS = [
  'repeated_frozen',
  'repetitive_cycling',
  'activity_simulation',
  'prolonged_stagnation_10m',
  'repeated_across_days',
];

const state = {
  page: 'dashboard',
  tab: 'overview',
  role: localStorage.getItem('wgmRole') || 'owner',
  mode: 'DEMO',
  employees: [],
  connections: [],
  selectedEmployeeId: '',
  portalEmployer: localStorage.getItem('wgmPortalEmployer') || '',
  period: { from: '2026-09-01', to: '2026-09-30' },

  reportStatus: 'Not generated',
  reportEmployeeId: '',
  prepared: null,
  batchResults: [],
  report: null,
  meta: null,
  scanProgress: { phase: '', processed: 0, total: 0, completedBatches: 0, totalBatches: 0 },

  reviewerChecks: [false, false, false, false, false],
  reviewerName: localStorage.getItem('wgmReviewerName') || 'White Glove Reviewer',
  humanDispositions: {},
  findingDispositions: {},

  approvedReports: [],
  notifications: [],
  contextRequests: [],
  selectedReportId: '',
  selectedReportMonth: '',
  selectedReportYear: '',

  syncMessage: 'Connect Scrin to load live employees.',
  toast: null,
};

const demoEmployees = [{
  id: 'demo-main::100',
  connectionId: 'demo-main',
  connectionName: 'Demo Scrin Connection',
  connectionType: 'shared',
  employmentId: '100',
  name: 'Sample VA',
  initials: 'SV',
  employer: 'Sample Employer',
  role: 'Virtual Assistant',
  timezone: 'America/Los_Angeles',
  timezoneOffsetMinutes: -420,
  excluded: false,
  reportingStatus: 'Ready',
  workPolicyType: 'flexible_daily',
  workPolicyTarget: 8,
  shots: [],
  daySummary: null,
  lastAnalytics: null,
}];

/* ==========================================================
   STORAGE
   ========================================================== */

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

state.employees = loadJson('wgmEmployees', demoEmployees);
state.connections = loadJson('wgmConnections', []);
state.approvedReports = loadJson('wgmFraudReleasedReports', []);
state.notifications = loadJson('wgmFraudNotifications', []);
state.contextRequests = loadJson('wgmContextRequests', []);
state.selectedEmployeeId = state.employees[0]?.id || '';

const saveEmployees = () => saveJson('wgmEmployees', state.employees);
const saveConnections = () => saveJson('wgmConnections', state.connections);
const saveApprovedReports = () => saveJson('wgmFraudReleasedReports', state.approvedReports);
const saveNotifications = () => saveJson('wgmFraudNotifications', state.notifications);
const saveContextRequests = () => saveJson('wgmContextRequests', state.contextRequests);

/* ==========================================================
   HELPERS
   ========================================================== */

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'VA';
}

function hoursLabel(decimal = 0) {
  const minutes = Math.max(0, Math.round(Number(decimal || 0) * 60));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function dateLabel(date) {
  if (!date) return '—';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function monthLabel(date) {
  if (!date) return 'Reporting period';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function periodLabel(period) {
  if (!period?.from || !period?.to) return 'Selected period';
  if (period.from === period.to) return dateLabel(period.from);

  const a = new Date(`${period.from}T00:00:00Z`);
  const b = new Date(`${period.to}T00:00:00Z`);

  const sameMonth =
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth();

  if (sameMonth) {
    return `${a.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })}–${b.getUTCDate()}, ${b.getUTCFullYear()}`;
  }

  return `${dateLabel(period.from)} – ${dateLabel(period.to)}`;
}

function statusClass(status = '') {
  if (/Approved|Ready|Connected|Clear|Green|Complete|Active|Resolved|Submitted/i.test(status)) return 'green';
  if (/Review|Pending|Draft|Yellow|Queued|Configured|Scanning|Context/i.test(status)) return 'amber';
  if (/Failed|Error|Red|Incomplete/i.test(status)) return 'red';
  return 'blue';
}

function toast(message) {
  state.toast = message;
  render();

  setTimeout(() => {
    state.toast = null;
    render();
  }, 2600);
}

function metric(label, value, sub) {
  return `
    <div class="card metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="delta">${sub}</div>
    </div>
  `;
}

function activeEmployees() {
  return state.employees.filter((e) => !e.excluded);
}

function employeeById(id) {
  return state.employees.find((e) => String(e.id) === String(id));
}

function mappedEmployers() {
  return [...new Set(
    activeEmployees()
      .map((e) => e.employer)
      .filter(Boolean)
  )].sort();
}

function employeeTimezone(employee) {
  return String(employee?.timezone || '').trim() || 'Timezone not set';
}

function currentEmployee() {
  if (state.role === 'employer') {
    ensureEmployerSelection();

    return (
      portalEmployees().find(
        (e) => String(e.id) === String(state.selectedEmployeeId)
      ) ||
      portalEmployees()[0] ||
      null
    );
  }

  return (
    employeeById(state.selectedEmployeeId) ||
    activeEmployees()[0] ||
    null
  );
}

function ensureEmployerSelection() {
  const employers = mappedEmployers();

  if (
    !state.portalEmployer ||
    !employers.includes(state.portalEmployer)
  ) {
    state.portalEmployer = employers[0] || '';
    localStorage.setItem(
      'wgmPortalEmployer',
      state.portalEmployer
    );
  }

  const team = portalEmployeesRaw();

  if (
    team.length &&
    !team.some(
      (e) =>
        String(e.id) ===
        String(state.selectedEmployeeId)
    )
  ) {
    state.selectedEmployeeId =
      team[0].id;
  }
}

function portalEmployeesRaw() {
  return activeEmployees().filter(
    (e) =>
      e.employer === state.portalEmployer
  );
}

function portalEmployees() {
  ensureEmployerSelection();
  return portalEmployeesRaw();
}

function approvedReportsForEmployee(employeeId) {
  return state.approvedReports
    .filter(
      (r) =>
        String(r.employeeId) ===
          String(employeeId) &&
        /Approved|Released/i.test(
          r.status || ''
        )
    )
    .sort(
      (a, b) =>
        String(
          b.approvedAt ||
          b.releasedAt ||
          ''
        ).localeCompare(
          String(
            a.approvedAt ||
            a.releasedAt ||
            ''
          )
        )
    );
}

function approvedReportsForEmployer(employer) {
  return state.approvedReports
    .filter(
      (r) =>
        r.employer === employer &&
        /Approved|Released/i.test(
          r.status || ''
        )
    )
    .sort(
      (a, b) =>
        String(
          b.approvedAt ||
          b.releasedAt ||
          ''
        ).localeCompare(
          String(
            a.approvedAt ||
            a.releasedAt ||
            ''
          )
        )
    );
}

function nextVersion(employeeId, period) {
  return (
    state.approvedReports.filter(
      (r) =>
        String(r.employeeId) ===
          String(employeeId) &&
        r.period?.from ===
          period.from &&
        r.period?.to ===
          period.to
    ).length + 1
  );
}

function isOwnerReviewer() {
  return (
    state.role === 'owner' ||
    state.role === 'reviewer'
  );
}

function humanSample() {
  return (
    state.prepared?.humanSample
      ?.screenshots || []
  );
}

function humanSampleTarget() {
  return Number(
    state.prepared?.humanSample
      ?.count ||
    humanSample().length ||
    0
  );
}

function humanReviewedCount() {
  const sampleIds = new Set(
    humanSample().map(
      (x) =>
        String(x.screenshotId)
    )
  );

  return Object.entries(
    state.humanDispositions
  ).filter(
    ([id, d]) =>
      sampleIds.has(String(id)) &&
      ['clear', 'needs_context'].includes(
        d?.decision
      )
  ).length;
}

function unresolvedCurrentCount() {
  let n = 0;

  for (
    const d of Object.values(
      state.humanDispositions
    )
  ) {
    if (
      d?.decision === 'needs_context'
    ) {
      n++;
    }
  }

  for (
    const d of Object.values(
      state.findingDispositions
    )
  ) {
    if (
      d?.decision === 'needs_context'
    ) {
      n++;
    }
  }

  return n;
}

function openContextRequestsForCurrentReport() {
  if (!state.prepared?.sessionKey) {
    return [];
  }

  return state.contextRequests.filter(
    (r) =>
      r.sessionKey ===
        state.prepared.sessionKey &&
      r.status !== 'resolved'
  );
}

function workPolicyLabel(type) {
  return ({
    fixed_schedule:
      'Fixed schedule',

    flexible_daily:
      'Flexible daily hours',

    weekly_target:
      'Weekly hours target',

    monthly_target:
      'Monthly hours target',

    on_demand:
      'On-demand / work when needed',
  })[type] ||
    'On-demand / work when needed';
}

function countWeekdays(from, to) {
  let count = 0;

  const a = new Date(
    `${from}T00:00:00Z`
  );

  const b = new Date(
    `${to}T00:00:00Z`
  );

  for (
    let d = new Date(a);
    d <= b;
    d.setUTCDate(
      d.getUTCDate() + 1
    )
  ) {
    const day =
      d.getUTCDay();

    if (
      day !== 0 &&
      day !== 6
    ) {
      count++;
    }
  }

  return count;
}

function isFullCalendarMonth(period) {
  const a = new Date(
    `${period.from}T00:00:00Z`
  );

  const b = new Date(
    `${period.to}T00:00:00Z`
  );

  if (
    a.getUTCFullYear() !==
      b.getUTCFullYear() ||
    a.getUTCMonth() !==
      b.getUTCMonth()
  ) {
    return false;
  }

  const last = new Date(
    Date.UTC(
      a.getUTCFullYear(),
      a.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  return (
    a.getUTCDate() === 1 &&
    b.getUTCDate() === last
  );
}

function expectedPeriodHours(
  employee,
  period
) {
  const type =
    employee?.workPolicyType ||
    'on_demand';

  const target = Math.max(
    0,
    Number(
      employee?.workPolicyTarget ||
      0
    )
  );

  if (
    !target ||
    type === 'on_demand'
  ) {
    return 0;
  }

  if (
    type === 'fixed_schedule' ||
    type === 'flexible_daily'
  ) {
    return (
      target *
      countWeekdays(
        period.from,
        period.to
      )
    );
  }

  if (type === 'weekly_target') {
    const days =
      Math.floor(
        (
          Date.parse(
            `${period.to}T00:00:00Z`
          ) -
          Date.parse(
            `${period.from}T00:00:00Z`
          )
        ) /
        86400000
      ) + 1;

    return (
      target *
      (days / 7)
    );
  }

  if (
    type === 'monthly_target'
  ) {
    return isFullCalendarMonth(
      period
    )
      ? target
      : 0;
  }

  return 0;
}

function workPolicyContext(
  employee,
  period,
  prepared
) {
  const type =
    employee?.workPolicyType ||
    'on_demand';

  const target = Number(
    employee?.workPolicyTarget ||
    0
  );

  const expected = Number(
    prepared?.metrics
      ?.expectedHours ||
    expectedPeriodHours(
      employee,
      period
    ) ||
    0
  );

  if (type === 'on_demand') {
    return 'No minimum scheduled hours configured. Reported time reflects activity captured while tracking was active.';
  }

  if (
    type === 'fixed_schedule'
  ) {
    return expected
      ? `Tracked time was reviewed against ${hoursLabel(expected)} of configured schedule time for the selected period.`
      : 'Tracked time was reviewed against the configured fixed schedule.';
  }

  if (
    type === 'flexible_daily'
  ) {
    return target
      ? `Daily target: ${hoursLabel(target)}. Start and end times are informational.`
      : 'Flexible daily-hours policy; start and end times are informational.';
  }

  if (
    type === 'weekly_target'
  ) {
    return target
      ? `Weekly target: ${hoursLabel(target)}. Daily start and end times are informational.`
      : 'Weekly-hours target policy.';
  }

  if (
    type === 'monthly_target'
  ) {
    return (
      isFullCalendarMonth(
        period
      ) &&
      target
    )
      ? `Monthly target: ${hoursLabel(target)}.`
      : 'Monthly target is not applied to a partial-month report.';
  }

  return '';
}

/* ==========================================================
   NAVIGATION / SHELL
   ========================================================== */

function roleName() {
  return ({
    owner: 'WGM Owner',
    reviewer: 'White Glove Reviewer',
    employer: 'Employer',
    employee: 'Employee',
  })[state.role] ||
    'WGM Owner';
}

function setRole(role) {
  state.role = role;

  localStorage.setItem(
    'wgmRole',
    role
  );

  state.page = 'dashboard';
  state.tab = 'overview';

  if (role === 'employer') {
    ensureEmployerSelection();
  }

  render();
}

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
      <span>${label}</span>
      ${
        badge
          ? `<span class="badge">${badge}</span>`
          : ''
      }
    </button>
  `;
}

function navMarkup() {
  if (state.role === 'employer') {
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
        'reports',
        'Reports'
      ),
    ].join('');
  }

  if (state.role === 'employee') {
    const pending =
      state.contextRequests.filter(
        (r) =>
          String(r.employeeId) ===
            String(
              state.selectedEmployeeId
            ) &&
          [
            'requested',
            'submitted',
          ].includes(
            r.status
          )
      ).length;

    return [
      navButton(
        'dashboard',
        'My Activity'
      ),

      navButton(
        'monitoring',
        'Monitoring'
      ),

      navButton(
        'context',
        'Action Required',
        pending || ''
      ),
    ].join('');
  }

  if (state.role === 'reviewer') {
    const pending =
      state.contextRequests.filter(
        (r) =>
          r.status ===
          'submitted'
      ).length;

    return [
      navButton(
        'dashboard',
        'Reviewer Home'
      ),

      navButton(
        'reports',
        'Screening'
      ),

      navButton(
        'review',
        'Review Queue',
        pending || ''
      ),

      navButton(
        'employees',
        'Employees'
      ),
    ].join('');
  }

  return [
    navButton(
      'dashboard',
      'Dashboard'
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
      'Screening & Reports'
    ),

    navButton(
      'review',
      'Review Queue'
    ),

    navButton(
      'dataSources',
      'Data Sources'
    ),

    navButton(
      'settings',
      'Settings'
    ),
  ].join('');
}

function shell(
  content,
  title
) {
  const employerSwitcher =
    state.role === 'employer'
      ? `
        <select
          id="employerSwitcher"
          class="map-input"
          style="max-width:260px"
        >
          ${mappedEmployers()
            .map(
              (e) => `
                <option
                  value="${esc(e)}"
                  ${
                    e ===
                    state.portalEmployer
                      ? 'selected'
                      : ''
                  }
                >
                  ${esc(e)}
                </option>
              `
            )
            .join('')}
        </select>
      `
      : '';

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
          ${navMarkup()}
        </nav>

        <div class="sidebar-bottom">
          <div class="user-chip">

            <div class="avatar">
              W
            </div>

            <div>
              <b>
                ${esc(roleName())}
              </b>

              <div
                style="
                  font-size:11px;
                  opacity:.7
                "
              >
                ${esc(state.mode)} mode
              </div>
            </div>

          </div>
        </div>

      </aside>

      <main class="main">

        <header class="topbar">

          <h1>
            ${esc(title)}
          </h1>

          <div
            style="
              display:flex;
              gap:10px;
              align-items:center
            "
          >

            ${employerSwitcher}

            <select
              id="roleSwitcher"
              class="map-input"
              style="width:auto"
            >

              <option
                value="owner"
                ${
                  state.role === 'owner'
                    ? 'selected'
                    : ''
                }
              >
                Owner
              </option>

              <option
                value="reviewer"
                ${
                  state.role === 'reviewer'
                    ? 'selected'
                    : ''
                }
              >
                Reviewer
              </option>

              <option
                value="employer"
                ${
                  state.role === 'employer'
                    ? 'selected'
                    : ''
                }
              >
                Employer
              </option>

              <option
                value="employee"
                ${
                  state.role === 'employee'
                    ? 'selected'
                    : ''
                }
              >
                Employee
              </option>

            </select>

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
              ${esc(state.toast)}
            </div>
          `
          : ''
      }

    </div>
  `;
}

/* ==========================================================
   DASHBOARDS
   ========================================================== */

function dashboard() {
  if (state.role === 'employer') {
    return employerDashboard();
  }

  if (state.role === 'reviewer') {
    return reviewerDashboard();
  }

  if (state.role === 'employee') {
    return employeeDashboard();
  }

  return shell(`
    <div class="header-row">

      <div>
        <h2>
          WGM Command Center
        </h2>

        <p>
          Scrin supplies monitored evidence.
          WGM owns screening, human review,
          context resolution and employer reporting.
        </p>
      </div>

      <div class="actions">

        <button
          class="btn"
          id="syncScrin"
        >
          Sync Scrin
        </button>

        <button
          class="btn primary"
          data-page="reports"
        >
          Run Screening
        </button>

      </div>

    </div>

    <div class="grid metrics">

      ${metric(
        'Connections',
        state.connections.length || 1,
        'Scrin sources'
      )}

      ${metric(
        'Employers',
        mappedEmployers().length,
        'Mapped organizations'
      )}

      ${metric(
        'Monitored employees',
        activeEmployees().length,
        'Account owners excluded'
      )}

      ${metric(
        'Approved reports',
        state.approvedReports.length,
        'Employer visible'
      )}

    </div>

    <div class="card panel">

      <table>

        <thead>
          <tr>
            <th>Employee</th>
            <th>Employer</th>
            <th>Connection</th>
            <th>Timezone</th>
            <th>Latest report</th>
          </tr>
        </thead>

        <tbody>

          ${activeEmployees()
            .map((e) => {
              const latest =
                approvedReportsForEmployee(
                  e.id
                )[0];

              return `
                <tr>

                  <td>
                    <span
                      class="row-link"
                      data-open-id="${esc(
                        e.id
                      )}"
                    >
                      ${esc(e.name)}
                    </span>
                  </td>

                  <td>
                    ${esc(
                      e.employer ||
                      'Unassigned'
                    )}
                  </td>

                  <td>
                    ${esc(
                      e.connectionName ||
                      'Scrin'
                    )}
                  </td>

                  <td>
                    ${esc(
                      employeeTimezone(
                        e
                      )
                    )}
                  </td>

                  <td>
                    ${
                      latest
                        ? esc(
                            monthLabel(
                              latest
                                .period
                                .from
                            )
                          )
                        : '—'
                    }
                  </td>

                </tr>
              `;
            })
            .join('')}

        </tbody>

      </table>

    </div>
  `, 'Dashboard');
}

function employerDashboard() {
  const team =
    portalEmployees();

  const notices =
    state.notifications
      .filter(
        (n) =>
          n.employer ===
            state.portalEmployer &&
          !n.read
      )
      .sort(
        (a, b) =>
          String(
            b.createdAt
          ).localeCompare(
            String(
              a.createdAt
            )
          )
      );

  return shell(`
    <div class="header-row">

      <div>
        <h2>
          ${esc(
            state.portalEmployer ||
            'Employer'
          )} Overview
        </h2>

        <p>
          Approved White Glove Monitor
          reports are available directly
          beside each monitored employee.
        </p>
      </div>

    </div>

    ${
      notices[0]
        ? `
          <div
            class="card panel"
            style="
              border-left:
              4px solid #C9A84C;
              margin-bottom:16px
            "
          >

            <div
              class="header-row"
              style="margin:0"
            >

              <div>

                <div class="panel-title">
                  NEW REPORT AVAILABLE
                </div>

                <h3>
                  ${esc(
                    notices[0].title
                  )}
                </h3>

                <p>
                  ${esc(
                    notices[0].message
                  )}
                </p>

              </div>

              <button
                class="btn gold"
                data-view-report="${esc(
                  notices[0]
                    .reportId
                )}"
              >
                View Report
              </button>

            </div>

          </div>
        `
        : ''
    }

    <div class="grid metrics">

      ${metric(
        'Team members',
        team.length,
        'Monitored employees'
      )}

      ${metric(
        'Approved reports',
        approvedReportsForEmployer(
          state.portalEmployer
        ).length,
        'Available now'
      )}

      ${metric(
        'New reports',
        notices.length,
        'Unread'
      )}

      ${metric(
        'Review type',
        'AI + Human',
        'White Glove reviewed'
      )}

    </div>

    <div class="card panel">

      <table>

        <thead>
          <tr>
            <th>Employee</th>
            <th>Latest report</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${team
            .map((e) => {
              const latest =
                approvedReportsForEmployee(
                  e.id
                )[0];

              return `
                <tr>

                  <td>
                    ${esc(e.name)}
                  </td>

                  <td>
                    ${
                      latest
                        ? esc(
                            monthLabel(
                              latest
                                .period
                                .from
                            )
                          )
                        : 'No approved report'
                    }
                  </td>

                  <td>
                    ${
                      latest
                        ? `
                          <span class="status green">
                            <span class="dot"></span>
                            Human Reviewed
                          </span>
                        `
                        : '—'
                    }
                  </td>

                  <td>
                    <button
                      class="btn"
                      data-employer-reports="${esc(
                        e.id
                      )}"
                      ${
                        latest
                          ? ''
                          : 'disabled'
                      }
                    >
                      View Reports
                    </button>
                  </td>

                </tr>
              `;
            })
            .join('')}

        </tbody>

      </table>

    </div>
  `, 'Employer Portal');
}

function reviewerDashboard() {
  const responses =
    state.contextRequests.filter(
      (r) =>
        r.status ===
        'submitted'
    ).length;

  return shell(`
    <div class="header-row">

      <div>

        <h2>
          Reviewer Workspace
        </h2>

        <p>
          Screen evidence,
          resolve context,
          complete human review
          and approve the final
          employer report.
        </p>

      </div>

      <button
        class="btn primary"
        data-page="reports"
      >
        Run Screening
      </button>

    </div>

    <div class="grid metrics">

      ${metric(
        'Monitored employees',
        activeEmployees().length,
        'Available to review'
      )}

      ${metric(
        'Current report',
        esc(state.reportStatus),
        'Workflow status'
      )}

      ${metric(
        'Context responses',
        responses,
        'Awaiting reviewer'
      )}

      ${metric(
        'Approved reports',
        state.approvedReports.length,
        'Employer visible'
      )}

    </div>

    ${
      state.report
        ? `
          <div class="card panel">
            ${reviewSummary()}
          </div>
        `
        : `
          <div class="card empty">
            No screening draft
            is currently open.
          </div>
        `
    }
  `, 'Reviewer Home');
}

function employeeDashboard() {
  const employee =
    currentEmployee();

  if (!employee) {
    return shell(
      `
        <div class="card empty">
          No employee selected.
        </div>
      `,
      'My Activity'
    );
  }

  const pending =
    state.contextRequests.filter(
      (r) =>
        String(r.employeeId) ===
          String(employee.id) &&
        [
          'requested',
          'submitted',
        ].includes(
          r.status
        )
    );

  return shell(`
    <div class="header-row">

      <div>

        <h2>
          My Activity
        </h2>

        <p>
          ${esc(employee.name)}
          ·
          ${esc(
            employee.employer ||
            ''
          )}
        </p>

      </div>

    </div>

    <div class="grid metrics">

      ${metric(
        'Monitoring',
        employee.excluded
          ? 'Excluded'
          : 'Active',
        esc(
          employee.connectionName ||
          'Scrin'
        )
      )}

      ${metric(
        'Timezone',
        esc(
          employeeTimezone(
            employee
          )
        ),
        'Reporting timezone'
      )}

      ${metric(
        'Work policy',
        esc(
          workPolicyLabel(
            employee
              .workPolicyType
          )
        ),
        'Configured by WGM'
      )}

      ${metric(
        'Action required',
        pending.filter(
          (x) =>
            x.status ===
            'requested'
        ).length,
        'Context requests'
      )}

    </div>

    ${
      pending.some(
        (x) =>
          x.status ===
          'requested'
      )
        ? `
          <div
            class="card panel"
            style="
              border-left:
              4px solid #C9A84C
            "
          >

            <div class="panel-title">
              ACTION REQUIRED —
              MONITORING CONTEXT
            </div>

            <p>
              White Glove Monitor
              needs additional context
              for a monitoring review.
            </p>

            <button
              class="btn gold"
              data-page="context"
            >
              Provide Context
            </button>

          </div>
        `
        : `
          <div class="card panel">
            <p>
              No monitoring context
              is currently required
              from you.
            </p>
          </div>
        `
    }
  `, 'Employee Portal');
}

/* ==========================================================
   EMPLOYEES / MONITORING
   ========================================================== */

function employeesPage() {
  const list =
    state.role === 'employer'
      ? portalEmployees()
      : state.role === 'employee'
        ? [currentEmployee()]
            .filter(Boolean)
        : activeEmployees();

  return shell(`
    <div class="header-row">

      <div>

        <h2>
          ${
            state.role ===
            'employer'
              ? 'My Team'
              : 'Employees'
          }
        </h2>

        <p>
          ${
            state.role ===
            'employer'
              ? 'View approved reports beside each employee.'
              : 'Open an employee to inspect monitoring evidence.'
          }
        </p>

      </div>

      ${
        state.role === 'owner'
          ? `
            <button
              class="btn"
              id="syncScrin"
            >
              Sync Scrin
            </button>
          `
          : ''
      }

    </div>

    <div class="card panel">

      <table>

        <thead>
          <tr>
            <th>Employee</th>
            <th>Employer</th>
            <th>Connection</th>
            <th>Timezone</th>
            <th>Latest report</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${list
            .map((e) => {
              const latest =
                approvedReportsForEmployee(
                  e.id
                )[0];

              return `
                <tr>

                  <td>
                    ${
                      isOwnerReviewer()
                        ? `
                          <span
                            class="row-link"
                            data-open-id="${esc(
                              e.id
                            )}"
                          >
                            ${esc(e.name)}
                          </span>
                        `
                        : esc(e.name)
                    }
                  </td>

                  <td>
                    ${esc(
                      e.employer ||
                      'Unassigned'
                    )}
                  </td>

                  <td>
                    ${esc(
                      e.connectionName ||
                      'Scrin'
                    )}
                  </td>

                  <td>
                    ${esc(
                      employeeTimezone(
                        e
                      )
                    )}
                  </td>

                  <td>
                    ${
                      latest
                        ? esc(
                            monthLabel(
                              latest
                                .period
                                .from
                            )
                          )
                        : '—'
                    }
                  </td>

                  <td>
                    ${
                      state.role ===
                      'employer'
                        ? `
                          <button
                            class="btn"
                            data-employer-reports="${esc(
                              e.id
                            )}"
                            ${
                              latest
                                ? ''
                                : 'disabled'
                            }
                          >
                            View Reports
                          </button>
                        `
                        : ''
                    }
                  </td>

                </tr>
              `;
            })
            .join('')}

        </tbody>

      </table>

    </div>
  `,
  state.role === 'employer'
    ? 'My Team'
    : 'Employees');
}

function monitoringPage() {
  const employee =
    currentEmployee();

  if (!employee) {
    return shell(
      `
        <div class="card empty">
          No employee selected.
        </div>
      `,
      'Monitoring'
    );
  }

  const tabs =
    state.role === 'employee'
      ? [
          'overview',
          'screenshots',
        ]
      : [
          'overview',
          'screenshots',
          'reports',
        ];

  return shell(`
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">
          ${esc(
            employee.initials ||
            initials(
              employee.name
            )
          )}
        </div>

        <div>

          <h2 style="margin:0">
            ${esc(employee.name)}
          </h2>

          <div class="small">
            ${esc(
              employee.employer ||
              'Unassigned'
            )}
            ·
            ${esc(
              employee.connectionName ||
              'Scrin'
            )}
          </div>

        </div>

      </div>

      <div class="tabs">

        ${tabs
          .map(
            (t) => `
              <button
                class="tab ${
                  state.tab === t
                    ? 'active'
                    : ''
                }"
                data-tab="${t}"
              >
                ${
                  t[0].toUpperCase() +
                  t.slice(1)
                }
              </button>
            `
          )
          .join('')}

      </div>

      ${monitorTab(employee)}

    </div>
  `, 'Employee Monitoring');
}

function monitoringDiagnostics(
  employee
) {
  const r =
    employee.lastAnalytics
      ?.reconciliation;

  if (
    !r ||
    !isOwnerReviewer()
  ) {
    return '';
  }

  return `
    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Scrin Reconciliation /
        Capture Diagnostics
      </div>

      <div
        class="grid metrics"
        style="margin-top:12px"
      >

        ${metric(
          'Raw activities',
          Number(
            r.rawActivitiesReturned ||
            0
          ),
          'Returned by Scrin API'
        )}

        ${metric(
          'Activities used',
          Number(
            r.activitiesUsed ||
            0
          ),
          `${Number(
            r.activitiesClippedAtBoundary ||
            0
          )} boundary clipped`
        )}

        ${metric(
          'Raw screenshots',
          Number(
            r.rawScreenshotRecordsReturned ||
            0
          ),
          'Before reconciliation'
        )}

        ${metric(
          'Final screenshots',
          Number(
            r.finalScreenshotCount ||
            0
          ),
          `${Number(
            r.screenshotsExcludedOutsideRange ||
            0
          )} outside period · ${Number(
            r.duplicateScreenshotRecordsRemoved ||
            0
          )} duplicate(s)`
        )}

      </div>

      <div class="small">
        Reporting timezone:
        <b>
          ${esc(
            r.reportingTimezone ||
            employeeTimezone(
              employee
            )
          )}
        </b>.
        These diagnostics are internal
        and never appear on the
        employer report.
      </div>

    </div>
  `;
}

function monitorTab(employee) {
  if (
    state.tab === 'screenshots'
  ) {
    return screenshotView(
      employee
    );
  }

  if (
    state.tab === 'reports'
  ) {
    const reports =
      approvedReportsForEmployee(
        employee.id
      );

    return reports.length
      ? approvedTable(reports)
      : `
        <div class="empty">
          No approved reports.
        </div>
      `;
  }

  const a =
    employee.lastAnalytics;

  return `
    <div class="grid metrics">

      ${metric(
        'Tracked time',
        a
          ? hoursLabel(
              a.metrics
                ?.trackedHours ||
              0
            )
          : '—',
        'Last analyzed period'
      )}

      ${metric(
        'Screenshots',
        a?.screenshotCount ??
          '—',
        'Reconciled captures'
      )}

      ${metric(
        'Reporting timezone',
        esc(
          employeeTimezone(
            employee
          )
        ),
        'Date boundary'
      )}

      ${metric(
        'Work policy',
        esc(
          workPolicyLabel(
            employee
              .workPolicyType
          )
        ),
        'Evaluation context'
      )}

    </div>

    <div class="callout">
      <strong>
        Screening rule
      </strong>
      WGM screens the selected period,
      then a human reviewer checks
      a stable random sample and
      every AI-generated review item
      before approval.
    </div>

    ${monitoringDiagnostics(
      employee
    )}
  `;
}

function screenshotView(employee) {
  const summary =
    employee.daySummary;

  const date =
    summary?.date ||
    state.period.to;

  return `
    <div class="toolbar">

      <div class="field">

        <label>
          Date
        </label>

        <input
          id="screenDate"
          type="date"
          value="${esc(date)}"
        >

      </div>

      <div class="spacer"></div>

      <button
        class="btn primary"
        id="loadLiveDay"
      >
        Load complete day
        from Scrin
      </button>

    </div>

    ${
      summary
        ? `
          <div
            class="grid metrics"
            style="margin:16px 0"
          >

            ${metric(
              'First tracked',
              esc(
                summary
                  .firstTracked ||
                '—'
              ),
              'Selected day'
            )}

            ${metric(
              'Last tracked',
              esc(
                summary
                  .lastTracked ||
                '—'
              ),
              'Selected day'
            )}

            ${metric(
              'Recorded time',
              hoursLabel(
                Number(
                  summary
                    .trackedSeconds ||
                  0
                ) / 3600
              ),
              'Scrin intervals'
            )}

            ${metric(
              'Screenshots',
              summary
                .screenshotCount ||
              0,
              'Reconciled captures'
            )}

          </div>
        `
        : ''
    }

    <div class="shot-grid">

      ${
        (employee.shots || [])
          .map(
            (s) =>
              screenshotCard(s)
          )
          .join('') ||
        `
          <div class="empty">
            No screenshots loaded.
          </div>
        `
      }

    </div>
  `;
}

function screenshotCard(shot) {
  const [
    time,
    application,
    level,
    thumbUrl,
    imageUrl,
  ] = shot;

  return `
    <div class="shot">

      <div class="shot-img">

        ${
          thumbUrl
            ? `
              <a
                href="${esc(
                  imageUrl ||
                  thumbUrl
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="${esc(
                    thumbUrl
                  )}"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block
                  "
                >
              </a>
            `
            : `
              <div class="empty">
                No image
              </div>
            `
        }

      </div>

      <div class="shot-meta">

        <strong>
          ${esc(time)}
        </strong>

        ${esc(application)}

        <br>

        <span class="small">
          Activity ${level ?? '—'}%
        </span>

      </div>

    </div>
  `;
}

async function loadLiveDay() {
  const employee =
    currentEmployee();

  const date =
    document.getElementById(
      'screenDate'
    )?.value;

  if (
    !employee ||
    !date
  ) {
    return;
  }

  if (
    !String(
      employee.timezone ||
      ''
    ).trim()
  ) {
    toast(
      'Set this employee’s reporting timezone in Settings first.'
    );
    return;
  }

  try {
    const data =
      await fetchJson(
        '/api/wgm/day-data',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            connectionId:
              employee
                .connectionId,

            employmentId:
              employee
                .employmentId,

            date,

            timezone:
              employee.timezone,

            timezoneOffsetMinutes:
              employee
                .timezoneOffsetMinutes ||
              0,
          }),
        }
      );

    employee.shots =
      (data.screenshots || [])
        .map(
          (s) => [
            s.time,
            s.application,
            s.activityLevel,
            s.thumbUrl,
            s.url,
          ]
        );

    employee.daySummary = {
      date: data.date,

      firstTracked:
        data.firstTracked,

      lastTracked:
        data.lastTracked,

      trackedSeconds:
        data.trackedSeconds,

      screenshotCount:
        data.screenshotCount,
    };

    employee.lastAnalytics = {
      ...(employee
        .lastAnalytics ||
      {}),

      reconciliation:
        data.reconciliation,
    };

    saveEmployees();
    render();

  } catch (error) {
    toast(
      `Could not load workday: ${error.message}`
    );
  }
}

/* ==========================================================
   API / SCREENING
   ========================================================== */

async function fetchJson(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        cache: 'no-store',
        ...options,
      }
    );

  const text =
    await response.text();

  let data;

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    const preview =
      text
        .trim()
        .slice(0, 80)
        .replace(
          /\s+/g,
          ' '
        );

    if (
      preview.startsWith('<')
    ) {
      throw new Error(
        `The API route ${url} returned an HTML page instead of JSON. Deploy src/worker.js and public/app.js from the same WGM build, then retry.`
      );
    }

    throw new Error(
      `The API route ${url} returned an invalid response: ${preview || 'empty response'}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Request failed: ${response.status}`
    );
  }

  return data;
}

function buildBatch(
  manifest,
  batchIndex,
  scanPlan
) {
  const start =
    batchIndex *
    scanPlan.newPerBatch;

  const newItems =
    manifest.slice(
      start,
      start +
        scanPlan.newPerBatch
    );

  if (!newItems.length) {
    return null;
  }

  const overlapStart =
    Math.max(
      0,
      start -
        scanPlan.overlapSize
    );

  const overlapItems =
    batchIndex === 0
      ? []
      : manifest.slice(
          overlapStart,
          start
        );

  const source = [
    ...overlapItems,
    ...newItems,
  ];

  const screenshots =
    source.map(
      (item) => ({
        ...item,

        // Use the Scrin thumbnail
        // first for speed.
        imageUrl:
          item.thumbUrl ||
          item.imageUrl,

        // Preserve the full image
        // as the worker fallback.
        thumbUrl:
          item.imageUrl ||
          item.thumbUrl,
      })
    );

  return {
    screenshots,

    countedScreenshotIds:
      newItems.map(
        (x) =>
          String(
            x.screenshotId
          )
      ),
  };
}

async function scanOneBatchWithRetry(
  payload,
  retries = 2
) {
  let lastError;

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {
    try {
      return await fetchJson(
        '/api/wgm/screening/batch',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

    } catch (error) {
      lastError = error;

      if (
        attempt < retries
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              900 *
              (attempt + 1)
            )
        );
      }
    }
  }

  throw (
    lastError ||
    new Error(
      'AI screening batch failed'
    )
  );
}

async function runBatchPool(
  manifest,
  scanPlan,
  prepared
) {
  const results =
    new Array(
      scanPlan.totalBatches
    );

  let next = 0;
  let processed = 0;
  let completed = 0;

  async function workerLoop() {
    while (true) {
      const batchIndex =
        next++;

      if (
        batchIndex >=
        scanPlan.totalBatches
      ) {
        return;
      }

      const batch =
        buildBatch(
          manifest,
          batchIndex,
          scanPlan
        );

      if (!batch) {
        return;
      }

      state.scanProgress = {
        phase:
          `AI screening selected period — ${completed} of ${scanPlan.totalBatches} batches complete…`,

        processed,

        total:
          prepared
            .screenshotCount,

        completedBatches:
          completed,

        totalBatches:
          scanPlan
            .totalBatches,
      };

      render();

      const result =
        await scanOneBatchWithRetry({
          sessionKey:
            prepared.sessionKey,

          batchIndex,

          totalBatches:
            scanPlan
              .totalBatches,

          screenshots:
            batch.screenshots,

          countedScreenshotIds:
            batch
              .countedScreenshotIds,
        });

      results[
        batchIndex
      ] = result;

      processed +=
        Number(
          result
            .countedReviewedCount ||
          0
        );

      completed++;

      state.batchResults =
        results.filter(Boolean);

      state.scanProgress = {
        phase:
          `AI screened ${Math.min(
            processed,
            prepared
              .screenshotCount
          ).toLocaleString()} screenshot(s) across ${completed} of ${scanPlan.totalBatches} batches.`,

        processed:
          Math.min(
            processed,
            prepared
              .screenshotCount
          ),

        total:
          prepared
            .screenshotCount,

        completedBatches:
          completed,

        totalBatches:
          scanPlan
            .totalBatches,
      };

      render();
    }
  }

  await Promise.all(
    Array.from(
      {
        length:
          Math.min(
            AI_CONCURRENCY,
            scanPlan
              .totalBatches
          ),
      },

      () =>
        workerLoop()
    )
  );

  return results.filter(
    Boolean
  );
}

async function generateReport() {
  if (!isOwnerReviewer()) {
    toast(
      'Only the WGM Owner or Reviewer can run screening.'
    );
    return;
  }

  const employeeId =
    document.getElementById(
      'reportEmployee'
    )?.value ||
    state.selectedEmployeeId;

  const employee =
    employeeById(
      employeeId
    );

  state.period = {
    from:
      document.getElementById(
        'fromDate'
      )?.value ||
      state.period.from,

    to:
      document.getElementById(
        'toDate'
      )?.value ||
      state.period.to,
  };

  if (
    !employee ||
    employee.excluded ||
    !employee.employer
  ) {
    toast(
      'Select a monitored employee mapped to an employer.'
    );
    return;
  }

  if (
    !String(
      employee.timezone ||
      ''
    ).trim()
  ) {
    toast(
      'Set a valid reporting timezone for this employee in Settings first.'
    );
    return;
  }

  if (
    state.mode !== 'LIVE'
  ) {
    toast(
      'Live Scrin data is required for AI screenshot screening.'
    );
    return;
  }

  if (
    !state.period.from ||
    !state.period.to ||
    state.period.to <
      state.period.from
  ) {
    toast(
      'Select a valid reporting period.'
    );
    return;
  }

  state.selectedEmployeeId =
    employee.id;

  state.reportEmployeeId =
    employee.id;

  state.prepared = null;
  state.batchResults = [];
  state.report = null;
  state.meta = null;

  state.humanDispositions = {};
  state.findingDispositions = {};

  state.reviewerChecks = [
    false,
    false,
    false,
    false,
    false,
  ];

  state.reportStatus =
    'Preparing evidence';

  state.scanProgress = {
    phase:
      'Retrieving and reconciling Scrin evidence…',

    processed: 0,
    total: 0,
    completedBatches: 0,
    totalBatches: 0,
  };

  render();

  try {
    const expectedHours =
      expectedPeriodHours(
        employee,
        state.period
      );

    const prepared =
      await fetchJson(
        '/api/wgm/screening/prepare',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            connectionId:
              employee
                .connectionId,

            employmentId:
              employee
                .employmentId,

            from:
              state.period.from,

            to:
              state.period.to,

            timezone:
              employee.timezone,

            timezoneOffsetMinutes:
              employee
                .timezoneOffsetMinutes ||
              0,

            expectedHours,

            adjustedExpectedHours:
              expectedHours,

            workPolicyType:
              employee
                .workPolicyType ||
              'on_demand',

            expectedDailyHours:
              [
                'fixed_schedule',
                'flexible_daily',
              ].includes(
                employee
                  .workPolicyType
              )
                ? Number(
                    employee
                      .workPolicyTarget ||
                    0
                  )
                : 0,

            expectedWeeklyHours:
              employee
                .workPolicyType ===
              'weekly_target'
                ? Number(
                    employee
                      .workPolicyTarget ||
                    0
                  )
                : 0,

            expectedMonthlyHours:
              employee
                .workPolicyType ===
              'monthly_target'
                ? Number(
                    employee
                      .workPolicyTarget ||
                    0
                  )
                : 0,

            batchSize:
              AI_BATCH_SIZE,

            overlapSize:
              AI_BATCH_OVERLAP,
          }),
        }
      );

    state.prepared =
      prepared;

    employee.lastAnalytics =
      prepared;

    employee.trackedHours =
      Number(
        prepared.metrics
          ?.trackedHours ||
        0
      );

    employee.reportingStatus =
      'Screening';

    saveEmployees();

    if (
      !prepared
        .screenshotCount
    ) {
      throw new Error(
        'No screenshots were returned for the selected employee and period.'
      );
    }

    state.reportStatus =
      'AI screening';

    state.scanProgress = {
      phase:
        `Retrieved ${prepared.screenshotCount.toLocaleString()} reconciled screenshot(s). Running ${prepared.scanPlan?.totalBatches || 0} AI batches with ${AI_CONCURRENCY} concurrent workers…`,

      processed: 0,

      total:
        prepared
          .screenshotCount,

      completedBatches: 0,

      totalBatches:
        prepared
          .scanPlan
          ?.totalBatches ||
        0,
    };

    render();

    const batchResults =
      await runBatchPool(
        prepared.manifest ||
          [],

        prepared.scanPlan,

        prepared
      );

    state.reportStatus =
      'Finalizing screening';

    state.scanProgress.phase =
      'Consolidating screenshot signals and cross-day patterns…';

    render();

    const report =
      await fetchJson(
        '/api/wgm/screening/finalize',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            sessionKey:
              prepared
                .sessionKey,

            expectedScreenshots:
              prepared
                .screenshotCount,

            manifest:
              prepared.manifest,

            batchResults,
          }),
        }
      );

    state.report =
      report;

    state.meta = {
      generatedAt:
        new Date()
          .toISOString(),

      analysisVersion:
        prepared
          .versions
          ?.analysisVersion,

      rulesVersion:
        prepared
          .versions
          ?.rulesVersion,

      promptVersion:
        prepared
          .versions
          ?.promptVersion,

      screenedScreenshots:
        report
          .screenedScreenshots,

      totalScreenshots:
        report
          .totalScreenshots,

      humanSampleSize:
        prepared
          .humanSample
          ?.count ||
        0,

      batchCount:
        prepared
          .scanPlan
          ?.totalBatches ||
        0,

      reconciliation:
        prepared
          .reconciliation,
    };

    state.scanProgress = {
      phase:
        `AI screening complete: ${Number(
          report
            .screenedScreenshots ||
          0
        ).toLocaleString()} screenshot(s) successfully screened. Human review is required.`,

      processed:
        report
          .screenedScreenshots ||
        0,

      total:
        prepared
          .screenshotCount,

      completedBatches:
        prepared
          .scanPlan
          ?.totalBatches ||
        0,

      totalBatches:
        prepared
          .scanPlan
          ?.totalBatches ||
        0,
    };

    state.reportStatus =
      report.screeningComplete
        ? 'Draft ready'
        : 'Incomplete screening';

    employee.reportingStatus =
      state.reportStatus;

    saveEmployees();

    state.page =
      'review';

    render();

  } catch (error) {
    state.reportStatus =
      'Generation failed';

    state.scanProgress.phase =
      error.message;

    render();

    toast(
      `Screening failed: ${error.message}`
    );
  }
}

/* ==========================================================
   REPORT GENERATION PAGE
   ========================================================== */

function screeningProgressCard() {
  const p =
    state.scanProgress;

  const pct =
    p.total
      ? Math.round(
          (
            p.processed /
            p.total
          ) *
          100
        )
      : 0;

  return `
    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div
        class="header-row"
        style="margin:0"
      >

        <div>

          <div class="panel-title">
            Screening progress
          </div>

          <div class="small">
            ${esc(
              p.phase ||
              state.reportStatus
            )}
          </div>

        </div>

        <span
          class="status ${statusClass(
            state.reportStatus
          )}"
        >
          <span class="dot"></span>
          ${esc(
            state.reportStatus
          )}
        </span>

      </div>

      <div
        class="grid metrics"
        style="margin-top:14px"
      >

        ${metric(
          'Reconciled screenshots',
          p.total
            ? p.total.toLocaleString()
            : '—',
          'Selected period'
        )}

        ${metric(
          'AI-screened',
          Number(
            p.processed ||
            0
          ).toLocaleString(),
          p.total
            ? `of ${p.total.toLocaleString()}`
            : 'Waiting'
        )}

        ${metric(
          'Human sample',
          state.prepared
            ?.humanSample
            ?.count ??
            '—',
          'Stable random sample'
        )}

        ${metric(
          'Batches complete',
          p.totalBatches
            ? `${p.completedBatches}/${p.totalBatches}`
            : '—',
          `${pct}% screenshots screened`
        )}

      </div>

      <div
        class="progress"
        style="
          height:10px;
          margin-top:10px
        "
      >
        <span
          style="width:${pct}%"
        ></span>
      </div>

    </div>
  `;
}

function reportsPage() {
  if (
    state.role === 'employer'
  ) {
    return shell(`
      <div class="header-row">

        <div>
          <h2>
            Reports
          </h2>

          <p>
            Select an employee
            to view approved reports.
          </p>
        </div>

      </div>

      ${
        portalEmployees()
          .map((e) => {
            const count =
              approvedReportsForEmployee(
                e.id
              ).length;

            return `
              <div
                class="card panel"
                style="
                  margin-bottom:12px
                "
              >

                <div
                  class="header-row"
                  style="margin:0"
                >

                  <div>

                    <div class="panel-title">
                      ${esc(e.name)}
                    </div>

                    <div class="small">
                      ${count}
                      approved report${
                        count === 1
                          ? ''
                          : 's'
                      }
                    </div>

                  </div>

                  <button
                    class="btn"
                    data-employer-reports="${esc(
                      e.id
                    )}"
                    ${
                      count
                        ? ''
                        : 'disabled'
                    }
                  >
                    View Reports
                  </button>

                </div>

              </div>
            `;
          })
          .join('') ||
        `
          <div class="card empty">
            No monitored employees.
          </div>
        `
      }
    `, 'Reports');
  }

  if (!isOwnerReviewer()) {
    return shell(
      `
        <div class="card empty">
          Reports are not shown
          in the employee portal.
        </div>
      `,
      'Reports'
    );
  }

  return shell(`
    <div class="header-row">

      <div>

        <h2>
          Screening & Reports
        </h2>

        <p>
          Select any reporting period.
          WGM reconciles Scrin data first,
          then screens screenshot evidence
          and sends the draft to human review.
        </p>

      </div>

    </div>

    <div class="card panel">

      <div class="toolbar">

        <div class="field">

          <label>
            Employee
          </label>

          <select
            id="reportEmployee"
            class="map-input"
          >
            ${activeEmployees()
              .map(
                (e) => `
                  <option
                    value="${esc(e.id)}"
                    ${
                      String(e.id) ===
                      String(
                        state.selectedEmployeeId
                      )
                        ? 'selected'
                        : ''
                    }
                  >
                    ${esc(e.name)}
                    —
                    ${esc(
                      e.employer ||
                      'Unassigned'
                    )}
                  </option>
                `
              )
              .join('')}
          </select>

        </div>

        <div class="field">

          <label>
            From
          </label>

          <input
            id="fromDate"
            type="date"
            value="${esc(
              state.period.from
            )}"
          >

        </div>

        <div class="field">

          <label>
            To
          </label>

          <input
            id="toDate"
            type="date"
            value="${esc(
              state.period.to
            )}"
          >

        </div>

        <div class="spacer"></div>

        <button
          class="btn gold"
          id="generateBtn"
        >
          Run AI Screening
        </button>

      </div>

      <div
        class="small"
        style="margin-top:10px"
      >
        Owner/Reviewer only.
        Screening uses
        ${AI_CONCURRENCY}
        concurrent AI batch workers
        for the prototype.
        Human approval is still mandatory.
      </div>

    </div>

    ${
      state.reportStatus !==
      'Not generated'
        ? screeningProgressCard()
        : ''
    }

    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Approved employer reports
      </div>

      ${
        state.approvedReports.length
          ? approvedTable(
              state.approvedReports
            )
          : `
            <div class="empty">
              No approved reports yet.
            </div>
          `
      }

    </div>
  `, 'Screening & Reports');
}

/* ==========================================================
   REVIEW WORKFLOW / CONTEXT
   ========================================================== */

function checkTitle(key) {
  return ({
    repeated_frozen:
      'Repeated or frozen screens',

    repetitive_cycling:
      'Repetitive screen cycling',

    activity_simulation:
      'Visible activity-simulation tools',

    prolonged_stagnation_10m:
      'Prolonged stagnant screens over 10 minutes',

    repeated_across_days:
      'Repeated sequences across days',

    evidence_gap:
      'Evidence coverage',

    incomplete_screening:
      'Screening coverage',
  })[key] || key;
}

function reviewSummary() {
  const employee =
    employeeById(
      state.reportEmployeeId
    ) ||
    currentEmployee();

  return `
    <table>

      <thead>
        <tr>
          <th>Employee</th>
          <th>Period</th>
          <th>AI-screened</th>
          <th>Human sample</th>
          <th>Human reviewed</th>
          <th>Needs context</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>

        <tr>

          <td>
            ${esc(
              employee?.name ||
              '—'
            )}
          </td>

          <td>
            ${esc(
              periodLabel(
                state.period
              )
            )}
          </td>

          <td>
            ${Number(
              state.report
                ?.screenedScreenshots ||
              0
            ).toLocaleString()}
          </td>

          <td>
            ${humanSampleTarget()}
          </td>

          <td>
            ${humanReviewedCount()}
          </td>

          <td>
            ${unresolvedCurrentCount()}
          </td>

          <td>
            ${esc(
              state.reportStatus
            )}
          </td>

        </tr>

      </tbody>

    </table>
  `;
}

function reviewPage() {
  const employee =
    employeeById(
      state.reportEmployeeId
    ) ||
    currentEmployee();

  const submitted =
    state.contextRequests.filter(
      (r) =>
        r.status ===
        'submitted'
    );

  return shell(`
    <div class="header-row">

      <div>

        <h2>
          Human Review
        </h2>

        <p>
          Review the random sample
          and every AI review item.
          Request employee context
          only when needed;
          employer reports are created
          only after everything
          is resolved.
        </p>

      </div>

      <button
        class="btn"
        data-page="reports"
      >
        Screen another period
      </button>

    </div>

    ${
      submitted.length
        ? `
          <div
            class="card panel"
            style="
              border-left:
              4px solid #C9A84C;
              margin-bottom:16px
            "
          >

            <div class="panel-title">
              CONTEXT RESPONSES RECEIVED
            </div>

            ${submitted
              .map(
                (r) => `
                  <div class="context-box">

                    <h4>
                      ${esc(
                        r.employeeName
                      )}
                      ·
                      ${esc(
                        r.label
                      )}
                    </h4>

                    <p>
                      <b>
                        Reviewer request:
                      </b>
                      ${esc(
                        r.question
                      )}
                    </p>

                    <p>
                      <b>
                        Employee response:
                      </b>
                      ${esc(
                        r.response ||
                        ''
                      )}
                    </p>

                    <button
                      class="btn gold"
                      data-resolve-context="${esc(
                        r.id
                      )}"
                    >
                      Resolve & Return
                      to Review
                    </button>

                  </div>
                `
              )
              .join('')}

          </div>
        `
        : ''
    }

    ${
      state.report
        ? reviewConsole(
            employee
          )
        : `
          <div class="card empty">
            Generate a screening
            draft first.
          </div>
        `
    }
  `, 'Review Queue');
}

function reviewConsole(employee) {
  const findings =
    state.report?.findings ||
    [];

  const openRequests =
    openContextRequestsForCurrentReport();

  return `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">
          ${esc(
            employee?.initials ||
            initials(
              employee?.name ||
              'VA'
            )
          )}
        </div>

        <div>

          <h2 style="margin:0">
            ${esc(
              employee?.name ||
              ''
            )}
            —
            ${esc(
              periodLabel(
                state.period
              )
            )}
          </h2>

          <div class="small">
            ${esc(
              employee?.employer ||
              ''
            )}
            ·
            Selected-period screenshot screening
          </div>

        </div>

        <div class="spacer"></div>

        <span
          class="status ${statusClass(
            state.reportStatus
          )}"
        >
          <span class="dot"></span>
          ${esc(
            state.reportStatus
          )}
        </span>

      </div>

      ${reviewSummary()}

      ${
        state.prepared
          ?.reconciliation
          ? `
            <div class="callout">

              <strong>
                Internal reconciliation
              </strong>

              ${Number(
                state.prepared
                  .reconciliation
                  .rawScreenshotRecordsReturned ||
                0
              )}
              raw screenshot records
              →

              ${Number(
                state.prepared
                  .reconciliation
                  .finalScreenshotCount ||
                0
              )}
              reconciled in-period screenshots.

              ${Number(
                state.prepared
                  .reconciliation
                  .screenshotsExcludedOutsideRange ||
                0
              )}
              outside-period record(s)
              and

              ${Number(
                state.prepared
                  .reconciliation
                  .duplicateScreenshotRecordsRemoved ||
                0
              )}
              duplicate(s) excluded.

            </div>
          `
          : ''
      }

      <div
        class="panel-title"
        style="margin-top:20px"
      >
        Reviewer checklist
      </div>

      <div class="check-list">

        ${[
          'I confirmed the selected-period AI screening completed to an acceptable coverage level',
          'I reviewed every screenshot in the required human sample',
          'I reviewed every AI-generated review item',
          'All context requests are resolved',
          'The employer-facing wording accurately reflects the reviewed evidence',
        ]
          .map(
            (label, i) => `
              <label class="check">

                <input
                  type="checkbox"
                  data-check="${i}"
                  ${
                    state
                      .reviewerChecks[
                        i
                      ]
                      ? 'checked'
                      : ''
                  }
                >

                ${label}

              </label>
            `
          )
          .join('')}

      </div>

      <div
        class="field"
        style="margin-top:14px"
      >

        <label>
          Reviewer name
        </label>

        <input
          id="reviewerName"
          class="map-input"
          value="${esc(
            state.reviewerName
          )}"
        >

      </div>

      <div
        class="actions"
        style="margin-top:14px"
      >

        <button
          class="btn"
          id="previewReport"
        >
          Preview Employer Report
        </button>

        ${
          unresolvedCurrentCount()
            ? `
              <button
                class="btn"
                id="sendContextRequests"
              >
                Send Context Request(s)
              </button>
            `
            : ''
        }

        <button
          class="btn gold"
          id="approveBtn"
        >
          Finalize & Approve Report
        </button>

      </div>

      ${
        openRequests.length
          ? `
            <div
              class="small"
              style="margin-top:10px"
            >
              ${openRequests.length}
              context request(s)
              are still open.
              Approval remains locked
              until they are resolved.
            </div>
          `
          : ''
      }

    </div>

    <div
      class="panel-title"
      style="margin-top:20px"
    >
      Human random sample ·
      ${humanSampleTarget()}
      screenshots
    </div>

    <div class="panel-sub">
      Reviewed
      ${humanReviewedCount()}
      of
      ${humanSampleTarget()}.
    </div>

    <div
      class="shot-grid"
      style="margin-top:12px"
    >

      ${
        humanSample().length
          ? humanSample()
              .map(
                humanReviewCard
              )
              .join('')
          : `
            <div class="empty">
              No human-review sample available.
            </div>
          `
      }

    </div>

    <div
      class="panel-title"
      style="margin-top:22px"
    >
      AI review items ·
      ${findings.length}
    </div>

    ${
      findings.length
        ? findings
            .map(
              findingReviewCard
            )
            .join('')
        : `
          <div class="context-box">

            <h4>
              No AI review item recorded
            </h4>

            <p>
              The screening pass
              did not return a visual
              pattern requiring reviewer
              attention.
              The random human sample
              must still be completed.
            </p>

          </div>
        `
    }
  `;
}

function humanReviewCard(
  screenshot
) {
  const id =
    String(
      screenshot.screenshotId
    );

  const d =
    state.humanDispositions[
      id
    ] || {};

  const image =
    screenshot.thumbUrl ||
    screenshot.imageUrl;

  return `
    <div class="shot">

      <div class="shot-img">

        ${
          image
            ? `
              <a
                href="${esc(
                  screenshot
                    .imageUrl ||
                  image
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="${esc(image)}"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block
                  "
                >
              </a>
            `
            : `
              <div class="empty">
                Image unavailable
              </div>
            `
        }

      </div>

      <div class="shot-meta">

        <strong>
          ${esc(
            screenshot
              .dateTime ||
            `${screenshot.date || ''} ${screenshot.time || ''}`
          )}
        </strong>

        ${esc(
          screenshot.application ||
          'Screenshot'
        )}

      </div>

      <div style="padding:10px">

        <label class="small">

          <input
            type="radio"
            name="sample_${esc(id)}"
            data-sample-decision="${esc(id)}"
            value="clear"
            ${
              d.decision ===
              'clear'
                ? 'checked'
                : ''
            }
          >

          Clear

        </label>

        <label
          class="small"
          style="margin-left:8px"
        >

          <input
            type="radio"
            name="sample_${esc(id)}"
            data-sample-decision="${esc(id)}"
            value="needs_context"
            ${
              d.decision ===
              'needs_context'
                ? 'checked'
                : ''
            }
          >

          Needs Context

        </label>

        ${
          d.decision ===
          'needs_context'
            ? `
              <textarea
                class="map-input"
                data-sample-context="${esc(id)}"
                placeholder="What context do you need from the employee?"
                style="
                  margin-top:8px;
                  min-height:70px
                "
              >${esc(
                d.context ||
                ''
              )}</textarea>
            `
            : ''
        }

      </div>

    </div>
  `;
}

function findingReviewCard(
  finding,
  index
) {
  const d =
    state.findingDispositions[
      index
    ] || {};

  return `
    <div class="context-box">

      <h4>
        ${esc(
          checkTitle(
            finding.type
          )
        )}
      </h4>

      <p>
        ${esc(
          finding.reason ||
          'Review this item against the screenshot evidence.'
        )}
      </p>

      <div class="small">
        Screenshot IDs:
        ${esc(
          (
            finding
              .screenshotIds ||
            []
          ).join(', ') ||
          'See screening record'
        )}
      </div>

      <div style="margin-top:10px">

        <label class="small">

          <input
            type="radio"
            name="finding_${index}"
            data-finding-decision="${index}"
            value="clear"
            ${
              d.decision ===
              'clear'
                ? 'checked'
                : ''
            }
          >

          Clear / resolved

        </label>

        <label
          class="small"
          style="margin-left:8px"
        >

          <input
            type="radio"
            name="finding_${index}"
            data-finding-decision="${index}"
            value="needs_context"
            ${
              d.decision ===
              'needs_context'
                ? 'checked'
                : ''
            }
          >

          Needs Context

        </label>

      </div>

      ${
        d.decision ===
        'needs_context'
          ? `
            <textarea
              class="map-input"
              data-finding-context="${index}"
              placeholder="What context do you need from the employee?"
              style="
                margin-top:8px;
                min-height:70px
              "
            >${esc(
              d.context ||
              ''
            )}</textarea>
          `
          : ''
      }

    </div>
  `;
}

function humanReviewComplete() {
  return humanSample().every(
    (s) =>
      [
        'clear',
        'needs_context',
      ].includes(
        state.humanDispositions[
          String(
            s.screenshotId
          )
        ]?.decision
      )
  );
}

function findingReviewComplete() {
  return (
    state.report?.findings ||
    []
  ).every(
    (_, i) =>
      [
        'clear',
        'needs_context',
      ].includes(
        state.findingDispositions[
          i
        ]?.decision
      )
  );
}

function canApprove() {
  if (
    !state.report
      ?.screeningComplete
  ) {
    return {
      ok: false,

      message:
        'AI screening coverage is below the required completion threshold.',
    };
  }

  if (
    !humanReviewComplete()
  ) {
    return {
      ok: false,

      message:
        `Review all ${humanSampleTarget()} screenshots in the human sample first.`,
    };
  }

  if (
    !findingReviewComplete()
  ) {
    return {
      ok: false,

      message:
        'Review every AI review item first.',
    };
  }

  if (
    unresolvedCurrentCount() >
    0
  ) {
    return {
      ok: false,

      message:
        'Resolve every Needs Context item before approval.',
    };
  }

  if (
    openContextRequestsForCurrentReport()
      .length
  ) {
    return {
      ok: false,

      message:
        'A context request is still open for this report.',
    };
  }

  if (
    !state.reviewerChecks.every(
      Boolean
    )
  ) {
    return {
      ok: false,

      message:
        'Complete the reviewer checklist before approval.',
    };
  }

  if (
    !String(
      state.reviewerName ||
      ''
    ).trim()
  ) {
    return {
      ok: false,

      message:
        'Enter the reviewer name.',
    };
  }

  return {
    ok: true,
  };
}

function createContextRequests() {
  const employee =
    employeeById(
      state.reportEmployeeId
    ) ||
    currentEmployee();

  if (
    !employee ||
    !state.prepared
      ?.sessionKey
  ) {
    return;
  }

  const created = [];

  for (
    const [id, d] of
    Object.entries(
      state.humanDispositions
    )
  ) {
    if (
      d?.decision !==
        'needs_context' ||
      !String(
        d.context ||
        ''
      ).trim()
    ) {
      continue;
    }

    const ref =
      `sample:${id}`;

    if (
      state.contextRequests.some(
        (r) =>
          r.sessionKey ===
            state.prepared
              .sessionKey &&
          r.ref === ref &&
          r.status !== 'resolved'
      )
    ) {
      continue;
    }

    const shot =
      humanSample().find(
        (s) =>
          String(
            s.screenshotId
          ) ===
          String(id)
      );

    created.push({
      id:
        `ctx_${Date.now()}_${created.length}`,

      sessionKey:
        state.prepared
          .sessionKey,

      employeeId:
        employee.id,

      employeeName:
        employee.name,

      employer:
        employee.employer,

      ref,

      refType:
        'sample',

      refKey:
        id,

      label:
        shot?.dateTime ||
        `Screenshot ${id}`,

      question:
        String(
          d.context
        ).trim(),

      response: '',

      status:
        'requested',

      createdAt:
        new Date()
          .toISOString(),
    });
  }

  (
    state.report?.findings ||
    []
  ).forEach(
    (finding, index) => {
      const d =
        state.findingDispositions[
          index
        ];

      if (
        d?.decision !==
          'needs_context' ||
        !String(
          d.context ||
          ''
        ).trim()
      ) {
        return;
      }

      const ref =
        `finding:${index}`;

      if (
        state.contextRequests.some(
          (r) =>
            r.sessionKey ===
              state.prepared
                .sessionKey &&
            r.ref === ref &&
            r.status !==
              'resolved'
        )
      ) {
        return;
      }

      created.push({
        id:
          `ctx_${Date.now()}_${created.length}`,

        sessionKey:
          state.prepared
            .sessionKey,

        employeeId:
          employee.id,

        employeeName:
          employee.name,

        employer:
          employee.employer,

        ref,

        refType:
          'finding',

        refKey:
          String(index),

        label:
          checkTitle(
            finding.type
          ),

        question:
          String(
            d.context
          ).trim(),

        response: '',

        status:
          'requested',

        createdAt:
          new Date()
            .toISOString(),
      });
    }
  );

  if (!created.length) {
    toast(
      'No new Needs Context items are ready to send.'
    );
    return;
  }

  state.contextRequests.push(
    ...created
  );

  saveContextRequests();

  render();

  toast(
    `${created.length} context request(s) sent to ${employee.name}.`
  );
}

function resolveContextRequest(id) {
  const req =
    state.contextRequests.find(
      (r) =>
        r.id === id
    );

  if (
    !req ||
    req.status !==
      'submitted'
  ) {
    return;
  }

  req.status =
    'resolved';

  req.resolvedAt =
    new Date()
      .toISOString();

  req.resolvedBy =
    state.reviewerName;

  if (
    req.sessionKey ===
    state.prepared
      ?.sessionKey
  ) {
    if (
      req.refType ===
      'sample'
    ) {
      state.humanDispositions[
        String(req.refKey)
      ] = {
        ...(
          state.humanDispositions[
            String(
              req.refKey
            )
          ] ||
          {}
        ),

        decision:
          'clear',

        employeeResponse:
          req.response,

        resolvedAt:
          req.resolvedAt,
      };
    }

    if (
      req.refType ===
      'finding'
    ) {
      state.findingDispositions[
        Number(req.refKey)
      ] = {
        ...(
          state.findingDispositions[
            Number(
              req.refKey
            )
          ] ||
          {}
        ),

        decision:
          'clear',

        employeeResponse:
          req.response,

        resolvedAt:
          req.resolvedAt,
      };
    }
  }

  saveContextRequests();

  render();

  toast(
    'Context resolved and returned to the active review.'
  );
}

function contextPage() {
  const employee =
    currentEmployee();

  if (!employee) {
    return shell(
      `
        <div class="card empty">
          No employee selected.
        </div>
      `,
      'Action Required'
    );
  }

  const requests =
    state.contextRequests
      .filter(
        (r) =>
          String(
            r.employeeId
          ) ===
            String(
              employee.id
            ) &&
          r.status !==
            'resolved'
      )
      .sort(
        (a, b) =>
          String(
            b.createdAt
          ).localeCompare(
            String(
              a.createdAt
            )
          )
      );

  return shell(`
    <div class="header-row">

      <div>

        <h2>
          Monitoring Context
        </h2>

        <p>
          Provide only the requested information.
          The employee does not see the full
          internal or employer report.
        </p>

      </div>

    </div>

    ${
      requests.length
        ? requests
            .map(
              (r) => `
                <div
                  class="card panel"
                  style="
                    margin-bottom:14px
                  "
                >

                  <div class="panel-title">
                    ${esc(
                      r.label
                    )}
                  </div>

                  <p>
                    <b>
                      White Glove Monitor asks:
                    </b>
                    ${esc(
                      r.question
                    )}
                  </p>

                  ${
                    r.status ===
                    'submitted'
                      ? `
                        <div class="context-box">

                          <h4>
                            Response submitted
                          </h4>

                          <p>
                            ${esc(
                              r.response ||
                              ''
                            )}
                          </p>

                          <div class="small">
                            The reviewer has been notified.
                          </div>

                        </div>
                      `
                      : `
                        <textarea
                          class="map-input"
                          data-context-response="${esc(
                            r.id
                          )}"
                          placeholder="Provide context here…"
                          style="
                            min-height:110px
                          "
                        ></textarea>

                        <button
                          class="btn gold"
                          data-submit-context="${esc(
                            r.id
                          )}"
                          style="margin-top:10px"
                        >
                          Submit Context
                        </button>
                      `
                  }

                </div>
              `
            )
            .join('')
        : `
          <div class="card empty">
            No context is currently required.
          </div>
        `
    }
  `, 'Action Required');
}

function submitContextRequest(id) {
  const req =
    state.contextRequests.find(
      (r) =>
        r.id === id
    );

  const input =
    document.querySelector(
      `[data-context-response="${CSS.escape(id)}"]`
    );

  if (
    !req ||
    !input
  ) {
    return;
  }

  const value =
    String(
      input.value ||
      ''
    ).trim();

  if (!value) {
    toast(
      'Enter the requested context before submitting.'
    );
    return;
  }

  req.response =
    value;

  req.status =
    'submitted';

  req.submittedAt =
    new Date()
      .toISOString();

  saveContextRequests();

  render();

  toast(
    'Context submitted. The reviewer has been notified.'
  );
}

function approveHumanReview() {
  const validation =
    canApprove();

  if (!validation.ok) {
    toast(
      validation.message
    );
    return;
  }

  const employee =
    employeeById(
      state.reportEmployeeId
    ) ||
    currentEmployee();

  if (
    !employee ||
    !state.report ||
    !state.prepared
  ) {
    return;
  }

  const version =
    nextVersion(
      employee.id,
      state.period
    );

  const reportId =
    `wgm_${Date.now()}`;

  const preparedSnapshot = {
    sessionKey:
      state.prepared
        .sessionKey,

    period:
      state.prepared
        .period,

    timezone:
      state.prepared
        .timezone,

    workPolicy:
      state.prepared
        .workPolicy,

    metrics:
      state.prepared
        .metrics,

    reconciliation:
      state.prepared
        .reconciliation,

    screenshotCount:
      state.prepared
        .screenshotCount,

    screenshotDates:
      state.prepared
        .screenshotDates,

    screenshotDateCounts:
      state.prepared
        .screenshotDateCounts,

    humanSample: {
      count:
        state.prepared
          .humanSample
          ?.count ||
        0,

      target:
        state.prepared
          .humanSample
          ?.target ||
        0,
    },

    versions:
      state.prepared
        .versions,
  };

  const approvedAt =
    new Date()
      .toISOString();

  const snapshot = {
    id:
      reportId,

    employeeId:
      employee.id,

    employeeName:
      employee.name,

    employer:
      employee.employer,

    role:
      employee.role ||
      'Virtual Assistant',

    timezone:
      employeeTimezone(
        employee
      ),

    workPolicyType:
      employee
        .workPolicyType ||
      'on_demand',

    workPolicyTarget:
      Number(
        employee
          .workPolicyTarget ||
        0
      ),

    period:
      JSON.parse(
        JSON.stringify(
          state.period
        )
      ),

    version,

    report:
      JSON.parse(
        JSON.stringify(
          state.report
        )
      ),

    prepared:
      JSON.parse(
        JSON.stringify(
          preparedSnapshot
        )
      ),

    meta:
      JSON.parse(
        JSON.stringify(
          state.meta ||
          {}
        )
      ),

    reviewerName:
      state.reviewerName,

    humanChecked:
      humanReviewedCount(),

    humanDispositions:
      JSON.parse(
        JSON.stringify(
          state.humanDispositions
        )
      ),

    findingDispositions:
      JSON.parse(
        JSON.stringify(
          state.findingDispositions
        )
      ),

    approvedAt,

    status:
      'Approved',
  };

  state.approvedReports.push(
    snapshot
  );

  saveApprovedReports();

  state.notifications.push({
    id:
      `notice_${reportId}`,

    employer:
      employee.employer,

    employeeId:
      employee.id,

    reportId,

    title:
      `${periodLabel(state.period)} Monitoring Report — ${employee.name}`,

    message:
      `White Glove Monitor completed human review and approved a monitoring report for ${employee.name}.`,

    read:
      false,

    createdAt:
      approvedAt,
  });

  saveNotifications();

  state.reportStatus =
    'Approved';

  employee.reportingStatus =
    'Approved';

  saveEmployees();

  state.selectedReportId =
    reportId;

  state.page =
    'approvedReport';

  render();

  toast(
    'Report approved and immediately available to the employer.'
  );
}

/* ==========================================================
   FINAL EMPLOYER REPORT
   ========================================================== */

function reportStyles() {
  return `
    <style>

      @page{
        size:A4 portrait;
        margin:0
      }

      .fs-wrap{
        max-width:210mm;
        margin:0 auto
      }

      .fs-actions{
        display:flex;
        justify-content:space-between;
        gap:10px;
        margin-bottom:16px
      }

      .fs-page{
        width:210mm;
        min-height:297mm;
        background:#fff;
        box-sizing:border-box;
        padding:10mm 11mm 8mm;
        margin:0 auto 24px;
        box-shadow:
          0 8px 30px rgba(0,0,0,.10);
        color:#1A2947;
        font-family:
          Aptos,
          Arial,
          sans-serif
      }

      .fs-top{
        display:flex;
        justify-content:space-between;
        align-items:flex-start
      }

      .fs-logo{
        width:44mm;
        max-height:25mm;
        object-fit:contain;
        object-position:left top
      }

      .fs-logo-fallback{
        display:none;
        font-weight:900;
        font-size:15px;
        line-height:1.05;
        color:#1A2947
      }

      .fs-logo-fallback span{
        color:#C9A84C
      }

      .fs-title{
        font-size:25px;
        line-height:1.05;
        margin:7mm 0 2mm;
        font-weight:800;
        color:#1A2947
      }

      .fs-meta{
        display:flex;
        gap:13px;
        font-size:7.8px;
        color:#7c8795;
        margin-bottom:4mm;
        flex-wrap:wrap
      }

      .fs-meta strong{
        color:#1A2947
      }

      .fs-hero{
        background:#1A2947;
        border-radius:14px;
        padding:6mm 7mm;
        display:flex;
        align-items:center;
        gap:7mm;
        color:#fff
      }

      .fs-stamp{
        width:27mm;
        height:27mm;
        border:
          2.2px solid #C9A84C;
        border-radius:50%;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
        color:#C9A84C;
        flex:0 0 auto
      }

      .fs-stamp .tick{
        font-size:14px;
        font-weight:900;
        line-height:1
      }

      .fs-stamp b{
        font-size:7.2px;
        letter-spacing:.1em;
        line-height:1.35;
        margin-top:1.5mm
      }

      .fs-stamp small{
        font-size:4.2px;
        color:#dce4ef;
        margin-top:1mm
      }

      .fs-hero .eyebrow{
        font-size:7px;
        color:#C9A84C;
        font-weight:800;
        letter-spacing:.08em
      }

      .fs-hero h2{
        font-size:18px;
        line-height:1.08;
        margin:2mm 0 1.5mm;
        color:#fff
      }

      .fs-hero p{
        font-size:7.4px;
        color:#d7deea;
        margin:0;
        line-height:1.45
      }

      .fs-kpis{
        display:grid;
        grid-template-columns:
          repeat(3,1fr);
        gap:3.5mm;
        margin:4mm 0 5mm
      }

      .fs-kpi{
        border-radius:10px;
        padding:4mm;
        background:#edf2f7
      }

      .fs-kpi.gold{
        background:#f7efd9
      }

      .fs-kpi strong{
        display:block;
        font-size:20px;
        color:#1A2947
      }

      .fs-kpi.gold strong{
        color:#997719
      }

      .fs-kpi b{
        display:block;
        font-size:7.5px;
        margin-top:1mm
      }

      .fs-kpi span{
        display:block;
        font-size:6.2px;
        color:#778291;
        margin-top:.7mm
      }

      .fs-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2mm
      }

      .fs-head h3{
        font-size:13px;
        margin:0
      }

      .fs-head span{
        font-size:6.2px;
        font-weight:800;
        color:#997719
      }

      .fs-checks{
        border:
          1px solid #dce2e9;
        border-radius:10px;
        padding:0 4mm
      }

      .fs-check{
        display:grid;
        grid-template-columns:
          7mm 1fr auto;
        gap:2.5mm;
        align-items:center;
        padding:2.6mm 0;
        border-bottom:
          1px solid #e5e9ee
      }

      .fs-check:last-child{
        border-bottom:0
      }

      .fs-icon{
        width:6mm;
        height:6mm;
        border-radius:50%;
        background:#f7efd9;
        color:#997719;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900
      }

      .fs-copy b{
        display:block;
        font-size:7.6px
      }

      .fs-copy p{
        font-size:6.2px;
        color:#727d8b;
        margin:.5mm 0 0;
        line-height:1.35
      }

      .fs-pill{
        border-radius:99px;
        padding:1.5mm 3mm;
        background:#f7efd9;
        color:#8c6b18;
        font-size:5.7px;
        font-weight:800;
        white-space:nowrap
      }

      .fs-bottom{
        display:grid;
        grid-template-columns:
          1.12fr .88fr;
        gap:4mm;
        margin-top:4mm
      }

      .fs-card{
        border:
          1px solid #dce2e9;
        border-radius:10px;
        padding:4mm;
        min-height:55mm
      }

      .fs-cardhead{
        display:flex;
        justify-content:space-between;
        margin-bottom:2.5mm
      }

      .fs-cardhead b{
        font-size:8.4px
      }

      .fs-cardhead span{
        font-size:5.8px;
        color:#6f7987;
        font-weight:700
      }

      .fs-weekdays,
      .fs-cal{
        display:grid;
        grid-template-columns:
          repeat(7,1fr);
        gap:1.4mm;
        text-align:center
      }

      .fs-weekdays div{
        font-size:5.2px;
        color:#8d949f
      }

      .fs-day{
        width:7mm;
        height:7mm;
        margin:0 auto;
        border-radius:4px;
        background:#f0f2f5;
        color:#aeb5bf;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:6.2px
      }

      .fs-day.selected{
        background:#1A2947;
        color:#fff
      }

      .fs-day.blank{
        visibility:hidden
      }

      .fs-legend{
        display:flex;
        gap:4mm;
        font-size:5.8px;
        color:#737d8a;
        margin-top:2.5mm
      }

      .fs-legend i{
        display:inline-block;
        width:2.8mm;
        height:2.8mm;
        border-radius:1px;
        margin-right:1mm
      }

      .fs-legend .yes{
        background:#1A2947
      }

      .fs-legend .no{
        background:#e6e9ed
      }

      .fs-cover-title{
        font-size:6.2px;
        font-weight:900;
        color:#997719;
        letter-spacing:.08em
      }

      .fs-row{
        display:flex;
        justify-content:space-between;
        gap:6mm;
        padding:2mm 0;
        border-bottom:
          1px solid #e8ebef;
        font-size:6.7px
      }

      .fs-row:last-of-type{
        border-bottom:0
      }

      .fs-row b{
        text-align:right
      }

      .fs-policy{
        font-size:5.8px;
        color:#7c8693;
        line-height:1.4;
        margin-top:2.5mm
      }

      .fs-divider{
        height:1px;
        background:#e2e6eb;
        margin:2.5mm 0
      }

      .fs-sign{
        display:grid;
        grid-template-columns:
          8mm 1fr;
        gap:3mm;
        margin-top:4mm;
        border-top:
          1px solid #dfe4ea;
        padding-top:3mm
      }

      .fs-signicon{
        width:7mm;
        height:7mm;
        border-radius:50%;
        background:#f7efd9;
        color:#997719;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900
      }

      .fs-sign b{
        font-size:7px
      }

      .fs-sign p{
        font-size:5.8px;
        color:#788290;
        margin:1mm 0;
        line-height:1.35
      }

      .fs-foot{
        font-size:5.2px;
        color:#9aa2ad;
        line-height:1.35
      }

      @media print{

        body{
          background:#fff!important
        }

        .sidebar,
        .topbar,
        .fs-actions,
        .toast{
          display:none!important
        }

        .main,
        .content{
          padding:0!important;
          margin:0!important
        }

        .fs-wrap{
          max-width:none
        }

        .fs-page{
          box-shadow:none;
          margin:0;
          width:210mm;
          min-height:297mm;
          page-break-after:avoid
        }
      }

    </style>
  `;
}

function monthCalendar(period) {
  const a =
    new Date(
      `${period.from}T00:00:00Z`
    );

  const year =
    a.getUTCFullYear();

  const month =
    a.getUTCMonth();

  const days =
    new Date(
      Date.UTC(
        year,
        month + 1,
        0
      )
    ).getUTCDate();

  const firstDow =
    new Date(
      Date.UTC(
        year,
        month,
        1
      )
    ).getUTCDay();

  const mondayIndex =
    (firstDow + 6) % 7;

  const from =
    Date.parse(
      `${period.from}T00:00:00Z`
    );

  const to =
    Date.parse(
      `${period.to}T00:00:00Z`
    );

  const cells =
    Array.from(
      {
        length:
          mondayIndex,
      },
      () =>
        '<div class="fs-day blank"></div>'
    );

  for (
    let d = 1;
    d <= days;
    d++
  ) {
    const iso =
      `${year}-${String(
        month + 1
      ).padStart(
        2,
        '0'
      )}-${String(
        d
      ).padStart(
        2,
        '0'
      )}`;

    const t =
      Date.parse(
        `${iso}T00:00:00Z`
      );

    cells.push(`
      <div
        class="fs-day ${
          t >= from &&
          t <= to
            ? 'selected'
            : ''
        }"
      >
        ${d}
      </div>
    `);
  }

  return `
    <div class="fs-weekdays">
      <div>MON</div>
      <div>TUE</div>
      <div>WED</div>
      <div>THU</div>
      <div>FRI</div>
      <div>SAT</div>
      <div>SUN</div>
    </div>

    <div class="fs-cal">
      ${cells.join('')}
    </div>
  `;
}

function employerSafeChecks(
  report,
  approved = true
) {
  const map =
    new Map(
      (report?.checks || [])
        .map(
          (c) => [
            c.key,
            c,
          ]
        )
    );

  const text = {
    repeated_frozen:
      'No unresolved repeated or frozen-screen concern remained after human review.',

    repetitive_cycling:
      'No unresolved repetitive screen-cycling pattern remained after human review.',

    activity_simulation:
      'No visible activity-simulation concern remained after human review.',

    prolonged_stagnation_10m:
      'No unexplained screen stagnation exceeding 10 minutes remained after human review.',

    repeated_across_days:
      'No unresolved replay-like repeated sequence across days remained after human review.',
  };

  return CHECK_KEYS.map(
    (key) => {
      const source =
        map.get(key);

      return {
        key,

        title:
          checkTitle(key),

        detail:
          approved
            ? text[key]
            : source
                ?.status ===
              'review'
              ? 'Pending final human resolution before employer approval.'
              : text[key],

        sourceStatus:
          source?.status ||
          'reviewed',
      };
    }
  );
}

function reportLogo() {
  return `
    <div>

      <img
        class="fs-logo"
        src="${WGM_LOGO_URL}"
        alt="White Glove Monitor"
        onerror="
          this.style.display='none';
          this.nextElementSibling.style.display='block'
        "
      >

      <div class="fs-logo-fallback">
        WHITE GLOVE
        <br>
        <span>
          MONITOR
        </span>
      </div>

    </div>
  `;
}

function reportMarkup(
  snapshot,
  preview = false
) {
  const employee =
    snapshot.employee || {
      name:
        snapshot.employeeName,

      employer:
        snapshot.employer,

      timezone:
        snapshot.timezone,
    };

  const report =
    snapshot.report ||
    state.report;

  const prepared =
    snapshot.prepared ||
    state.prepared;

  const period =
    snapshot.period ||
    state.period;

  const reviewerName =
    snapshot.reviewerName ||
    state.reviewerName;

  const humanChecked =
    Number(
      snapshot.humanChecked ??
      humanReviewedCount()
    );

  const screened =
    Number(
      report
        ?.screenedScreenshots ||
      0
    );

  const recordedHours =
    Number(
      prepared
        ?.metrics
        ?.trackedHours ||
      0
    );

  const approved =
    !preview &&
    /Approved|Released/i.test(
      snapshot.status ||
      ''
    );

  const checks =
    employerSafeChecks(
      report,
      approved
    );

  const unresolvedForDisplay =
    approved
      ? 0
      : unresolvedCurrentCount();

  const resultHeadline =
    approved
      ? 'No unresolved monitoring concerns'
      : 'Draft — human review not yet finalized';

  const resultSubtext =
    approved
      ? `White Glove Monitor completed AI-assisted screenshot screening and human review for ${periodLabel(period)}.`
      : 'This preview shows the employer-facing format. It is not visible to the employer until the reviewer approves it.';

  return `
    ${reportStyles()}

    <div class="fs-wrap">

      <div class="fs-actions">

        <button
          class="btn"
          data-page="${
            preview
              ? 'review'
              : state.role ===
                'employer'
                ? 'employerReports'
                : 'reports'
          }"
        >
          Back
        </button>

        <div
          style="
            display:flex;
            gap:8px;
            align-items:center
          "
        >

          <span
            class="status ${
              approved
                ? 'green'
                : 'amber'
            }"
          >
            <span class="dot"></span>
            ${
              approved
                ? 'Human Reviewed'
                : 'Preview'
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

      <section class="fs-page">

        <div class="fs-top">

          ${reportLogo()}

          ${
            preview
              ? `
                <div class="fs-pill">
                  INTERNAL PREVIEW
                </div>
              `
              : ''
          }

        </div>

        <div class="fs-title">
          Fraud screening &amp;
          activity review
        </div>

        <div class="fs-meta">

          <strong>
            ${esc(
              employee.name ||
              snapshot
                .employeeName ||
              ''
            )}
          </strong>

          <span>
            ${esc(
              employee.employer ||
              snapshot.employer ||
              ''
            )}
          </span>

          <span>
            ${esc(
              periodLabel(
                period
              )
            )}
          </span>

          <span>
            ${esc(
              employee.timezone ||
              snapshot.timezone ||
              prepared
                ?.timezone
                ?.label ||
              ''
            )}
          </span>

        </div>

        <div class="fs-hero">

          <div class="fs-stamp">

            <div class="tick">
              ✓
            </div>

            <b>
              ${
                approved
                  ? 'HUMAN<br>REVIEWED'
                  : 'REVIEW<br>PREVIEW'
              }
            </b>

            <small>
              WHITE GLOVE MONITOR
            </small>

          </div>

          <div>

            <div class="eyebrow">
              SCREENING RESULT
            </div>

            <h2>
              ${esc(
                resultHeadline
              )}
            </h2>

            <p>
              ${esc(
                resultSubtext
              )}
            </p>

          </div>

        </div>

        <div class="fs-kpis">

          <div class="fs-kpi gold">

            <strong>
              ${screened.toLocaleString()}
            </strong>

            <b>
              Screenshots screened
            </b>

            <span>
              AI-assisted visual review
            </span>

          </div>

          <div class="fs-kpi">

            <strong>
              ${humanChecked.toLocaleString()}
            </strong>

            <b>
              Human-checked screenshots
            </b>

            <span>
              Reviewed by White Glove Monitor
            </span>

          </div>

          <div class="fs-kpi">

            <strong>
              ${unresolvedForDisplay}
            </strong>

            <b>
              Unresolved findings
            </b>

            <span>
              ${
                approved
                  ? 'Following final human review'
                  : 'Internal preview only'
              }
            </span>

          </div>

        </div>

        <div class="fs-head">

          <h3>
            What we checked
          </h3>

          <span>
            5 SCREENING CHECKS
          </span>

        </div>

        <div class="fs-checks">

          ${checks
            .map(
              (c) => `
                <div class="fs-check">

                  <div class="fs-icon">
                    ✓
                  </div>

                  <div class="fs-copy">

                    <b>
                      ${esc(
                        c.title
                      )}
                    </b>

                    <p>
                      ${esc(
                        c.detail
                      )}
                    </p>

                  </div>

                  <div class="fs-pill">
                    REVIEWED
                  </div>

                </div>
              `
            )
            .join('')}

        </div>

        <div class="fs-bottom">

          <div class="fs-card">

            <div class="fs-cardhead">

              <b>
                Selected review period
              </b>

              <span>
                ${esc(
                  monthLabel(
                    period.from
                  ).toUpperCase()
                )}
              </span>

            </div>

            ${monthCalendar(period)}

            <div class="fs-legend">

              <span>
                <i class="yes"></i>
                Selected review period
              </span>

              <span>
                <i class="no"></i>
                Outside selected period
              </span>

            </div>

          </div>

          <div class="fs-card">

            <div class="fs-cover-title">
              REVIEW COVERAGE
            </div>

            <div class="fs-row">

              <span>
                Selected period
              </span>

              <b>
                ${esc(
                  periodLabel(
                    period
                  )
                )}
              </b>

            </div>

            <div class="fs-row">

              <span>
                Recorded time
              </span>

              <b>
                ${hoursLabel(
                  recordedHours
                )}
              </b>

            </div>

            <div class="fs-row">

              <span>
                Screenshots screened
              </span>

              <b>
                ${screened.toLocaleString()}
              </b>

            </div>

            <div class="fs-row">

              <span>
                Human-reviewed sample
              </span>

              <b>
                ${humanChecked.toLocaleString()}
              </b>

            </div>

            <div class="fs-policy">
              ${esc(
                workPolicyContext(
                  {
                    workPolicyType:
                      snapshot
                        .workPolicyType ||
                      employee
                        .workPolicyType,

                    workPolicyTarget:
                      snapshot
                        .workPolicyTarget ||
                      employee
                        .workPolicyTarget,
                  },

                  period,

                  prepared
                )
              )}
            </div>

          </div>

        </div>

        <div class="fs-sign">

          <div class="fs-signicon">
            ✓
          </div>

          <div>

            <b>
              ${
                approved
                  ? `Human review completed · ${esc(reviewerName)}`
                  : 'Human review preview'
              }
            </b>

            <p>
              ${
                approved
                  ? `Approved ${new Date(
                      snapshot.approvedAt ||
                      snapshot.releasedAt ||
                      Date.now()
                    ).toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    )}.`
                  : 'The final report is created when the reviewer approves the review.'
              }
            </p>

            <div class="fs-foot">
              This report reflects the monitoring
              evidence reviewed for the selected
              reporting period. Screening indicators
              identify items requiring review and
              should not independently be interpreted
              as findings of employee misconduct.
            </div>

          </div>

        </div>

      </section>

    </div>
  `;
}

function reportPreview() {
  const employee =
    employeeById(
      state.reportEmployeeId
    ) ||
    currentEmployee();

  if (
    !employee ||
    !state.report ||
    !state.prepared
  ) {
    return shell(
      `
        <div class="card empty">
          No report draft is available.
        </div>
      `,
      'Report Preview'
    );
  }

  return shell(
    reportMarkup(
      {
        employee,

        report:
          state.report,

        prepared:
          state.prepared,

        period:
          state.period,

        reviewerName:
          state.reviewerName,

        humanChecked:
          humanReviewedCount(),

        status:
          'Preview',

        workPolicyType:
          employee
            .workPolicyType,

        workPolicyTarget:
          employee
            .workPolicyTarget,
      },

      true
    ),

    'Employer Report Preview'
  );
}

function approvedReportView() {
  const snapshot =
    state.approvedReports.find(
      (r) =>
        r.id ===
        state.selectedReportId
    );

  if (!snapshot) {
    return shell(
      `
        <div class="card empty">
          Approved report not found.
        </div>
      `,
      'Approved Report'
    );
  }

  return shell(
    reportMarkup(
      snapshot,
      false
    ),
    'Approved Report'
  );
}

function approvedTable(reports) {
  const sorted =
    [...reports].sort(
      (a, b) =>
        String(
          b.approvedAt ||
          b.releasedAt ||
          ''
        ).localeCompare(
          String(
            a.approvedAt ||
            a.releasedAt ||
            ''
          )
        )
    );

  return `
    <table>

      <thead>
        <tr>
          <th>Employee</th>
          <th>Employer</th>
          <th>Period</th>
          <th>Version</th>
          <th>Approved</th>
          <th></th>
        </tr>
      </thead>

      <tbody>

        ${sorted
          .map(
            (r) => `
              <tr>

                <td>
                  ${esc(
                    r.employeeName
                  )}
                </td>

                <td>
                  ${esc(
                    r.employer ||
                    ''
                  )}
                </td>

                <td>
                  ${esc(
                    periodLabel(
                      r.period
                    )
                  )}
                </td>

                <td>
                  v${r.version || 1}
                </td>

                <td>
                  ${new Date(
                    r.approvedAt ||
                    r.releasedAt ||
                    Date.now()
                  ).toLocaleString()}
                </td>

                <td>
                  <button
                    class="btn"
                    data-view-report="${esc(
                      r.id
                    )}"
                  >
                    View Report
                  </button>
                </td>

              </tr>
            `
          )
          .join('')}

      </tbody>

    </table>
  `;
}

function employerReportsPage() {
  const employee =
    employeeById(
      state.selectedEmployeeId
    );

  if (!employee) {
    return shell(
      `
        <div class="card empty">
          Employee not found.
        </div>
      `,
      'Employee Reports'
    );
  }

  const reports =
    approvedReportsForEmployee(
      employee.id
    );

  if (!reports.length) {
    return shell(
      `
        <div class="card empty">
          No approved reports are available
          for this employee.
        </div>
      `,
      'Employee Reports'
    );
  }

  const years =
    [...new Set(
      reports.map(
        (r) =>
          new Date(
            `${r.period.from}T00:00:00Z`
          ).getUTCFullYear()
      )
    )].sort(
      (a, b) =>
        b - a
    );

  const currentYear =
    Number(
      state.selectedReportYear ||
      years[0]
    );

  const monthsForYear =
    [...new Set(
      reports
        .filter(
          (r) =>
            new Date(
              `${r.period.from}T00:00:00Z`
            ).getUTCFullYear() ===
            currentYear
        )
        .map(
          (r) =>
            new Date(
              `${r.period.from}T00:00:00Z`
            ).getUTCMonth() + 1
        )
    )].sort(
      (a, b) =>
        b - a
    );

  const currentMonth =
    Number(
      state.selectedReportMonth ||
      monthsForYear[0]
    );

  return shell(`
    <div class="header-row">

      <div>

        <h2>
          ${esc(employee.name)}
          Reports
        </h2>

        <p>
          Select the month and year
          you want to view.
        </p>

      </div>

    </div>

    <div class="card panel">

      <div class="toolbar">

        <div class="field">

          <label>
            Month
          </label>

          <select
            id="reportMonth"
            class="map-input"
          >

            ${monthsForYear
              .map(
                (m) => `
                  <option
                    value="${m}"
                    ${
                      m ===
                      currentMonth
                        ? 'selected'
                        : ''
                    }
                  >
                    ${new Date(
                      Date.UTC(
                        2026,
                        m - 1,
                        1
                      )
                    ).toLocaleDateString(
                      'en-US',
                      {
                        month:
                          'long',

                        timeZone:
                          'UTC',
                      }
                    )}
                  </option>
                `
              )
              .join('')}

          </select>

        </div>

        <div class="field">

          <label>
            Year
          </label>

          <select
            id="reportYear"
            class="map-input"
          >

            ${years
              .map(
                (y) => `
                  <option
                    value="${y}"
                    ${
                      y ===
                      currentYear
                        ? 'selected'
                        : ''
                    }
                  >
                    ${y}
                  </option>
                `
              )
              .join('')}

          </select>

        </div>

        <div class="spacer"></div>

        <button
          class="btn gold"
          id="viewSelectedReport"
        >
          View Report
        </button>

      </div>

    </div>
  `, 'Employee Reports');
}

function viewSelectedEmployerReport() {
  const employee =
    employeeById(
      state.selectedEmployeeId
    );

  const year =
    Number(
      document.getElementById(
        'reportYear'
      )?.value ||
      state.selectedReportYear
    );

  const month =
    Number(
      document.getElementById(
        'reportMonth'
      )?.value ||
      state.selectedReportMonth
    );

  state.selectedReportYear =
    String(year);

  state.selectedReportMonth =
    String(month);

  const match =
    approvedReportsForEmployee(
      employee?.id
    ).find(
      (r) => {
        const d =
          new Date(
            `${r.period.from}T00:00:00Z`
          );

        return (
          d.getUTCFullYear() ===
            year &&
          d.getUTCMonth() + 1 ===
            month
        );
      }
    );

  if (!match) {
    toast(
      'No approved report exists for that month and year.'
    );
    return;
  }

  openApprovedReport(
    match.id
  );
}

function openEmployerReports(
  employeeId
) {
  const e =
    employeeById(
      employeeId
    );

  if (
    state.role === 'employer' &&
    e?.employer !==
      state.portalEmployer
  ) {
    toast(
      'Employee is outside this employer portal.'
    );
    return;
  }

  state.selectedEmployeeId =
    employeeId;

  state.selectedReportMonth =
    '';

  state.selectedReportYear =
    '';

  state.page =
    'employerReports';

  render();
}

function openApprovedReport(id) {
  state.selectedReportId =
    id;

  state.notifications
    .forEach(
      (n) => {
        if (
          n.reportId === id
        ) {
          n.read = true;
        }
      }
    );

  saveNotifications();

  state.page =
    'approvedReport';

  render();
}

/* ==========================================================
   DATA SOURCES / SETTINGS
   ========================================================== */

function dataSourcesPage() {
  return shell(`
    <div class="header-row">

      <div>

        <h2>
          Data Sources
        </h2>

        <p>
          All configured Scrin connections.
          Dedicated connections can contain
          an employer/account owner plus
          one or more monitored VAs.
        </p>

      </div>

      <button
        class="btn"
        id="refreshConnections"
      >
        Refresh
      </button>

    </div>

    <div class="card panel">

      <table>

        <thead>
          <tr>
            <th>Connection</th>
            <th>Type</th>
            <th>Employer</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          ${state.connections
            .map(
              (c) => `
                <tr>

                  <td>
                    ${esc(
                      c.name ||
                      c.id
                    )}
                  </td>

                  <td>
                    ${
                      c.type ===
                      'dedicated'
                        ? 'Dedicated'
                        : 'Shared'
                    }
                  </td>

                  <td>
                    ${esc(
                      c.employer ||
                      'Mixed / mapped in WGM'
                    )}
                  </td>

                  <td>
                    <span
                      class="status ${statusClass(
                        c.status ||
                        'configured'
                      )}"
                    >
                      <span class="dot"></span>
                      ${esc(
                        c.status ||
                        'configured'
                      )}
                    </span>
                  </td>

                </tr>
              `
            )
            .join('')}

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
  `, 'Data Sources');
}

function timezoneSelect(employee) {
  const options = [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Africa/Lagos',
  ];

  const current =
    String(
      employee.timezone ||
      ''
    );

  const all =
    current &&
    !options.includes(current)
      ? [
          current,
          ...options,
        ]
      : options;

  return `
    <select
      class="map-input"
      data-map-timezone="${esc(
        employee.id
      )}"
    >

      <option value="">
        Select timezone…
      </option>

      ${all
        .map(
          (tz) => `
            <option
              value="${esc(tz)}"
              ${
                tz ===
                current
                  ? 'selected'
                  : ''
              }
            >
              ${esc(tz)}
            </option>
          `
        )
        .join('')}

    </select>
  `;
}

function policySelect(employee) {
  const type =
    employee.workPolicyType ||
    'on_demand';

  return `
    <select
      class="map-input"
      data-map-policy="${esc(
        employee.id
      )}"
    >

      <option
        value="fixed_schedule"
        ${
          type ===
          'fixed_schedule'
            ? 'selected'
            : ''
        }
      >
        Fixed schedule
      </option>

      <option
        value="flexible_daily"
        ${
          type ===
          'flexible_daily'
            ? 'selected'
            : ''
        }
      >
        Flexible daily hours
      </option>

      <option
        value="weekly_target"
        ${
          type ===
          'weekly_target'
            ? 'selected'
            : ''
        }
      >
        Weekly hours target
      </option>

      <option
        value="monthly_target"
        ${
          type ===
          'monthly_target'
            ? 'selected'
            : ''
        }
      >
        Monthly hours target
      </option>

      <option
        value="on_demand"
        ${
          type ===
          'on_demand'
            ? 'selected'
            : ''
        }
      >
        On-demand
      </option>

    </select>
  `;
}

function settingsPage() {
  return shell(`
    <div class="header-row">

      <div>

        <h2>
          Settings
        </h2>

        <p>
          Classify each Scrin identity,
          set the reporting timezone,
          and configure the work-policy
          context used by WGM.
        </p>

      </div>

    </div>

    <div class="grid two-col">

      <div class="card panel">

        <div class="panel-title">
          Scrin API v2
        </div>

        <button
          class="btn primary"
          id="syncScrin"
        >
          Sync connections
        </button>

        <button
          class="btn"
          id="testScrin"
        >
          Test
        </button>

        <div
          class="small"
          style="margin-top:10px"
        >
          ${esc(
            state.syncMessage
          )}
        </div>

      </div>

      <div class="card panel">

        <div class="panel-title">
          Screening Engine
        </div>

        <p class="small">
          Selected-period screenshot
          screening + human review +
          context resolution.
        </p>

        <span class="status green">
          <span class="dot"></span>
          V2.2
        </span>

      </div>

    </div>

    <div
      class="card panel"
      style="
        margin-top:16px;
        overflow-x:auto
      "
    >

      <table>

        <thead>
          <tr>
            <th>Scrin identity</th>
            <th>Employer</th>
            <th>Reporting timezone</th>
            <th>Monitor</th>
            <th>Work policy</th>
            <th>Target hours</th>
          </tr>
        </thead>

        <tbody>

          ${state.employees
            .map(
              (e) => `
                <tr>

                  <td>

                    <b>
                      ${esc(e.name)}
                    </b>

                    <div class="small">
                      ${esc(
                        e.connectionName ||
                        ''
                      )}
                    </div>

                  </td>

                  <td>
                    ${
                      e.employerLocked
                        ? `
                          <input
                            class="map-input"
                            value="${esc(
                              e.connectionEmployer ||
                              e.employer ||
                              ''
                            )}"
                            disabled
                          >
                        `
                        : `
                          <input
                            class="map-input"
                            data-map-employer="${esc(
                              e.id
                            )}"
                            value="${esc(
                              e.employer ||
                              ''
                            )}"
                          >
                        `
                    }
                  </td>

                  <td>
                    ${timezoneSelect(e)}
                  </td>

                  <td>

                    <label class="small">

                      <input
                        type="checkbox"
                        data-map-monitored="${esc(
                          e.id
                        )}"
                        ${
                          e.excluded
                            ? ''
                            : 'checked'
                        }
                      >

                      Monitored employee

                    </label>

                    <div class="small">
                      Uncheck for employer/account owner.
                    </div>

                  </td>

                  <td>
                    ${policySelect(e)}
                  </td>

                  <td>

                    <input
                      class="map-input"
                      data-map-target="${esc(
                        e.id
                      )}"
                      type="number"
                      min="0"
                      step="0.5"
                      value="${Number(
                        e.workPolicyTarget ||
                        0
                      )}"
                      placeholder="0"
                    >

                  </td>

                </tr>
              `
            )
            .join('')}

        </tbody>

      </table>

      <div
        class="small"
        style="margin-top:10px"
      >
        For daily policies,
        target = hours/day.
        Weekly target = hours/week.
        Monthly target = hours/month.
        On-demand can remain 0.
      </div>

      <button
        class="btn gold"
        id="saveMappings"
        style="margin-top:16px"
      >
        Save employee settings
      </button>

    </div>
  `, 'Settings');
}

function saveMappings() {
  document
    .querySelectorAll(
      '[data-map-employer]'
    )
    .forEach(
      (input) => {
        const e =
          employeeById(
            input.dataset
              .mapEmployer
          );

        if (
          e &&
          !e.employerLocked
        ) {
          e.employer =
            input.value.trim();
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-timezone]'
    )
    .forEach(
      (input) => {
        const e =
          employeeById(
            input.dataset
              .mapTimezone
          );

        if (e) {
          e.timezone =
            input.value.trim();
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-monitored]'
    )
    .forEach(
      (input) => {
        const e =
          employeeById(
            input.dataset
              .mapMonitored
          );

        if (e) {
          e.excluded =
            !input.checked;
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-policy]'
    )
    .forEach(
      (input) => {
        const e =
          employeeById(
            input.dataset
              .mapPolicy
          );

        if (e) {
          e.workPolicyType =
            input.value;
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-target]'
    )
    .forEach(
      (input) => {
        const e =
          employeeById(
            input.dataset
              .mapTarget
          );

        if (e) {
          e.workPolicyTarget =
            Math.max(
              0,
              Number(
                input.value ||
                0
              )
            );
        }
      }
    );

  state.employees.forEach(
    (e) => {
      if (
        e.employerLocked
      ) {
        e.employer =
          e.connectionEmployer ||
          e.employer;
      }
    }
  );

  saveEmployees();

  const invalid =
    activeEmployees().filter(
      (e) =>
        !String(
          e.employer ||
          ''
        ).trim() ||
        !String(
          e.timezone ||
          ''
        ).trim()
    );

  ensureEmployerSelection();

  toast(
    invalid.length
      ? `${invalid.length} monitored employee(s) still need an employer or timezone.`
      : 'Employee monitoring, timezone and work-policy settings saved.'
  );
}

function mergeEmployee(
  incoming,
  prior
) {
  const old =
    prior.find(
      (e) =>
        String(e.id) ===
        String(incoming.id)
    ) || {};

  const dedicatedEmployer =
    incoming.employerLocked
      ? (
          incoming
            .connectionEmployer ||
          incoming.employer ||
          ''
        )
      : null;

  return {
    ...incoming,
    ...old,

    // Preserve fresh provider identity
    // fields while retaining
    // WGM-owned configuration.

    id:
      incoming.id ||
      old.id ||
      `${incoming.connectionId || 'scrin'}::${incoming.employmentId}`,

    connectionId:
      incoming
        .connectionId,

    connectionName:
      incoming
        .connectionName,

    connectionType:
      incoming
        .connectionType,

    connectionEmployer:
      incoming
        .connectionEmployer,

    employerLocked:
      Boolean(
        incoming
          .employerLocked
      ),

    employmentId:
      incoming
        .employmentId,

    name:
      incoming.name,

    email:
      incoming.email,

    scrinCompany:
      incoming
        .scrinCompany,

    scrinCompanyId:
      incoming
        .scrinCompanyId,

    initials:
      initials(
        incoming.name
      ),

    employer:
      dedicatedEmployer !==
      null
        ? dedicatedEmployer
        : (
            old.employer ||
            incoming.employer ||
            ''
          ),

    excluded:
      Boolean(
        old.excluded
      ),

    timezone:
      old.timezone ||
      incoming
        .scrinTimezone ||
      incoming.timezone ||
      '',

    timezoneOffsetMinutes:
      Number(
        old.timezoneOffsetMinutes ??
        incoming
          .timezoneOffsetMinutes ??
        0
      ),

    workPolicyType:
      old.workPolicyType ||
      'on_demand',

    workPolicyTarget:
      Number(
        old.workPolicyTarget ??
        0
      ),

    shots:
      old.shots ||
      [],

    daySummary:
      old.daySummary ||
      null,

    lastAnalytics:
      old.lastAnalytics ||
      null,

    reportingStatus:
      old.reportingStatus ||
      incoming
        .reportingStatus ||
      'Synced',
  };
}

async function syncScrin() {
  state.syncMessage =
    'Syncing all Scrin connections…';

  render();

  try {
    const data =
      await fetchJson(
        '/api/scrin/all-common',
        {
          method: 'POST',
        }
      );

    const prior = [
      ...state.employees,
    ];

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
      ).map(
        (e) =>
          mergeEmployee(
            e,
            prior
          )
      );

    if (
      !state.employees.length
    ) {
      throw new Error(
        'No employment records returned from Scrin.'
      );
    }

    if (
      !state.employees.some(
        (e) =>
          String(e.id) ===
          String(
            state.selectedEmployeeId
          )
      )
    ) {
      state.selectedEmployeeId =
        activeEmployees()[0]
          ?.id ||
        state.employees[0]
          .id;
    }

    saveEmployees();
    saveConnections();

    state.mode =
      data.demo
        ? 'DEMO'
        : 'LIVE';

    state.syncMessage =
      `${state.employees.length} Scrin identity record(s) loaded from ${state.connections.length} connection(s). Use Settings to uncheck employer/account-owner identities.`;

  } catch (error) {
    state.syncMessage =
      `Sync failed: ${error.message}`;
  }

  render();
}

async function refreshConnections() {
  try {
    const data =
      await fetchJson(
        '/api/scrin/connections'
      );

    state.connections =
      Array.isArray(
        data.connections
      )
        ? data.connections
        : [];

    saveConnections();

    toast(
      `${state.connections.length} connection(s) configured.`
    );

  } catch (error) {
    toast(
      `Could not refresh: ${error.message}`
    );
  }
}

async function testScrin() {
  try {
    const data =
      await fetchJson(
        '/api/scrin/all-common',
        {
          method: 'POST',
        }
      );

    state.mode =
      data.demo
        ? 'DEMO'
        : 'LIVE';

    toast(
      `${data.employees?.length || 0} Scrin identity record(s) available across ${data.connections?.length || 0} connection(s).`
    );

  } catch (error) {
    toast(
      `Connection test failed: ${error.message}`
    );
  }
}

/* ==========================================================
   RENDER / EVENTS
   ========================================================== */

function render() {
  let output = '';

  if (
    state.page === 'dashboard'
  ) {
    output =
      dashboard();

  } else if (
    state.page === 'employees'
  ) {
    output =
      employeesPage();

  } else if (
    state.page === 'monitoring'
  ) {
    output =
      monitoringPage();

  } else if (
    state.page === 'reports'
  ) {
    output =
      reportsPage();

  } else if (
    state.page === 'review'
  ) {
    output =
      reviewPage();

  } else if (
    state.page === 'context'
  ) {
    output =
      contextPage();

  } else if (
    state.page === 'dataSources'
  ) {
    output =
      dataSourcesPage();

  } else if (
    state.page === 'settings'
  ) {
    output =
      settingsPage();

  } else if (
    state.page ===
    'reportPreview'
  ) {
    output =
      reportPreview();

  } else if (
    state.page ===
    'approvedReport'
  ) {
    output =
      approvedReportView();

  } else if (
    state.page ===
    'employerReports'
  ) {
    output =
      employerReportsPage();
  }

  document
    .getElementById(
      'app'
    )
    .innerHTML =
      output;

  bind();
}

function bind() {
  document
    .querySelectorAll(
      '[data-page]'
    )
    .forEach(
      (button) => {
        button.onclick =
          () => {
            state.page =
              button.dataset
                .page;

            render();
          };
      }
    );

  document
    .querySelectorAll(
      '[data-open-id]'
    )
    .forEach(
      (button) => {
        button.onclick =
          () => {
            state.selectedEmployeeId =
              button.dataset
                .openId;

            state.page =
              'monitoring';

            state.tab =
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
      (button) => {
        button.onclick =
          () => {
            state.tab =
              button.dataset
                .tab;

            render();
          };
      }
    );

  document
    .querySelectorAll(
      '[data-view-report]'
    )
    .forEach(
      (button) => {
        button.onclick =
          () =>
            openApprovedReport(
              button.dataset
                .viewReport
            );
      }
    );

  document
    .querySelectorAll(
      '[data-employer-reports]'
    )
    .forEach(
      (button) => {
        button.onclick =
          () =>
            openEmployerReports(
              button.dataset
                .employerReports
            );
      }
    );

  document
    .querySelectorAll(
      '[data-check]'
    )
    .forEach(
      (checkbox) => {
        checkbox.onchange =
          () => {
            state.reviewerChecks[
              Number(
                checkbox.dataset
                  .check
              )
            ] =
              checkbox.checked;
          };
      }
    );

  document
    .querySelectorAll(
      '[data-sample-decision]'
    )
    .forEach(
      (input) => {
        input.onchange =
          () => {
            const id =
              String(
                input.dataset
                  .sampleDecision
              );

            state.humanDispositions[
              id
            ] = {
              ...(
                state.humanDispositions[
                  id
                ] ||
                {}
              ),

              decision:
                input.value,
            };

            render();
          };
      }
    );

  document
    .querySelectorAll(
      '[data-sample-context]'
    )
    .forEach(
      (textarea) => {
        textarea.oninput =
          () => {
            const id =
              String(
                textarea.dataset
                  .sampleContext
              );

            state.humanDispositions[
              id
            ] = {
              ...(
                state.humanDispositions[
                  id
                ] ||
                {
                  decision:
                    'needs_context',
                }
              ),

              context:
                textarea.value,
            };
          };
      }
    );

  document
    .querySelectorAll(
      '[data-finding-decision]'
    )
    .forEach(
      (input) => {
        input.onchange =
          () => {
            const i =
              Number(
                input.dataset
                  .findingDecision
              );

            state.findingDispositions[
              i
            ] = {
              ...(
                state.findingDispositions[
                  i
                ] ||
                {}
              ),

              decision:
                input.value,
            };

            render();
          };
      }
    );

  document
    .querySelectorAll(
      '[data-finding-context]'
    )
    .forEach(
      (textarea) => {
        textarea.oninput =
          () => {
            const i =
              Number(
                textarea.dataset
                  .findingContext
              );

            state.findingDispositions[
              i
            ] = {
              ...(
                state.findingDispositions[
                  i
                ] ||
                {
                  decision:
                    'needs_context',
                }
              ),

              context:
                textarea.value,
            };
          };
      }
    );

  document
    .querySelectorAll(
      '[data-resolve-context]'
    )
    .forEach(
      (button) => {
        button.onclick =
          () =>
            resolveContextRequest(
              button.dataset
                .resolveContext
            );
      }
    );

  document
    .querySelectorAll(
      '[data-submit-context]'
    )
    .forEach(
      (button) => {
        button.onclick =
          () =>
            submitContextRequest(
              button.dataset
                .submitContext
            );
      }
    );

  const roleSwitcher =
    document.getElementById(
      'roleSwitcher'
    );

  if (roleSwitcher) {
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

  if (employerSwitcher) {
    employerSwitcher.onchange =
      () => {
        state.portalEmployer =
          employerSwitcher.value;

        localStorage.setItem(
          'wgmPortalEmployer',
          state.portalEmployer
        );

        state.selectedEmployeeId =
          portalEmployees()[0]
            ?.id ||
          '';

        render();
      };
  }

  const sync =
    document.getElementById(
      'syncScrin'
    );

  if (sync) {
    sync.onclick =
      syncScrin;
  }

  const test =
    document.getElementById(
      'testScrin'
    );

  if (test) {
    test.onclick =
      testScrin;
  }

  const refresh =
    document.getElementById(
      'refreshConnections'
    );

  if (refresh) {
    refresh.onclick =
      refreshConnections;
  }

  const save =
    document.getElementById(
      'saveMappings'
    );

  if (save) {
    save.onclick =
      saveMappings;
  }

  const loadDay =
    document.getElementById(
      'loadLiveDay'
    );

  if (loadDay) {
    loadDay.onclick =
      loadLiveDay;
  }

  const generate =
    document.getElementById(
      'generateBtn'
    );

  if (generate) {
    generate.onclick =
      generateReport;
  }

  const reviewerName =
    document.getElementById(
      'reviewerName'
    );

  if (reviewerName) {
    reviewerName.oninput =
      () => {
        state.reviewerName =
          reviewerName.value;

        localStorage.setItem(
          'wgmReviewerName',
          state.reviewerName
        );
      };
  }

  const preview =
    document.getElementById(
      'previewReport'
    );

  if (preview) {
    preview.onclick =
      () => {
        state.page =
          'reportPreview';

        render();
      };
  }

  const sendContext =
    document.getElementById(
      'sendContextRequests'
    );

  if (sendContext) {
    sendContext.onclick =
      createContextRequests;
  }

  const approve =
    document.getElementById(
      'approveBtn'
    );

  if (approve) {
    approve.onclick =
      approveHumanReview;
  }

  const print =
    document.getElementById(
      'printReport'
    );

  if (print) {
    print.onclick =
      () =>
        window.print();
  }

  const viewSelected =
    document.getElementById(
      'viewSelectedReport'
    );

  if (viewSelected) {
    viewSelected.onclick =
      viewSelectedEmployerReport;
  }

  const reportYear =
    document.getElementById(
      'reportYear'
    );

  if (reportYear) {
    reportYear.onchange =
      () => {
        state.selectedReportYear =
          reportYear.value;

        state.selectedReportMonth =
          '';

        render();
      };
  }
}

async function initializeApp() {
  try {
    const health =
      await fetchJson(
        '/api/health'
      );

    state.mode =
      health.mode === 'live'
        ? 'LIVE'
        : 'DEMO';

    if (
      state.mode === 'LIVE'
    ) {
      state.syncMessage =
        `Live Scrin detected. ${health.connectionCount ?? '—'} connection(s). ${health.analysisVersion || ''}`;
    }

  } catch (error) {
    state.syncMessage =
      `Worker health check failed: ${error.message}`;
  }

  try {
    const data =
      await fetchJson(
        '/api/scrin/connections'
      );

    if (
      Array.isArray(
        data.connections
      )
    ) {
      state.connections =
        data.connections;

      saveConnections();
    }

  } catch {}

  if (
    state.role === 'employer'
  ) {
    ensureEmployerSelection();
  }

  render();
}

initializeApp();
