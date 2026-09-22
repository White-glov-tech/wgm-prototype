const ANALYSIS_VERSION = 'wgm-full-month-screening-1.0';
const RULES_VERSION = 'wgm-fraud-review-rules-1.1';
const PROMPT_VERSION = 'wgm-full-month-vision-prompt-1.0';
const DEFAULT_SCAN_BATCH_SIZE = 20;
const DEFAULT_BATCH_OVERLAP = 2;
const MAX_BATCH_IMAGES = 24;
const HUMAN_SAMPLE_MIN = 30;
const HUMAN_SAMPLE_MAX = 66;

const BATCH_SCHEMA = {
  type: 'object',
  properties: {
    screenshots: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          screenshotId: { type: 'string' },
          status: { type: 'string', enum: ['clear', 'review'] },
          visualKey: { type: 'string' },
          reasons: {
            type: 'array',
            maxItems: 4,
            items: { type: 'string' },
          },
          signals: {
            type: 'array',
            maxItems: 4,
            items: {
              type: 'string',
              enum: [
                'repeated_frozen',
                'repetitive_cycling',
                'activity_simulation',
                'replay_candidate',
              ],
            },
          },
        },
        required: [
          'screenshotId',
          'status',
          'visualKey',
          'reasons',
          'signals',
        ],
        additionalProperties: false,
      },
    },
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
          screenshotIds: {
            type: 'array',
            maxItems: 16,
            items: { type: 'string' },
          },
        },
        required: ['key', 'status', 'detail', 'screenshotIds'],
        additionalProperties: false,
      },
    },
  },
  required: ['screenshots', 'checks'],
  additionalProperties: false,
};

const CROSS_DAY_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['clear', 'review', 'not_assessed'],
    },
    detail: { type: 'string' },
    screenshotIds: {
      type: 'array',
      maxItems: 24,
      items: { type: 'string' },
    },
  },
  required: ['status', 'detail', 'screenshotIds'],
  additionalProperties: false,
};

const LEGACY_REPORT_SCHEMA = {
  type: 'object',
  properties: {
    overallResult: {
      type: 'string',
      enum: ['clear', 'review'],
    },
    screeningHeadline: {
      type: 'string',
    },
    screeningSubtext: {
      type: 'string',
    },
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
            enum: [
              'clear',
              'review',
              'not_assessed',
            ],
          },
          detail: {
            type: 'string',
          },
        },
        required: [
          'key',
          'status',
          'detail',
        ],
        additionalProperties: false,
      },
    },
    findings: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
          },
          screenshotIds: {
            type: 'array',
            maxItems: 12,
            items: {
              type: 'string',
            },
          },
        },
        required: [
          'reason',
          'screenshotIds',
        ],
        additionalProperties: false,
      },
    },
    scopeNote: {
      type: 'string',
    },
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

const BATCH_SYSTEM_PROMPT = `
You are the White Glove Monitor full-month screenshot screening engine.

You are reviewing chronological employee-monitoring screenshots.
Every image supplied in this request must be inspected.

Required checks:

1. repeated_frozen
Concerning sequences where substantially the same screen appears unchanged
across successive captures in a way that may require human context.

2. repetitive_cycling
Suspicious back-and-forth or repeated screen cycling that may indicate
artificial activity rather than ordinary navigation.

3. activity_simulation
Visible mouse-mover, auto-clicker, macro, automation,
activity-simulation, or similar interfaces.

4. repeated_across_days
Only identify a replay candidate when the supplied images themselves
support it. Cross-day sequence confirmation is also performed later
across the full month.

Rules:

- Be conservative.
- Similar CRM screens, inboxes, dashboards, documents, browser tabs,
  templates, listings, spreadsheets, or recurring business workflows
  are NOT suspicious merely because they recur.
- Reading, calls, meetings, research, low-input work, idle-looking screens,
  app switching, AI-tool use, and ordinary breaks are not misconduct.
- Do not infer hidden software, hidden automation, physical mouse movers,
  fraud, theft, intent, or misconduct that is not visibly supported.
- A screenshot may be "review" only when there is a concrete visual reason
  that merits human context.
- visualKey is required for every screenshot.
- Make visualKey a short normalized semantic fingerprint using
  lower_snake_case tokens based on primary application + screen type
  + broad layout/content class.
- Ignore timestamps, names, unique record numbers, and minor text changes.
- Example visualKey:
  "chrome_crm_contact_record_two_column"
- Keep visualKey under 80 characters.
- Use the same visualKey for materially similar screens when possible.
- Return one screenshot result for EVERY supplied screenshotId.
- The repeated_across_days check should be "not_assessed" unless this batch
  itself contains evidence from more than one date that supports the conclusion.
- Keep details concise and neutral.
- Human review is mandatory before release.
`;

const CROSS_DAY_SYSTEM_PROMPT = `
You are the White Glove Monitor cross-day replay verification engine.

The supplied screenshots were selected because the full-month first-pass
screening found similar semantic visual sequences on different dates.

Determine whether the actual images support a review-worthy replay-like
repeated sequence across days.

Be conservative:

- Recurring use of the same CRM, inbox, dashboard, spreadsheet, browser,
  document template, listing system, or other normal business tool
  is not suspicious by itself.
- Similar screen layouts with changing legitimate content are normal.
- Only return review when the images show a materially concerning
  repeated/replay-like pattern that should receive human context.
- Do not infer fraud or misconduct.
- This is only a screening flag.
- If the supplied candidates do not permit a defensible conclusion,
  return not_assessed.
`;

const LEGACY_SYSTEM_PROMPT = `
You are the White Glove Monitor screenshot screening engine.

Review only the screenshot images and verified metadata supplied.
Do not invent facts.

The four checks are:

- repeated/frozen screens
- repetitive screen cycling
- visible activity-simulation tools
- repeated sequences across days

Be conservative.

Routine repeated business software is not suspicious by itself.

Do not infer hidden automation, physical mouse movers, fraud,
theft, or misconduct.

Human review is mandatory before release.
`;

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'content-type':
          'application/json;charset=UTF-8',
        'cache-control':
          'no-store',
      },
    },
  );
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function round(
  value,
  decimals = 1,
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      Number(value || 0)
      *
      factor
    )
    /
    factor
  );
}

function clamp(
  value,
  min,
  max,
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value || 0),
    ),
  );
}

function unique(
  values = [],
) {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
}

function addDays(
  dateString,
  days,
) {
  const date =
    new Date(
      `${dateString}T00:00:00Z`,
    );

  date.setUTCDate(
    date.getUTCDate()
    +
    Number(days || 0),
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function dayCountInclusive(
  from,
  to,
) {
  const start =
    Date.parse(
      `${from}T00:00:00Z`,
    );

  const end =
    Date.parse(
      `${to}T00:00:00Z`,
    );

  if (
    !Number.isFinite(start)
    ||
    !Number.isFinite(end)
    ||
    end < start
  ) {
    return 0;
  }

  return (
    Math.floor(
      (end - start)
      /
      86400000,
    )
    +
    1
  );
}

function hoursText(
  hours,
) {
  const totalMinutes =
    Math.max(
      0,
      Math.round(
        Number(hours || 0)
        *
        60,
      ),
    );

  return (
    `${Math.floor(totalMinutes / 60)}h `
    +
    `${String(totalMinutes % 60).padStart(2, '0')}m`
  );
}

function fnv1a32(
  value,
) {
  let hash =
    0x811c9dc5;

  const text =
    String(value || '');

  for (
    let i = 0;
    i < text.length;
    i++
  ) {
    hash ^=
      text.charCodeAt(i);

    hash =
      Math.imul(
        hash,
        0x01000193,
      );
  }

  return hash >>> 0;
}

function mulberry32(
  seed,
) {
  let value =
    seed >>> 0;

  return function rng() {
    value +=
      0x6d2b79f5;

    let t =
      value;

    t =
      Math.imul(
        t ^ (t >>> 15),
        t | 1,
      );

    t ^=
      t
      +
      Math.imul(
        t ^ (t >>> 7),
        t | 61,
      );

    return (
      (
        (
          t
          ^
          (t >>> 14)
        )
        >>>
        0
      )
      /
      4294967296
    );
  };
}

function stableShuffle(
  values,
  rng,
) {
  const result =
    [...values];

  for (
    let i =
      result.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        rng()
        *
        (i + 1),
      );

    [
      result[i],
      result[j],
    ] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

function stableSessionKey(
  input,
) {
  const seed = [
    input.connectionId || '',
    input.employmentId || '',
    input.from || '',
    input.to || '',
    input.timezone || '',
    input.timezoneOffsetMinutes || 0,
  ].join('|');

  return (
    `wgm_${
      fnv1a32(seed)
        .toString(16)
        .padStart(8, '0')
    }`
  );
}

function parseConnections(
  env,
) {
  const output = [];

  if (
    env.SCRIN_CONNECTIONS_JSON
  ) {
    let parsed;

    try {
      parsed =
        JSON.parse(
          env.SCRIN_CONNECTIONS_JSON,
        );
    } catch {
      throw new Error(
        'SCRIN_CONNECTIONS_JSON is not valid JSON',
      );
    }

    if (
      !Array.isArray(parsed)
    ) {
      throw new Error(
        'SCRIN_CONNECTIONS_JSON must be a JSON array',
      );
    }

    for (
      const raw of parsed
    ) {
      if (
        !raw?.id
        ||
        !raw?.token
      ) {
        continue;
      }

      const type =
        raw.type === 'dedicated'
          ? 'dedicated'
          : 'shared';

      if (
        type === 'dedicated'
        &&
        !String(
          raw.employer || '',
        ).trim()
      ) {
        throw new Error(
          `Dedicated connection ${raw.id} requires an employer`,
        );
      }

      output.push({
        id:
          String(raw.id),

        name:
          String(
            raw.name
            ||
            raw.id,
          ),

        provider:
          'scrin',

        type,

        employer:
          String(
            raw.employer || '',
          ),

        token:
          String(raw.token),

        enabled:
          raw.enabled !== false,
      });
    }
  }

  if (
    !output.length
    &&
    env.SCRIN_TOKEN
  ) {
    output.push({
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

      token:
        String(
          env.SCRIN_TOKEN,
        ),

      enabled:
        true,
    });
  }

  return output.filter(
    connection =>
      connection.enabled,
  );
}

function publicConnection(
  connection,
) {
  return {
    id:
      connection.id,

    name:
      connection.name,

    provider:
      'scrin',

    type:
      connection.type,

    employer:
      connection.employer || '',

    employerLocked:
      connection.type ===
      'dedicated',

    status:
      'configured',
  };
}

function getConnection(
  env,
  connectionId,
) {
  const connections =
    parseConnections(env);

  if (
    !connections.length
  ) {
    throw new Error(
      'No Scrin connection is configured',
    );
  }

  if (
    connectionId
  ) {
    const found =
      connections.find(
        connection =>
          connection.id
          ===
          String(connectionId),
      );

    if (
      !found
    ) {
      throw new Error(
        `Unknown Scrin connection: ${connectionId}`,
      );
    }

    return found;
  }

  if (
    connections.length
    ===
    1
  ) {
    return connections[0];
  }

  throw new Error(
    'connectionId is required when more than one Scrin connection is configured',
  );
}

async function scrinFetch(
  env,
  connectionId,
  path,
  body,
) {
  const connection =
    getConnection(
      env,
      connectionId,
    );

  const base =
    (
      env.SCRIN_API_BASE_URL
      ||
      'https://scrin.io'
    )
    .replace(
      /\/$/,
      '',
    );

  const response =
    await fetch(
      base + path,
      {
        method:
          'POST',

        headers: {
          'content-type':
            'application/json',

          'X-SSM-Token':
            connection.token,
        },

        body:
          JSON.stringify(body),
      },
    );

  const text =
    await response.text();

  if (
    !response.ok
  ) {
    throw new Error(
      `Scrin ${response.status} (${connection.name}): ${text.slice(0, 300)}`,
    );
  }

  let data =
    null;

  if (
    text
  ) {
    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `Scrin returned non-JSON data from ${path}`,
      );
    }
  }

  return {
    connection,
    data,
  };
}

function demoCommon() {
  return {
    companies: [
      {
        id:
          477279,

        name:
          'WGH Scrin Account',

        employments: [
          {
            id:
              477279,

            name:
              'Maria Gadin',

            email:
              'masked@example.com',

            registered:
              true,
          },

          {
            id:
              500002,

            name:
              'VA 2 — sync to reveal',

            email:
              'masked2@example.com',

            registered:
              true,
          },
        ],
      },
    ],
  };
}

function normalizeCommon(
  data,
  connection,
) {
  const companies =
    Array.isArray(
      data?.companies,
    )
      ? data.companies

      : Array.isArray(data)
        ? data
        : [];

  const employees = [];

  for (
    const company of companies
  ) {
    const employments =
      Array.isArray(
        company?.employments,
      )
        ? company.employments
        : [];

    for (
      const person of employments
    ) {
      employees.push({
        id:
          `${connection.id}::${person.id}`,

        connectionId:
          connection.id,

        connectionName:
          connection.name,

        connectionType:
          connection.type,

        connectionEmployer:
          connection.employer || '',

        employerLocked:
          connection.type ===
          'dedicated',

        employmentId:
          person.id,

        name:
          person.name
          ||
          person.email
          ||
          `Employment ${person.id}`,

        email:
          person.email || null,

        scrinCompanyId:
          company.id,

        scrinCompany:
          company.name || '',

        source:
          connection.type ===
          'dedicated'
            ? 'Standalone WGM'
            : 'WGH Managed',

        role:
          'Virtual Assistant',

        reportingStatus:
          'Synced',

        employer:
          connection.type ===
          'dedicated'
            ? connection.employer
            : '',
      });
    }
  }

  return {
    companies,
    employees,
  };
}

function isValidTimeZone(
  timeZone,
) {
  if (
    !timeZone
  ) {
    return false;
  }

  try {
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone,
      },
    )
    .format(
      new Date(),
    );

    return true;
  } catch {
    return false;
  }
}

function timezoneOffsetMs(
  timestampMs,
  timeZone,
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone,
        year:
          'numeric',
        month:
          '2-digit',
        day:
          '2-digit',
        hour:
          '2-digit',
        minute:
          '2-digit',
        second:
          '2-digit',
        hourCycle:
          'h23',
      },
    )
    .formatToParts(
      new Date(timestampMs),
    );

  const map = {};

  for (
    const part of parts
  ) {
    if (
      part.type !==
      'literal'
    ) {
      map[part.type] =
        Number(part.value);
    }
  }

  const representedAsUtc =
    Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      map.hour,
      map.minute,
      map.second,
    );

  return (
    representedAsUtc
    -
    timestampMs
  );
}

function zonedDateTimeToUtcMs(
  dateString,
  timeZone,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const [
    year,
    month,
    day,
  ] =
    String(dateString)
      .split('-')
      .map(Number);

  const guess =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
    );

  let offset =
    timezoneOffsetMs(
      guess,
      timeZone,
    );

  let utc =
    guess - offset;

  const refinedOffset =
    timezoneOffsetMs(
      utc,
      timeZone,
    );

  if (
    refinedOffset !== offset
  ) {
    offset =
      refinedOffset;

    utc =
      guess - offset;
  }

  return utc;
}

function epochRange(
  from,
  to,
  timeZone = '',
  offsetMinutes = 0,
) {
  let startMs;
  let endMs;

  if (
    isValidTimeZone(
      timeZone,
    )
  ) {
    startMs =
      zonedDateTimeToUtcMs(
        from,
        timeZone,
        0,
        0,
        0,
      );

    const nextDay =
      addDays(
        to,
        1,
      );

    endMs =
      zonedDateTimeToUtcMs(
        nextDay,
        timeZone,
        0,
        0,
        0,
      )
      -
      1000;
  } else {
    startMs =
      Date.parse(
        `${from}T00:00:00Z`,
      )
      -
      Number(
        offsetMinutes || 0,
      )
      *
      60000;

    endMs =
      Date.parse(
        `${to}T23:59:59Z`,
      )
      -
      Number(
        offsetMinutes || 0,
      )
      *
      60000;
  }

  if (
    !Number.isFinite(startMs)
    ||
    !Number.isFinite(endMs)
    ||
    endMs < startMs
  ) {
    throw new Error(
      'Invalid date range',
    );
  }

  return {
    from:
      Math.floor(
        startMs / 1000,
      ),

    to:
      Math.floor(
        endMs / 1000,
      ),
  };
}

function localDate(
  epochSeconds,
  timeZone = '',
  offsetMinutes = 0,
) {
  const milliseconds =
    Number(epochSeconds)
    *
    1000;

  if (
    isValidTimeZone(
      timeZone,
    )
  ) {
    const parts =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone,
          year:
            'numeric',
          month:
            '2-digit',
          day:
            '2-digit',
        },
      )
      .formatToParts(
        new Date(milliseconds),
      );

    const map = {};

    for (
      const part of parts
    ) {
      if (
        part.type !==
        'literal'
      ) {
        map[part.type] =
          part.value;
      }
    }

    return (
      `${map.year}-`
      +
      `${map.month}-`
      +
      `${map.day}`
    );
  }

  return (
    new Date(
      milliseconds
      +
      Number(
        offsetMinutes || 0,
      )
      *
      60000,
    )
    .toISOString()
    .slice(0, 10)
  );
}

function localTimeLabel(
  epochSeconds,
  timeZone = '',
  offsetMinutes = 0,
) {
  if (
    epochSeconds === null
    ||
    epochSeconds === undefined
  ) {
    return '—';
  }

  const milliseconds =
    Number(epochSeconds)
    *
    1000;

  if (
    isValidTimeZone(
      timeZone,
    )
  ) {
    return (
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone,
          hour:
            'numeric',
          minute:
            '2-digit',
          hour12:
            true,
        },
      )
      .format(
        new Date(milliseconds),
      )
    );
  }

  const date =
    new Date(
      milliseconds
      +
      Number(
        offsetMinutes || 0,
      )
      *
      60000,
    );

  let hours =
    date.getUTCHours();

  const minutes =
    String(
      date.getUTCMinutes(),
    )
    .padStart(
      2,
      '0',
    );

  const suffix =
    hours >= 12
      ? 'PM'
      : 'AM';

  hours %= 12;

  if (
    !hours
  ) {
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

function activityDuration(
  activity,
) {
  const from =
    Number(
      activity?.from,
    );

  const to =
    Number(
      activity?.to,
    );

  return (
    Number.isFinite(from)
    &&
    Number.isFinite(to)
    &&
    to > from
  )
    ? to - from
    : 0;
}

function unionSeconds(
  activities = [],
) {
  const intervals =
    activities
      .map(
        activity => [
          Number(activity.from),
          Number(activity.to),
        ],
      )
      .filter(
        ([from, to]) =>
          Number.isFinite(from)
          &&
          Number.isFinite(to)
          &&
          to > from,
      )
      .sort(
        (a, b) =>
          a[0] - b[0],
      );

  if (
    !intervals.length
  ) {
    return 0;
  }

  let total = 0;

  let start =
    intervals[0][0];

  let end =
    intervals[0][1];

  for (
    let i = 1;
    i < intervals.length;
    i++
  ) {
    const [
      nextStart,
      nextEnd,
    ] =
      intervals[i];

    if (
      nextStart <= end
    ) {
      end =
        Math.max(
          end,
          nextEnd,
        );
    } else {
      total +=
        end - start;

      start =
        nextStart;

      end =
        nextEnd;
    }
  }

  return (
    total
    +
    (end - start)
  );
}

function summarizeActivities(
  activities = [],
  expectedHours = 0,
  timeZone = '',
  offsetMinutes = 0,
) {
  const trackedSeconds =
    unionSeconds(
      activities,
    );

  const trackedHours =
    trackedSeconds
    /
    3600;

  const days =
    new Set();

  for (
    const activity of activities
  ) {
    if (
      !activityDuration(
        activity,
      )
    ) {
      continue;
    }

    days.add(
      localDate(
        activity.from,
        timeZone,
        offsetMinutes,
      ),
    );
  }

  return {
    trackedSeconds,

    trackedHours,

    activeDays:
      days.size,

    expectedHours:
      Number(
        expectedHours || 0,
      ),

    scheduleCoveragePercent:
      Number(
        expectedHours,
      ) > 0
        ? round(
            Math.min(
              100,
              (
                trackedHours
                /
                Number(
                  expectedHours,
                )
              )
              *
              100,
            ),
            1,
          )
        : null,
  };
}

async function fetchScreenshotsChunked(
  env,
  connectionId,
  activityIds = [],
) {
  const output = [];

  const ids =
    unique(
      activityIds,
    );

  for (
    let i = 0;
    i < ids.length;
    i += 100
  ) {
    const result =
      await scrinFetch(
        env,
        connectionId,
        '/api/v2/GetScreenshots',
        ids.slice(
          i,
          i + 100,
        ),
      );

    if (
      Array.isArray(
        result.data,
      )
    ) {
      output.push(
        ...result.data,
      );
    }
  }

  const deduped =
    new Map();

  for (
    const screenshot of output
  ) {
    const key =
      screenshot?.id
      ||
      `${screenshot?.activityId || 'activity'}:${screenshot?.taken || 0}`;

    deduped.set(
      String(key),
      screenshot,
    );
  }

  return [
    ...deduped.values(),
  ]
  .sort(
    (a, b) =>
      Number(
        a?.taken || 0,
      )
      -
      Number(
        b?.taken || 0,
      ),
  );
}

function applicationName(
  application,
) {
  return (
    String(
      application?.applicationName
      ||
      'Unknown',
    )
    .trim()
    ||
    'Unknown'
  );
}

function screenshotManifest(
  screenshots,
  timeZone = '',
  offsetMinutes = 0,
) {
  return screenshots
    .filter(
      screenshot =>
        Number.isFinite(
          Number(
            screenshot?.taken,
          ),
        )
        &&
        Boolean(
          screenshot?.url
          ||
          screenshot?.thumbUrl,
        ),
    )
    .sort(
      (a, b) =>
        Number(a.taken)
        -
        Number(b.taken),
    )
    .map(
      (
        screenshot,
        index,
      ) => {
        const applications =
          Array.isArray(
            screenshot?.applications,
          )
            ? screenshot.applications
            : [];

        const foreground =
          applications.find(
            application =>
              application?.fromScreen,
          )
          ||
          applications[0];

        return {
          index,

          screenshotId:
            String(
              screenshot.id
              ||
              `${screenshot.activityId || 'activity'}:${screenshot.taken}`,
            ),

          activityId:
            screenshot.activityId
              ? String(
                  screenshot.activityId,
                )
              : '',

          taken:
            Number(
              screenshot.taken,
            ),

          date:
            localDate(
              screenshot.taken,
              timeZone,
              offsetMinutes,
            ),

          time:
            localTimeLabel(
              screenshot.taken,
              timeZone,
              offsetMinutes,
            ),

          dateTime:
            `${
              localDate(
                screenshot.taken,
                timeZone,
                offsetMinutes,
              )
            } ${
              localTimeLabel(
                screenshot.taken,
                timeZone,
                offsetMinutes,
              )
            }`,

          application:
            foreground?.applicationName
            ||
            'Screenshot',

          activityLevel:
            Number.isFinite(
              Number(
                screenshot.activityLevel,
              ),
            )
              ? Number(
                  screenshot.activityLevel,
                )
              : null,

          imageUrl:
            screenshot.url
            ||
            screenshot.thumbUrl
            ||
            null,

          thumbUrl:
            screenshot.thumbUrl
            ||
            screenshot.url
            ||
            null,
        };
      },
    );
}

function buildDateCounts(
  manifest = [],
) {
  const map = {};

  for (
    const screenshot of manifest
  ) {
    map[screenshot.date] =
      (
        map[screenshot.date]
        ||
        0
      )
      +
      1;
  }

  return map;
}

function stableHumanSample(
  manifest,
  sessionKey,
) {
  if (
    !manifest.length
  ) {
    return {
      target:
        0,

      count:
        0,

      screenshots:
        [],
    };
  }

  const seed =
    fnv1a32(
      `${sessionKey}|human-sample`,
    );

  const rng =
    mulberry32(
      seed,
    );

  const requestedTarget =
    HUMAN_SAMPLE_MIN
    +
    Math.floor(
      rng()
      *
      (
        HUMAN_SAMPLE_MAX
        -
        HUMAN_SAMPLE_MIN
        +
        1
      ),
    );

  const target =
    Math.min(
      manifest.length,
      requestedTarget,
    );

  const byDate =
    new Map();

  for (
    const screenshot of manifest
  ) {
    if (
      !byDate.has(
        screenshot.date,
      )
    ) {
      byDate.set(
        screenshot.date,
        [],
      );
    }

    byDate
      .get(
        screenshot.date,
      )
      .push(
        screenshot,
      );
  }

  const dayKeys =
    stableShuffle(
      [
        ...byDate.keys(),
      ]
      .sort(),
      rng,
    );

  const dayPools =
    dayKeys.map(
      date => ({
        date,

        screenshots:
          stableShuffle(
            byDate.get(date),
            rng,
          ),

        cursor:
          0,
      }),
    );

  const selected = [];

  const seen =
    new Set();

  let madeProgress =
    true;

  while (
    selected.length < target
    &&
    madeProgress
  ) {
    madeProgress =
      false;

    for (
      const pool of dayPools
    ) {
      if (
        selected.length
        >=
        target
      ) {
        break;
      }

      while (
        pool.cursor
        <
        pool.screenshots.length
      ) {
        const candidate =
          pool.screenshots[
            pool.cursor++
          ];

        if (
          !seen.has(
            candidate.screenshotId,
          )
        ) {
          seen.add(
            candidate.screenshotId,
          );

          selected.push(
            candidate,
          );

          madeProgress =
            true;

          break;
        }
      }
    }
  }

  return {
    target:
      requestedTarget,

    count:
      selected.length,

    screenshots:
      selected
        .sort(
          (a, b) =>
            a.taken - b.taken,
        ),
  };
}

function summarizeScreenshotApps(
  screenshots = [],
) {
  const apps = {};

  for (
    const screenshot of screenshots
  ) {
    const applications =
      Array.isArray(
        screenshot?.applications,
      )
        ? screenshot.applications
        : [];

    for (
      const application of applications
    ) {
      const name =
        applicationName(
          application,
        );

      const duration =
        Number(
          application?.duration || 0,
        );

      apps[name] =
        (
          apps[name]
          ||
          0
        )
        +
        (
          Number.isFinite(
            duration,
          )
            ? duration
            : 0
        );
    }
  }

  const total =
    Object
      .values(apps)
      .reduce(
        (
          sum,
          value,
        ) =>
          sum + value,
        0,
      )
    ||
    1;

  return Object
    .entries(apps)
    .sort(
      (a, b) =>
        b[1] - a[1],
    )
    .map(
      ([
        name,
        seconds,
      ]) => ({
        name,

        seconds,

        hours:
          round(
            seconds / 3600,
            2,
          ),

        sharePercent:
          round(
            (
              seconds
              /
              total
            )
            *
            100,
            1,
          ),
      }),
    );
}

function reviewAssessment(
  metrics,
  manifest,
) {
  const reasons = [];

  if (
    metrics.trackedHours
    <=
    0
  ) {
    reasons.push(
      'No tracked time was returned for the selected period.',
    );
  }

  if (
    metrics.trackedHours
    >
    0
    &&
    manifest.length === 0
  ) {
    reasons.push(
      'Tracked time exists but no screenshot evidence was returned.',
    );
  }

  return {
    status:
      reasons.length
        ? 'Yellow'
        : 'Green',

    reasons,

    note:
      reasons.length
        ? 'Evidence coverage should be reviewed before release.'
        : 'The monthly evidence package is available for full screenshot screening.',
  };
}

async function prepareScreening(
  env,
  input,
) {
  const connectionId =
    input.connectionId;

  const employmentId =
    input.employmentId;

  const from =
    input.from;

  const to =
    input.to;

  const timeZone =
    String(
      input.timezone || '',
    )
    .trim();

  const offsetMinutes =
    Number(
      input.timezoneOffsetMinutes
      ||
      0,
    );

  const expectedHours =
    Number(
      input.adjustedExpectedHours
      ??
      input.expectedHours
      ??
      0,
    );

  if (
    !employmentId
    ||
    !from
    ||
    !to
  ) {
    throw new Error(
      'employmentId, from and to are required',
    );
  }

  const range =
    epochRange(
      from,
      to,
      timeZone,
      offsetMinutes,
    );

  const activityResult =
    await scrinFetch(
      env,
      connectionId,
      '/api/v2/GetActivities',
      [
        {
          employmentId:
            String(
              employmentId,
            ),

          from:
            range.from,

          to:
            range.to,
        },
      ],
    );

  const activities =
    Array.isArray(
      activityResult.data,
    )
      ? activityResult.data
      : [];

  const screenshots =
    await fetchScreenshotsChunked(
      env,
      connectionId,
      activities.map(
        activity =>
          activity.id,
      ),
    );

  const manifest =
    screenshotManifest(
      screenshots,
      timeZone,
      offsetMinutes,
    );

  const metrics =
    summarizeActivities(
      activities,
      expectedHours,
      timeZone,
      offsetMinutes,
    );

  const screenshotDates =
    unique(
      manifest.map(
        item =>
          item.date,
      ),
    )
    .sort();

  const sessionKey =
    stableSessionKey(
      input,
    );

  const humanSample =
    stableHumanSample(
      manifest,
      sessionKey,
    );

  const requestedBatchSize =
    Number(
      input.batchSize
      ||
      DEFAULT_SCAN_BATCH_SIZE,
    );

  const batchSize =
    clamp(
      requestedBatchSize,
      8,
      MAX_BATCH_IMAGES,
    );

  const overlapSize =
    clamp(
      Number(
        input.overlapSize
        ??
        DEFAULT_BATCH_OVERLAP,
      ),
      0,
      Math.min(
        4,
        batchSize - 1,
      ),
    );

  const newPerBatch =
    Math.max(
      1,
      batchSize - overlapSize,
    );

  const totalBatches =
    manifest.length
      ? Math.ceil(
          manifest.length
          /
          newPerBatch,
        )
      : 0;

  return {
    sessionKey,

    connection:
      publicConnection(
        activityResult.connection,
      ),

    period: {
      from,
      to,

      dayCount:
        dayCountInclusive(
          from,
          to,
        ),
    },

    timezone: {
      iana:
        isValidTimeZone(
          timeZone,
        )
          ? timeZone
          : null,

      fallbackOffsetMinutes:
        offsetMinutes,

      label:
        isValidTimeZone(
          timeZone,
        )
          ? timeZone
          : (
              `UTC${
                offsetMinutes >= 0
                  ? '+'
                  : ''
              }${
                round(
                  offsetMinutes / 60,
                  2,
                )
              }`
            ),
    },

    metrics,

    screenshotCount:
      manifest.length,

    screenshotDates,

    screenshotDateCounts:
      buildDateCounts(
        manifest,
      ),

    manifest,

    humanSample,

    scanPlan: {
      batchSize,
      overlapSize,
      newPerBatch,
      totalBatches,
    },

    apps:
      summarizeScreenshotApps(
        screenshots,
      )
      .slice(
        0,
        15,
      ),

    review:
      reviewAssessment(
        metrics,
        manifest,
      ),

    versions: {
      analysisVersion:
        ANALYSIS_VERSION,

      rulesVersion:
        RULES_VERSION,

      promptVersion:
        PROMPT_VERSION,
    },
  };
}

function normalizeInputScreenshot(
  item,
) {
  return {
    screenshotId:
      String(
        item?.screenshotId || '',
      ),

    activityId:
      String(
        item?.activityId || '',
      ),

    taken:
      Number(
        item?.taken || 0,
      ),

    date:
      String(
        item?.date || '',
      ),

    time:
      String(
        item?.time || '',
      ),

    dateTime:
      String(
        item?.dateTime || '',
      ),

    application:
      String(
        item?.application
        ||
        'Screenshot',
      ),

    activityLevel:
      Number.isFinite(
        Number(
          item?.activityLevel,
        ),
      )
        ? Number(
            item.activityLevel,
          )
        : null,

    imageUrl:
      item?.imageUrl
      ||
      item?.thumbUrl
      ||
      null,

    thumbUrl:
      item?.thumbUrl
      ||
      item?.imageUrl
      ||
      null,
  };
}

function extractResponseText(
  data,
) {
  if (
    typeof data?.output_text
    ===
    'string'
    &&
    data.output_text
  ) {
    return data.output_text;
  }

  const output =
    Array.isArray(
      data?.output,
    )
      ? data.output
      : [];

  for (
    const item of output
  ) {
    const content =
      Array.isArray(
        item?.content,
      )
        ? item.content
        : [];

    for (
      const part of content
    ) {
      if (
        part?.type ===
        'output_text'
        &&
        typeof part?.text
        ===
        'string'
      ) {
        return part.text;
      }
    }
  }

  return '';
}

async function openAIJson(
  env,
  systemPrompt,
  userContent,
  schemaName,
  schema,
) {
  const model =
    env.OPENAI_SCREENING_MODEL
    ||
    env.OPENAI_MODEL;

  if (
    !env.OPENAI_API_KEY
    ||
    !model
  ) {
    throw new Error(
      'Full-month AI screening requires OPENAI_API_KEY and OPENAI_MODEL (or OPENAI_SCREENING_MODEL).',
    );
  }

  const response =
    await fetch(
      'https://api.openai.com/v1/responses',
      {
        method:
          'POST',

        headers: {
          Authorization:
            `Bearer ${env.OPENAI_API_KEY}`,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            model,

            input: [
              {
                role:
                  'system',

                content:
                  systemPrompt,
              },

              {
                role:
                  'user',

                content:
                  userContent,
              },
            ],

            text: {
              format: {
                type:
                  'json_schema',

                name:
                  schemaName,

                strict:
                  true,

                schema,
              },
            },
          }),
      },
    );

  const data =
    await response.json();

  if (
    !response.ok
  ) {
    throw new Error(
      `OpenAI ${response.status}: ${JSON.stringify(data).slice(0, 700)}`,
    );
  }

  const text =
    extractResponseText(
      data,
    );

  if (
    !text
  ) {
    throw new Error(
      'OpenAI returned no structured output text',
    );
  }

  return {
    parsed:
      JSON.parse(text),

    model,

    responseId:
      data.id || null,
  };
}

function batchUserContent(
  screenshots,
  countedScreenshotIds,
  batchIndex,
  totalBatches,
) {
  const content = [
    {
      type:
        'input_text',

      text:
        `Full-month screening batch ${batchIndex + 1} of ${totalBatches}.\n`
        +
        `There are ${screenshots.length} images in this request. `
        +
        `Some may be chronological overlap from the prior batch so frozen/cycling patterns can cross batch boundaries.\n`
        +
        `Counted screenshot IDs for progress: ${JSON.stringify(countedScreenshotIds)}\n`
        +
        `Return one screenshot object for every supplied screenshotId.`,
    },
  ];

  for (
    const screenshot of screenshots
  ) {
    content.push({
      type:
        'input_text',

      text:
        `SCREENSHOT `
        +
        `id=${screenshot.screenshotId}; `
        +
        `date=${screenshot.date}; `
        +
        `time=${screenshot.time}; `
        +
        `applicationMetadata=${screenshot.application}; `
        +
        `activityLevelMetadata=${screenshot.activityLevel ?? 'unknown'}`,
    });

    content.push({
      type:
        'input_image',

      image_url:
        screenshot.imageUrl,

      detail:
        'auto',
    });
  }

  return content;
}

function normalizeBatchChecks(
  checks = [],
) {
  const keys = [
    'repeated_frozen',
    'repetitive_cycling',
    'activity_simulation',
    'repeated_across_days',
  ];

  const map =
    new Map(
      checks.map(
        check => [
          check.key,
          check,
        ],
      ),
    );

  return keys.map(
    key =>
      map.get(key)
      ||
      {
        key,

        status:
          key ===
          'repeated_across_days'
            ? 'not_assessed'
            : 'clear',

        detail:
          key ===
          'repeated_across_days'
            ? 'Cross-day replay assessment is finalized after all monthly batches are screened.'
            : 'No review-worthy pattern was returned in this batch.',

        screenshotIds:
          [],
      },
  );
}

async function scanBatch(
  env,
  input,
) {
  const screenshots =
    (
      Array.isArray(
        input.screenshots,
      )
        ? input.screenshots
        : []
    )
    .map(
      normalizeInputScreenshot,
    )
    .filter(
      item =>
        item.screenshotId
        &&
        item.imageUrl,
    );

  if (
    !screenshots.length
  ) {
    throw new Error(
      'screenshots[] with imageUrl is required',
    );
  }

  if (
    screenshots.length
    >
    MAX_BATCH_IMAGES
  ) {
    throw new Error(
      `A screening batch may contain at most ${MAX_BATCH_IMAGES} images`,
    );
  }

  const suppliedIds =
    new Set(
      screenshots.map(
        item =>
          item.screenshotId,
      ),
    );

  const countedIds =
    unique(
      (
        Array.isArray(
          input.countedScreenshotIds,
        )
          ? input.countedScreenshotIds
          : screenshots.map(
              item =>
                item.screenshotId,
            )
      )
      .map(String)
      .filter(
        id =>
          suppliedIds.has(id),
      ),
    );

  const batchIndex =
    Math.max(
      0,
      Number(
        input.batchIndex || 0,
      ),
    );

  const totalBatches =
    Math.max(
      1,
      Number(
        input.totalBatches || 1,
      ),
    );

  const ai =
    await openAIJson(
      env,
      BATCH_SYSTEM_PROMPT,
      batchUserContent(
        screenshots,
        countedIds,
        batchIndex,
        totalBatches,
      ),
      'wgm_full_month_screening_batch',
      BATCH_SCHEMA,
    );

  const metadata =
    new Map(
      screenshots.map(
        item => [
          item.screenshotId,
          item,
        ],
      ),
    );

  const returned =
    new Map();

  for (
    const result of
      Array.isArray(
        ai.parsed?.screenshots,
      )
        ? ai.parsed.screenshots
        : []
  ) {
    if (
      !metadata.has(
        String(
          result.screenshotId,
        ),
      )
    ) {
      continue;
    }

    returned.set(
      String(
        result.screenshotId,
      ),
      result,
    );
  }

  const normalizedResults = [];
  const missingScreenshotIds = [];

  for (
    const screenshot of screenshots
  ) {
    const result =
      returned.get(
        screenshot.screenshotId,
      );

    if (
      !result
    ) {
      missingScreenshotIds.push(
        screenshot.screenshotId,
      );

      normalizedResults.push({
        screenshotId:
          screenshot.screenshotId,

        date:
          screenshot.date,

        time:
          screenshot.time,

        dateTime:
          screenshot.dateTime,

        application:
          screenshot.application,

        status:
          'review',

        visualKey:
          'unclassified_missing_ai_result',

        reasons: [
          'The AI response did not include this screenshot. Retry this batch before finalizing.',
        ],

        signals:
          [],
      });

      continue;
    }

    normalizedResults.push({
      screenshotId:
        screenshot.screenshotId,

      date:
        screenshot.date,

      time:
        screenshot.time,

      dateTime:
        screenshot.dateTime,

      application:
        screenshot.application,

      status:
        result.status,

      visualKey:
        String(
          result.visualKey
          ||
          'unclassified',
        )
        .slice(
          0,
          120,
        ),

      reasons:
        Array.isArray(
          result.reasons,
        )
          ? result.reasons.slice(0, 4)
          : [],

      signals:
        Array.isArray(
          result.signals,
        )
          ? result.signals.slice(0, 4)
          : [],
    });
  }

  const successfulIds =
    normalizedResults
      .filter(
        result =>
          !missingScreenshotIds.includes(
            result.screenshotId,
          ),
      )
      .map(
        result =>
          result.screenshotId,
      );

  const countedReviewedIds =
    countedIds.filter(
      id =>
        successfulIds.includes(id),
    );

  return {
    batchIndex,

    totalBatches,

    suppliedScreenshotCount:
      screenshots.length,

    countedScreenshotCount:
      countedIds.length,

    countedReviewedCount:
      countedReviewedIds.length,

    countedReviewedIds,

    missingScreenshotIds,

    screenshots:
      normalizedResults,

    checks:
      normalizeBatchChecks(
        ai.parsed?.checks,
      ),

    ai: {
      model:
        ai.model,

      responseId:
        ai.responseId,
    },
  };
}

function resultByScreenshot(
  batchResults = [],
) {
  const map =
    new Map();

  for (
    const batch of batchResults
  ) {
    const results =
      Array.isArray(
        batch?.screenshots,
      )
        ? batch.screenshots
        : [];

    for (
      const result of results
    ) {
      const id =
        String(
          result?.screenshotId || '',
        );

      if (
        !id
      ) {
        continue;
      }

      const existing =
        map.get(id);

      if (
        !existing
        ||
        existing.visualKey
        ===
        'unclassified_missing_ai_result'
      ) {
        map.set(
          id,
          result,
        );
      }
    }
  }

  return map;
}

function batchCheckFindings(
  batchResults = [],
) {
  const map =
    new Map();

  const keys = [
    'repeated_frozen',
    'repetitive_cycling',
    'activity_simulation',
  ];

  for (
    const key of keys
  ) {
    map.set(
      key,
      {
        key,
        status:
          'clear',
        details:
          [],
        screenshotIds:
          new Set(),
      },
    );
  }

  for (
    const batch of batchResults
  ) {
    for (
      const check of
        Array.isArray(
          batch?.checks,
        )
          ? batch.checks
          : []
    ) {
      if (
        !map.has(
          check.key,
        )
      ) {
        continue;
      }

      const current =
        map.get(
          check.key,
        );

      if (
        check.status
        ===
        'review'
      ) {
        current.status =
          'review';
      }

      if (
        check.status
        ===
        'not_assessed'
        &&
        current.status
        !==
        'review'
      ) {
        current.status =
          'not_assessed';
      }

      if (
        check.detail
      ) {
        current.details.push(
          check.detail,
        );
      }

      for (
        const id of
          Array.isArray(
            check.screenshotIds,
          )
            ? check.screenshotIds
            : []
      ) {
        current
          .screenshotIds
          .add(
            String(id),
          );
      }
    }
  }

  return [
    ...map.values(),
  ]
  .map(
    item => ({
      key:
        item.key,

      status:
        item.status,

      detail:
        item.status
        ===
        'review'
          ? unique(
              item.details,
            )
            .slice(
              0,
              2,
            )
            .join(' ')
          : item.status
            ===
            'not_assessed'
              ? 'This check requires additional review because one or more screening batches were incomplete.'
              : defaultClearDetail(
                  item.key,
                ),

      screenshotIds:
        [
          ...item.screenshotIds,
        ],
    }),
  );
}

function defaultClearDetail(
  key,
) {
  return {
    repeated_frozen:
      'No concerning unchanged-screen sequence was identified in the full-month screenshot screening.',

    repetitive_cycling:
      'No suspicious back-and-forth screen cycling pattern was identified in the full-month screenshot screening.',

    activity_simulation:
      'No visible mouse-mover, auto-clicker, or activity-simulation interface was identified in the full-month screenshot screening.',

    repeated_across_days:
      'No concerning replay-like repeated sequence across different capture dates was confirmed.',
  }[key];
}

function sequenceCandidates(
  resultsMap,
) {
  const byDate =
    new Map();

  for (
    const result of resultsMap.values()
  ) {
    if (
      !result?.date
      ||
      !result?.visualKey
    ) {
      continue;
    }

    if (
      result.visualKey
      ===
      'unclassified_missing_ai_result'
    ) {
      continue;
    }

    if (
      !byDate.has(
        result.date,
      )
    ) {
      byDate.set(
        result.date,
        [],
      );
    }

    byDate
      .get(
        result.date,
      )
      .push(
        result,
      );
  }

  for (
    const results of byDate.values()
  ) {
    results.sort(
      (a, b) =>
        String(
          a.dateTime,
        )
        .localeCompare(
          String(
            b.dateTime,
          ),
        ),
    );
  }

  const sequences =
    new Map();

  for (
    const [
      date,
      results,
    ]
    of
    byDate.entries()
  ) {
    for (
      let i = 0;
      i <= results.length - 3;
      i++
    ) {
      const slice =
        results.slice(
          i,
          i + 3,
        );

      const keys =
        slice.map(
          item =>
            item.visualKey,
        );

      if (
        new Set(keys).size
        ===
        1
        &&
        keys[0].includes(
          'unclassified',
        )
      ) {
        continue;
      }

      const signature =
        keys.join(
          '>>',
        );

      if (
        !sequences.has(
          signature,
        )
      ) {
        sequences.set(
          signature,
          [],
        );
      }

      sequences
        .get(
          signature,
        )
        .push({
          date,

          screenshotIds:
            slice.map(
              item =>
                item.screenshotId,
            ),
        });
    }
  }

  const candidates = [];

  for (
    const [
      signature,
      occurrences,
    ]
    of
    sequences.entries()
  ) {
    const dates =
      unique(
        occurrences.map(
          item =>
            item.date,
        ),
      );

    if (
      dates.length < 2
    ) {
      continue;
    }

    candidates.push({
      signature,

      dates,

      occurrences,

      screenshotIds:
        unique(
          occurrences.flatMap(
            item =>
              item.screenshotIds,
          ),
        )
        .slice(
          0,
          24,
        ),
    });
  }

  return candidates
    .sort(
      (a, b) =>
        b.dates.length
        -
        a.dates.length,
    )
    .slice(
      0,
      8,
    );
}

function candidateImageContent(
  candidates,
  manifestMap,
) {
  const ids =
    unique(
      candidates.flatMap(
        candidate =>
          candidate.screenshotIds,
      ),
    )
    .slice(
      0,
      24,
    );

  const content = [
    {
      type:
        'input_text',

      text:
        'The full-month first pass found semantic sequence candidates recurring across different dates. '
        +
        'Verify the actual candidate images. Candidate summary: '
        +
        JSON.stringify(
          candidates.map(
            candidate => ({
              dates:
                candidate.dates,

              screenshotIds:
                candidate.screenshotIds,
            }),
          ),
        ),
    },
  ];

  for (
    const id of ids
  ) {
    const screenshot =
      manifestMap.get(id);

    if (
      !screenshot?.imageUrl
    ) {
      continue;
    }

    content.push({
      type:
        'input_text',

      text:
        `CANDIDATE SCREENSHOT `
        +
        `id=${screenshot.screenshotId}; `
        +
        `date=${screenshot.date}; `
        +
        `time=${screenshot.time}; `
        +
        `application=${screenshot.application}`,
    });

    content.push({
      type:
        'input_image',

      image_url:
        screenshot.imageUrl,

      detail:
        'auto',
    });
  }

  return content;
}

async function crossDayReview(
  env,
  candidates,
  manifest,
) {
  if (
    !candidates.length
  ) {
    return {
      key:
        'repeated_across_days',

      status:
        'clear',

      detail:
        defaultClearDetail(
          'repeated_across_days',
        ),

      screenshotIds:
        [],

      candidateGroupsReviewed:
        0,
    };
  }

  const manifestMap =
    new Map(
      manifest.map(
        item => [
          String(
            item.screenshotId,
          ),
          item,
        ],
      ),
    );

  try {
    const ai =
      await openAIJson(
        env,
        CROSS_DAY_SYSTEM_PROMPT,
        candidateImageContent(
          candidates,
          manifestMap,
        ),
        'wgm_cross_day_replay_check',
        CROSS_DAY_SCHEMA,
      );

    return {
      key:
        'repeated_across_days',

      status:
        ai.parsed.status,

      detail:
        ai.parsed.detail,

      screenshotIds:
        unique(
          ai.parsed.screenshotIds
          ||
          [],
        ),

      candidateGroupsReviewed:
        candidates.length,

      ai: {
        model:
          ai.model,

        responseId:
          ai.responseId,
      },
    };
  } catch (
    error
  ) {
    return {
      key:
        'repeated_across_days',

      status:
        'not_assessed',

      detail:
        `Cross-day replay verification could not be completed: ${error.message}`,

      screenshotIds:
        [],

      candidateGroupsReviewed:
        candidates.length,
    };
  }
}

function findingFromCheck(
  check,
) {
  if (
    check.status
    !==
    'review'
  ) {
    return null;
  }

  return {
    type:
      check.key,

    reason:
      check.detail,

    screenshotIds:
      unique(
        check.screenshotIds
        ||
        [],
      ),
  };
}

async function finalizeScreening(
  env,
  input,
) {
  const manifest =
    (
      Array.isArray(
        input.manifest,
      )
        ? input.manifest
        : []
    )
    .map(
      normalizeInputScreenshot,
    )
    .filter(
      item =>
        item.screenshotId,
    );

  const batchResults =
    Array.isArray(
      input.batchResults,
    )
      ? input.batchResults
      : [];

  const expectedScreenshots =
    Number(
      input.expectedScreenshots
      ??
      manifest.length
      ??
      0,
    );

  const resultMap =
    resultByScreenshot(
      batchResults,
    );

  const successfullyScreenedIds =
    [
      ...resultMap.values(),
    ]
    .filter(
      result =>
        result.visualKey
        !==
        'unclassified_missing_ai_result',
    )
    .map(
      result =>
        String(
          result.screenshotId,
        ),
    );

  const uniqueScreenedIds =
    unique(
      successfullyScreenedIds,
    );

  const allScreenshotsScreened =
    expectedScreenshots === 0
      ? true
      : (
          uniqueScreenedIds.length
          ===
          expectedScreenshots
        );

  const missingScreenshotIds =
    manifest
      .map(
        item =>
          item.screenshotId,
      )
      .filter(
        id =>
          !uniqueScreenedIds.includes(
            id,
          ),
      );

  const baseChecks =
    batchCheckFindings(
      batchResults,
    );

  const candidates =
    sequenceCandidates(
      resultMap,
    );

  const crossDay =
    allScreenshotsScreened
      ? await crossDayReview(
          env,
          candidates,
          manifest,
        )
      : {
          key:
            'repeated_across_days',

          status:
            'not_assessed',

          detail:
            'Cross-day replay verification was not finalized because the full screenshot set has not been successfully screened.',

          screenshotIds:
            [],

          candidateGroupsReviewed:
            0,
        };

  const checks = [
    ...baseChecks,
    crossDay,
  ];

  const findings =
    checks
      .map(
        findingFromCheck,
      )
      .filter(Boolean);

  if (
    !allScreenshotsScreened
  ) {
    findings.push({
      type:
        'incomplete_screening',

      reason:
        `${missingScreenshotIds.length} screenshot(s) still require successful AI screening before this month can be marked complete.`,

      screenshotIds:
        missingScreenshotIds.slice(
          0,
          24,
        ),
    });
  }

  const aiFlaggedScreenshotIds =
    unique(
      findings.flatMap(
        finding =>
          finding.screenshotIds
          ||
          [],
      ),
    );

  const overallResult =
    findings.length
      ? 'review'
      : 'clear';

  const headline =
    !allScreenshotsScreened
      ? (
          `${missingScreenshotIds.length} screenshot`
          +
          `${missingScreenshotIds.length === 1 ? '' : 's'} `
          +
          `still require screening.`
        )
      : aiFlaggedScreenshotIds.length
        ? (
            `${aiFlaggedScreenshotIds.length} questionable screenshot`
            +
            `${aiFlaggedScreenshotIds.length === 1 ? '' : 's'} `
            +
            `need human context.`
          )
        : 'No suspicious patterns found.';

  return {
    overallResult,

    screeningHeadline:
      headline,

    screeningSubtext:
      allScreenshotsScreened
        ? (
            `AI screened all `
            +
            `${uniqueScreenedIds.length.toLocaleString()} `
            +
            `supplied screenshot images for the selected period. `
            +
            `Human review is still required before release.`
          )
        : (
            `AI successfully screened `
            +
            `${uniqueScreenedIds.length.toLocaleString()} `
            +
            `of `
            +
            `${expectedScreenshots.toLocaleString()} `
            +
            `supplied screenshot images.`
          ),

    checks,

    findings,

    aiFlaggedScreenshotIds,

    screenedScreenshots:
      uniqueScreenedIds.length,

    totalScreenshots:
      expectedScreenshots,

    allScreenshotsScreened,

    missingScreenshotIds,

    crossDayCandidateGroups:
      candidates.length,

    scopeNote:
      'Review scope: supplied Scrin screenshot images and verified metadata for the selected period. Hidden automation and physical mouse movers may not be visible. Screening flags are not automated findings of misconduct.',

    versions: {
      analysisVersion:
        ANALYSIS_VERSION,

      rulesVersion:
        RULES_VERSION,

      promptVersion:
        PROMPT_VERSION,
    },
  };
}

function legacyVisionContent(
  input,
) {
  const analytics =
    input.analytics || {};

  const screenshots =
    Array.isArray(
      analytics.selectedScreenshotEvidence,
    )
      ? analytics.selectedScreenshotEvidence

      : Array.isArray(
          analytics.humanSample?.screenshots,
        )
        ? analytics.humanSample.screenshots
        : [];

  const content = [
    {
      type:
        'input_text',

      text:
        'Legacy compatibility screening. '
        +
        'This endpoint does not replace the new full-month batch workflow. '
        +
        'Employee/period metadata: '
        +
        JSON.stringify({
          employee:
            input.employee || null,

          period:
            input.period
            ||
            analytics.period
            ||
            null,
        }),
    },
  ];

  for (
    const screenshot of screenshots.slice(
      0,
      12,
    )
  ) {
    if (
      !screenshot?.imageUrl
    ) {
      continue;
    }

    content.push({
      type:
        'input_text',

      text:
        `SCREENSHOT `
        +
        `id=${screenshot.screenshotId}; `
        +
        `dateTime=${screenshot.dateTime}; `
        +
        `application=${screenshot.application}`,
    });

    content.push({
      type:
        'input_image',

      image_url:
        screenshot.imageUrl,

      detail:
        'auto',
    });
  }

  return content;
}

function legacyFallback() {
  return {
    overallResult:
      'review',

    screeningHeadline:
      'Full-month screening required.',

    screeningSubtext:
      'Use the V1.9 full-month screening workflow before human approval and release.',

    checks: [
      {
        key:
          'repeated_frozen',

        status:
          'not_assessed',

        detail:
          'Full-month batch screening has not been completed.',
      },

      {
        key:
          'repetitive_cycling',

        status:
          'not_assessed',

        detail:
          'Full-month batch screening has not been completed.',
      },

      {
        key:
          'activity_simulation',

        status:
          'not_assessed',

        detail:
          'Full-month batch screening has not been completed.',
      },

      {
        key:
          'repeated_across_days',

        status:
          'not_assessed',

        detail:
          'Full-month batch screening has not been completed.',
      },
    ],

    findings:
      [],

    scopeNote:
      'Legacy compatibility draft only. Use the full-month batch screening workflow for release.',
  };
}

async function legacyGenerate(
  env,
  input,
) {
  const fallback =
    legacyFallback();

  if (
    !env.OPENAI_API_KEY
    ||
    !(
      env.OPENAI_SCREENING_MODEL
      ||
      env.OPENAI_MODEL
    )
  ) {
    return {
      report:
        fallback,

      usedOpenAI:
        false,

      warning:
        'OpenAI screening model is not configured.',

      visionScreenshotsSent:
        0,
    };
  }

  const content =
    legacyVisionContent(
      input,
    );

  const visionScreenshotsSent =
    content.filter(
      item =>
        item.type ===
        'input_image',
    ).length;

  if (
    !visionScreenshotsSent
  ) {
    return {
      report:
        fallback,

      usedOpenAI:
        false,

      warning:
        'No screenshot images were supplied to the legacy screening endpoint.',

      visionScreenshotsSent:
        0,
    };
  }

  try {
    const ai =
      await openAIJson(
        env,
        LEGACY_SYSTEM_PROMPT,
        content,
        'wgm_legacy_screening_report',
        LEGACY_REPORT_SCHEMA,
      );

    return {
      report:
        ai.parsed,

      usedOpenAI:
        true,

      warning:
        'Legacy compatibility endpoint used. Full-month V1.9 screening is required before release.',

      visionScreenshotsSent,
    };
  } catch (
    error
  ) {
    return {
      report:
        fallback,

      usedOpenAI:
        false,

      warning:
        `Legacy OpenAI screening failed: ${error.message}`,

      visionScreenshotsSent:
        0,
    };
  }
}

function demoPrepare(
  input,
) {
  const period = {
    from:
      input.from,

    to:
      input.to,

    dayCount:
      dayCountInclusive(
        input.from,
        input.to,
      ),
  };

  const screenshotDates = [
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    '2026-09-07',
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
    '2026-09-25',
  ];

  const manifest = [];

  let index = 0;

  for (
    const date of screenshotDates
  ) {
    for (
      let i = 0;
      i < 6;
      i++
    ) {
      manifest.push({
        index,

        screenshotId:
          `demo_${index + 1}`,

        activityId:
          `demo_activity_${Math.floor(index / 3) + 1}`,

        taken:
          Date.parse(
            `${date}T${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '35' : '05'}:00Z`,
          )
          /
          1000,

        date,

        time:
          `${9 + Math.floor(i / 2)}:${i % 2 ? '35' : '05'} AM`,

        dateTime:
          `${date} ${9 + Math.floor(i / 2)}:${i % 2 ? '35' : '05'} AM`,

        application:
          i % 3 === 0
            ? 'CRM'
            : i % 3 === 1
              ? 'Email'
              : 'Browser',

        activityLevel:
          70,

        imageUrl:
          null,

        thumbUrl:
          null,
      });

      index++;
    }
  }

  const sessionKey =
    stableSessionKey(
      input,
    );

  const humanSample =
    stableHumanSample(
      manifest,
      sessionKey,
    );

  const batchSize =
    clamp(
      Number(
        input.batchSize
        ||
        DEFAULT_SCAN_BATCH_SIZE,
      ),
      8,
      MAX_BATCH_IMAGES,
    );

  const overlapSize =
    clamp(
      Number(
        input.overlapSize
        ??
        DEFAULT_BATCH_OVERLAP,
      ),
      0,
      Math.min(
        4,
        batchSize - 1,
      ),
    );

  const newPerBatch =
    Math.max(
      1,
      batchSize - overlapSize,
    );

  return {
    sessionKey,

    connection: {
      id:
        'demo-main',

      name:
        'Demo Scrin Connection',

      provider:
        'scrin',

      type:
        'shared',

      employer:
        '',

      employerLocked:
        false,

      status:
        'demo',
    },

    period,

    timezone: {
      iana:
        'America/Los_Angeles',

      fallbackOffsetMinutes:
        -420,

      label:
        'America/Los_Angeles',
    },

    metrics: {
      trackedSeconds:
        161.42
        *
        3600,

      trackedHours:
        161.42,

      activeDays:
        20,

      expectedHours:
        Number(
          input.expectedHours
          ||
          160,
        ),

      scheduleCoveragePercent:
        100,
    },

    screenshotCount:
      manifest.length,

    screenshotDates,

    screenshotDateCounts:
      buildDateCounts(
        manifest,
      ),

    manifest,

    humanSample,

    scanPlan: {
      batchSize,
      overlapSize,
      newPerBatch,

      totalBatches:
        Math.ceil(
          manifest.length
          /
          newPerBatch,
        ),
    },

    apps:
      [],

    review: {
      status:
        'Green',

      reasons:
        [],

      note:
        'Demo evidence package prepared.',
    },

    versions: {
      analysisVersion:
        ANALYSIS_VERSION,

      rulesVersion:
        RULES_VERSION,

      promptVersion:
        PROMPT_VERSION,
    },
  };
}

export default {
  async fetch(
    request,
    env,
  ) {
    const url =
      new URL(
        request.url,
      );

    const demo =
      env.DEMO_MODE
      !==
      'false';

    if (
      url.pathname ===
      '/api/health'
    ) {
      return json({
        ok:
          true,

        mode:
          demo
            ? 'demo'
            : 'live',

        connectionCount:
          parseConnections(
            env,
          ).length,

        analysisVersion:
          ANALYSIS_VERSION,

        rulesVersion:
          RULES_VERSION,

        promptVersion:
          PROMPT_VERSION,

        screeningMode:
          'full_month_batch',

        defaultScanBatchSize:
          DEFAULT_SCAN_BATCH_SIZE,

        humanSampleRange: [
          HUMAN_SAMPLE_MIN,
          HUMAN_SAMPLE_MAX,
        ],
      });
    }

    if (
      url.pathname ===
      '/api/scrin/connections'
    ) {
      if (
        demo
      ) {
        return json({
          demo:
            true,

          connections: [
            {
              id:
                'demo-main',

              name:
                'Demo Scrin Connection',

              provider:
                'scrin',

              type:
                'shared',

              employer:
                '',

              employerLocked:
                false,

              status:
                'demo',
            },
          ],
        });
      }

      return json({
        demo:
          false,

        connections:
          parseConnections(
            env,
          )
          .map(
            publicConnection,
          ),
      });
    }

    if (
      url.pathname ===
      '/api/scrin/all-common'
      &&
      request.method ===
      'POST'
    ) {
      if (
        demo
      ) {
        const connection = {
          id:
            'demo-main',

          name:
            'Demo Scrin Connection',

          provider:
            'scrin',

          type:
            'shared',

          employer:
            '',

          token:
            'demo',
        };

        const normalized =
          normalizeCommon(
            demoCommon(),
            connection,
          );

        return json({
          demo:
            true,

          connections: [
            {
              ...publicConnection(
                connection,
              ),

              status:
                'connected',

              employeeCount:
                normalized
                  .employees
                  .length,
            },
          ],

          employees:
            normalized.employees,

          errors:
            [],
        });
      }

      const connections =
        parseConnections(
          env,
        );

      const employees = [];
      const publicConnections = [];
      const errors = [];

      for (
        const connection of connections
      ) {
        try {
          const result =
            await scrinFetch(
              env,
              connection.id,
              '/api/v2/GetCommonData',
              {},
            );

          const normalized =
            normalizeCommon(
              result.data,
              connection,
            );

          employees.push(
            ...normalized.employees,
          );

          publicConnections.push({
            ...publicConnection(
              connection,
            ),

            status:
              'connected',

            employeeCount:
              normalized
                .employees
                .length,

            companyCount:
              normalized
                .companies
                .length,
          });
        } catch (
          error
        ) {
          errors.push({
            connectionId:
              connection.id,

            connectionName:
              connection.name,

            error:
              error.message,
          });

          publicConnections.push({
            ...publicConnection(
              connection,
            ),

            status:
              'error',

            employeeCount:
              0,

            error:
              error.message,
          });
        }
      }

      return json({
        demo:
          false,

        connections:
          publicConnections,

        employees,

        errors,
      });
    }

    if (
      url.pathname ===
      '/api/scrin/activities'
      &&
      request.method ===
      'POST'
    ) {
      try {
        const body =
          await readJson(
            request,
          );

        if (
          !Array.isArray(
            body.ranges,
          )
        ) {
          return json(
            {
              error:
                'Expected { connectionId, ranges: [...] }',
            },
            400,
          );
        }

        const result =
          await scrinFetch(
            env,
            body.connectionId,
            '/api/v2/GetActivities',
            body.ranges,
          );

        return json({
          connection:
            publicConnection(
              result.connection,
            ),

          activities:
            result.data,
        });
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/scrin/screenshots'
      &&
      request.method ===
      'POST'
    ) {
      try {
        const body =
          await readJson(
            request,
          );

        if (
          !Array.isArray(
            body.activityIds,
          )
        ) {
          return json(
            {
              error:
                'Expected { connectionId, activityIds: [...] }',
            },
            400,
          );
        }

        const result =
          await scrinFetch(
            env,
            body.connectionId,
            '/api/v2/GetScreenshots',
            body.activityIds,
          );

        return json({
          connection:
            publicConnection(
              result.connection,
            ),

          screenshots:
            result.data,
        });
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/wgm/screening/prepare'
      &&
      request.method ===
      'POST'
    ) {
      try {
        const body =
          await readJson(
            request,
          );

        const prepared =
          demo
            ? demoPrepare(
                body,
              )
            : await prepareScreening(
                env,
                body,
              );

        return json(
          prepared,
        );
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/wgm/screening/batch'
      &&
      request.method ===
      'POST'
    ) {
      if (
        demo
      ) {
        return json(
          {
            error:
              'Demo mode does not contain real screenshot image URLs. Switch DEMO_MODE=false to run actual full-month AI screenshot screening.',
          },
          400,
        );
      }

      try {
        const body =
          await readJson(
            request,
          );

        const result =
          await scanBatch(
            env,
            body,
          );

        return json(
          result,
        );
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/wgm/screening/finalize'
      &&
      request.method ===
      'POST'
    ) {
      try {
        const body =
          await readJson(
            request,
          );

        const result =
          await finalizeScreening(
            env,
            body,
          );

        return json(
          result,
        );
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/wgm/day-data'
      &&
      request.method ===
      'POST'
    ) {
      try {
        const body =
          await readJson(
            request,
          );

        if (
          demo
        ) {
          return json({
            demo:
              true,

            date:
              body.date,

            firstTracked:
              '8:03 AM',

            lastTracked:
              '5:12 PM',

            trackedSeconds:
              8.03
              *
              3600,

            activityCount:
              24,

            screenshotCount:
              96,

            sessions: [
              {
                from:
                  '8:03 AM',

                to:
                  '12:04 PM',

                seconds:
                  4.016
                  *
                  3600,
              },

              {
                from:
                  '12:42 PM',

                to:
                  '5:12 PM',

                seconds:
                  4.5
                  *
                  3600,
              },
            ],

            screenshots:
              [],
          });
        }

        if (
          !body.employmentId
          ||
          !body.date
        ) {
          return json(
            {
              error:
                'employmentId and date are required',
            },
            400,
          );
        }

        const timeZone =
          String(
            body.timezone || '',
          )
          .trim();

        const offsetMinutes =
          Number(
            body.timezoneOffsetMinutes
            ||
            0,
          );

        const range =
          epochRange(
            body.date,
            body.date,
            timeZone,
            offsetMinutes,
          );

        const activityResult =
          await scrinFetch(
            env,
            body.connectionId,
            '/api/v2/GetActivities',
            [
              {
                employmentId:
                  String(
                    body.employmentId,
                  ),

                from:
                  range.from,

                to:
                  range.to,
              },
            ],
          );

        const activities =
          Array.isArray(
            activityResult.data,
          )
            ? activityResult.data
            : [];

        const screenshots =
          await fetchScreenshotsChunked(
            env,
            body.connectionId,
            activities.map(
              activity =>
                activity.id,
            ),
          );

        const intervals =
          activities
            .filter(
              activity =>
                activityDuration(
                  activity,
                ) > 0,
            )
            .sort(
              (a, b) =>
                Number(a.from)
                -
                Number(b.from),
            );

        const sessions = [];

        if (
          intervals.length
        ) {
          let start =
            Number(
              intervals[0].from,
            );

          let end =
            Number(
              intervals[0].to,
            );

          for (
            let i = 1;
            i < intervals.length;
            i++
          ) {
            const nextStart =
              Number(
                intervals[i].from,
              );

            const nextEnd =
              Number(
                intervals[i].to,
              );

            if (
              nextStart
              <=
              end + 90
            ) {
              end =
                Math.max(
                  end,
                  nextEnd,
                );
            } else {
              sessions.push({
                from:
                  localTimeLabel(
                    start,
                    timeZone,
                    offsetMinutes,
                  ),

                to:
                  localTimeLabel(
                    end,
                    timeZone,
                    offsetMinutes,
                  ),

                seconds:
                  end - start,
              });

              start =
                nextStart;

              end =
                nextEnd;
            }
          }

          sessions.push({
            from:
              localTimeLabel(
                start,
                timeZone,
                offsetMinutes,
              ),

            to:
              localTimeLabel(
                end,
                timeZone,
                offsetMinutes,
              ),

            seconds:
              end - start,
          });
        }

        return json({
          demo:
            false,

          connection:
            publicConnection(
              activityResult.connection,
            ),

          date:
            body.date,

          firstTracked:
            intervals.length
              ? localTimeLabel(
                  intervals[0].from,
                  timeZone,
                  offsetMinutes,
                )
              : '—',

          lastTracked:
            intervals.length
              ? localTimeLabel(
                  Math.max(
                    ...intervals.map(
                      activity =>
                        Number(
                          activity.to,
                        ),
                    ),
                  ),
                  timeZone,
                  offsetMinutes,
                )
              : '—',

          trackedSeconds:
            unionSeconds(
              activities,
            ),

          activityCount:
            activities.length,

          screenshotCount:
            screenshots.length,

          sessions,

          screenshots:
            screenshotManifest(
              screenshots,
              timeZone,
              offsetMinutes,
            )
            .map(
              screenshot => ({
                id:
                  screenshot.screenshotId,

                activityId:
                  screenshot.activityId,

                taken:
                  screenshot.taken,

                time:
                  screenshot.time,

                application:
                  screenshot.application,

                activityLevel:
                  screenshot.activityLevel,

                thumbUrl:
                  screenshot.thumbUrl,

                url:
                  screenshot.imageUrl,
              }),
            ),
        });
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/wgm/period-analytics'
      &&
      request.method ===
      'POST'
    ) {
      try {
        const body =
          await readJson(
            request,
          );

        const prepared =
          demo
            ? demoPrepare(
                body,
              )
            : await prepareScreening(
                env,
                body,
              );

        const current = {
          period:
            prepared.period,

          connection:
            prepared.connection,

          metrics:
            prepared.metrics,

          evidence: {
            screenshotCount:
              prepared.screenshotCount,

            activeDays:
              prepared.metrics.activeDays,

            daysWithScreenshots:
              prepared
                .screenshotDates
                .length,

            activeDayCoveragePercent:
              prepared.metrics.activeDays
                ? round(
                    (
                      prepared
                        .screenshotDates
                        .length
                      /
                      prepared
                        .metrics
                        .activeDays
                    )
                    *
                    100,
                    1,
                  )
                : 0,

            evidenceCoveragePercent:
              prepared.screenshotCount
                ? 100
                : 0,
          },

          categories:
            [],

          apps:
            prepared.apps,

          screenshotDates:
            prepared.screenshotDates,

          selectedScreenshotEvidence:
            prepared
              .humanSample
              .screenshots
              .slice(
                0,
                12,
              ),

          humanSample:
            prepared.humanSample,

          scanPlan:
            prepared.scanPlan,

          review:
            prepared.review,

          analysisDisclosure: {
            screenshotMetadataAnalyzedPercent:
              prepared.screenshotCount
                ? 100
                : 0,

            screenshotImageContentAnalyzedPercent:
              0,

            note:
              'V1.9 requires /api/wgm/screening/batch to scan every screenshot image before release.',
          },

          versions:
            prepared.versions,
        };

        return json({
          current,

          previous:
            null,

          comparison: {
            available:
              false,
          },

          metadata: {
            generatedAt:
              new Date()
                .toISOString(),

            analysisVersion:
              ANALYSIS_VERSION,

            rulesVersion:
              RULES_VERSION,
          },
        });
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/wgm/period-data'
      &&
      request.method ===
      'POST'
    ) {
      try {
        const body =
          await readJson(
            request,
          );

        const prepared =
          demo
            ? demoPrepare(
                body,
              )
            : await prepareScreening(
                env,
                body,
              );

        return json({
          connection:
            prepared.connection,

          metrics:
            prepared.metrics,

          workstreams:
            [],

          apps:
            prepared.apps.map(
              item => [
                item.name,
                item.sharePercent,
              ],
            ),

          averageActivityLevel:
            null,

          screenshotCount:
            prepared.screenshotCount,

          screenshotDates:
            prepared.screenshotDates,

          selectedScreenshotEvidence:
            prepared
              .humanSample
              .screenshots
              .slice(
                0,
                12,
              ),

          screenshotEvidenceSummary: {
            count:
              prepared.screenshotCount,

            captureDates:
              prepared
                .screenshotDates
                .length,

            topApplications:
              prepared
                .apps
                .slice(
                  0,
                  6,
                ),
          },
        });
      } catch (
        error
      ) {
        return json(
          {
            error:
              error.message,
          },
          500,
        );
      }
    }

    if (
      url.pathname ===
      '/api/reports/generate'
      &&
      request.method ===
      'POST'
    ) {
      const body =
        await readJson(
          request,
        );

      const generated =
        await legacyGenerate(
          env,
          body,
        );

      return json({
        report:
          generated.report,

        generatedBy:
          generated.usedOpenAI
            ? 'openai'
            : 'wgm-fallback',

        requiresHumanReview:
          true,

        warning:
          generated.warning,

        metadata: {
          generatedAt:
            new Date()
              .toISOString(),

          model:
            env.OPENAI_SCREENING_MODEL
            ||
            env.OPENAI_MODEL
            ||
            null,

          promptVersion:
            PROMPT_VERSION,

          visionScreenshotsSent:
            generated
              .visionScreenshotsSent,

          analysisVersion:
            ANALYSIS_VERSION,

          rulesVersion:
            RULES_VERSION,

          reportType:
            'fraud_screening_activity_review',

          legacyCompatibilityEndpoint:
            true,
        },
      });
    }

    if (
      url.pathname ===
      '/api/reports/release'
      &&
      request.method ===
      'POST'
    ) {
      const body =
        await readJson(
          request,
        );

      return json({
        status:
          'released',

        releaseId:
          `wgm_${Date.now()}`,

        deliveryEvent:
          'queued',

        ghlIntegrated:
          false,

        employeeId:
          body.employeeId || null,

        employer:
          body.employer || null,

        period:
          body.period || null,

        releasedAt:
          new Date()
            .toISOString(),
      });
    }

    return env.ASSETS.fetch(
      request,
    );
  },
};
