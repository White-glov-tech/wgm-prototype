/* ==========================================================
   WHITE GLOVE MONITOR — PROTOTYPE V1.9
   FULL-MONTH SCREENSHOT SCREENING + HUMAN REVIEW
   ========================================================== */

const WGM_LOGO_DATA = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 180">
  <rect width="270" height="180" fill="white"/>
  <path d="M45 72 C73 13 167 8 214 63" fill="none" stroke="#1A2947" stroke-width="12" stroke-linecap="round"/>
  <path d="M55 118 C88 169 174 171 213 118" fill="none" stroke="#C9A84C" stroke-width="12" stroke-linecap="round"/>
  <text x="135" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="#1A2947">WHITE GLOVE</text>
  <text x="135" y="114" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#C9A84C">MONITOR</text>
  <text x="135" y="137" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1.4" fill="#1A2947">WORKFORCE INTELLIGENCE | PEACE OF MIND</text>
</svg>`);

const state = {
  page: 'dashboard',
  tab: 'overview',
  mode: 'DEMO',
  employees: [],
  connections: [],
  selectedEmployeeId: '',
  role: localStorage.getItem('wgmRole') || 'owner',
  portalEmployer: localStorage.getItem('wgmPortalEmployer') || '',
  period: { from: '2026-09-01', to: '2026-09-30' },

  reportStatus: 'Not generated',
  reportEmployeeId: '',
  prepared: null,
  batchResults: [],
  report: null,
  meta: null,
  scanProgress: {
    phase: '',
    processed: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0,
  },

  reviewerChecks: [true, true, true, true, true],
  reviewerName: localStorage.getItem('wgmReviewerName') || 'White Glove Reviewer',
  humanDispositions: {},
  findingDispositions: {},

  released: [],
  notifications: [],
  selectedReleaseId: '',
  syncMessage: 'Demo data loaded. Connect Scrin to load live employees.',
  toast: null,
};

const demoEmployees = [
  {
    id: 'demo-main::477279',
    connectionId: 'demo-main',
    connectionName: 'Demo Scrin Connection',
    employmentId: '477279',
    name: 'Sample team member',
    initials: 'ST',
    employer: 'Sample employer',
    role: 'Virtual Assistant',
    timezone: 'America/Los_Angeles',
    timezoneOffsetMinutes: -420,
    expectedHours: 160,
    excluded: false,
    reportingStatus: 'Ready',
    shots: [],
    daySummary: null,
    lastAnalytics: null,
  },
];

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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

state.employees = loadJson('wgmEmployees', demoEmployees);
state.connections = loadJson('wgmConnections', []);
state.released = loadJson('wgmFraudReleasedReports', []);
state.notifications = loadJson('wgmFraudNotifications', []);
state.selectedEmployeeId = state.employees[0]?.id || '';

const saveEmployees = () => saveJson('wgmEmployees', state.employees);
const saveConnections = () => saveJson('wgmConnections', state.connections);
const saveReleased = () => saveJson('wgmFraudReleasedReports', state.released);
const saveNotifications = () => saveJson('wgmFraudNotifications', state.notifications);

/* ==========================================================
   HELPERS
   ========================================================== */

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'VA';
}

function hoursLabel(decimal = 0) {
  const minutes = Math.max(0, Math.round(Number(decimal || 0) * 60));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function monthLabel(date) {
  if (!date) return 'Reporting period';

  return new Date(`${date}T00:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function statusClass(status = '') {
  if (/Released|Approved|Ready|Connected|Clear|Green|Complete|Active/i.test(status)) return 'green';
  if (/Review|Pending|Draft|Yellow|Queued|Configured|Scanning/i.test(status)) return 'amber';
  if (/Failed|Error|Red|Incomplete/i.test(status)) return 'red';
  return 'blue';
}

function toast(message) {
  state.toast = message;
  render();

  setTimeout(() => {
    state.toast = null;
    render();
  }, 2400);
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
  return state.employees.filter((employee) => !employee.excluded);
}

function employeeById(id) {
  return state.employees.find(
    (employee) => String(employee.id) === String(id)
  );
}

function mappedEmployers() {
  return [
    ...new Set(
      activeEmployees()
        .map((employee) => employee.employer)
        .filter(Boolean)
    ),
  ];
}

function employeeTimezone(employee) {
  const value = String(employee?.timezone || '').trim();
  return value || 'Employee timezone';
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

  const team = activeEmployees().filter(
    (employee) => employee.employer === state.portalEmployer
  );

  if (
    team.length &&
    !team.some(
      (employee) =>
        String(employee.id) ===
        String(state.selectedEmployeeId)
    )
  ) {
    state.selectedEmployeeId = team[0].id;
  }
}

function portalEmployees() {
  ensureEmployerSelection();

  return activeEmployees().filter(
    (employee) =>
      employee.employer === state.portalEmployer
  );
}

function currentEmployee() {
  if (state.role === 'employer') {
    return (
      portalEmployees().find(
        (employee) =>
          String(employee.id) ===
          String(state.selectedEmployeeId)
      ) ||
      portalEmployees()[0] ||
      null
    );
  }

  if (state.role === 'employee') {
    return (
      employeeById(state.selectedEmployeeId) ||
      activeEmployees()[0] ||
      null
    );
  }

  return (
    employeeById(state.selectedEmployeeId) ||
    activeEmployees()[0] ||
    null
  );
}

function unreadNotifications(employer) {
  return state.notifications.filter(
    (notification) =>
      notification.employer === employer &&
      !notification.read
  ).length;
}

function employerReports(employer) {
  return state.released
    .filter(
      (report) =>
        report.employer === employer
    )
    .sort(
      (a, b) =>
        String(b.releasedAt).localeCompare(
          String(a.releasedAt)
        )
    );
}

function employeeReports(employeeId) {
  return state.released
    .filter(
      (report) =>
        String(report.employeeId) ===
        String(employeeId)
    )
    .sort(
      (a, b) =>
        String(b.releasedAt).localeCompare(
          String(a.releasedAt)
        )
    );
}

function nextVersion(employeeId, period) {
  return (
    state.released.filter(
      (report) =>
        String(report.employeeId) ===
          String(employeeId) &&
        report.period?.from === period.from &&
        report.period?.to === period.to
    ).length + 1
  );
}

function humanSample() {
  return state.prepared?.humanSample?.screenshots || [];
}

function humanSampleTarget() {
  return Number(
    state.prepared?.humanSample?.count ||
    humanSample().length ||
    0
  );
}

function humanReviewedCount() {
  const sampleIds = new Set(
    humanSample().map(
      (item) => String(item.screenshotId)
    )
  );

  return Object.entries(
    state.humanDispositions
  ).filter(
    ([id, disposition]) =>
      sampleIds.has(String(id)) &&
      ['clear', 'needs_context'].includes(
        disposition?.decision
      )
  ).length;
}

function humanReviewComplete() {
  return (
    humanReviewedCount() ===
    humanSampleTarget()
  );
}

function findingReviewComplete() {
  const findings =
    state.report?.findings || [];

  return findings.every((_, index) => {
    const disposition =
      state.findingDispositions[index];

    if (!disposition?.decision) {
      return false;
    }

    if (
      disposition.decision ===
        'needs_context' &&
      !String(
        disposition.context || ''
      ).trim()
    ) {
      return false;
    }

    return true;
  });
}

function unresolvedScreenshotIds() {
  const ids = new Set();

  for (
    const [id, disposition] of
    Object.entries(
      state.humanDispositions
    )
  ) {
    if (
      disposition?.decision ===
      'needs_context'
    ) {
      ids.add(String(id));
    }
  }

  const findings =
    state.report?.findings || [];

  findings.forEach(
    (finding, index) => {
      const disposition =
        state.findingDispositions[index];

      if (
        disposition?.decision !==
        'needs_context'
      ) {
        return;
      }

      const screenshotIds =
        Array.isArray(
          finding?.screenshotIds
        )
          ? finding.screenshotIds
          : [];

      if (screenshotIds.length) {
        screenshotIds.forEach(
          (id) => ids.add(String(id))
        );
      } else {
        ids.add(`finding_${index + 1}`);
      }
    }
  );

  return [...ids];
}

function unresolvedCount() {
  return unresolvedScreenshotIds().length;
}

function aiFlaggedCount() {
  return new Set(
    (
      state.report
        ?.aiFlaggedScreenshotIds ||
      []
    ).map(String)
  ).size;
}

function unresolvedCountFor(
  report,
  humanDispositions = {},
  findingDispositions = {}
) {
  const ids = new Set();

  for (
    const [id, disposition] of
    Object.entries(
      humanDispositions || {}
    )
  ) {
    if (
      disposition?.decision ===
      'needs_context'
    ) {
      ids.add(String(id));
    }
  }

  (report?.findings || []).forEach(
    (finding, index) => {
      const disposition =
        findingDispositions?.[index];

      if (
        disposition?.decision !==
        'needs_context'
      ) {
        return;
      }

      const screenshotIds =
        Array.isArray(
          finding?.screenshotIds
        )
          ? finding.screenshotIds
          : [];

      if (screenshotIds.length) {
        screenshotIds.forEach(
          (id) => ids.add(String(id))
        );
      } else {
        ids.add(`finding_${index + 1}`);
      }
    }
  );

  return ids.size;
}

function reportHeadlineFor(
  report,
  prepared,
  status,
  humanDispositions = {},
  findingDispositions = {}
) {
  const unresolved =
    unresolvedCountFor(
      report,
      humanDispositions,
      findingDispositions
    );

  const screened =
    Number(
      report?.screenedScreenshots || 0
    );

  const total =
    Number(
      report?.totalScreenshots ||
      prepared?.screenshotCount ||
      0
    );

  const missing =
    Math.max(
      0,
      total - screened
    );

  const aiFlags =
    new Set(
      (
        report?.aiFlaggedScreenshotIds ||
        []
      ).map(String)
    ).size;

  if (missing > 0) {
    return (
      `${missing} screenshot` +
      `${missing === 1 ? '' : 's'} ` +
      `still require screening.`
    );
  }

  if (
    /Approved|Released/.test(status)
  ) {
    if (unresolved > 0) {
      return (
        `${unresolved} questionable screenshot` +
        `${unresolved === 1 ? '' : 's'} ` +
        `${unresolved === 1 ? 'needs' : 'need'} context.`
      );
    }

    return 'No suspicious patterns found.';
  }

  if (unresolved > 0) {
    return (
      `${unresolved} questionable screenshot` +
      `${unresolved === 1 ? '' : 's'} ` +
      `currently ` +
      `${unresolved === 1 ? 'needs' : 'need'} context.`
    );
  }

  if (aiFlags > 0) {
    return (
      `${aiFlags} AI-flagged screenshot` +
      `${aiFlags === 1 ? '' : 's'} ` +
      `await human review.`
    );
  }

  if (
    report?.allScreenshotsScreened
  ) {
    return (
      'No suspicious patterns found by AI screening.'
    );
  }

  return 'Human review pending.';
}

function reportSubtextFor(
  report,
  prepared,
  status,
  humanDispositions = {},
  findingDispositions = {}
) {
  const total =
    Number(
      report?.totalScreenshots ||
      prepared?.screenshotCount ||
      0
    );

  const screened =
    Number(
      report?.screenedScreenshots || 0
    );

  const unresolved =
    unresolvedCountFor(
      report,
      humanDispositions,
      findingDispositions
    );

  if (
    !report?.allScreenshotsScreened
  ) {
    return (
      `AI successfully screened ` +
      `${screened.toLocaleString()} of ` +
      `${total.toLocaleString()} supplied screenshot images.`
    );
  }

  if (
    /Approved|Released/.test(status)
  ) {
    return unresolved
      ? 'Human review identified screenshots that require employer or employee context.'
      : 'In the screenshots screened and human-reviewed for this report.';
  }

  return (
    `AI screened all ` +
    `${total.toLocaleString()} supplied screenshot images. ` +
    `Human review is still required before release.`
  );
}

function reportHeadline(
  status = state.reportStatus
) {
  return reportHeadlineFor(
    state.report,
    state.prepared,
    status,
    state.humanDispositions,
    state.findingDispositions
  );
}

function reportSubtext(
  status = state.reportStatus
) {
  return reportSubtextFor(
    state.report,
    state.prepared,
    status,
    state.humanDispositions,
    state.findingDispositions
  );
}

/* ==========================================================
   ROLE / NAVIGATION
   ========================================================== */

function roleName() {
  return ({
    owner: 'WGM Owner',
    reviewer: 'White Glove Reviewer',
    employer: 'Employer Portal',
    employee: 'Employee Portal',
  })[state.role] || 'WGM Owner';
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
      class="${state.page === id ? 'active' : ''}"
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
  if (
    state.role === 'reviewer'
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
        'reports',
        'Reports'
      ),

      navButton(
        'monitoring',
        'Evidence Review'
      ),
    ].join('');
  }

  if (
    state.role === 'employer'
  ) {
    const unread =
      unreadNotifications(
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
        'reports',
        'Reports',
        unread
          ? String(unread)
          : ''
      ),

      navButton(
        'monitoring',
        'Monitoring'
      ),
    ].join('');
  }

  if (
    state.role === 'employee'
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
  const unread =
    state.role === 'employer'
      ? unreadNotifications(
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
                ${roleName()}
              </b>

              <div
                style="
                  font-size:11px;
                  opacity:.7
                "
              >
                ${
                  state.role === 'reviewer'
                    ? 'Human Review'
                    : 'Prototype V1.9'
                }
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
              unread
                ? `
                  <span class="status amber">
                    <span class="dot"></span>
                    ${unread} new
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
                ${state.role === 'owner' ? 'selected' : ''}
              >
                WGM Owner
              </option>

              <option
                value="reviewer"
                ${state.role === 'reviewer' ? 'selected' : ''}
              >
                White Glove Reviewer
              </option>

              <option
                value="employer"
                ${state.role === 'employer' ? 'selected' : ''}
              >
                Employer Portal
              </option>

              <option
                value="employee"
                ${state.role === 'employee' ? 'selected' : ''}
              >
                Employee Portal
              </option>

            </select>

            <div class="mode-pill">
              ${state.mode}
              MODE · V1.9 FULL-MONTH
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
  if (
    state.role === 'employer'
  ) {
    return employerDashboard();
  }

  if (
    state.role === 'reviewer'
  ) {
    return reviewerDashboard();
  }

  if (
    state.role === 'employee'
  ) {
    return employeeDashboard();
  }

  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            WGM Command Center
          </h2>

          <p>
            Scrin supplies monitoring evidence.
            WGM now screens the full month,
            creates a stable 30–66 screenshot human sample,
            requires human sign-off,
            and releases the fixed one-page report.
          </p>

        </div>

        <button
          class="btn primary"
          data-page="reports"
        >
          Generate screening report
        </button>

      </div>

      <div class="grid metrics">

        ${
          metric(
            'Connections',
            state.connections.length || 1,
            'Scrin sources'
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
            'Employees',
            activeEmployees().length,
            'Reportable'
          )
        }

        ${
          metric(
            'Released screenings',
            state.released.length,
            'Human reviewed'
          )
        }

      </div>

      <div class="card panel">

        <table>

          <thead>

            <tr>
              <th>Employee</th>
              <th>Employer</th>
              <th>Connection</th>
              <th>Latest report</th>
            </tr>

          </thead>

          <tbody>

            ${
              activeEmployees()
                .map(
                  (employee) => {
                    const latest =
                      employeeReports(
                        employee.id
                      )[0];

                    return `
                      <tr>

                        <td>
                          <span
                            class="row-link"
                            data-open-id="${esc(employee.id)}"
                          >
                            ${esc(employee.name)}
                          </span>
                        </td>

                        <td>
                          ${esc(employee.employer || 'Unassigned')}
                        </td>

                        <td>
                          ${esc(employee.connectionName || 'Scrin')}
                        </td>

                        <td>
                          ${
                            latest
                              ? `${esc(monthLabel(latest.period.from))} · v${latest.version}`
                              : '—'
                          }
                        </td>

                      </tr>
                    `;
                  }
                )
                .join('')
            }

          </tbody>

        </table>

      </div>
    `,
    'Dashboard'
  );
}

function employerDashboard() {
  const team =
    portalEmployees();

  const notices =
    state.notifications
      .filter(
        (notification) =>
          notification.employer ===
            state.portalEmployer &&
          !notification.read
      )
      .sort(
        (a, b) =>
          String(b.createdAt)
            .localeCompare(
              String(a.createdAt)
            )
      );

  const latestNotice =
    notices[0];

  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            ${esc(state.portalEmployer || 'Employer')}
            Overview
          </h2>

          <p>
            Only human-reviewed released reports
            appear here.
          </p>

        </div>

        <select
          id="employerSwitcher"
          class="map-input"
        >

          ${
            mappedEmployers()
              .map(
                (employer) => `
                  <option
                    value="${esc(employer)}"
                    ${
                      employer === state.portalEmployer
                        ? 'selected'
                        : ''
                    }
                  >
                    ${esc(employer)}
                  </option>
                `
              )
              .join('')
          }

        </select>

      </div>

      ${
        latestNotice
          ? `
            <div
              class="card panel"
              style="
                border-left:4px solid #C9A84C;
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
                    ${esc(latestNotice.title)}
                  </h3>

                  <p>
                    ${esc(latestNotice.message)}
                  </p>

                </div>

                <button
                  class="btn gold"
                  data-view-release="${esc(latestNotice.reportId)}"
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
            'Team members',
            team.length,
            'This employer'
          )
        }

        ${
          metric(
            'Released reports',
            employerReports(
              state.portalEmployer
            ).length,
            'Human reviewed'
          )
        }

        ${
          metric(
            'Unread reports',
            notices.length,
            'Notifications'
          )
        }

        ${
          metric(
            'Report type',
            'Fraud screening',
            'Screenshot activity review'
          )
        }

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

            ${
              team
                .map(
                  (employee) => {
                    const latest =
                      employeeReports(
                        employee.id
                      )[0];

                    return `
                      <tr>

                        <td>
                          ${esc(employee.name)}
                        </td>

                        <td>
                          ${
                            latest
                              ? `${esc(monthLabel(latest.period.from))} · v${latest.version}`
                              : 'No released report'
                          }
                        </td>

                        <td>

                          ${
                            latest
                              ? `
                                <span class="status green">
                                  <span class="dot"></span>
                                  Released
                                </span>
                              `
                              : '—'
                          }

                        </td>

                        <td>

                          ${
                            latest
                              ? `
                                <button
                                  class="btn"
                                  data-view-release="${esc(latest.id)}"
                                >
                                  View
                                </button>
                              `
                              : ''
                          }

                        </td>

                      </tr>
                    `;
                  }
                )
                .join('')
            }

          </tbody>

        </table>

      </div>
    `,
    'Employer Portal'
  );
}

function reviewerDashboard() {
  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            Reviewer Workspace
          </h2>

          <p>
            The HUMAN REVIEWED stamp is applied only
            after the full-month AI scan and the
            required human review are complete.
          </p>

        </div>

        <button
          class="btn primary"
          data-page="review"
        >
          Open review
        </button>

      </div>

      <div class="grid metrics">

        ${
          metric(
            'Employees',
            activeEmployees().length,
            'Authorized'
          )
        }

        ${
          metric(
            'Current status',
            esc(state.reportStatus),
            'Screening'
          )
        }

        ${
          metric(
            'Released',
            state.released.length,
            'Signed off'
          )
        }

        ${
          metric(
            'Reviewer',
            esc(state.reviewerName),
            'Sign-off name'
          )
        }

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
              Generate a screening report first.
            </div>
          `
      }
    `,
    'Reviewer Home'
  );
}

function employeeDashboard() {
  const employee =
    currentEmployee();

  const latest =
    employee
      ? employeeReports(employee.id)[0]
      : null;

  return shell(
    employee
      ? `
        <div class="header-row">

          <div>

            <h2>
              My Activity
            </h2>

            <p>
              ${esc(employee.name)}
              ·
              ${esc(employee.employer || '')}
            </p>

          </div>

        </div>

        <div class="grid metrics">

          ${
            metric(
              'Latest report',
              latest
                ? monthLabel(latest.period.from)
                : 'None',
              latest
                ? 'Released by White Glove'
                : 'No report'
            )
          }

          ${
            metric(
              'Connection',
              esc(employee.connectionName || 'Scrin'),
              'Monitoring source'
            )
          }

          ${
            metric(
              'Timezone',
              esc(employeeTimezone(employee)),
              'Report context'
            )
          }

          ${
            metric(
              'Report type',
              'Fraud screening',
              'Screenshot activity review'
            )
          }

        </div>

        ${
          latest
            ? `
              <button
                class="btn primary"
                data-view-release="${esc(latest.id)}"
              >
                View latest report
              </button>
            `
            : `
              <div class="card empty">
                No released report yet.
              </div>
            `
        }
      `
      : `
        <div class="card empty">
          No employee selected.
        </div>
      `,
    'Employee Portal'
  );
}

/* ==========================================================
   EMPLOYEES / MONITORING
   ========================================================== */

function employeesPage() {
  const list =
    state.role === 'employer'
      ? portalEmployees()
      : state.role === 'employee'
        ? [currentEmployee()].filter(Boolean)
        : activeEmployees();

  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            ${
              state.role === 'employer'
                ? 'My Team'
                : 'Employees'
            }
          </h2>

          <p>
            Open an employee to inspect monitoring evidence.
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

        ${
          state.role === 'owner'
            ? `
              <div class="callout">
                <strong>
                  Connection status
                </strong>
                ${esc(state.syncMessage)}
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
              <th>Timezone</th>
              <th>Latest screening</th>
            </tr>

          </thead>

          <tbody>

            ${
              list
                .map(
                  (employee) => {
                    const latest =
                      employeeReports(
                        employee.id
                      )[0];

                    return `
                      <tr>

                        <td>
                          <span
                            class="row-link"
                            data-open-id="${esc(employee.id)}"
                          >
                            ${esc(employee.name)}
                          </span>
                        </td>

                        <td>
                          ${esc(employee.employer || 'Unassigned')}
                        </td>

                        <td>
                          ${esc(employee.connectionName || 'Scrin')}
                        </td>

                        <td>
                          ${esc(employeeTimezone(employee))}
                        </td>

                        <td>
                          ${
                            latest
                              ? `${esc(monthLabel(latest.period.from))} · Released`
                              : '—'
                          }
                        </td>

                      </tr>
                    `;
                  }
                )
                .join('')
            }

          </tbody>

        </table>

      </div>
    `,
    state.role === 'employer'
      ? 'My Team'
      : 'Employees'
  );
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

  return shell(
    `
      <div class="card panel">

        <div class="employee-head">

          <div class="employee-avatar">
            ${esc(employee.initials || initials(employee.name))}
          </div>

          <div>

            <h2 style="margin:0">
              ${esc(employee.name)}
            </h2>

            <div class="small">
              ${esc(employee.employer || 'Unassigned')}
              ·
              ${esc(employee.connectionName || 'Scrin')}
            </div>

          </div>

        </div>

        <div class="tabs">

          ${
            ['overview', 'screenshots', 'reports']
              .map(
                (tab) => `
                  <button
                    class="tab ${state.tab === tab ? 'active' : ''}"
                    data-tab="${tab}"
                  >
                    ${tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                `
              )
              .join('')
          }

        </div>

        ${monitorTab(employee)}

      </div>
    `,
    'Employee Monitoring'
  );
}

function monitorTab(employee) {
  if (
    state.tab === 'screenshots'
  ) {
    return screenshotView(employee);
  }

  if (
    state.tab === 'reports'
  ) {
    const reports =
      employeeReports(employee.id);

    return reports.length
      ? releaseTable(reports)
      : `
        <div class="empty">
          No released reports.
        </div>
      `;
  }

  const analytics =
    employee.lastAnalytics;

  return `
    <div class="grid metrics">

      ${
        metric(
          'Tracked time',
          analytics
            ? hoursLabel(
                analytics.metrics?.trackedHours || 0
              )
            : '—',
          'Last analyzed period'
        )
      }

      ${
        metric(
          'Screenshots',
          analytics?.screenshotCount ??
          analytics?.evidence?.screenshotCount ??
          '—',
          'Monthly captures'
        )
      }

      ${
        metric(
          'Capture dates',
          analytics?.screenshotDates?.length ?? '—',
          'Month'
        )
      }

      ${
        metric(
          'Evidence status',
          analytics?.review?.status || '—',
          'Coverage'
        )
      }

    </div>

    <div class="callout">

      <strong>
        Full-month screening rule
      </strong>

      WGM must successfully AI-screen every supplied screenshot
      before human approval.

      The human reviewer then checks a stable random sample
      of 30–66 screenshots and reviews all AI flags.

    </div>
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
        Load complete day from Scrin
      </button>

    </div>

    ${
      summary
        ? `
          <div
            class="grid metrics"
            style="margin:16px 0"
          >

            ${
              metric(
                'First tracked',
                esc(summary.firstTracked || '—'),
                'Selected day'
              )
            }

            ${
              metric(
                'Last tracked',
                esc(summary.lastTracked || '—'),
                'Selected day'
              )
            }

            ${
              metric(
                'Recorded time',
                hoursLabel(
                  Number(
                    summary.trackedSeconds || 0
                  ) / 3600
                ),
                'Scrin intervals'
              )
            }

            ${
              metric(
                'Screenshots',
                summary.screenshotCount || 0,
                'Evidence captures'
              )
            }

          </div>
        `
        : ''
    }

    <div class="shot-grid">

      ${
        (employee.shots || [])
          .map(
            (shot) => screenshotCard(shot)
          )
          .join('')
        ||
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
                href="${esc(imageUrl || thumbUrl)}"
                target="_blank"
                rel="noopener noreferrer"
              >

                <img
                  src="${esc(thumbUrl)}"
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
    document
      .getElementById('screenDate')
      ?.value;

  if (
    !employee ||
    !date
  ) {
    return;
  }

  if (
    state.mode !== 'LIVE'
  ) {
    toast(
      'Live Scrin connection required.'
    );
    return;
  }

  try {
    const response =
      await fetch(
        '/api/wgm/day-data',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify({
              connectionId:
                employee.connectionId,

              employmentId:
                employee.employmentId,

              date,

              timezone:
                employee.timezone || '',

              timezoneOffsetMinutes:
                employee.timezoneOffsetMinutes || 0,
            }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        'Could not load workday'
      );
    }

    employee.shots =
      (data.screenshots || [])
        .map(
          (screenshot) => [
            screenshot.time,
            screenshot.application,
            screenshot.activityLevel,
            screenshot.thumbUrl,
            screenshot.url,
          ]
        );

    employee.daySummary = {
      date:
        data.date,

      firstTracked:
        data.firstTracked,

      lastTracked:
        data.lastTracked,

      trackedSeconds:
        data.trackedSeconds,

      screenshotCount:
        data.screenshotCount,
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
   REPORT GENERATION / FULL-MONTH SCANNING
   ========================================================== */

function reportsPage() {
  if (
    state.role === 'employer'
  ) {
    const reports =
      employerReports(
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
              Human-reviewed reports for
              ${esc(state.portalEmployer || 'your company')}.
            </p>

          </div>

        </div>

        <div class="card panel">

          ${
            reports.length
              ? releaseTable(reports)
              : `
                <div class="empty">
                  No released reports.
                </div>
              `
          }

        </div>
      `,
      'Reports'
    );
  }

  if (
    state.role === 'employee'
  ) {
    const employee =
      currentEmployee();

    const reports =
      employee
        ? employeeReports(employee.id)
        : [];

    return shell(
      `
        <div class="header-row">

          <div>

            <h2>
              My Reports
            </h2>

            <p>
              Only released reports are visible.
            </p>

          </div>

        </div>

        <div class="card panel">

          ${
            reports.length
              ? releaseTable(reports)
              : `
                <div class="empty">
                  No released reports.
                </div>
              `
          }

        </div>
      `,
      'My Reports'
    );
  }

  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            Full-Month Fraud Screening
          </h2>

          <p>
            Choose the VA and month.

            WGM will retrieve the full screenshot set,
            AI-screen every screenshot in batches,
            then generate the stable human-review sample.
          </p>

        </div>

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
              value="${state.period.from}"
            >

          </div>

          <div class="field">

            <label>
              To
            </label>

            <input
              id="toDate"
              type="date"
              value="${state.period.to}"
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
                activeEmployees()
                  .map(
                    (employee) => `
                      <option
                        value="${esc(employee.id)}"
                        ${
                          employee.id === state.selectedEmployeeId
                            ? 'selected'
                            : ''
                        }
                      >
                        ${esc(employee.name)}
                        —
                        ${esc(employee.employer || 'Unassigned')}
                      </option>
                    `
                  )
                  .join('')
              }

            </select>

          </div>

          <div class="spacer"></div>

          <button
            id="generateBtn"
            class="btn gold"
          >
            Start Full-Month Screening
          </button>

        </div>

      </div>

      ${screeningProgressCard()}

      <div
        class="card panel"
        style="margin-top:16px"
      >

        <div class="panel-title">
          V1.9 screening sequence
        </div>

        <div class="grid two-col">

          <div class="context-box">

            <h4>
              1. Full AI screening
            </h4>

            <p>
              Every supplied monthly Scrin screenshot
              is sent through the visual screening engine.

              The screened count cannot become complete
              until all screenshots return successfully.
            </p>

          </div>

          <div class="context-box">

            <h4>
              2. Human review
            </h4>

            <p>
              WGM creates a stable random sample
              between 30 and 66 screenshots
              across capture dates.

              Every sample screenshot receives
              Clear or Needs Context.
            </p>

          </div>

        </div>

      </div>
    `,
    'Reports'
  );
}

function screeningProgressCard() {
  if (
    state.reportStatus ===
    'Not generated'
  ) {
    return '';
  }

  const progress =
    state.scanProgress;

  const total =
    Number(
      progress.total ||
      state.prepared?.screenshotCount ||
      0
    );

  const processed =
    Number(
      progress.processed ||
      0
    );

  const percentage =
    total
      ? Math.min(
          100,
          Math.round(
            processed / total * 100
          )
        )
      : 0;

  return `
    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div
        class="header-row"
        style="margin-bottom:10px"
      >

        <div>

          <div class="panel-title">
            Screening progress
          </div>

          <div class="panel-sub">
            ${esc(progress.phase || state.reportStatus)}
          </div>

        </div>

        <span
          class="status ${statusClass(state.reportStatus)}"
        >
          <span class="dot"></span>
          ${esc(state.reportStatus)}
        </span>

      </div>

      <div class="grid metrics">

        ${
          metric(
            'Monthly screenshots',
            total
              ? total.toLocaleString()
              : '—',
            'Retrieved from Scrin'
          )
        }

        ${
          metric(
            'AI-screened',
            processed.toLocaleString(),
            total
              ? `of ${total.toLocaleString()}`
              : 'Waiting'
          )
        }

        ${
          metric(
            'Human sample',
            state.prepared?.humanSample?.count ?? '—',
            'Stable random 30–66'
          )
        }

        ${
          metric(
            'Batch',
            progress.totalBatches
              ? `${progress.currentBatch}/${progress.totalBatches}`
              : '—',
            `${percentage}% complete`
          )
        }

      </div>

      <div
        class="progress"
        style="
          height:10px;
          margin-top:10px
        "
      >
        <span
          style="width:${percentage}%"
        ></span>
      </div>

      ${
        /Scanning|Preparing|Finalizing/i
          .test(state.reportStatus)
          ? `
            <div
              class="small"
              style="margin-top:8px"
            >
              Keep this page open while the full-month scan runs.
            </div>
          `
          : ''
      }

    </div>
  `;
}

async function fetchJson(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      options
    );

  const data =
    await response.json();

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
  const {
    overlapSize,
    newPerBatch,
  } = scanPlan;

  const start =
    batchIndex *
    newPerBatch;

  const newItems =
    manifest.slice(
      start,
      start + newPerBatch
    );

  if (!newItems.length) {
    return null;
  }

  const overlapStart =
    Math.max(
      0,
      start - overlapSize
    );

  const overlapItems =
    batchIndex === 0
      ? []
      : manifest.slice(
          overlapStart,
          start
        );

  const screenshots = [
    ...overlapItems,
    ...newItems,
  ];

  return {
    screenshots,

    countedScreenshotIds:
      newItems.map(
        (item) =>
          String(item.screenshotId)
      ),
  };
}

async function scanOneBatchWithRetry(
  payload,
  retries = 2
) {
  let lastError =
    null;

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {
    try {
      const result =
        await fetchJson(
          '/api/wgm/screening/batch',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      if (
        result.missingScreenshotIds?.length &&
        attempt < retries
      ) {
        lastError =
          new Error(
            `${result.missingScreenshotIds.length} screenshot(s) missing from AI response`
          );

        continue;
      }

      return result;

    } catch (error) {
      lastError =
        error;

      if (
        attempt < retries
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              900 * (attempt + 1)
            )
        );
      }
    }
  }

  throw (
    lastError ||
    new Error(
      'Batch screening failed'
    )
  );
}

async function generateReport() {
  const employeeId =
    document
      .getElementById('reportEmployee')
      ?.value ||
    state.selectedEmployeeId;

  const employee =
    employeeById(employeeId);

  state.period = {
    from:
      document
        .getElementById('fromDate')
        ?.value ||
      state.period.from,

    to:
      document
        .getElementById('toDate')
        ?.value ||
      state.period.to,
  };

  if (
    !employee ||
    employee.excluded ||
    !employee.employer
  ) {
    toast(
      'Map this employee to an employer first.'
    );

    return;
  }

  if (
    state.mode !== 'LIVE'
  ) {
    toast(
      'Full-month AI screening requires LIVE mode with real Scrin screenshot URLs.'
    );

    return;
  }

  state.selectedEmployeeId =
    employee.id;

  state.reportEmployeeId =
    employee.id;

  state.prepared =
    null;

  state.batchResults =
    [];

  state.report =
    null;

  state.meta =
    null;

  state.humanDispositions =
    {};

  state.findingDispositions =
    {};

  state.reviewerChecks =
    [true, true, true, true, true];

  state.reportStatus =
    'Preparing evidence';

  state.scanProgress = {
    phase:
      'Retrieving the complete monthly evidence package from Scrin…',

    processed: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0,
  };

  render();

  try {
    const prepared =
      await fetchJson(
        '/api/wgm/screening/prepare',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              connectionId:
                employee.connectionId,

              employmentId:
                employee.employmentId,

              from:
                state.period.from,

              to:
                state.period.to,

              timezone:
                employee.timezone || '',

              timezoneOffsetMinutes:
                employee.timezoneOffsetMinutes || 0,

              expectedHours:
                Number(
                  employee.expectedHours || 0
                ),

              adjustedExpectedHours:
                Number(
                  employee.expectedHours || 0
                ),

              batchSize: 20,
              overlapSize: 2,
            }),
        }
      );

    state.prepared =
      prepared;

    employee.lastAnalytics =
      prepared;

    employee.trackedHours =
      Number(
        prepared.metrics?.trackedHours || 0
      );

    employee.reportingStatus =
      'Screening';

    saveEmployees();

    if (
      !prepared.screenshotCount
    ) {
      throw new Error(
        'No screenshots were returned for the selected employee and period.'
      );
    }

    state.scanProgress = {
      phase:
        `Retrieved ${prepared.screenshotCount.toLocaleString()} screenshot(s). Starting full-month AI screening…`,

      processed: 0,

      total:
        prepared.screenshotCount,

      currentBatch: 0,

      totalBatches:
        prepared.scanPlan?.totalBatches || 0,
    };

    state.reportStatus =
      'Scanning full month';

    render();

    const manifest =
      prepared.manifest || [];

    const scanPlan =
      prepared.scanPlan;

    const batchResults =
      [];

    let processed =
      0;

    for (
      let batchIndex = 0;
      batchIndex < scanPlan.totalBatches;
      batchIndex++
    ) {
      const batch =
        buildBatch(
          manifest,
          batchIndex,
          scanPlan
        );

      if (!batch) {
        break;
      }

      state.scanProgress = {
        phase:
          `AI screening batch ${batchIndex + 1} of ${scanPlan.totalBatches}…`,

        processed,

        total:
          prepared.screenshotCount,

        currentBatch:
          batchIndex + 1,

        totalBatches:
          scanPlan.totalBatches,
      };

      render();

      const result =
        await scanOneBatchWithRetry({
          sessionKey:
            prepared.sessionKey,

          batchIndex,

          totalBatches:
            scanPlan.totalBatches,

          screenshots:
            batch.screenshots,

          countedScreenshotIds:
            batch.countedScreenshotIds,
        });

      batchResults.push(result);

      processed +=
        Number(
          result.countedReviewedCount || 0
        );

      state.batchResults =
        batchResults;

      state.scanProgress = {
        phase:
          `AI screened ${Math.min(processed, prepared.screenshotCount).toLocaleString()} of ${prepared.screenshotCount.toLocaleString()} screenshots.`,

        processed:
          Math.min(
            processed,
            prepared.screenshotCount
          ),

        total:
          prepared.screenshotCount,

        currentBatch:
          batchIndex + 1,

        totalBatches:
          scanPlan.totalBatches,
      };

      render();
    }

    state.reportStatus =
      'Finalizing screening';

    state.scanProgress.phase =
      'Checking cross-day repeated sequences and consolidating all screening flags…';

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

          body:
            JSON.stringify({
              sessionKey:
                prepared.sessionKey,

              expectedScreenshots:
                prepared.screenshotCount,

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
        new Date().toISOString(),

      analysisVersion:
        prepared.versions?.analysisVersion,

      rulesVersion:
        prepared.versions?.rulesVersion,

      promptVersion:
        prepared.versions?.promptVersion,

      screenedScreenshots:
        report.screenedScreenshots,

      totalScreenshots:
        report.totalScreenshots,

      humanSampleSize:
        prepared.humanSample?.count || 0,

      batchCount:
        scanPlan.totalBatches,
    };

    state.scanProgress = {
      phase:
        report.allScreenshotsScreened
          ? `Full-month AI screening complete: ${report.screenedScreenshots.toLocaleString()} of ${report.totalScreenshots.toLocaleString()} screenshots.`
          : `Screening incomplete: ${report.screenedScreenshots.toLocaleString()} of ${report.totalScreenshots.toLocaleString()} screenshots successfully screened.`,

      processed:
        report.screenedScreenshots,

      total:
        report.totalScreenshots,

      currentBatch:
        scanPlan.totalBatches,

      totalBatches:
        scanPlan.totalBatches,
    };

    state.reportStatus =
      report.allScreenshotsScreened
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
      `Full-month screening failed: ${error.message}`
    );
  }
}

/* ==========================================================
   REVIEWER WORKFLOW
   ========================================================== */

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
          <th>Month</th>
          <th>AI-screened</th>
          <th>Human sample</th>
          <th>Human reviewed</th>
          <th>Unresolved</th>
          <th>Status</th>
        </tr>

      </thead>

      <tbody>

        <tr>

          <td>
            ${esc(employee?.name || '—')}
          </td>

          <td>
            ${esc(monthLabel(state.period.from))}
          </td>

          <td>
            ${Number(state.report?.screenedScreenshots || 0).toLocaleString()}
            /
            ${Number(state.report?.totalScreenshots || state.prepared?.screenshotCount || 0).toLocaleString()}
          </td>

          <td>
            ${humanSampleTarget()}
          </td>

          <td>
            ${humanReviewedCount()}
          </td>

          <td>
            ${unresolvedCount()}
          </td>

          <td>
            ${esc(state.reportStatus)}
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

  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            Human Review
          </h2>

          <p>
            Every randomly selected human-review screenshot
            must be marked Clear or Needs Context.

            All AI findings must also receive
            a reviewer disposition.
          </p>

        </div>

        <button
          class="btn primary"
          data-page="reports"
        >
          Generate another
        </button>

      </div>

      ${
        state.report
          ? reviewConsole(employee)
          : `
            <div class="card empty">
              Generate a screening report first.
            </div>
          `
      }
    `,
    'Review Queue'
  );
}

function checkTitle(key) {
  return ({
    repeated_frozen:
      'Repeated or frozen screens',

    repetitive_cycling:
      'Repetitive screen cycling',

    activity_simulation:
      'Visible activity-simulation tools',

    repeated_across_days:
      'Repeated sequences across days',
  })[key] || key;
}

function reviewConsole(employee) {
  const sample =
    humanSample();

  const findings =
    state.report?.findings || [];

  const allScanned =
    Boolean(
      state.report?.allScreenshotsScreened
    );

  return `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">
          ${esc(employee?.initials || initials(employee?.name || 'VA'))}
        </div>

        <div>

          <h2 style="margin:0">
            ${esc(employee?.name || '')}
            —
            ${esc(monthLabel(state.period.from))}
          </h2>

          <div class="small">
            ${esc(employee?.employer || '')}
            ·
            Full-month screenshot screening
          </div>

        </div>

        <div class="spacer"></div>

        <span
          class="status ${statusClass(state.reportStatus)}"
        >
          <span class="dot"></span>
          ${esc(state.reportStatus)}
        </span>

      </div>

      ${reviewSummary()}

      ${
        !allScanned
          ? `
            <div
              class="callout"
              style="border-left-color:#b7482b"
            >

              <strong>
                Approval blocked
              </strong>

              The full month has not been successfully screened.

              ${Number(state.report?.missingScreenshotIds?.length || 0)}
              screenshot(s) still need a successful AI result.

            </div>
          `
          : ''
      }

      <div
        class="grid two-col"
        style="margin-top:16px"
      >

        <div>

          <div class="panel-title">
            AI screening outcome
          </div>

          <div class="context-box">

            <h4>
              ${esc(reportHeadline())}
            </h4>

            <p>
              ${esc(reportSubtext())}
            </p>

          </div>

          ${
            (state.report?.checks || [])
              .map(
                (check) => `
                  <div class="context-box">

                    <h4>
                      ${esc(checkTitle(check.key))}
                      ·
                      ${esc(check.status)}
                    </h4>

                    <p>
                      ${esc(check.detail || '')}
                    </p>

                  </div>
                `
              )
              .join('')
          }

        </div>

        <div>

          <div class="panel-title">
            Reviewer sign-off
          </div>

          <div class="field">

            <label>
              Reviewer name
            </label>

            <input
              id="reviewerName"
              value="${esc(state.reviewerName)}"
            >

          </div>

          <div class="checklist">

            ${
              [
                'I confirmed the full-month AI screening completed',
                'I reviewed the complete random human sample',
                'I reviewed every AI-flagged finding',
                'Any Needs Context item contains reviewer context',
                'The client-facing report wording accurately reflects the evidence',
              ]
                .map(
                  (label, index) => `
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

                      ${label}

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
              Preview Report
            </button>

            <button
              class="btn gold"
              id="approveBtn"
            >
              Approve Human Review
            </button>

          </div>

        </div>

      </div>

      <div
        class="panel-title"
        style="margin-top:20px"
      >
        Human random sample · ${humanSampleTarget()} screenshots
      </div>

      <div class="panel-sub">
        Reviewed ${humanReviewedCount()} of ${humanSampleTarget()}.
        The sample is stable for this VA and reporting period.
      </div>

      <div
        class="shot-grid"
        style="margin-top:12px"
      >

        ${
          sample.length
            ? sample
                .map(
                  (screenshot) =>
                    humanReviewCard(screenshot)
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
        AI findings · ${findings.length}
      </div>

      ${
        findings.length
          ? findings
              .map(
                (finding, index) =>
                  findingReviewCard(
                    finding,
                    index
                  )
              )
              .join('')
          : `
            <div class="context-box">

              <h4>
                No AI finding recorded
              </h4>

              <p>
                The completed full-month scan
                did not return a review-worthy visual pattern.

                The human sample still requires review
                before approval.
              </p>

            </div>
          `
      }

      ${
        /Approved|Released/
          .test(state.reportStatus)
          ? `
            <div
              class="callout"
              style="margin-top:16px"
            >

              <strong>
                Human review approved
              </strong>

              ${
                unresolvedCount()
                  ? `${unresolvedCount()} screenshot(s) remain marked Needs Context and will be shown as unresolved findings in the released report.`
                  : 'No unresolved screenshot context remains.'
              }

            </div>

            <div class="actions">

              <button
                class="btn"
                id="previewReport2"
              >
                Preview signed report
              </button>

              <button
                class="btn primary"
                id="releaseBtn"
              >
                ${
                  state.reportStatus === 'Released'
                    ? 'Released · Employer notified'
                    : 'Release to Employer'
                }
              </button>

            </div>
          `
          : ''
      }

    </div>
  `;
}

function humanReviewCard(screenshot) {
  const id =
    String(
      screenshot.screenshotId
    );

  const disposition =
    state.humanDispositions[id] || {
      decision: '',
      context: '',
    };

  const aiFlagged =
    (
      state.report?.aiFlaggedScreenshotIds ||
      []
    )
      .map(String)
      .includes(id);

  return `
    <div
      class="shot"
      style="position:relative"
    >

      ${
        aiFlagged
          ? `
            <div
              style="
                position:absolute;
                z-index:3;
                top:8px;
                right:8px;
                background:#fff0e6;
                color:#a84b19;
                padding:5px 8px;
                border-radius:99px;
                font-size:10px;
                font-weight:800
              "
            >
              AI FLAG
            </div>
          `
          : ''
      }

      <div class="shot-img">

        <a
          href="${esc(screenshot.imageUrl || screenshot.thumbUrl || '')}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <img
            src="${esc(screenshot.thumbUrl || screenshot.imageUrl || '')}"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
              display:block
            "
          >

        </a>

      </div>

      <div class="shot-meta">

        <strong>
          ${esc(screenshot.dateTime || '')}
        </strong>

        ${esc(screenshot.application || '')}

      </div>

      <div
        style="
          padding:9px;
          border-top:1px solid #e5e7eb
        "
      >

        <div
          style="
            display:flex;
            gap:12px;
            flex-wrap:wrap;
            font-size:12px
          "
        >

          <label>

            <input
              type="radio"
              name="sample_${esc(id)}"
              data-sample-decision="${esc(id)}"
              value="clear"
              ${
                disposition.decision === 'clear'
                  ? 'checked'
                  : ''
              }
            >

            Clear

          </label>

          <label>

            <input
              type="radio"
              name="sample_${esc(id)}"
              data-sample-decision="${esc(id)}"
              value="needs_context"
              ${
                disposition.decision === 'needs_context'
                  ? 'checked'
                  : ''
              }
            >

            Needs Context

          </label>

        </div>

        ${
          disposition.decision ===
          'needs_context'
            ? `
              <textarea
                data-sample-context="${esc(id)}"
                placeholder="Required reviewer context for this screenshot…"
                style="
                  width:100%;
                  min-height:74px;
                  margin-top:8px
                "
              >${esc(disposition.context || '')}</textarea>
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
  const disposition =
    state.findingDispositions[index] || {
      decision: '',
      context: '',
    };

  const screenshotIds =
    Array.isArray(
      finding.screenshotIds
    )
      ? finding.screenshotIds.map(String)
      : [];

  const manifestMap =
    new Map(
      (state.prepared?.manifest || [])
        .map(
          (item) => [
            String(item.screenshotId),
            item,
          ]
        )
    );

  const thumbnails =
    screenshotIds
      .map(
        (id) =>
          manifestMap.get(id)
      )
      .filter(Boolean)
      .slice(0, 6);

  return `
    <div
      class="context-box"
      style="margin-top:10px"
    >

      <h4>
        AI Finding ${index + 1}
        ·
        ${esc(finding.type || 'screening_flag')}
      </h4>

      <p>
        ${esc(finding.reason || '')}
      </p>

      ${
        thumbnails.length
          ? `
            <div
              style="
                display:grid;
                grid-template-columns:repeat(6,1fr);
                gap:6px;
                margin:10px 0
              "
            >

              ${
                thumbnails
                  .map(
                    (shot) => `
                      <a
                        href="${esc(shot.imageUrl || shot.thumbUrl || '')}"
                        target="_blank"
                        title="${esc(shot.dateTime || '')}"
                      >

                        <img
                          src="${esc(shot.thumbUrl || shot.imageUrl || '')}"
                          style="
                            width:100%;
                            aspect-ratio:16/10;
                            object-fit:cover;
                            border-radius:6px;
                            border:1px solid #dde2e8
                          "
                        >

                      </a>
                    `
                  )
                  .join('')
              }

            </div>
          `
          : ''
      }

      <div
        style="
          display:flex;
          gap:14px;
          flex-wrap:wrap;
          font-size:12px;
          margin-top:8px
        "
      >

        <label>

          <input
            type="radio"
            name="finding_${index}"
            data-finding-decision="${index}"
            value="clear"
            ${
              disposition.decision === 'clear'
                ? 'checked'
                : ''
            }
          >

          Cleared by reviewer

        </label>

        <label>

          <input
            type="radio"
            name="finding_${index}"
            data-finding-decision="${index}"
            value="needs_context"
            ${
              disposition.decision === 'needs_context'
                ? 'checked'
                : ''
            }
          >

          Needs Context

        </label>

      </div>

      ${
        disposition.decision ===
        'needs_context'
          ? `
            <textarea
              data-finding-context="${index}"
              placeholder="Required reviewer context for this finding…"
              style="
                width:100%;
                min-height:78px;
                margin-top:8px
              "
            >${esc(disposition.context || '')}</textarea>
          `
          : ''
      }

    </div>
  `;
}

function canApprove() {
  if (
    !state.report
      ?.allScreenshotsScreened
  ) {
    return {
      ok: false,
      message:
        'The full-month AI scan must successfully screen every screenshot before approval.',
    };
  }

  if (
    !humanReviewComplete()
  ) {
    return {
      ok: false,
      message:
        `Review all ${humanSampleTarget()} screenshots in the human sample before approval.`,
    };
  }

  if (
    !findingReviewComplete()
  ) {
    return {
      ok: false,
      message:
        'Review every AI finding before approval.',
    };
  }

  if (
    !state.reviewerChecks
      .every(Boolean)
  ) {
    return {
      ok: false,
      message:
        'Complete the reviewer checklist before approval.',
    };
  }

  if (
    !String(
      state.reviewerName || ''
    ).trim()
  ) {
    return {
      ok: false,
      message:
        'Enter the reviewer name.',
    };
  }

  for (
    const disposition of
    Object.values(
      state.humanDispositions
    )
  ) {
    if (
      disposition?.decision ===
        'needs_context' &&
      !String(
        disposition.context || ''
      ).trim()
    ) {
      return {
        ok: false,
        message:
          'Every human-sample screenshot marked Needs Context must include reviewer context.',
      };
    }
  }

  for (
    const disposition of
    Object.values(
      state.findingDispositions
    )
  ) {
    if (
      disposition?.decision ===
        'needs_context' &&
      !String(
        disposition.context || ''
      ).trim()
    ) {
      return {
        ok: false,
        message:
          'Every AI finding marked Needs Context must include reviewer context.',
      };
    }
  }

  return {
    ok: true,
  };
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

  state.reportStatus =
    'Approved';

  const employee =
    employeeById(
      state.reportEmployeeId
    );

  if (employee) {
    employee.reportingStatus =
      'Approved';
  }

  saveEmployees();

  render();

  toast(
    'Human review approved. The HUMAN REVIEWED stamp is now active.'
  );
}

/* ==========================================================
   FIXED ONE-PAGE REPORT
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
        height:297mm;
        background:#fff;
        box-sizing:border-box;
        padding:11mm 12mm 8mm;
        margin:0 auto 24px;
        box-shadow:0 8px 30px rgba(0,0,0,.10);
        color:#192c4e;
        font-family:Aptos,Arial,sans-serif;
        overflow:hidden
      }

      .fs-top{
        display:flex;
        justify-content:space-between;
        align-items:flex-start
      }

      .fs-logo{
        width:31mm;
        height:auto;
        object-fit:contain;
        display:block
      }

      .fs-sample{
        background:#f7efd9;
        color:#8a6818;
        border-radius:7px;
        padding:7px 12px;
        font-size:8px;
        font-weight:800
      }

      .fs-title{
        font-size:27px;
        line-height:1.05;
        margin:10mm 0 3mm;
        font-weight:800;
        color:#1a2d4f
      }

      .fs-meta{
        display:flex;
        gap:18px;
        font-size:8px;
        color:#8a919c;
        margin-bottom:6mm;
        flex-wrap:wrap
      }

      .fs-meta strong{
        color:#1b2d4d
      }

      .fs-hero{
        background:#1d3154;
        border-radius:16px;
        padding:7mm 9mm;
        display:flex;
        align-items:center;
        gap:8mm;
        color:#fff
      }

      .fs-stamp{
        width:30mm;
        height:30mm;
        border:2.4px solid #d7ad2d;
        border-radius:50%;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
        color:#d7ad2d;
        flex:0 0 auto
      }

      .fs-stamp .tick{
        width:7mm;
        height:7mm;
        border:1.8px solid #d7ad2d;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:13px;
        font-weight:900;
        margin-bottom:1.5mm
      }

      .fs-stamp b{
        font-size:8px;
        letter-spacing:.13em;
        line-height:1.4
      }

      .fs-stamp small{
        font-size:4.4px;
        color:#aab4c4;
        margin-top:1.5mm
      }

      .fs-hero .eyebrow{
        font-size:7.5px;
        color:#e0b62f;
        font-weight:800;
        letter-spacing:.08em
      }

      .fs-hero h2{
        font-size:20px;
        line-height:1.08;
        margin:2.5mm 0 2mm;
        color:#fff
      }

      .fs-hero p{
        font-size:8px;
        color:#aeb9ca;
        margin:0
      }

      .fs-pending{
        font-size:7px;
        color:#e0b62f;
        margin-top:2mm
      }

      .fs-kpis{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:4mm;
        margin:5mm 0 6mm
      }

      .fs-kpi{
        border-radius:11px;
        padding:5mm;
        background:#e9eff6
      }

      .fs-kpi.gold{
        background:#f8f0da
      }

      .fs-kpi strong{
        display:block;
        font-size:21px;
        color:#1a2d4f
      }

      .fs-kpi.gold strong{
        color:#9a771a
      }

      .fs-kpi b{
        display:block;
        font-size:8px;
        margin-top:1.5mm
      }

      .fs-kpi span{
        display:block;
        font-size:6.6px;
        color:#7a8390;
        margin-top:1mm
      }

      .fs-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2mm
      }

      .fs-head h3{
        font-size:14px;
        margin:0
      }

      .fs-head span{
        font-size:6.5px;
        font-weight:800;
        color:#9a771a
      }

      .fs-checks{
        border:1px solid #dce2e9;
        border-radius:10px;
        padding:0 4.5mm
      }

      .fs-check{
        display:grid;
        grid-template-columns:8mm 1fr auto;
        gap:3mm;
        align-items:center;
        padding:3.4mm 0;
        border-bottom:1px solid #e3e7ec
      }

      .fs-check:last-child{
        border-bottom:0
      }

      .fs-icon{
        width:6.5mm;
        height:6.5mm;
        border-radius:50%;
        background:#f8f0da;
        color:#9a771a;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900
      }

      .fs-check.review .fs-icon{
        background:#fff0e6;
        color:#a84b19
      }

      .fs-check.na .fs-icon{
        background:#eef1f4;
        color:#76808f
      }

      .fs-copy b{
        display:block;
        font-size:8.2px
      }

      .fs-copy p{
        font-size:6.8px;
        color:#737c8a;
        margin:.8mm 0 0
      }

      .fs-pill{
        border-radius:99px;
        padding:1.8mm 3.5mm;
        background:#f8f0da;
        color:#8e6a18;
        font-size:6px;
        font-weight:800
      }

      .fs-pill.review{
        background:#fff0e6;
        color:#a84b19
      }

      .fs-pill.na{
        background:#eef1f4;
        color:#697483
      }

      .fs-bottom{
        display:grid;
        grid-template-columns:1.25fr .95fr;
        gap:5mm;
        margin-top:5mm
      }

      .fs-card{
        border:1px solid #dce2e9;
        border-radius:10px;
        padding:4.5mm;
        min-height:64mm
      }

      .fs-cardhead{
        display:flex;
        justify-content:space-between;
        margin-bottom:3mm
      }

      .fs-cardhead b{
        font-size:9px
      }

      .fs-cardhead span{
        font-size:6.2px;
        color:#6f7987;
        font-weight:700
      }

      .fs-weekdays,
      .fs-cal{
        display:grid;
        grid-template-columns:repeat(7,1fr);
        gap:1.7mm;
        text-align:center
      }

      .fs-weekdays div{
        font-size:5.8px;
        color:#8d949f
      }

      .fs-day{
        width:7.7mm;
        height:7.7mm;
        margin:0 auto;
        border-radius:4px;
        background:#f0f2f5;
        color:#b8bdc5;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:6.8px
      }

      .fs-day.has{
        background:#1d3154;
        color:#fff
      }

      .fs-day.blank{
        visibility:hidden
      }

      .fs-legend{
        display:flex;
        gap:5mm;
        font-size:6.2px;
        color:#7b8490;
        margin-top:3mm
      }

      .fs-legend i{
        display:inline-block;
        width:3mm;
        height:3mm;
        border-radius:1px;
        margin-right:1.5mm
      }

      .fs-legend .yes{
        background:#1d3154
      }

      .fs-legend .no{
        background:#e3e6ea
      }

      .fs-note{
        font-size:6.1px;
        color:#9aa0aa;
        margin-top:2.5mm
      }

      .fs-cover-title{
        font-size:7.5px;
        font-weight:800
      }

      .fs-big{
        font-size:24px;
        font-weight:800;
        margin-top:4mm
      }

      .fs-biglabel{
        font-size:7.7px;
        font-weight:700
      }

      .fs-muted{
        font-size:6.6px;
        color:#818a98;
        margin-top:1.2mm
      }

      .fs-divider{
        height:1px;
        background:#e1e5ea;
        margin:4mm 0
      }

      .fs-row{
        display:flex;
        justify-content:space-between;
        font-size:7.2px
      }

      .fs-sign{
        border-top:1px solid #dce2e9;
        margin-top:5mm;
        padding-top:3mm;
        display:grid;
        grid-template-columns:7mm 1fr;
        gap:3mm
      }

      .fs-signicon{
        width:6mm;
        height:6mm;
        border-radius:50%;
        background:#f8f0da;
        color:#9a771a;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900
      }

      .fs-sign b{
        font-size:7.5px
      }

      .fs-sign p{
        font-size:6.5px;
        color:#737c8a;
        margin:.8mm 0 0
      }

      .fs-foot{
        font-size:5.4px;
        color:#a0a6af;
        margin-top:1mm
      }

      .fs-context{
        margin-top:2.5mm;
        padding:2.5mm 3mm;
        background:#fff8e7;
        border-left:3px solid #d7ad2d;
        border-radius:4px;
        font-size:6.2px;
        color:#6a5a27
      }

      .fs-context b{
        color:#4e421c
      }

      @media print{

        body{
          background:#fff!important
        }

        .sidebar,
        .topbar,
        .fs-actions{
          display:none!important
        }

        .main,
        .content{
          margin:0!important;
          padding:0!important;
          width:100%!important
        }

        .fs-page{
          box-shadow:none!important;
          margin:0!important;
          width:210mm!important;
          height:297mm!important;
          -webkit-print-color-adjust:exact;
          print-color-adjust:exact
        }

      }

    </style>
  `;
}

function monthDays(period) {
  const start =
    new Date(
      `${period.from}T00:00:00Z`
    );

  const year =
    start.getUTCFullYear();

  const monthIndex =
    start.getUTCMonth();

  const daysInMonth =
    new Date(
      Date.UTC(
        year,
        monthIndex + 1,
        0
      )
    )
      .getUTCDate();

  return Array.from(
    {
      length: daysInMonth,
    },
    (_, index) => {
      const date =
        new Date(
          Date.UTC(
            year,
            monthIndex,
            index + 1
          )
        );

      return {
        day:
          index + 1,

        iso:
          date
            .toISOString()
            .slice(0, 10),

        weekday:
          date.getUTCDay(),
      };
    }
  );
}

function calendarMarkup(
  period,
  screenshotDates
) {
  const days =
    monthDays(period);

  const captured =
    new Set(
      (screenshotDates || [])
        .map(String)
    );

  const offset =
    (
      (
        days[0]?.weekday ??
        1
      ) + 6
    ) % 7;

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

      ${
        Array.from(
          {
            length: offset,
          },
          () => `
            <div class="fs-day blank">
              0
            </div>
          `
        )
          .join('')
      }

      ${
        days
          .map(
            (day) => `
              <div
                class="fs-day ${captured.has(day.iso) ? 'has' : ''}"
              >
                ${day.day}
              </div>
            `
          )
          .join('')
      }

    </div>
  `;
}

function normalizedChecks(report) {
  const map =
    new Map(
      (report?.checks || [])
        .map(
          (check) => [
            check.key,
            check,
          ]
        )
    );

  return [
    [
      'repeated_frozen',
      'Repeated or frozen screens',
    ],

    [
      'repetitive_cycling',
      'Repetitive screen cycling',
    ],

    [
      'activity_simulation',
      'Visible activity-simulation tools',
    ],

    [
      'repeated_across_days',
      'Repeated sequences across days',
    ],
  ]
    .map(
      ([key, title]) => ({
        key,
        title,
        ...(
          map.get(key) || {
            status:
              'not_assessed',

            detail:
              'This check was not assessed.',
          }
        ),
      })
    );
}

function checkVisual(check) {
  if (
    check.status === 'review'
  ) {
    return {
      className: 'review',
      icon: '!',
      pill: 'REVIEW',
    };
  }

  if (
    check.status ===
    'not_assessed'
  ) {
    return {
      className: 'na',
      icon: '–',
      pill: 'NOT ASSESSED',
    };
  }

  return {
    className: '',
    icon: '✓',
    pill: 'CHECKED',
  };
}

function unresolvedContextSummaryFor(
  report,
  prepared,
  humanDispositions = {},
  findingDispositions = {}
) {
  const items = [];

  for (
    const [id, disposition] of
    Object.entries(
      humanDispositions || {}
    )
  ) {
    if (
      disposition?.decision ===
      'needs_context'
    ) {
      const shot =
        (prepared?.manifest || [])
          .find(
            (item) =>
              String(item.screenshotId) ===
              String(id)
          );

      items.push({
        label:
          shot?.dateTime || id,

        context:
          disposition.context || '',
      });
    }
  }

  (report?.findings || [])
    .forEach(
      (finding, index) => {
        const disposition =
          findingDispositions?.[index];

        if (
          disposition?.decision ===
          'needs_context'
        ) {
          items.push({
            label:
              `AI finding ${index + 1}`,

            context:
              disposition.context ||
              finding.reason ||
              '',
          });
        }
      }
    );

  return items;
}

function reportMarkup({
  employee,
  report,
  prepared,
  meta,
  period,
  status,
  reviewerName,
  humanChecked,
  version = null,
  released = false,
  humanDispositions = null,
  findingDispositions = null,
}) {
  const effectiveHumanDispositions =
    humanDispositions ||
    state.humanDispositions;

  const effectiveFindingDispositions =
    findingDispositions ||
    state.findingDispositions;

  const humanReviewed =
    /Approved|Released/
      .test(status);

  const unresolved =
    unresolvedCountFor(
      report,
      effectiveHumanDispositions,
      effectiveFindingDispositions
    );

  const screenshotTotal =
    Number(
      report?.totalScreenshots ||
      prepared?.screenshotCount ||
      0
    );

  const screened =
    Number(
      report?.screenedScreenshots ||
      0
    );

  const screenshotDates =
    prepared?.screenshotDates ||
    [];

  const daysInMonth =
    monthDays(period).length;

  const datesWithoutCapture =
    Math.max(
      0,
      daysInMonth -
      screenshotDates.length
    );

  const checks =
    normalizedChecks(report);

  const completedChecks =
    checks.filter(
      (check) =>
        check.status !== 'not_assessed'
    ).length;

  const recordedHours =
    prepared?.metrics?.trackedHours;

  const expectedHours =
    Number(
      prepared?.metrics?.expectedHours ||
      0
    );

  const contexts =
    unresolvedContextSummaryFor(
      report,
      prepared,
      effectiveHumanDispositions,
      effectiveFindingDispositions
    );

  const headline =
    reportHeadlineFor(
      report,
      prepared,
      status,
      effectiveHumanDispositions,
      effectiveFindingDispositions
    );

  const subtext =
    reportSubtextFor(
      report,
      prepared,
      status,
      effectiveHumanDispositions,
      effectiveFindingDispositions
    );

  const html = `
    ${reportStyles()}

    <div class="fs-wrap">

      <div class="fs-actions">

        <button
          class="btn"
          data-page="${released ? 'reports' : 'review'}"
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
            class="status ${statusClass(status)}"
          >
            <span class="dot"></span>
            ${esc(status)}
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

      <section class="fs-page">

        <div class="fs-top">

          <img
            class="fs-logo"
            src="${WGM_LOGO_DATA}"
            alt="White Glove Monitor"
          >

          ${
            state.mode !== 'LIVE' &&
            !released
              ? `
                <div class="fs-sample">
                  DESIGN MOCK-UP / SAMPLE DATA
                </div>
              `
              : ''
          }

        </div>

        <div class="fs-title">
          Fraud screening &amp; activity review
        </div>

        <div class="fs-meta">

          <strong>
            ${esc(employee.name)}
          </strong>

          <span>
            ${esc(monthLabel(period.from))}
          </span>

          <span>
            Screenshot-based review
          </span>

          <span>
            ${esc(employeeTimezone(employee))}
          </span>

        </div>

        <div class="fs-hero">

          <div class="fs-stamp">

            <div class="tick">
              ✓
            </div>

            <b>
              ${
                humanReviewed
                  ? 'HUMAN<br>REVIEWED'
                  : 'REVIEW<br>PENDING'
              }
            </b>

            <small>
              WHITE GLOVE MONITOR
            </small>

          </div>

          <div>

            <div class="eyebrow">
              SCREENSHOT SCREENING COMPLETE
            </div>

            <h2>
              ${esc(headline)}
            </h2>

            <p>
              ${esc(subtext)}
            </p>

            ${
              humanReviewed
                ? ''
                : `
                  <div class="fs-pending">
                    Human sign-off is still pending.
                  </div>
                `
            }

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
              ${
                screened === screenshotTotal
                  ? 'AI screening of all supplied images'
                  : `of ${screenshotTotal.toLocaleString()} supplied images`
              }
            </span>

          </div>

          <div class="fs-kpi">

            <strong>
              ${Number(humanChecked || 0).toLocaleString()}
            </strong>

            <b>
              Human-checked screenshots
            </b>

            <span>
              Stable random sample of
              ${Number(prepared?.humanSample?.count || 0)}
            </span>

          </div>

          <div class="fs-kpi">

            <strong>
              ${unresolved}
            </strong>

            <b>
              Unresolved findings
            </b>

            <span>
              Following human review
            </span>

          </div>

        </div>

        <div class="fs-head">

          <h3>
            What we checked
          </h3>

          <span>
            ${completedChecks}
            CHECK${completedChecks === 1 ? '' : 'S'}
            COMPLETED
          </span>

        </div>

        <div class="fs-checks">

          ${
            checks
              .map(
                (check) => {
                  const visual =
                    checkVisual(check);

                  return `
                    <div
                      class="fs-check ${visual.className}"
                    >

                      <div class="fs-icon">
                        ${visual.icon}
                      </div>

                      <div class="fs-copy">

                        <b>
                          ${esc(check.title)}
                        </b>

                        <p>
                          ${esc(check.detail || '')}
                        </p>

                      </div>

                      <div
                        class="fs-pill ${visual.className}"
                      >
                        ${visual.pill}
                      </div>

                    </div>
                  `;
                }
              )
              .join('')
          }

        </div>

        <div class="fs-bottom">

          <div class="fs-card">

            <div class="fs-cardhead">

              <b>
                Screenshot dates
              </b>

              <span>
                ${esc(monthLabel(period.from).toUpperCase())}
              </span>

            </div>

            ${
              calendarMarkup(
                period,
                screenshotDates
              )
            }

            <div class="fs-legend">

              <span>
                <i class="yes"></i>
                Capture supplied
              </span>

              <span>
                <i class="no"></i>
                No capture supplied
              </span>

            </div>

            <div class="fs-note">
              No screenshots on a date does not mean
              the person did not work.
            </div>

          </div>

          <div class="fs-card">

            <div class="fs-cover-title">
              REVIEW COVERAGE
            </div>

            <div class="fs-big">
              ${screenshotDates.length}
            </div>

            <div class="fs-biglabel">
              dates with screenshots
            </div>

            <div class="fs-muted">
              ${datesWithoutCapture}
              dates without supplied screenshots
            </div>

            <div class="fs-divider"></div>

            <div class="fs-row">

              <span>
                Recorded hours
              </span>

              <b>
                ${
                  Number.isFinite(
                    Number(recordedHours)
                  )
                    ? hoursLabel(recordedHours)
                    : 'Not supplied'
                }
              </b>

            </div>

            <div
              class="fs-muted"
              style="margin-top:3mm"
            >
              Shown from Scrin tracked time.
              Screenshot spacing is not used to calculate hours.
            </div>

            <div
              class="fs-muted"
              style="margin-top:3mm"
            >
              ${
                expectedHours
                  ? `Schedule context: ${hoursLabel(expectedHours)} expected for the selected period.`
                  : 'No schedule or attendance target applied.'
              }
            </div>

          </div>

        </div>

        ${
          contexts.length &&
          humanReviewed
            ? `
              <div class="fs-context">

                <b>
                  Reviewer context:
                </b>

                ${
                  contexts
                    .slice(0, 3)
                    .map(
                      (item) =>
                        `${esc(item.label)} — ${esc(item.context)}`
                    )
                    .join(' · ')
                }

                ${
                  contexts.length > 3
                    ? ` · +${contexts.length - 3} additional context item(s)`
                    : ''
                }

              </div>
            `
            : ''
        }

        <div class="fs-sign">

          <div class="fs-signicon">
            ✓
          </div>

          <div>

            <b>
              ${
                humanReviewed
                  ? `Human review signed off | ${esc(reviewerName || 'White Glove Reviewer')}`
                  : 'Human review pending'
              }
            </b>

            <p>
              ${
                humanReviewed
                  ? `${Number(humanChecked || 0)} sample screenshot${Number(humanChecked || 0) === 1 ? '' : 's'} checked; all AI findings reviewed.`
                  : 'This draft cannot be released with the HUMAN REVIEWED stamp until reviewer sign-off.'
              }
            </p>

            <div class="fs-foot">
              ${
                esc(
                  report?.scopeNote ||
                  'Review scope: Supplied screenshots only. Hidden automation and physical mouse movers may not be visible.'
                )
              }
            </div>

          </div>

        </div>

      </section>

    </div>
  `;

  return html;
}

function reportPreview() {
  const employee =
    employeeById(
      state.reportEmployeeId
    ) ||
    currentEmployee();

  return shell(
    employee &&
    state.report
      ? reportMarkup({
          employee,

          report:
            state.report,

          prepared:
            state.prepared,

          meta:
            state.meta,

          period:
            state.period,

          status:
            state.reportStatus,

          reviewerName:
            state.reviewerName,

          humanChecked:
            humanReviewedCount(),
        })
      : `
        <div class="card empty">
          No current report.
        </div>
      `,
    'Fraud Screening Report'
  );
}

function releasedReportView() {
  const released =
    state.released.find(
      (report) =>
        report.id ===
        state.selectedReleaseId
    );

  if (!released) {
    return shell(
      `
        <div class="card empty">
          Released report not found.
        </div>
      `,
      'Released Report'
    );
  }

  const employee = {
    id:
      released.employeeId,

    name:
      released.employeeName,

    employer:
      released.employer,

    role:
      released.role,

    timezone:
      released.timezone,
  };

  return shell(
    reportMarkup({
      employee,

      report:
        released.report,

      prepared:
        released.prepared,

      meta:
        released.meta,

      period:
        released.period,

      status:
        'Released',

      reviewerName:
        released.reviewerName,

      humanChecked:
        released.humanChecked,

      version:
        released.version,

      released:
        true,

      humanDispositions:
        released.humanDispositions || {},

      findingDispositions:
        released.findingDispositions || {},
    }),
    'Released Report'
  );
}

function viewReleasedReport(id) {
  state.selectedReleaseId =
    id;

  state.notifications.forEach(
    (notification) => {
      if (
        notification.reportId === id
      ) {
        notification.read =
          true;
      }
    }
  );

  saveNotifications();

  state.page =
    'releasedReport';

  render();
}

async function releaseCurrentReport() {
  if (
    state.reportStatus !==
    'Approved'
  ) {
    return;
  }

  const employee =
    employeeById(
      state.reportEmployeeId
    ) ||
    currentEmployee();

  if (
    !employee ||
    !state.report
  ) {
    return;
  }

  try {
    const response =
      await fetchJson(
        '/api/reports/release',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              employeeId:
                employee.id,

              employer:
                employee.employer,

              period:
                state.period,
            }),
        }
      );

    const releaseId =
      response.releaseId ||
      `wgm_${Date.now()}`;

    const version =
      nextVersion(
        employee.id,
        state.period
      );

    const preparedSnapshot = {
      sessionKey:
        state.prepared?.sessionKey,

      period:
        state.prepared?.period,

      timezone:
        state.prepared?.timezone,

      metrics:
        state.prepared?.metrics,

      screenshotCount:
        state.prepared?.screenshotCount,

      screenshotDates:
        state.prepared?.screenshotDates,

      screenshotDateCounts:
        state.prepared?.screenshotDateCounts,

      humanSample: {
        count:
          state.prepared?.humanSample?.count || 0,

        target:
          state.prepared?.humanSample?.target || 0,
      },

      scanPlan:
        state.prepared?.scanPlan,

      versions:
        state.prepared?.versions,
    };

    const snapshot = {
      id:
        releaseId,

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
        employeeTimezone(employee),

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
            state.meta || {}
          )
        ),

      reviewerName:
        state.reviewerName,

      humanChecked:
        humanReviewedCount(),

      unresolved:
        unresolvedCount(),

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

      releasedAt:
        response.releasedAt ||
        new Date().toISOString(),

      status:
        'Released',
    };

    state.released.push(
      snapshot
    );

    saveReleased();

    state.notifications.push({
      id:
        `notice_${releaseId}`,

      employer:
        employee.employer,

      employeeId:
        employee.id,

      reportId:
        releaseId,

      title:
        `${monthLabel(state.period.from)} Fraud Screening & Activity Review — ${employee.name}`,

      message:
        `White Glove has completed human review and released the ${monthLabel(state.period.from)} screening report for ${employee.name}.`,

      read:
        false,

      createdAt:
        snapshot.releasedAt,
    });

    saveNotifications();

    state.reportStatus =
      'Released';

    employee.reportingStatus =
      'Released';

    saveEmployees();

    render();

    toast(
      'Report released. Employer notification created.'
    );

  } catch (error) {
    toast(
      `Could not release report: ${error.message}`
    );
  }
}

function releaseTable(reports) {
  return `
    <table>

      <thead>

        <tr>
          <th>Employee</th>
          <th>Employer</th>
          <th>Month</th>
          <th>Version</th>
          <th>Released</th>
          <th></th>
        </tr>

      </thead>

      <tbody>

        ${
          reports
            .map(
              (report) => `
                <tr>

                  <td>
                    ${esc(report.employeeName)}
                  </td>

                  <td>
                    ${esc(report.employer || '')}
                  </td>

                  <td>
                    ${esc(monthLabel(report.period.from))}
                  </td>

                  <td>
                    v${report.version}
                  </td>

                  <td>
                    ${new Date(report.releasedAt).toLocaleString()}
                  </td>

                  <td>

                    <button
                      class="btn"
                      data-view-release="${esc(report.id)}"
                    >
                      View Report
                    </button>

                  </td>

                </tr>
              `
            )
            .join('')
        }

      </tbody>

    </table>
  `;
}

/* ==========================================================
   DATA SOURCES / SETTINGS
   ========================================================== */

function dataSourcesPage() {
  const connections =
    state.connections.length
      ? state.connections
      : [
          {
            id:
              'wgh-main',

            name:
              'WGH Main Scrin Account',

            type:
              'shared',

            status:
              state.mode === 'LIVE'
                ? 'connected'
                : 'configured',
          },
        ];

  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            Data Sources
          </h2>

          <p>
            Scrin is the current capture provider.

            Additional Scrin API data can be added next
            without changing the report workflow.
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
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            ${
              connections
                .map(
                  (connection) => `
                    <tr>

                      <td>
                        ${esc(connection.name || connection.id)}
                      </td>

                      <td>
                        ${
                          connection.type === 'dedicated'
                            ? 'Dedicated Employer'
                            : 'WGH Shared'
                        }
                      </td>

                      <td>

                        <span
                          class="status ${statusClass(connection.status || 'configured')}"
                        >
                          <span class="dot"></span>
                          ${esc(connection.status || 'configured')}
                        </span>

                      </td>

                    </tr>
                  `
                )
                .join('')
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
    `,
    'Data Sources'
  );
}

function settingsPage() {
  return shell(
    `
      <div class="header-row">

        <div>

          <h2>
            Settings
          </h2>

          <p>
            Map each Scrin employee to the correct employer
            and set the employee timezone used
            for screenshot-date assignment.
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
            ${esc(state.syncMessage)}
          </div>

        </div>

        <div class="card panel">

          <div class="panel-title">
            Report Engine
          </div>

          <p class="small">
            Full-month screenshot screening
            + stable 30–66 human sample.
          </p>

          <span class="status green">
            <span class="dot"></span>
            wgm-full-month-screening-1.0
          </span>

        </div>

      </div>

      <div
        class="card panel"
        style="margin-top:16px"
      >

        <table>

          <thead>

            <tr>
              <th>Employee</th>
              <th>Employer</th>
              <th>IANA timezone</th>
              <th>Exclude</th>
              <th>Expected hours</th>
            </tr>

          </thead>

          <tbody>

            ${
              state.employees
                .map(
                  (employee) => `
                    <tr>

                      <td>
                        ${esc(employee.name)}
                      </td>

                      <td>

                        ${
                          employee.employerLocked
                            ? `
                              <input
                                class="map-input"
                                value="${esc(employee.employer || employee.connectionEmployer || '')}"
                                disabled
                              >
                            `
                            : `
                              <input
                                class="map-input"
                                data-map-employer="${esc(employee.id)}"
                                value="${esc(employee.employer || '')}"
                              >
                            `
                        }

                      </td>

                      <td>

                        <input
                          class="map-input"
                          data-map-timezone="${esc(employee.id)}"
                          value="${esc(employee.timezone || '')}"
                          placeholder="America/Los_Angeles"
                        >

                      </td>

                      <td>

                        ${
                          employee.employerLocked
                            ? 'N/A'
                            : `
                              <input
                                type="checkbox"
                                data-map-excluded="${esc(employee.id)}"
                                ${employee.excluded ? 'checked' : ''}
                              >
                            `
                        }

                      </td>

                      <td>

                        <input
                          class="map-input"
                          data-map-hours="${esc(employee.id)}"
                          type="number"
                          min="0"
                          step="0.5"
                          value="${Number(employee.expectedHours || 0)}"
                        >

                      </td>

                    </tr>
                  `
                )
                .join('')
            }

          </tbody>

        </table>

        <div
          class="small"
          style="margin-top:10px"
        >
          Use a real IANA timezone such as
          <b>America/Los_Angeles</b>.

          This is what keeps Scrin capture dates correct across DST.
        </div>

        <button
          class="btn gold"
          id="saveMappings"
          style="margin-top:16px"
        >
          Save mappings
        </button>

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
      (input) => {
        const employee =
          employeeById(
            input.dataset.mapEmployer
          );

        if (
          employee &&
          !employee.employerLocked
        ) {
          employee.employer =
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
        const employee =
          employeeById(
            input.dataset.mapTimezone
          );

        if (employee) {
          employee.timezone =
            input.value.trim();
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-excluded]'
    )
    .forEach(
      (input) => {
        const employee =
          employeeById(
            input.dataset.mapExcluded
          );

        if (
          employee &&
          !employee.employerLocked
        ) {
          employee.excluded =
            input.checked;
        }
      }
    );

  document
    .querySelectorAll(
      '[data-map-hours]'
    )
    .forEach(
      (input) => {
        const employee =
          employeeById(
            input.dataset.mapHours
          );

        if (employee) {
          employee.expectedHours =
            Number(
              input.value || 0
            );
        }
      }
    );

  state.employees.forEach(
    (employee) => {
      if (
        employee.employerLocked
      ) {
        employee.employer =
          employee.connectionEmployer ||
          employee.employer;

        employee.excluded =
          false;
      }
    }
  );

  saveEmployees();

  const unmapped =
    state.employees.filter(
      (employee) =>
        !employee.excluded &&
        !String(
          employee.employer || ''
        ).trim()
    );

  if (unmapped.length) {
    toast(
      `${unmapped.length} active employee(s) still need an employer mapping.`
    );
    return;
  }

  ensureEmployerSelection();

  toast(
    'Employer, timezone, and expected-hour settings saved.'
  );
}

function mergeEmployee(
  incoming,
  prior
) {
  const old =
    prior.find(
      (employee) =>
        String(employee.id) ===
        String(incoming.id)
    ) || {};

  const dedicatedEmployer =
    incoming.employerLocked
      ? (
          incoming.connectionEmployer ||
          incoming.employer ||
          ''
        )
      : null;

  return {
    ...old,
    ...incoming,

    id:
      incoming.id ||
      `${incoming.connectionId || 'scrin'}::${incoming.employmentId}`,

    initials:
      initials(incoming.name),

    employer:
      dedicatedEmployer !== null
        ? dedicatedEmployer
        : (
            old.employer ||
            incoming.employer ||
            ''
          ),

    excluded:
      incoming.employerLocked
        ? false
        : Boolean(old.excluded),

    expectedHours:
      Number(
        old.expectedHours ??
        incoming.expectedHours ??
        160
      ),

    timezone:
      old.timezone ||
      incoming.timezone ||
      '',

    timezoneOffsetMinutes:
      Number(
        old.timezoneOffsetMinutes ??
        incoming.timezoneOffsetMinutes ??
        0
      ),

    shots:
      old.shots || [],

    daySummary:
      old.daySummary || null,

    lastAnalytics:
      old.lastAnalytics || null,

    reportingStatus:
      old.reportingStatus ||
      incoming.reportingStatus ||
      'Synced',
  };
}

async function syncScrin() {
  state.syncMessage =
    'Syncing…';

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
      )
        .map(
          (employee) =>
            mergeEmployee(
              employee,
              prior
            )
        );

    if (
      !state.employees.length
    ) {
      throw new Error(
        'No employment records returned'
      );
    }

    if (
      !state.employees.some(
        (employee) =>
          String(employee.id) ===
          String(state.selectedEmployeeId)
      )
    ) {
      state.selectedEmployeeId =
        activeEmployees()[0]?.id ||
        state.employees[0].id;
    }

    saveEmployees();
    saveConnections();

    state.mode =
      data.demo
        ? 'DEMO'
        : 'LIVE';

    state.syncMessage =
      `${state.employees.length} employment record(s) loaded from ${state.connections.length} connection(s).`;

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
      `${data.employees?.length || 0} employment record(s) available.`
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
    output = dashboard();
  }

  else if (
    state.page === 'employees'
  ) {
    output = employeesPage();
  }

  else if (
    state.page === 'monitoring'
  ) {
    output = monitoringPage();
  }

  else if (
    state.page === 'reports'
  ) {
    output = reportsPage();
  }

  else if (
    state.page === 'review'
  ) {
    output = reviewPage();
  }

  else if (
    state.page === 'dataSources'
  ) {
    output = dataSourcesPage();
  }

  else if (
    state.page === 'settings'
  ) {
    output = settingsPage();
  }

  else if (
    state.page === 'reportPreview'
  ) {
    output = reportPreview();
  }

  else if (
    state.page === 'releasedReport'
  ) {
    output = releasedReportView();
  }

  document
    .getElementById('app')
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
              button.dataset.page;

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
            const employee =
              employeeById(
                button.dataset.openId
              );

            if (
              state.role === 'employer' &&
              employee?.employer !==
                state.portalEmployer
            ) {
              toast(
                'Employee is outside this employer portal.'
              );
              return;
            }

            state.selectedEmployeeId =
              button.dataset.openId;

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
              button.dataset.tab;

            render();
          };
      }
    );

  document
    .querySelectorAll(
      '[data-view-release]'
    )
    .forEach(
      (button) => {
        button.onclick =
          () =>
            viewReleasedReport(
              button.dataset.viewRelease
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
                checkbox.dataset.check
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
                input.dataset.sampleDecision
              );

            const current =
              state.humanDispositions[id] || {
                decision: '',
                context: '',
              };

            state.humanDispositions[id] = {
              ...current,
              decision: input.value,
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
                textarea.dataset.sampleContext
              );

            const current =
              state.humanDispositions[id] || {
                decision: 'needs_context',
                context: '',
              };

            state.humanDispositions[id] = {
              ...current,
              context: textarea.value,
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
            const index =
              Number(
                input.dataset.findingDecision
              );

            const current =
              state.findingDispositions[index] || {
                decision: '',
                context: '',
              };

            state.findingDispositions[index] = {
              ...current,
              decision: input.value,
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
            const index =
              Number(
                textarea.dataset.findingContext
              );

            const current =
              state.findingDispositions[index] || {
                decision: 'needs_context',
                context: '',
              };

            state.findingDispositions[index] = {
              ...current,
              context: textarea.value,
            };
          };
      }
    );

  const roleSwitcher =
    document
      .getElementById(
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
    document
      .getElementById(
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
          portalEmployees()[0]?.id ||
          '';

        render();
      };
  }

  const sync =
    document
      .getElementById(
        'syncScrin'
      );

  if (sync) {
    sync.onclick =
      syncScrin;
  }

  const test =
    document
      .getElementById(
        'testScrin'
      );

  if (test) {
    test.onclick =
      testScrin;
  }

  const refresh =
    document
      .getElementById(
        'refreshConnections'
      );

  if (refresh) {
    refresh.onclick =
      refreshConnections;
  }

  const saveMappingsButton =
    document
      .getElementById(
        'saveMappings'
      );

  if (saveMappingsButton) {
    saveMappingsButton.onclick =
      saveMappings;
  }

  const loadDay =
    document
      .getElementById(
        'loadLiveDay'
      );

  if (loadDay) {
    loadDay.onclick =
      loadLiveDay;
  }

  const generate =
    document
      .getElementById(
        'generateBtn'
      );

  if (generate) {
    generate.onclick =
      generateReport;
  }

  const reviewerName =
    document
      .getElementById(
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
    document
      .getElementById(
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

  const preview2 =
    document
      .getElementById(
        'previewReport2'
      );

  if (preview2) {
    preview2.onclick =
      () => {
        state.page =
          'reportPreview';

        render();
      };
  }

  const approve =
    document
      .getElementById(
        'approveBtn'
      );

  if (approve) {
    approve.onclick =
      approveHumanReview;
  }

  const release =
    document
      .getElementById(
        'releaseBtn'
      );

  if (release) {
    release.onclick =
      releaseCurrentReport;
  }

  const print =
    document
      .getElementById(
        'printReport'
      );

  if (print) {
    print.onclick =
      () =>
        window.print();
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

  } catch {}

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
