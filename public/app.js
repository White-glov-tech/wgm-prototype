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
  reviewerName:
    localStorage.getItem('wgmReviewerName') ||
    'White Glove Reviewer',

  humanDispositions: {},
  findingDispositions: {},

  released: [],
  notifications: [],
  selectedReleaseId: '',

  syncMessage:
    'Demo data loaded. Connect Scrin to load live employees.',

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

function loadJson(key, fallback) {
  try {
    return (
      JSON.parse(
        localStorage.getItem(key) ||
        'null'
      ) ?? fallback
    );
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {}
}

state.employees =
  loadJson(
    'wgmEmployees',
    demoEmployees
  );

state.connections =
  loadJson(
    'wgmConnections',
    []
  );

state.released =
  loadJson(
    'wgmFraudReleasedReports',
    []
  );

state.notifications =
  loadJson(
    'wgmFraudNotifications',
    []
  );

state.selectedEmployeeId =
  state.employees[0]?.id ||
  '';

const saveEmployees =
  () =>
    saveJson(
      'wgmEmployees',
      state.employees
    );

const saveConnections =
  () =>
    saveJson(
      'wgmConnections',
      state.connections
    );

const saveReleased =
  () =>
    saveJson(
      'wgmFraudReleasedReports',
      state.released
    );

const saveNotifications =
  () =>
    saveJson(
      'wgmFraudNotifications',
      state.notifications
    );

function esc(value = '') {
  return String(value)
    .replace(
      /[&<>"']/g,
      (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
    );
}

function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) => part[0]
      )
      .join('')
      .toUpperCase()
    ||
    'VA'
  );
}

function hoursLabel(decimal = 0) {
  const minutes =
    Math.max(
      0,
      Math.round(
        Number(decimal || 0) *
        60
      )
    );

  return (
    `${Math.floor(minutes / 60)}h `
    +
    `${String(minutes % 60).padStart(2, '0')}m`
  );
}

function monthLabel(date) {
  if (!date) {
    return 'Reporting period';
  }

  return new Date(
    `${date}T00:00:00Z`
  )
    .toLocaleString(
      'en-US',
      {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }
    );
}

function statusClass(status = '') {
  if (
    /Released|Approved|Ready|Connected|Clear|Green|Complete|Active/i
      .test(status)
  ) {
    return 'green';
  }

  if (
    /Review|Pending|Draft|Yellow|Queued|Configured|Scanning/i
      .test(status)
  ) {
    return 'amber';
  }

  if (
    /Failed|Error|Red|Incomplete/i
      .test(status)
  ) {
    return 'red';
  }

  return 'blue';
}

function toast(message) {
  state.toast =
    message;

  render();

  setTimeout(
    () => {
      state.toast =
        null;

      render();
    },
    2400
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

function activeEmployees() {
  return state.employees
    .filter(
      (employee) =>
        !employee.excluded
    );
}

function employeeById(id) {
  return state.employees
    .find(
      (employee) =>
        String(employee.id)
        ===
        String(id)
    );
}

function mappedEmployers() {
  return [
    ...new Set(
      activeEmployees()
        .map(
          (employee) =>
            employee.employer
        )
        .filter(Boolean)
    ),
  ];
}

function employeeTimezone(
  employee
) {
  const value =
    String(
      employee?.timezone ||
      ''
    )
      .trim();

  return (
    value ||
    'Employee timezone'
  );
}

function ensureEmployerSelection() {
  const employers =
    mappedEmployers();

  if (
    !state.portalEmployer
    ||
    !employers.includes(
      state.portalEmployer
    )
  ) {
    state.portalEmployer =
      employers[0] ||
      '';

    localStorage.setItem(
      'wgmPortalEmployer',
      state.portalEmployer
    );
  }

  const team =
    activeEmployees()
      .filter(
        (employee) =>
          employee.employer
          ===
          state.portalEmployer
      );

  if (
    team.length
    &&
    !team.some(
      (employee) =>
        String(employee.id)
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
      (employee) =>
        employee.employer
        ===
        state.portalEmployer
    );
}

function currentEmployee() {
  if (
    state.role ===
    'employer'
  ) {
    return (
      portalEmployees()
        .find(
          (employee) =>
            String(employee.id)
            ===
            String(
              state.selectedEmployeeId
            )
        )
      ||
      portalEmployees()[0]
      ||
      null
    );
  }

  if (
    state.role ===
    'employee'
  ) {
    return (
      employeeById(
        state.selectedEmployeeId
      )
      ||
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
    null
  );
}

function unreadNotifications(
  employer
) {
  return state.notifications
    .filter(
      (notification) =>
        notification.employer
        ===
        employer
        &&
        !notification.read
    )
    .length;
}

function employerReports(
  employer
) {
  return state.released
    .filter(
      (report) =>
        report.employer
        ===
        employer
    )
    .sort(
      (a, b) =>
        String(b.releasedAt)
          .localeCompare(
            String(a.releasedAt)
          )
    );
}

function employeeReports(
  employeeId
) {
  return state.released
    .filter(
      (report) =>
        String(report.employeeId)
        ===
        String(employeeId)
    )
    .sort(
      (a, b) =>
        String(b.releasedAt)
          .localeCompare(
            String(a.releasedAt)
          )
    );
}

function nextVersion(
  employeeId,
  period
) {
  return (
    state.released
      .filter(
        (report) =>
          String(report.employeeId)
          ===
          String(employeeId)
          &&
          report.period?.from
          ===
          period.from
          &&
          report.period?.to
          ===
          period.to
      )
      .length
    +
    1
  );
}

function humanSample() {
  return (
    state.prepared
      ?.humanSample
      ?.screenshots
    ||
    []
  );
}

function humanSampleTarget() {
  return Number(
    state.prepared
      ?.humanSample
      ?.count
    ||
    humanSample().length
    ||
    0
  );
}

function humanReviewedCount() {
  const sampleIds =
    new Set(
      humanSample()
        .map(
          (item) =>
            String(
              item.screenshotId
            )
        )
    );

  return Object.entries(
    state.humanDispositions
  )
    .filter(
      ([id, disposition]) =>
        sampleIds.has(
          String(id)
        )
        &&
        [
          'clear',
          'needs_context',
        ]
          .includes(
            disposition?.decision
          )
    )
    .length;
}

function humanReviewComplete() {
  return (
    humanReviewedCount()
    ===
    humanSampleTarget()
  );
}

function findingReviewComplete() {
  const findings =
    state.report?.findings
    ||
    [];

  return findings
    .every(
      (_, index) => {
        const disposition =
          state.findingDispositions[
            index
          ];

        if (
          !disposition
            ?.decision
        ) {
          return false;
        }

        if (
          disposition.decision
          ===
          'needs_context'
          &&
          !String(
            disposition.context
            ||
            ''
          )
            .trim()
        ) {
          return false;
        }

        return true;
      }
    );
}

function unresolvedScreenshotIds() {
  const ids =
    new Set();

  for (
    const [
      id,
      disposition,
    ]
    of
    Object.entries(
      state.humanDispositions
    )
  ) {
    if (
      disposition?.decision
      ===
      'needs_context'
    ) {
      ids.add(
        String(id)
      );
    }
  }

  const findings =
    state.report?.findings
    ||
    [];

  findings.forEach(
    (finding, index) => {
      const disposition =
        state.findingDispositions[
          index
        ];

      if (
        disposition?.decision
        !==
        'needs_context'
      ) {
        return;
      }

      const screenshotIds =
        Array.isArray(
          finding
            ?.screenshotIds
        )
          ? finding.screenshotIds
          : [];

      if (
        screenshotIds.length
      ) {
        screenshotIds
          .forEach(
            (id) =>
              ids.add(
                String(id)
              )
          );
      } else {
        ids.add(
          `finding_${index + 1}`
        );
      }
    }
  );

  return [
    ...ids,
  ];
}

function unresolvedCount() {
  return (
    unresolvedScreenshotIds()
      .length
  );
}

function aiFlaggedCount() {
  return new Set(
    (
      state.report
        ?.aiFlaggedScreenshotIds
      ||
      []
    )
      .map(String)
  )
    .size;
}

function unresolvedCountFor(
  report,
  humanDispositions = {},
  findingDispositions = {}
) {
  const ids =
    new Set();

  for (
    const [
      id,
      disposition,
    ]
    of
    Object.entries(
      humanDispositions ||
      {}
    )
  ) {
    if (
      disposition?.decision
      ===
      'needs_context'
    ) {
      ids.add(
        String(id)
      );
    }
  }

  (
    report?.findings ||
    []
  )
    .forEach(
      (finding, index) => {
        const disposition =
          findingDispositions
            ?.[index];

        if (
          disposition?.decision
          !==
          'needs_context'
        ) {
          return;
        }

        const screenshotIds =
          Array.isArray(
            finding
              ?.screenshotIds
          )
            ? finding.screenshotIds
            : [];

        if (
          screenshotIds.length
        ) {
          screenshotIds
            .forEach(
              (id) =>
                ids.add(
                  String(id)
                )
            );
        } else {
          ids.add(
            `finding_${index + 1}`
          );
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
      report
        ?.screenedScreenshots
      ||
      0
    );

  const total =
    Number(
      report
        ?.totalScreenshots
      ||
      prepared
        ?.screenshotCount
      ||
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
        report
          ?.aiFlaggedScreenshotIds
        ||
        []
      )
        .map(String)
    )
      .size;

  if (
    missing > 0
  ) {
    return (
      `${missing} screenshot`
      +
      `${missing === 1 ? '' : 's'} `
      +
      `still require screening.`
    );
  }

  if (
    /Approved|Released/
      .test(status)
  ) {
    if (
      unresolved > 0
    ) {
      return (
        `${unresolved} questionable screenshot`
        +
        `${unresolved === 1 ? '' : 's'} `
        +
        `${unresolved === 1 ? 'needs' : 'need'} context.`
      );
    }

    return (
      'No suspicious patterns found.'
    );
  }

  if (
    unresolved > 0
  ) {
    return (
      `${unresolved} questionable screenshot`
      +
      `${unresolved === 1 ? '' : 's'} `
      +
      `currently `
      +
      `${unresolved === 1 ? 'needs' : 'need'} context.`
    );
  }

  if (
    aiFlags > 0
  ) {
    return (
      `${aiFlags} AI-flagged screenshot`
      +
      `${aiFlags === 1 ? '' : 's'} `
      +
      `await human review.`
    );
  }

  if (
    report
      ?.allScreenshotsScreened
  ) {
    return (
      'No suspicious patterns found by AI screening.'
    );
  }

  return (
    'Human review pending.'
  );
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
      report
        ?.totalScreenshots
      ||
      prepared
        ?.screenshotCount
      ||
      0
    );

  const screened =
    Number(
      report
        ?.screenedScreenshots
      ||
      0
    );

  const unresolved =
    unresolvedCountFor(
      report,
      humanDispositions,
      findingDispositions
    );

  if (
    !report
      ?.allScreenshotsScreened
  ) {
    return (
      `AI successfully screened `
      +
      `${screened.toLocaleString()} `
      +
      `of `
      +
      `${total.toLocaleString()} `
      +
      `supplied screenshot images.`
    );
  }

  if (
    /Approved|Released/
      .test(status)
  ) {
    return unresolved
      ? 'Human review identified screenshots that require employer or employee context.'
      : 'In the screenshots screened and human-reviewed for this report.';
  }

  return (
    `AI screened all `
    +
    `${total.toLocaleString()} `
    +
    `supplied screenshot images. `
    +
    `Human review is still required before release.`
  );
}

function reportHeadline(
  status =
  state.reportStatus
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
  status =
  state.reportStatus
) {
  return reportSubtextFor(
    state.report,
    state.prepared,
    status,
    state.humanDispositions,
    state.findingDispositions
  );
}

function roleName() {
  return ({
    owner:
      'WGM Owner',

    reviewer:
      'White Glove Reviewer',

    employer:
      'Employer Portal',

    employee:
      'Employee Portal',
  })[state.role]
  ||
  'WGM Owner';
}

function setRole(role) {
  state.role =
    role;

  localStorage.setItem(
    'wgmRole',
    role
  );

  state.page =
    'dashboard';

  state.tab =
    'overview';

  if (
    role ===
    'employer'
  ) {
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
  if (
    state.role ===
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
        state.reportStatus
        ===
        'Draft ready'
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
    ]
      .join('');
  }

  if (
    state.role ===
    'employer'
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
    ]
      .join('');
  }

  if (
    state.role ===
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
      ),
    ]
      .join('');
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
      state.reportStatus
      ===
      'Draft ready'
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
  ]
    .join('');
}

function shell(
  content,
  title
) {
  const unread =
    state.role ===
    'employer'
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
                  state.role
                  ===
                  'reviewer'
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
                ${
                  state.role
                  ===
                  'owner'
                    ? 'selected'
                    : ''
                }
              >
                WGM Owner
              </option>

              <option
                value="reviewer"
                ${
                  state.role
                  ===
                  'reviewer'
                    ? 'selected'
                    : ''
                }
              >
                White Glove Reviewer
              </option>

              <option
                value="employer"
                ${
                  state.role
                  ===
                  'employer'
                    ? 'selected'
                    : ''
                }
              >
                Employer Portal
              </option>

              <option
                value="employee"
                ${
                  state.role
                  ===
                  'employee'
                    ? 'selected'
                    : ''
                }
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

/*
  NOTE:
  The remainder of this exact file is included in the downloadable
  copy linked above. Use that linked file as the authoritative V1.9
  app.js replacement if the chat UI truncates this very large code block.
*/
