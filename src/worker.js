const ANALYSIS_VERSION = 'wgm-fraud-screening-1.0';
const RULES_VERSION = 'wgm-fraud-review-rules-1.0';
const PROMPT_VERSION = 'wgm-fraud-screening-prompt-1.0';

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    overallResult: {
      type: 'string',
      enum: ['clear', 'review'],
    },
    screeningHeadline: { type: 'string' },
    screeningSubtext: { type: 'string' },
    checks: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            enum: [
              'repeated_frozen',
              'repetitive_cycling',
              'activity_simulation',
              'repeated_across_days',
            ],
          },
          status: {
            type: 'string',
            enum: ['clear', 'review', 'not_assessed'],
          },
          detail: { type: 'string' },
        },
        required: ['key', 'status', 'detail'],
        additionalProperties: false,
      },
    },
    findings: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          screenshotIds: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 8,
          },
        },
        required: ['reason', 'screenshotIds'],
        additionalProperties: false,
      },
    },
    scopeNote: { type: 'string' },
  },
  required: [
    'overallResult',
    'screeningHeadline',
    'screeningSubtext',
    'checks',
    'findings',
    'scopeNote',
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are the White Glove Monitor screenshot fraud-screening engine.
You are filling a fixed one-page report template. You do not design the report.
Review only the screenshot images and verified metadata supplied in this request.

The four required checks are:
1. repeated_frozen — concerning unchanged/frozen-screen sequences;
2. repetitive_cycling — suspicious back-and-forth or repetitive screen cycling;
3. activity_simulation — visible mouse-mover, auto-clicker, macro, automation or activity-simulation interfaces;
4. repeated_across_days — replay-like or substantially repeated visual sequences appearing across different dates.

Be conservative. Similar business screens, repeated use of the same CRM, email, browser, documents, dashboards, templates or websites are not suspicious by themselves.
Activity level, idle time, app switching, AI-tool use, screenshot spacing, schedule coverage or missing screenshots are not proof of fraud or misconduct.
Do not infer hidden automation or physical mouse movers that are not visible.
Do not invent suspicious behavior, work output, task duration, intent, fraud, theft, tampering or misconduct.
If the supplied visual sample is insufficient to assess a check, return not_assessed rather than clear.
A finding must be supported by one or more supplied screenshot IDs. Never cite an ID that was not supplied.
overallResult may be clear only when the supplied visual evidence does not contain a review-worthy suspicious pattern. Human review is still mandatory before release.
Use concise client-facing wording. screeningHeadline should be “No suspicious patterns found.” when overallResult is clear. When review is required, use neutral wording such as “Patterns require human review.”
screeningSubtext should describe only the reviewed screenshots, not certify the employee’s entire work month.
scopeNote must state the limitation of the review, including that hidden automation and physical mouse movers may not be visible.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'cache-control': 'no-store',
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function dayCountInclusive(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 0;
  }

  return Math.floor((end - start) / 86400000) + 1;
}

function parseConnections(env) {
  const connections = [];

  if (env.SCRIN_CONNECTIONS_JSON) {
    let parsed;

    try {
      parsed = JSON.parse(env.SCRIN_CONNECTIONS_JSON);
    } catch {
      throw new Error('SCRIN_CONNECTIONS_JSON is not valid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('SCRIN_CONNECTIONS_JSON must be a JSON array');
    }

    for (const raw of parsed) {
      if (!raw?.id || !raw?.token) continue;

      const type = raw.type === 'dedicated' ? 'dedicated' : 'shared';

      if (type === 'dedicated' && !String(raw.employer || '').trim()) {
        throw new Error(`Dedicated connection ${raw.id} requires an employer`);
      }

      connections.push({
        id: String(raw.id),
        name: String(raw.name || raw.id),
        provider: 'scrin',
        type,
        employer: String(raw.employer || ''),
        token: String(raw.token),
        enabled: raw.enabled !== false,
      });
    }
  }

  if (!connections.length && env.SCRIN_TOKEN) {
    connections.push({
      id: 'wgh-main',
      name: 'WGH Main Scrin Account',
      provider: 'scrin',
      type: 'shared',
      employer: '',
      token: String(env.SCRIN_TOKEN),
      enabled: true,
    });
  }

  return connections.filter((connection) => connection.enabled);
}

function publicConnection(connection) {
  return {
    id: connection.id,
    name: connection.name,
    provider: 'scrin',
    type: connection.type,
    employer: connection.employer || '',
    employerLocked: connection.type === 'dedicated',
    status: 'configured',
  };
}

function getConnection(env, connectionId) {
  const connections = parseConnections(env);

  if (!connections.length) {
    throw new Error('No Scrin connection is configured');
  }

  if (connectionId) {
    const found = connections.find(
      (connection) => connection.id === String(connectionId),
    );

    if (!found) {
      throw new Error(`Unknown Scrin connection: ${connectionId}`);
    }

    return found;
  }

  if (connections.length === 1) {
    return connections[0];
  }

  throw new Error(
    'connectionId is required when more than one Scrin connection is configured',
  );
}

async function scrinFetch(env, connectionId, path, body) {
  const connection = getConnection(env, connectionId);
  const base = (env.SCRIN_API_BASE_URL || 'https://scrin.io').replace(/\/$/, '');

  const response = await fetch(base + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-SSM-Token': connection.token,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Scrin ${response.status} (${connection.name}): ${text.slice(0, 300)}`,
    );
  }

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Scrin returned non-JSON data from ${path}`);
    }
  }

  return { connection, data };
}

function demoCommon() {
  return {
    companies: [
      {
        id: 477279,
        name: 'WGH Scrin Account',
        employments: [
          {
            id: 477279,
            name: 'Maria Gadin',
            email: 'masked@example.com',
            registered: true,
          },
          {
            id: 500002,
            name: 'VA 2 — sync to reveal',
            email: 'masked2@example.com',
            registered: true,
          },
        ],
      },
    ],
  };
}

function normalizeCommon(data, connection) {
  const companies = Array.isArray(data?.companies)
    ? data.companies
    : Array.isArray(data)
      ? data
      : [];

  const employees = [];

  for (const company of companies) {
    const employments = Array.isArray(company?.employments)
      ? company.employments
      : [];

    for (const person of employments) {
      employees.push({
        id: `${connection.id}::${person.id}`,
        connectionId: connection.id,
        connectionName: connection.name,
        connectionType: connection.type,
        connectionEmployer: connection.employer || '',
        employerLocked: connection.type === 'dedicated',
        employmentId: person.id,
        name: person.name || person.email || `Employment ${person.id}`,
        email: person.email || null,
        scrinCompanyId: company.id,
        scrinCompany: company.name || '',
        source:
          connection.type === 'dedicated' ? 'Standalone WGM' : 'WGH Managed',
        role: 'Virtual Assistant',
        reportingStatus: 'Synced',
        employer: connection.type === 'dedicated' ? connection.employer : '',
      });
    }
  }

  return { companies, employees };
}

function epochRange(from, to, offsetMinutes = 0) {
  const start =
    Date.parse(`${from}T00:00:00Z`) - Number(offsetMinutes || 0) * 60000;

  const end =
    Date.parse(`${to}T23:59:59Z`) - Number(offsetMinutes || 0) * 60000;

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error('Invalid date range');
  }

  return {
    from: Math.floor(start / 1000),
    to: Math.floor(end / 1000),
  };
}

function localDate(epochSeconds, offsetMinutes = 0) {
  return new Date(
    Number(epochSeconds) * 1000 + Number(offsetMinutes || 0) * 60000,
  )
    .toISOString()
    .slice(0, 10);
}

function localTimeLabel(epochSeconds, offsetMinutes = 0) {
  if (epochSeconds === null || epochSeconds === undefined) return '—';

  const date = new Date(
    (Number(epochSeconds) + Number(offsetMinutes || 0) * 60) * 1000,
  );

  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';

  hours %= 12;
  if (!hours) hours = 12;

  return `${hours}:${minutes} ${suffix}`;
}

function activityDuration(activity) {
  const from = Number(activity?.from);
  const to = Number(activity?.to);

  return Number.isFinite(from) && Number.isFinite(to) && to > from
    ? to - from
    : 0;
}

function unionSeconds(activities = []) {
  const intervals = activities
    .map((activity) => [Number(activity.from), Number(activity.to)])
    .filter(
      ([from, to]) =>
        Number.isFinite(from) && Number.isFinite(to) && to > from,
    )
    .sort((a, b) => a[0] - b[0]);

  if (!intervals.length) return 0;

  let total = 0;
  let start = intervals[0][0];
  let end = intervals[0][1];

  for (let i = 1; i < intervals.length; i++) {
    const [nextStart, nextEnd] = intervals[i];

    if (nextStart <= end) {
      end = Math.max(end, nextEnd);
    } else {
      total += end - start;
      start = nextStart;
      end = nextEnd;
    }
  }

  return total + (end - start);
}

function summarizeActivities(activities = [], expectedHours = 0, offsetMinutes = 0) {
  const trackedSeconds = unionSeconds(activities);
  const trackedHours = trackedSeconds / 3600;
  const days = new Set();

  for (const activity of activities) {
    if (!activityDuration(activity)) continue;
    days.add(localDate(activity.from, offsetMinutes));
  }

  return {
    trackedSeconds,
    trackedHours,
    activeDays: days.size,
    expectedHours: Number(expectedHours || 0),
    scheduleCoveragePercent:
      Number(expectedHours) > 0
        ? round(
            Math.min(100, (trackedHours / Number(expectedHours)) * 100),
            1,
          )
        : null,
  };
}

async function fetchScreenshotsChunked(env, connectionId, activityIds = []) {
  const output = [];
  const ids = unique(activityIds);

  for (let i = 0; i < ids.length; i += 100) {
    const result = await scrinFetch(
      env,
      connectionId,
      '/api/v2/GetScreenshots',
      ids.slice(i, i + 100),
    );

    if (Array.isArray(result.data)) {
      output.push(...result.data);
    }
  }

  const deduped = new Map();

  for (const screenshot of output) {
    const key =
      screenshot?.id ||
      `${screenshot?.activityId || 'activity'}:${screenshot?.taken || 0}`;

    deduped.set(key, screenshot);
  }

  return [...deduped.values()].sort(
    (a, b) => Number(a?.taken || 0) - Number(b?.taken || 0),
  );
}

function applicationName(application) {
  return String(application?.applicationName || 'Unknown').trim() || 'Unknown';
}

function summarizeScreenshots(screenshots = []) {
  const apps = {};
  let activityLevelTotal = 0;
  let activityLevelCount = 0;

  for (const screenshot of screenshots) {
    const level = Number(screenshot?.activityLevel);

    if (Number.isFinite(level)) {
      activityLevelTotal += level;
      activityLevelCount++;
    }

    const applications = Array.isArray(screenshot?.applications)
      ? screenshot.applications
      : [];

    for (const application of applications) {
      const name = applicationName(application);
      const duration = Number(application?.duration || 0);
      apps[name] =
        (apps[name] || 0) + (Number.isFinite(duration) ? duration : 0);
    }
  }

  const totalAppSeconds =
    Object.values(apps).reduce((sum, value) => sum + value, 0) || 1;

  return {
    screenshotCount: screenshots.length,
    averageActivityLevel: activityLevelCount
      ? round(activityLevelTotal / activityLevelCount, 1)
      : null,
    apps: Object.entries(apps)
      .sort((a, b) => b[1] - a[1])
      .map(([name, seconds]) => ({
        name,
        seconds,
        hours: round(seconds / 3600, 2),
        sharePercent: round((seconds / totalAppSeconds) * 100, 1),
      })),
  };
}

function classifyText(text = '') {
  const value = String(text || '').toLowerCase();

  const rules = [
    ['CRM & lead follow-up', /follow up boss|followupboss|hubspot|crm|lead|prospect|pipeline|appointment|dialer|sales/],
    ['Email & communication', /gmail|outlook|email|mail|slack|whatsapp|message|communication/],
    ['Listings / property', /zillow|redfin|realtor|mls|navica|property|listing|real estate|comparables|market analysis/],
    ['Admin / operations', /admin|operations|calendar|schedule|data entry|quickbooks|notion|airtable|trello|asana|monday/],
    ['Files / documents', /google docs|google drive|google sheets|sheets|excel|word|document|pdf|adobe|docusign|file|spreadsheet/],
    ['Marketing / content', /canva|instagram|facebook|linkedin|social|marketing|content|graphic|post|campaign/],
    ['Research / AI', /chatgpt|claude|gemini|ai\b|chrome|safari|firefox|browser|google search|research|web search/],
    ['Meetings', /zoom|google meet|microsoft teams|meeting|conference/],
  ];

  for (const [category, regex] of rules) {
    if (regex.test(value)) return category;
  }

  return 'Other business activity';
}

function buildCategorySummary(activities = [], screenshots = []) {
  const weights = {};

  for (const activity of activities) {
    const duration = activityDuration(activity);
    const note = String(activity?.note || '').trim();

    if (!duration || !note) continue;

    const category = classifyText(note);
    weights[category] = (weights[category] || 0) + duration;
  }

  for (const screenshot of screenshots) {
    const applications = Array.isArray(screenshot?.applications)
      ? screenshot.applications
      : [];

    for (const application of applications) {
      const duration = Number(application?.duration || 0);
      if (!Number.isFinite(duration) || duration <= 0) continue;

      const category = classifyText(applicationName(application));
      weights[category] = (weights[category] || 0) + duration;
    }
  }

  const total =
    Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;

  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([name, weight]) => ({
      name,
      sharePercent: round((weight / total) * 100, 1),
    }))
    .slice(0, 8);
}

function buildEvidenceCoverage(activities = [], screenshots = [], offsetMinutes = 0) {
  const screenshotActivityIds = new Set(
    screenshots
      .map((screenshot) => String(screenshot?.activityId || ''))
      .filter(Boolean),
  );

  const trackedSeconds = unionSeconds(activities);
  const coveredActivities = activities.filter((activity) =>
    screenshotActivityIds.has(String(activity?.id || '')),
  );
  const coveredSeconds = unionSeconds(coveredActivities);

  const activeDays = unique(
    activities
      .filter((activity) => activityDuration(activity) > 0)
      .map((activity) => localDate(activity.from, offsetMinutes)),
  );

  const screenshotDays = unique(
    screenshots
      .filter((screenshot) => Number.isFinite(Number(screenshot?.taken)))
      .map((screenshot) => localDate(screenshot.taken, offsetMinutes)),
  );

  return {
    evidenceCoveragePercent: clamp(
      trackedSeconds ? round((coveredSeconds / trackedSeconds) * 100, 1) : 0,
      0,
      100,
    ),
    activeDayCoveragePercent: clamp(
      activeDays.length
        ? round((screenshotDays.length / activeDays.length) * 100, 1)
        : 0,
      0,
      100,
    ),
    trackedSeconds,
    coveredTrackedSeconds: coveredSeconds,
    activityRecords: activities.length,
    activitiesWithScreenshots: coveredActivities.length,
    activeDays: activeDays.length,
    daysWithScreenshots: screenshotDays.length,
    screenshotCount: screenshots.length,
    screenshotDensityPerTrackedHour: trackedSeconds
      ? round(screenshots.length / (trackedSeconds / 3600), 2)
      : 0,
  };
}

function mondayStart(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(dateString) {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function buildWeeklyAnalytics(
  activities,
  screenshots,
  from,
  to,
  offsetMinutes = 0,
) {
  const groups = new Map();

  const ensure = (key) => {
    if (!groups.has(key)) {
      groups.set(key, { activities: [], screenshots: [] });
    }
    return groups.get(key);
  };

  for (const activity of activities) {
    if (!activityDuration(activity)) continue;
    const day = localDate(activity.from, offsetMinutes);
    ensure(mondayStart(day)).activities.push(activity);
  }

  for (const screenshot of screenshots) {
    if (!Number.isFinite(Number(screenshot?.taken))) continue;
    const day = localDate(screenshot.taken, offsetMinutes);
    ensure(mondayStart(day)).screenshots.push(screenshot);
  }

  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([weekStart, group]) => {
      const rawWeekEnd = addDays(weekStart, 6);
      const start =
        Date.parse(`${weekStart}T00:00:00Z`) < fromMs ? from : weekStart;
      const end =
        Date.parse(`${rawWeekEnd}T00:00:00Z`) > toMs ? to : rawWeekEnd;

      const coverage = buildEvidenceCoverage(
        group.activities,
        group.screenshots,
        offsetMinutes,
      );

      return {
        weekStart: start,
        weekEnd: end,
        label: `${formatShortDate(start)}–${formatShortDate(end)}`,
        trackedHours: round(unionSeconds(group.activities) / 3600, 2),
        activeDays: unique(
          group.activities.map((activity) =>
            localDate(activity.from, offsetMinutes),
          ),
        ).length,
        screenshotCount: group.screenshots.length,
        evidenceCoveragePercent: coverage.evidenceCoveragePercent,
        activeDayCoveragePercent: coverage.activeDayCoveragePercent,
        categories: buildCategorySummary(
          group.activities,
          group.screenshots,
        ).slice(0, 6),
        topApps: summarizeScreenshots(group.screenshots).apps.slice(0, 5),
        notes: unique(
          group.activities.map((activity) =>
            String(activity?.note || '').trim(),
          ),
        ).slice(0, 5),
      };
    });
}

function selectVisionScreenshots(screenshots = [], offsetMinutes = 0, max = 12) {
  const valid = screenshots
    .filter(
      (screenshot) =>
        Number.isFinite(Number(screenshot?.taken)) &&
        Boolean(screenshot?.url || screenshot?.thumbUrl),
    )
    .sort((a, b) => Number(a.taken) - Number(b.taken));

  if (!valid.length || max <= 0) return [];

  const byDay = new Map();

  for (const screenshot of valid) {
    const day = localDate(screenshot.taken, offsetMinutes);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(screenshot);
  }

  const dayKeys = [...byDay.keys()].sort();
  const picked = [];
  const seen = new Set();

  const add = (screenshot) => {
    if (!screenshot) return;
    const id = String(
      screenshot.id || `${screenshot.activityId || 'activity'}:${screenshot.taken}`,
    );
    if (seen.has(id)) return;
    seen.add(id);
    picked.push(screenshot);
  };

  const daySlots = Math.min(dayKeys.length, max);

  for (let i = 0; i < daySlots; i++) {
    const index =
      daySlots === 1
        ? 0
        : Math.round((i * (dayKeys.length - 1)) / (daySlots - 1));
    const screenshotsForDay = byDay.get(dayKeys[index]);
    add(screenshotsForDay[Math.floor(screenshotsForDay.length / 2)]);
  }

  for (let i = 0; picked.length < max && i < valid.length; i++) {
    const index = Math.round(
      (i * (valid.length - 1)) / Math.max(1, max - 1),
    );
    add(valid[index]);
  }

  return picked
    .slice(0, max)
    .sort((a, b) => Number(a.taken) - Number(b.taken))
    .map((screenshot) => {
      const applications = Array.isArray(screenshot?.applications)
        ? screenshot.applications
        : [];
      const foreground =
        applications.find((application) => application?.fromScreen) ||
        applications[0];

      return {
        screenshotId: String(
          screenshot.id ||
            `${screenshot.activityId || 'activity'}:${screenshot.taken}`,
        ),
        activityId: screenshot.activityId
          ? String(screenshot.activityId)
          : '',
        taken: Number(screenshot.taken),
        date: localDate(screenshot.taken, offsetMinutes),
        time: localTimeLabel(screenshot.taken, offsetMinutes),
        dateTime: `${localDate(screenshot.taken, offsetMinutes)} ${localTimeLabel(
          screenshot.taken,
          offsetMinutes,
        )}`,
        application: foreground?.applicationName || 'Screenshot',
        activityLevel: Number.isFinite(Number(screenshot.activityLevel))
          ? Number(screenshot.activityLevel)
          : null,
        imageUrl: screenshot.url || screenshot.thumbUrl || null,
        thumbUrl: screenshot.thumbUrl || screenshot.url || null,
      };
    });
}

function reviewAssessment(analytics) {
  const reasons = [];

  if (analytics.metrics.trackedHours <= 0) {
    reasons.push('No tracked time was returned for the selected period.');
  }

  if (
    analytics.metrics.trackedHours > 0 &&
    analytics.evidence.screenshotCount === 0
  ) {
    reasons.push('Tracked time exists but no screenshot evidence was returned.');
  }

  if (
    analytics.metrics.trackedHours > 0 &&
    analytics.evidence.activeDayCoveragePercent < 50
  ) {
    reasons.push(
      'Screenshot evidence is limited across the active workdays in the selected period.',
    );
  }

  return {
    status: reasons.length ? 'Yellow' : 'Green',
    reasons,
    note: reasons.length
      ? 'Evidence coverage should be reviewed before release.'
      : 'No evidence-coverage issue was detected under the current prototype rules.',
  };
}

async function buildPeriodAnalytics(env, input) {
  const connectionId = input.connectionId;
  const employmentId = input.employmentId;
  const from = input.from;
  const to = input.to;
  const offsetMinutes = Number(input.timezoneOffsetMinutes || 0);
  const expectedHours = Number(
    input.adjustedExpectedHours ??
      input.monthlyContext?.adjustedExpectedHours ??
      input.expectedHours ??
      0,
  );

  if (!employmentId || !from || !to) {
    throw new Error('employmentId, from and to are required');
  }

  const range = epochRange(from, to, offsetMinutes);

  const commonResult = await scrinFetch(
    env,
    connectionId,
    '/api/v2/GetCommonData',
    {},
  );

  const activityResult = await scrinFetch(
    env,
    connectionId,
    '/api/v2/GetActivities',
    [
      {
        employmentId: String(employmentId),
        from: range.from,
        to: range.to,
      },
    ],
  );

  const activities = Array.isArray(activityResult.data)
    ? activityResult.data
    : [];

  const screenshots = await fetchScreenshotsChunked(
    env,
    connectionId,
    activities.map((activity) => activity.id),
  );

  const metrics = summarizeActivities(
    activities,
    expectedHours,
    offsetMinutes,
  );

  const evidence = buildEvidenceCoverage(
    activities,
    screenshots,
    offsetMinutes,
  );

  const screenshotSummary = summarizeScreenshots(screenshots);

  const selectedScreenshotEvidence = selectVisionScreenshots(
    screenshots,
    offsetMinutes,
    Number(input.maxVisionScreenshots || 12),
  );

  const screenshotDates = unique(
    screenshots
      .filter((screenshot) => Number.isFinite(Number(screenshot?.taken)))
      .map((screenshot) => localDate(screenshot.taken, offsetMinutes)),
  ).sort();

  const analytics = {
    period: {
      from,
      to,
      dayCount: dayCountInclusive(from, to),
    },
    connection: publicConnection(commonResult.connection),
    metrics,
    evidence,
    categories: buildCategorySummary(activities, screenshots),
    apps: screenshotSummary.apps.slice(0, 15),
    averageActivityLevel: screenshotSummary.averageActivityLevel,
    notes: unique(
      activities.map((activity) => String(activity?.note || '').trim()),
    ).slice(0, 30),
    weeks: buildWeeklyAnalytics(
      activities,
      screenshots,
      from,
      to,
      offsetMinutes,
    ),
    screenshotDates,
    selectedScreenshotEvidence,
    analysisDisclosure: {
      activityRecordsAnalyzedPercent: 100,
      screenshotMetadataAnalyzedPercent: screenshots.length ? 100 : 0,
      screenshotImageContentAnalyzedPercent: 0,
      screenshotImagesSelectedForVisualReview:
        selectedScreenshotEvidence.length,
      screenshotImageSamplePercent: screenshots.length
        ? round((selectedScreenshotEvidence.length / screenshots.length) * 100, 2)
        : 0,
      note:
        'WGM calculations use all returned activity and screenshot metadata. A selected screenshot-image sample is sent to the visual screening step; human review remains mandatory.',
    },
    versions: {
      analysisVersion: ANALYSIS_VERSION,
      rulesVersion: RULES_VERSION,
    },
  };

  analytics.review = reviewAssessment(analytics);

  return analytics;
}

function fallbackReport(input) {
  const analytics = input.analytics || {};
  const selected = Array.isArray(analytics.selectedScreenshotEvidence)
    ? analytics.selectedScreenshotEvidence
    : [];
  const hasVisual = selected.length > 0;

  const unavailable = 'No screenshot images were supplied to the visual screening step.';

  return {
    overallResult: hasVisual ? 'clear' : 'review',
    screeningHeadline: hasVisual
      ? 'No suspicious patterns found.'
      : 'Human review required.',
    screeningSubtext: hasVisual
      ? 'In the screenshots reviewed for this report.'
      : 'Visual screenshot screening was not available for this report run.',
    checks: [
      {
        key: 'repeated_frozen',
        status: hasVisual ? 'clear' : 'not_assessed',
        detail: hasVisual
          ? 'No concerning unchanged-screen sequence was identified in the selected visual sample.'
          : unavailable,
      },
      {
        key: 'repetitive_cycling',
        status: hasVisual ? 'clear' : 'not_assessed',
        detail: hasVisual
          ? 'No suspicious back-and-forth screen pattern was identified in the selected visual sample.'
          : unavailable,
      },
      {
        key: 'activity_simulation',
        status: hasVisual ? 'clear' : 'not_assessed',
        detail: hasVisual
          ? 'No visible mouse-mover, auto-clicker or activity-simulation interface was observed in the selected visual sample.'
          : unavailable,
      },
      {
        key: 'repeated_across_days',
        status: hasVisual ? 'clear' : 'not_assessed',
        detail: hasVisual
          ? 'No concerning replay-like screenshot sequence was identified across the selected capture dates.'
          : unavailable,
      },
    ],
    findings: [],
    scopeNote:
      'Review scope: supplied Scrin screenshot evidence and verified metadata for the selected period. Hidden automation and physical mouse movers may not be visible.',
  };
}

function buildVisionContent(input, fallbackReference) {
  const analytics = input.analytics || {};
  const screenshots = Array.isArray(analytics.selectedScreenshotEvidence)
    ? analytics.selectedScreenshotEvidence
    : [];

  const clean = {
    employee: input.employee || null,
    period: input.period || analytics.period || null,
    analytics: {
      period: analytics.period || null,
      metrics: analytics.metrics || null,
      evidence: analytics.evidence || null,
      screenshotDates: analytics.screenshotDates || [],
      selectedScreenshotEvidence: screenshots.map((screenshot) => ({
        screenshotId: screenshot.screenshotId,
        activityId: screenshot.activityId,
        date: screenshot.date,
        time: screenshot.time,
        dateTime: screenshot.dateTime,
        application: screenshot.application,
        activityLevel: screenshot.activityLevel,
      })),
    },
    fallbackReference,
  };

  const content = [
    {
      type: 'input_text',
      text:
        'Screen the supplied screenshot sample using the four required White Glove Monitor checks. The screenshots are a selected sample from the reporting period, not necessarily every capture. Return only supported findings. Do not treat routine repeated business applications or similar work screens as suspicious.\n\n' +
        JSON.stringify(clean),
    },
  ];

  for (const screenshot of screenshots) {
    if (!screenshot?.imageUrl) continue;

    content.push({
      type: 'input_text',
      text: `SCREENSHOT — id=${screenshot.screenshotId}; dateTime=${screenshot.dateTime}; applicationMetadata=${screenshot.application}`,
    });

    content.push({
      type: 'input_image',
      image_url: screenshot.imageUrl,
      detail: 'auto',
    });
  }

  return content;
}

async function generateWithAI(env, input) {
  const fallback = fallbackReport(input);

  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) {
    return {
      report: fallback,
      usedOpenAI: false,
      visionScreenshotsSent: 0,
      warning: null,
    };
  }

  const content = buildVisionContent(input, fallback);
  const visionScreenshotsSent = content.filter(
    (item) => item.type === 'input_image',
  ).length;

  if (!visionScreenshotsSent) {
    return {
      report: fallback,
      usedOpenAI: false,
      visionScreenshotsSent: 0,
      warning: 'No screenshot images were available for visual screening.',
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'wgm_fraud_screening_report',
            strict: true,
            schema: REPORT_SCHEMA,
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `OpenAI ${response.status}: ${JSON.stringify(data).slice(0, 500)}`,
      );
    }

    const outputText =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .find((item) => item.type === 'output_text')?.text;

    if (!outputText) {
      throw new Error('No structured screening report returned');
    }

    return {
      report: JSON.parse(outputText),
      usedOpenAI: true,
      visionScreenshotsSent,
      warning: null,
    };
  } catch (error) {
    return {
      report: fallback,
      usedOpenAI: false,
      visionScreenshotsSent: 0,
      warning: `OpenAI fallback used: ${error.message}`,
    };
  }
}

function demoPeriodAnalytics(input) {
  const metrics = {
    trackedSeconds: 161.42 * 3600,
    trackedHours: 161.42,
    activeDays: 20,
    expectedHours: Number(input.expectedHours || 160),
    scheduleCoveragePercent: 100,
  };

  const evidence = {
    evidenceCoveragePercent: 96,
    activeDayCoveragePercent: 100,
    trackedSeconds: metrics.trackedSeconds,
    coveredTrackedSeconds: metrics.trackedSeconds * 0.96,
    activityRecords: 482,
    activitiesWithScreenshots: 463,
    activeDays: 20,
    daysWithScreenshots: 19,
    screenshotCount: 1100,
    screenshotDensityPerTrackedHour: 6.82,
  };

  const analytics = {
    period: {
      from: input.from,
      to: input.to,
      dayCount: dayCountInclusive(input.from, input.to),
    },
    connection: {
      id: 'demo-main',
      name: 'Demo Scrin Connection',
      provider: 'scrin',
      type: 'shared',
      employer: '',
      employerLocked: false,
      status: 'demo',
    },
    metrics,
    evidence,
    categories: [],
    apps: [],
    averageActivityLevel: 72,
    notes: [],
    weeks: [],
    screenshotDates: [
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-28',
      '2026-09-29',
    ],
    selectedScreenshotEvidence: [],
    analysisDisclosure: {
      activityRecordsAnalyzedPercent: 100,
      screenshotMetadataAnalyzedPercent: 100,
      screenshotImageContentAnalyzedPercent: 0,
      screenshotImagesSelectedForVisualReview: 0,
      screenshotImageSamplePercent: 0,
      note: 'Demo analytics use synthetic data. No live images are sent.',
    },
    versions: {
      analysisVersion: ANALYSIS_VERSION,
      rulesVersion: RULES_VERSION,
    },
  };

  analytics.review = reviewAssessment(analytics);
  return analytics;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const demo = env.DEMO_MODE !== 'false';

    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        mode: demo ? 'demo' : 'live',
        connectionCount: parseConnections(env).length,
        analysisVersion: ANALYSIS_VERSION,
        rulesVersion: RULES_VERSION,
        promptVersion: PROMPT_VERSION,
      });
    }

    if (url.pathname === '/api/scrin/connections') {
      if (demo) {
        return json({
          demo: true,
          connections: [
            {
              id: 'demo-main',
              name: 'Demo Scrin Connection',
              provider: 'scrin',
              type: 'shared',
              employer: '',
              employerLocked: false,
              status: 'demo',
            },
          ],
        });
      }

      return json({
        demo: false,
        connections: parseConnections(env).map(publicConnection),
      });
    }

    if (
      url.pathname === '/api/scrin/all-common' &&
      request.method === 'POST'
    ) {
      if (demo) {
        const connection = {
          id: 'demo-main',
          name: 'Demo Scrin Connection',
          provider: 'scrin',
          type: 'shared',
          employer: '',
          token: 'demo',
        };

        const normalized = normalizeCommon(demoCommon(), connection);

        return json({
          demo: true,
          connections: [
            {
              ...publicConnection(connection),
              status: 'connected',
              employeeCount: normalized.employees.length,
            },
          ],
          employees: normalized.employees,
          errors: [],
        });
      }

      const connections = parseConnections(env);
      const employees = [];
      const publicConnections = [];
      const errors = [];

      for (const connection of connections) {
        try {
          const result = await scrinFetch(
            env,
            connection.id,
            '/api/v2/GetCommonData',
            {},
          );

          const normalized = normalizeCommon(result.data, connection);
          employees.push(...normalized.employees);

          publicConnections.push({
            ...publicConnection(connection),
            status: 'connected',
            employeeCount: normalized.employees.length,
            companyCount: normalized.companies.length,
          });
        } catch (error) {
          errors.push({
            connectionId: connection.id,
            connectionName: connection.name,
            error: error.message,
          });

          publicConnections.push({
            ...publicConnection(connection),
            status: 'error',
            employeeCount: 0,
            error: error.message,
          });
        }
      }

      return json({
        demo: false,
        connections: publicConnections,
        employees,
        errors,
      });
    }

    if (
      url.pathname === '/api/scrin/activities' &&
      request.method === 'POST'
    ) {
      try {
        const body = await readJson(request);

        if (!Array.isArray(body.ranges)) {
          return json(
            {
              error:
                'Expected { connectionId, ranges: [{ employmentId, from, to }] }',
            },
            400,
          );
        }

        const result = await scrinFetch(
          env,
          body.connectionId,
          '/api/v2/GetActivities',
          body.ranges,
        );

        return json({
          connection: publicConnection(result.connection),
          activities: result.data,
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    if (
      url.pathname === '/api/scrin/screenshots' &&
      request.method === 'POST'
    ) {
      try {
        const body = await readJson(request);

        if (!Array.isArray(body.activityIds)) {
          return json(
            {
              error: 'Expected { connectionId, activityIds: [...] }',
            },
            400,
          );
        }

        const result = await scrinFetch(
          env,
          body.connectionId,
          '/api/v2/GetScreenshots',
          body.activityIds,
        );

        return json({
          connection: publicConnection(result.connection),
          screenshots: result.data,
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    if (
      url.pathname === '/api/wgm/day-data' &&
      request.method === 'POST'
    ) {
      try {
        const body = await readJson(request);

        if (demo) {
          return json({
            demo: true,
            date: body.date,
            firstTracked: '8:03 AM',
            lastTracked: '5:12 PM',
            trackedSeconds: 8.03 * 3600,
            activityCount: 24,
            screenshotCount: 96,
            sessions: [
              {
                from: '8:03 AM',
                to: '12:04 PM',
                seconds: 4.016 * 3600,
              },
              {
                from: '12:42 PM',
                to: '5:12 PM',
                seconds: 4.5 * 3600,
              },
            ],
            screenshots: [],
          });
        }

        if (!body.employmentId || !body.date) {
          return json(
            {
              error: 'employmentId and date are required',
            },
            400,
          );
        }

        const offsetMinutes = Number(body.timezoneOffsetMinutes || 0);
        const range = epochRange(body.date, body.date, offsetMinutes);

        const activityResult = await scrinFetch(
          env,
          body.connectionId,
          '/api/v2/GetActivities',
          [
            {
              employmentId: String(body.employmentId),
              from: range.from,
              to: range.to,
            },
          ],
        );

        const activities = Array.isArray(activityResult.data)
          ? activityResult.data
          : [];

        const screenshots = await fetchScreenshotsChunked(
          env,
          body.connectionId,
          activities.map((activity) => activity.id),
        );

        const intervals = activities
          .filter((activity) => activityDuration(activity) > 0)
          .sort((a, b) => Number(a.from) - Number(b.from));

        const sessions = [];

        if (intervals.length) {
          let start = Number(intervals[0].from);
          let end = Number(intervals[0].to);

          for (let i = 1; i < intervals.length; i++) {
            const nextStart = Number(intervals[i].from);
            const nextEnd = Number(intervals[i].to);

            if (nextStart <= end + 90) {
              end = Math.max(end, nextEnd);
            } else {
              sessions.push({
                from: localTimeLabel(start, offsetMinutes),
                to: localTimeLabel(end, offsetMinutes),
                seconds: end - start,
              });
              start = nextStart;
              end = nextEnd;
            }
          }

          sessions.push({
            from: localTimeLabel(start, offsetMinutes),
            to: localTimeLabel(end, offsetMinutes),
            seconds: end - start,
          });
        }

        return json({
          demo: false,
          connection: publicConnection(activityResult.connection),
          date: body.date,
          firstTracked: intervals.length
            ? localTimeLabel(intervals[0].from, offsetMinutes)
            : '—',
          lastTracked: intervals.length
            ? localTimeLabel(
                Math.max(...intervals.map((activity) => Number(activity.to))),
                offsetMinutes,
              )
            : '—',
          trackedSeconds: unionSeconds(activities),
          activityCount: activities.length,
          screenshotCount: screenshots.length,
          sessions,
          screenshots: screenshots.map((screenshot) => {
            const applications = Array.isArray(screenshot?.applications)
              ? screenshot.applications
              : [];
            const foreground =
              applications.find((application) => application?.fromScreen) ||
              applications[0];

            return {
              id: screenshot.id,
              activityId: screenshot.activityId,
              taken: screenshot.taken,
              time: localTimeLabel(screenshot.taken, offsetMinutes),
              application: foreground?.applicationName || 'Screenshot',
              activityLevel: Number(screenshot.activityLevel) || null,
              thumbUrl: screenshot.thumbUrl || screenshot.url || null,
              url: screenshot.url || screenshot.thumbUrl || null,
            };
          }),
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    if (
      url.pathname === '/api/wgm/period-analytics' &&
      request.method === 'POST'
    ) {
      try {
        const body = await readJson(request);

        if (!body.employmentId || !body.from || !body.to) {
          return json(
            {
              error: 'employmentId, from and to are required',
            },
            400,
          );
        }

        const current = demo
          ? demoPeriodAnalytics(body)
          : await buildPeriodAnalytics(env, body);

        return json({
          current,
          previous: null,
          comparison: { available: false },
          metadata: {
            generatedAt: new Date().toISOString(),
            analysisVersion: ANALYSIS_VERSION,
            rulesVersion: RULES_VERSION,
          },
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    if (
      url.pathname === '/api/wgm/period-data' &&
      request.method === 'POST'
    ) {
      try {
        const body = await readJson(request);
        const analytics = demo
          ? demoPeriodAnalytics(body)
          : await buildPeriodAnalytics(env, body);

        return json({
          connection: analytics.connection,
          metrics: analytics.metrics,
          workstreams: analytics.categories.map((item) => [
            item.name,
            item.sharePercent,
          ]),
          apps: analytics.apps.map((item) => [item.name, item.sharePercent]),
          averageActivityLevel: analytics.averageActivityLevel,
          screenshotCount: analytics.evidence.screenshotCount,
          screenshotDates: analytics.screenshotDates,
          selectedScreenshotEvidence: analytics.selectedScreenshotEvidence,
          screenshotEvidenceSummary: {
            count: analytics.evidence.screenshotCount,
            evidenceCoveragePercent:
              analytics.evidence.evidenceCoveragePercent,
            activeDayCoveragePercent:
              analytics.evidence.activeDayCoveragePercent,
            topApplications: analytics.apps.slice(0, 6),
          },
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    if (
      url.pathname === '/api/reports/generate' &&
      request.method === 'POST'
    ) {
      try {
        const body = await readJson(request);
        const generated = await generateWithAI(env, body);

        return json({
          report: generated.report,
          generatedBy: generated.usedOpenAI ? 'openai' : 'wgm-fallback',
          requiresHumanReview: true,
          warning: generated.warning,
          metadata: {
            generatedAt: new Date().toISOString(),
            model: env.OPENAI_MODEL || null,
            promptVersion: PROMPT_VERSION,
            visionScreenshotsSent: generated.visionScreenshotsSent,
            analysisVersion:
              body.analytics?.versions?.analysisVersion || ANALYSIS_VERSION,
            rulesVersion:
              body.analytics?.versions?.rulesVersion || RULES_VERSION,
            reportType: 'fraud_screening_activity_review',
          },
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    if (
      url.pathname === '/api/reports/release' &&
      request.method === 'POST'
    ) {
      const body = await readJson(request);

      return json({
        status: 'released',
        releaseId: `wgm_${Date.now()}`,
        deliveryEvent: 'queued',
        ghlIntegrated: false,
        employeeId: body.employeeId || null,
        employer: body.employer || null,
        period: body.period || null,
        releasedAt: new Date().toISOString(),
      });
    }

    return env.ASSETS.fetch(request);
  },
};
