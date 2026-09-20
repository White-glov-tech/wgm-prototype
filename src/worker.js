const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    executiveSummary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 5
    },
    coaching: { type: 'string' },
    clientContext: { type: 'string' },
    nextFocus: { type: 'string' },
    integrity: { type: 'string' },
    comparisonSummary: { type: 'string' },
    evidenceSummary: { type: 'string' },
    recurringPatterns: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 5
    },
    weeklyInsights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          summary: { type: 'string' }
        },
        required: [
          'label',
          'summary'
        ],
        additionalProperties: false
      }
    }
  },
  required: [
    'headline',
    'executiveSummary',
    'strengths',
    'coaching',
    'clientContext',
    'nextFocus',
    'integrity',
    'comparisonSummary',
    'evidenceSummary',
    'recurringPatterns',
    'weeklyInsights'
  ],
  additionalProperties: false
};


const SYSTEM_PROMPT = `
You are the White Glove Monitor reporting engine.

Your job is to interpret verified WGM analytics for a human reviewer and employer.

Rules:
- Never recalculate objective metrics. Use the supplied values as authoritative.
- Never invent work, transactions, task durations, misconduct, fraud, theft, or reassurance unsupported by the evidence.
- Do not treat keyboard/mouse activity, screenshots, app switching, AI-tool usage, or lack of input as standalone proof of productivity or misconduct.
- Distinguish schedule coverage from evidence coverage.
- Evidence coverage is a technical coverage measure, not a performance score.
- Project/category shares are directional unless the input explicitly says otherwise.
- Missing evidence must be described as a coverage limitation, not negative employee behavior.
- Apply supplied schedule, leave, approved changes, and context before describing an exception.
- Never certify the absence of fraud or theft.
- A Green review state means no review-worthy issue was detected in the available evidence under the configured rules. It is not a guarantee of perfect behavior.
- Human review is mandatory before release.
- Keep the writing concise, professional, specific, and useful to a busy founder.
`;


const ANALYSIS_VERSION =
  'wgm-period-analytics-1.0';

const RULES_VERSION =
  'wgm-review-rules-1.0';

const PROMPT_VERSION =
  'wgm-report-prompt-1.0';


function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        'content-type':
          'application/json;charset=UTF-8',

        'cache-control':
          'no-store'
      }
    }
  );
}


async function readJson(
  request
) {

  try {

    return await request.json();

  } catch {

    return {};
  }
}


function round(
  value,
  decimals = 1
) {

  const factor =
    10 ** decimals;

  return (
    Math.round(
      Number(
        value
        ||
        0
      )
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
  max
) {

  return Math.max(
    min,

    Math.min(
      max,
      Number(
        value
        ||
        0
      )
    )
  );
}


function unique(
  values = []
) {

  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}


function addDays(
  dateString,
  days
) {

  const date =
    new Date(
      `${dateString}T00:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate()
    +
    Number(
      days
      ||
      0
    )
  );

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}


function dayCountInclusive(
  from,
  to
) {

  const start =
    Date.parse(
      `${from}T00:00:00Z`
    );

  const end =
    Date.parse(
      `${to}T00:00:00Z`
    );


  if(
    !Number.isFinite(
      start
    )
    ||
    !Number.isFinite(
      end
    )
    ||
    end
    <
    start
  ){

    return 0;
  }


  return (
    Math.floor(
      (
        end
        -
        start
      )
      /
      86400000
    )
    +
    1
  );
}


/* ==========================================================
   SCRIN CONNECTIONS
   ========================================================== */

function parseConnections(
  env
) {

  const out =
    [];


  if(
    env.SCRIN_CONNECTIONS_JSON
  ){

    let parsed;


    try {

      parsed =
        JSON.parse(
          env.SCRIN_CONNECTIONS_JSON
        );

    } catch {

      throw new Error(
        'SCRIN_CONNECTIONS_JSON is not valid JSON'
      );
    }


    if(
      !Array.isArray(
        parsed
      )
    ){

      throw new Error(
        'SCRIN_CONNECTIONS_JSON must be a JSON array'
      );
    }


    for(
      const raw
      of parsed
    ){

      if(
        !raw
        ||
        !raw.id
        ||
        !raw.token
      ){

        continue;
      }


      const type =
        raw.type
        ===
        'dedicated'

          ? 'dedicated'

          : 'shared';


      if(
        type
        ===
        'dedicated'
        &&
        !String(
          raw.employer
          ||
          ''
        ).trim()
      ){

        throw new Error(
          `Dedicated connection ${raw.id} requires an employer`
        );
      }


      out.push({
        id:
          String(
            raw.id
          ),

        name:
          String(
            raw.name
            ||
            raw.id
          ),

        provider:
          'scrin',

        type,

        employer:
          String(
            raw.employer
            ||
            ''
          ),

        token:
          String(
            raw.token
          ),

        enabled:
          raw.enabled
          !==
          false
      });
    }
  }


  /*
    Backward compatibility.
    Your existing SCRIN_TOKEN keeps working.
  */

  if(
    !out.length
    &&
    env.SCRIN_TOKEN
  ){

    out.push({
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
          env.SCRIN_TOKEN
        ),

      enabled:
        true
    });
  }


  return out.filter(
    connection =>
      connection.enabled
  );
}


function publicConnection(
  connection
) {

  return {
    id:
      connection.id,

    name:
      connection.name,

    provider:
      connection.provider,

    type:
      connection.type,

    employer:
      connection.employer
      ||
      '',

    employerLocked:
      connection.type
      ===
      'dedicated',

    status:
      'configured'
  };
}


function getConnection(
  env,
  connectionId
) {

  const connections =
    parseConnections(
      env
    );


  if(
    !connections.length
  ){

    throw new Error(
      'No Scrin connection is configured'
    );
  }


  if(
    connectionId
  ){

    const found =
      connections.find(
        connection =>
          connection.id
          ===
          String(
            connectionId
          )
      );


    if(
      !found
    ){

      throw new Error(
        `Unknown Scrin connection: ${connectionId}`
      );
    }


    return found;
  }


  if(
    connections.length
    ===
    1
  ){

    return connections[0];
  }


  throw new Error(
    'connectionId is required when more than one Scrin connection is configured'
  );
}


async function scrinFetchWithConnection(
  env,
  connectionId,
  path,
  body
) {

  const connection =
    getConnection(
      env,
      connectionId
    );


  const base =
    (
      env.SCRIN_API_BASE_URL
      ||
      'https://scrin.io'
    )
    .replace(
      /\/$/,
      ''
    );


  const response =
    await fetch(
      base
      +
      path,
      {
        method:
          'POST',

        headers: {
          'content-type':
            'application/json',

          'X-SSM-Token':
            connection.token
        },

        body:
          JSON.stringify(
            body
          )
      }
    );


  const text =
    await response.text();


  if(
    !response.ok
  ){

    throw new Error(
      `Scrin ${response.status} (${connection.name}): ${text.slice(0,300)}`
    );
  }


  let data =
    null;


  if(
    text
  ){

    try {

      data =
        JSON.parse(
          text
        );

    } catch {

      throw new Error(
        `Scrin returned non-JSON data from ${path}`
      );
    }
  }


  return {
    connection,
    data
  };
}


/* ==========================================================
   DEMO COMMON DATA
   ========================================================== */

function demoCommon() {

  return {
    companies: [
      {
        id:
          477279,

        name:
          'WGH Scrin Account',

        isManager:
          true,

        employments: [
          {
            id:
              477279,

            name:
              'Maria Gadin',

            email:
              'masked@example.com',

            registered:
              true
          },

          {
            id:
              500002,

            name:
              'VA 2 — sync to reveal',

            email:
              'masked2@example.com',

            registered:
              true
          },

          {
            id:
              500003,

            name:
              'VA 3 — sync to reveal',

            email:
              'masked3@example.com',

            registered:
              true
          }
        ]
      }
    ]
  };
}


/* ==========================================================
   COMMON DATA NORMALIZATION
   ========================================================== */

function normalizeCommon(
  data,
  connection
) {

  const companies =
    Array.isArray(
      data?.companies
    )

      ? data.companies

      : (
          Array.isArray(
            data
          )

            ? data

            : []
        );


  const employees =
    [];


  for(
    const company
    of companies
  ){

    const employments =
      Array.isArray(
        company?.employments
      )

        ? company.employments

        : [];


    for(
      const person
      of employments
    ){

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
          connection.employer
          ||
          '',

        employerLocked:
          connection.type
          ===
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
          person.email
          ||
          null,

        scrinCompanyId:
          company.id,

        scrinCompany:
          company.name
          ||
          `Scrin Company ${company.id}`,

        registered:
          person.registered,

        lastActive:
          person.lastActive,

        source:
          connection.type
          ===
          'dedicated'

            ? 'Standalone WGM'

            : 'WGH Managed',

        role:
          'Virtual Assistant',

        reportingStatus:
          'Synced',

        employer:
          connection.type
          ===
          'dedicated'

            ? connection.employer

            : ''
      });
    }
  }


  return {
    companies,
    employees
  };
}


/* ==========================================================
   DATE / TIME UTILITIES
   ========================================================== */

function epochRange(
  from,
  to,
  offsetMinutes = 0
) {

  const startUtc =
    Date.parse(
      `${from}T00:00:00Z`
    )
    -
    Number(
      offsetMinutes
      ||
      0
    )
    *
    60000;


  const endUtc =
    Date.parse(
      `${to}T23:59:59Z`
    )
    -
    Number(
      offsetMinutes
      ||
      0
    )
    *
    60000;


  if(
    !Number.isFinite(
      startUtc
    )
    ||
    !Number.isFinite(
      endUtc
    )
    ||
    endUtc
    <
    startUtc
  ){

    throw new Error(
      'Invalid date range'
    );
  }


  return {
    from:
      Math.floor(
        startUtc
        /
        1000
      ),

    to:
      Math.floor(
        endUtc
        /
        1000
      )
  };
}


function localDate(
  epochSeconds,
  offsetMinutes = 0
) {

  return new Date(
    (
      Number(
        epochSeconds
      )
      *
      1000
    )
    +
    Number(
      offsetMinutes
      ||
      0
    )
    *
    60000
  )
  .toISOString()
  .slice(
    0,
    10
  );
}


function localTimeLabel(
  epochSeconds,
  offsetMinutes = 0
) {

  if(
    epochSeconds
    ===
    null
    ||
    epochSeconds
    ===
    undefined
  ){

    return '—';
  }


  const date =
    new Date(
      (
        Number(
          epochSeconds
        )
        +
        Number(
          offsetMinutes
          ||
          0
        )
        *
        60
      )
      *
      1000
    );


  let hours =
    date.getUTCHours();


  const minutes =
    String(
      date.getUTCMinutes()
    )
    .padStart(
      2,
      '0'
    );


  const suffix =
    hours
    >=
    12

      ? 'PM'

      : 'AM';


  hours %=
    12;


  if(
    hours
    ===
    0
  ){

    hours =
      12;
  }


  return (
    `${hours}:`
    +
    `${minutes} `
    +
    suffix
  );
}


/* ==========================================================
   ACTIVITY CALCULATIONS
   ========================================================== */

function activityDuration(
  activity
) {

  const from =
    Number(
      activity?.from
    );


  const to =
    Number(
      activity?.to
    );


  return (
    Number.isFinite(
      from
    )
    &&
    Number.isFinite(
      to
    )
    &&
    to
    >
    from
  )

    ? (
        to
        -
        from
      )

    : 0;
}


function unionSeconds(
  activities = []
) {

  const intervals =
    activities

      .map(
        activity => [
          Number(
            activity.from
          ),

          Number(
            activity.to
          )
        ]
      )

      .filter(
        ([from,to]) =>
          Number.isFinite(
            from
          )
          &&
          Number.isFinite(
            to
          )
          &&
          to
          >
          from
      )

      .sort(
        (a,b) =>
          a[0]
          -
          b[0]
      );


  if(
    !intervals.length
  ){

    return 0;
  }


  let total =
    0;


  let start =
    intervals[0][0];


  let end =
    intervals[0][1];


  for(
    let i=1;
    i<intervals.length;
    i++
  ){

    const [
      nextStart,
      nextEnd
    ] =
      intervals[i];


    if(
      nextStart
      <=
      end
    ){

      end =
        Math.max(
          end,
          nextEnd
        );

    } else {

      total +=
        end
        -
        start;


      start =
        nextStart;


      end =
        nextEnd;
    }
  }


  total +=
    end
    -
    start;


  return total;
}


function summarizeActivities(
  activities = [],
  expectedHours = 0,
  offsetMinutes = 0
) {

  const trackedSeconds =
    unionSeconds(
      activities
    );


  const days =
    new Set();


  const projectSeconds =
    {};


  for(
    const activity
    of activities
  ){

    const duration =
      activityDuration(
        activity
      );


    if(
      !duration
    ){

      continue;
    }


    days.add(
      localDate(
        activity.from,
        offsetMinutes
      )
    );


    const key =
      activity.projectId
      ==
      null

        ? 'Unassigned'

        : String(
            activity.projectId
          );


    projectSeconds[key] =
      (
        projectSeconds[key]
        ||
        0
      )
      +
      duration;
  }


  const trackedHours =
    trackedSeconds
    /
    3600;


  return {
    trackedSeconds,

    trackedHours,

    activeDays:
      days.size,

    expectedHours:
      Number(
        expectedHours
        ||
        0
      ),

    scheduleCoveragePercent:
      Number(
        expectedHours
      )
      >
      0

        ? round(
            Math.min(
              100,

              (
                trackedHours
                /
                Number(
                  expectedHours
                )
              )
              *
              100
            ),

            1
          )

        : null,

    projectSeconds
  };
}


/* ==========================================================
   PROJECTS
   ========================================================== */

function extractProjectNames(
  common
) {

  const names =
    {};


  const walk =
    value => {

      if(
        !value
        ||
        typeof value
        !==
        'object'
      ){

        return;
      }


      if(
        Array.isArray(
          value
        )
      ){

        for(
          const child
          of value
        ){

          walk(
            child
          );
        }


        return;
      }


      for(
        const [
          key,
          item
        ]
        of
        Object.entries(
          value
        )
      ){

        if(
          key
          ===
          'projects'
          &&
          Array.isArray(
            item
          )
        ){

          for(
            const project
            of item
          ){

            if(
              project?.id
              !=
              null
            ){

              names[
                String(
                  project.id
                )
              ]
              =
              project.name
              ||
              `Project ${project.id}`;
            }
          }

        } else if(
          item
          &&
          typeof item
          ===
          'object'
        ){

          walk(
            item
          );
        }
      }
    };


  walk(
    common
  );


  return names;
}


function projectSummary(
  metrics,
  common
) {

  const nameMap =
    extractProjectNames(
      common
    );


  const total =
    Object.values(
      metrics.projectSeconds
      ||
      {}
    )
    .reduce(
      (a,b) =>
        a+b,
      0
    )
    ||
    1;


  return Object
    .entries(
      metrics.projectSeconds
      ||
      {}
    )

    .sort(
      (a,b) =>
        b[1]
        -
        a[1]
    )

    .map(
      ([id,seconds]) => ({

        id,

        name:
          nameMap[id]
          ||
          (
            id
            ===
            'Unassigned'

              ? 'Unassigned'

              : `Project ${id}`
          ),

        seconds,

        hours:
          round(
            seconds
            /
            3600,
            2
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
            1
          )
      })
    );
}


/* ==========================================================
   SCREENSHOTS
   ========================================================== */

async function fetchScreenshotsChunked(
  env,
  connectionId,
  activityIds
) {

  const out =
    [];


  const ids =
    unique(
      activityIds
      ||
      []
    );


  for(
    let i=0;
    i<ids.length;
    i+=100
  ){

    const part =
      ids.slice(
        i,
        i+100
      );


    const result =
      await scrinFetchWithConnection(
        env,
        connectionId,
        '/api/v2/GetScreenshots',
        part
      );


    if(
      Array.isArray(
        result.data
      )
    ){

      out.push(
        ...result.data
      );
    }
  }


  const byId =
    new Map();


  for(
    const screenshot
    of out
  ){

    const key =
      screenshot?.id

      ||

      (
        `${screenshot?.activityId || 'activity'}`
        +
        ':'
        +
        `${screenshot?.taken || 0}`
      );


    byId.set(
      key,
      screenshot
    );
  }


  return [
    ...byId.values()
  ]
  .sort(
    (a,b) =>
      Number(
        a?.taken
        ||
        0
      )
      -
      Number(
        b?.taken
        ||
        0
      )
  );
}


function applicationName(
  application
) {

  return (
    String(
      application?.applicationName
      ||
      'Unknown'
    )
    .trim()
    ||
    'Unknown'
  );
}


function summarizeScreenshots(
  screenshots = []
) {

  const apps =
    {};


  let activityLevelTotal =
    0;


  let activityLevelCount =
    0;


  for(
    const screenshot
    of screenshots
  ){

    const level =
      Number(
        screenshot?.activityLevel
      );


    if(
      Number.isFinite(
        level
      )
    ){

      activityLevelTotal +=
        level;

      activityLevelCount++;
    }


    const applications =
      Array.isArray(
        screenshot?.applications
      )

        ? screenshot.applications

        : [];


    for(
      const app
      of applications
    ){

      const name =
        applicationName(
          app
        );


      const duration =
        Number(
          app?.duration
          ||
          0
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
            duration
          )

            ? duration

            : 0
        );
    }
  }


  const totalAppSeconds =
    Object.values(
      apps
    )
    .reduce(
      (a,b) =>
        a+b,
      0
    )
    ||
    1;


  const appSummary =
    Object.entries(
      apps
    )

    .sort(
      (a,b) =>
        b[1]
        -
        a[1]
    )

    .map(
      ([name,seconds]) => ({

        name,

        seconds,

        hours:
          round(
            seconds
            /
            3600,
            2
          ),

        sharePercent:
          round(
            (
              seconds
              /
              totalAppSeconds
            )
            *
            100,
            1
          )
      })
    );


  return {
    screenshotCount:
      screenshots.length,

    averageActivityLevel:
      activityLevelCount

        ? round(
            activityLevelTotal
            /
            activityLevelCount,
            1
          )

        : null,

    apps:
      appSummary
  };
}


function screenshotPreview(
  screenshots = [],
  offsetMinutes = 0,
  limit = 24
) {

  return screenshots

    .slice(
      0,
      limit
    )

    .map(
      screenshot => {

        const applications =
          Array.isArray(
            screenshot?.applications
          )

            ? screenshot.applications

            : [];


        const foreground =
          applications.find(
            app =>
              app?.fromScreen
          )

          ||

          applications[0];


        return [
          localTimeLabel(
            screenshot?.taken,
            offsetMinutes
          ),

          foreground?.applicationName
          ||
          'Screenshot',

          Number(
            screenshot?.activityLevel
          )
          ||
          null,

          screenshot?.thumbUrl
          ||
          screenshot?.url
          ||
          null,

          screenshot?.url
          ||
          screenshot?.thumbUrl
          ||
          null
        ];
      }
    );
}


/* ==========================================================
   DIRECTIONAL CATEGORY ENGINE
   ========================================================== */

function classifyText(
  text = ''
) {

  const value =
    String(
      text
      ||
      ''
    )
    .toLowerCase();


  const rules = [
    [
      'CRM & lead follow-up',
      /follow up boss|followupboss|hubspot|crm|lead|prospect|pipeline|appointment|call|dialer|sales/
    ],

    [
      'Email & communication',
      /gmail|outlook|email|mail|slack|whatsapp|message|messaging|teams chat|communication/
    ],

    [
      'Property research & listings',
      /zillow|redfin|realtor|mls|navica|property|listing|real estate|comparables|comp\b|home search|market analysis/
    ],

    [
      'Documents & administration',
      /google docs|google drive|google sheets|sheets|excel|word|document|pdf|adobe|docusign|file|admin|spreadsheet/
    ],

    [
      'Marketing & content',
      /canva|instagram|facebook|linkedin|social|marketing|content|graphic|post|campaign/
    ],

    [
      'Meetings & collaboration',
      /zoom|google meet|meet\b|microsoft teams|meeting|conference/
    ],

    [
      'Research & browser work',
      /chrome|safari|firefox|browser|google search|research|web search/
    ]
  ];


  for(
    const [
      category,
      regex
    ]
    of rules
  ){

    if(
      regex.test(
        value
      )
    ){

      return category;
    }
  }


  return (
    'Other business activity'
  );
}


function buildCategorySummary(
  activities = [],
  screenshots = []
) {

  const weights =
    {};


  /*
    Activity notes provide one evidence signal.
  */

  for(
    const activity
    of activities
  ){

    const duration =
      activityDuration(
        activity
      );


    if(
      !duration
    ){

      continue;
    }


    const note =
      String(
        activity?.note
        ||
        ''
      )
      .trim();


    if(
      note
    ){

      const category =
        classifyText(
          note
        );


      weights[category] =
        (
          weights[category]
          ||
          0
        )
        +
        duration;
    }
  }


  /*
    Application metadata provides the other signal.
  */

  for(
    const screenshot
    of screenshots
  ){

    const applications =
      Array.isArray(
        screenshot?.applications
      )

        ? screenshot.applications

        : [];


    for(
      const app
      of applications
    ){

      const duration =
        Number(
          app?.duration
          ||
          0
        );


      if(
        !Number.isFinite(
          duration
        )
        ||
        duration
        <=
        0
      ){

        continue;
      }


      const category =
        classifyText(
          applicationName(
            app
          )
        );


      weights[category] =
        (
          weights[category]
          ||
          0
        )
        +
        duration;
    }
  }


  const total =
    Object.values(
      weights
    )
    .reduce(
      (a,b) =>
        a+b,
      0
    )
    ||
    1;


  return Object
    .entries(
      weights
    )

    .sort(
      (a,b) =>
        b[1]
        -
        a[1]
    )

    .map(
      ([name,weight]) => ({

        name,

        sharePercent:
          round(
            (
              weight
              /
              total
            )
            *
            100,
            1
          ),

        evidenceWeightSeconds:
          Math.round(
            weight
          )
      })
    )

    .slice(
      0,
      8
    );
}


/* ==========================================================
   EVIDENCE COVERAGE
   ========================================================== */

function buildEvidenceCoverage(
  activities = [],
  screenshots = [],
  offsetMinutes = 0
) {

  const screenshotActivityIds =
    new Set(
      screenshots
        .map(
          screenshot =>
            String(
              screenshot?.activityId
              ||
              ''
            )
        )
        .filter(Boolean)
    );


  const trackedSeconds =
    unionSeconds(
      activities
    );


  const coveredActivities =
    activities.filter(
      activity =>
        screenshotActivityIds.has(
          String(
            activity?.id
            ||
            ''
          )
        )
    );


  const coveredSeconds =
    unionSeconds(
      coveredActivities
    );


  const activeDays =
    unique(
      activities
        .filter(
          activity =>
            activityDuration(
              activity
            )
            >
            0
        )
        .map(
          activity =>
            localDate(
              activity.from,
              offsetMinutes
            )
        )
    );


  const screenshotDays =
    unique(
      screenshots
        .filter(
          screenshot =>
            Number.isFinite(
              Number(
                screenshot?.taken
              )
            )
        )
        .map(
          screenshot =>
            localDate(
              screenshot.taken,
              offsetMinutes
            )
        )
    );


  const segmentCoveragePercent =
    trackedSeconds
    >
    0

      ? round(
          (
            coveredSeconds
            /
            trackedSeconds
          )
          *
          100,
          1
        )

      : 0;


  const activeDayCoveragePercent =
    activeDays.length

      ? round(
          (
            screenshotDays.length
            /
            activeDays.length
          )
          *
          100,
          1
        )

      : 0;


  return {
    evidenceCoveragePercent:
      clamp(
        segmentCoveragePercent,
        0,
        100
      ),

    activeDayCoveragePercent:
      clamp(
        activeDayCoveragePercent,
        0,
        100
      ),

    trackedSeconds,

    coveredTrackedSeconds:
      coveredSeconds,

    activityRecords:
      activities.length,

    activitiesWithScreenshots:
      coveredActivities.length,

    activeDays:
      activeDays.length,

    daysWithScreenshots:
      screenshotDays.length,

    screenshotCount:
      screenshots.length,

    screenshotDensityPerTrackedHour:
      trackedSeconds
      >
      0

        ? round(
            screenshots.length
            /
            (
              trackedSeconds
              /
              3600
            ),
            2
          )

        : 0
  };
}


/* ==========================================================
   WEEKLY ANALYTICS
   ========================================================== */

function mondayStart(
  dateString
) {

  const date =
    new Date(
      `${dateString}T00:00:00Z`
    );


  const day =
    date.getUTCDay();


  const diff =
    day
    ===
    0

      ? -6

      : 1
        -
        day;


  date.setUTCDate(
    date.getUTCDate()
    +
    diff
  );


  return date
    .toISOString()
    .slice(
      0,
      10
    );
}


function formatShortDate(
  dateString
) {

  const date =
    new Date(
      `${dateString}T00:00:00Z`
    );


  return date
    .toLocaleDateString(
      'en-US',
      {
        month:
          'short',

        day:
          'numeric',

        timeZone:
          'UTC'
      }
    );
}


function buildWeeklyAnalytics(
  activities,
  screenshots,
  from,
  to,
  offsetMinutes = 0
) {

  const groups =
    new Map();


  for(
    const activity
    of activities
  ){

    if(
      !activityDuration(
        activity
      )
    ){

      continue;
    }


    const day =
      localDate(
        activity.from,
        offsetMinutes
      );


    const key =
      mondayStart(
        day
      );


    if(
      !groups.has(
        key
      )
    ){

      groups.set(
        key,
        {
          activities: [],
          screenshots: []
        }
      );
    }


    groups
      .get(
        key
      )
      .activities
      .push(
        activity
      );
  }


  for(
    const screenshot
    of screenshots
  ){

    if(
      !Number.isFinite(
        Number(
          screenshot?.taken
        )
      )
    ){

      continue;
    }


    const day =
      localDate(
        screenshot.taken,
        offsetMinutes
      );


    const key =
      mondayStart(
        day
      );


    if(
      !groups.has(
        key
      )
    ){

      groups.set(
        key,
        {
          activities: [],
          screenshots: []
        }
      );
    }


    groups
      .get(
        key
      )
      .screenshots
      .push(
        screenshot
      );
  }


  const fromMs =
    Date.parse(
      `${from}T00:00:00Z`
    );


  const toMs =
    Date.parse(
      `${to}T00:00:00Z`
    );


  return [
    ...groups.entries()
  ]

  .sort(
    (a,b) =>
      a[0]
      .localeCompare(
        b[0]
      )
  )

  .map(
    ([weekStart,group]) => {

      const rawWeekEnd =
        addDays(
          weekStart,
          6
        );


      const weekStartClamped =
        Date.parse(
          `${weekStart}T00:00:00Z`
        )
        <
        fromMs

          ? from

          : weekStart;


      const weekEndClamped =
        Date.parse(
          `${rawWeekEnd}T00:00:00Z`
        )
        >
        toMs

          ? to

          : rawWeekEnd;


      const trackedSeconds =
        unionSeconds(
          group.activities
        );


      const coverage =
        buildEvidenceCoverage(
          group.activities,
          group.screenshots,
          offsetMinutes
        );


      const categories =
        buildCategorySummary(
          group.activities,
          group.screenshots
        )
        .slice(
          0,
          4
        );


      const notes =
        unique(
          group.activities
            .map(
              activity =>
                String(
                  activity?.note
                  ||
                  ''
                )
                .trim()
            )
        )
        .slice(
          0,
          5
        );


      const appSummary =
        summarizeScreenshots(
          group.screenshots
        )
        .apps
        .slice(
          0,
          5
        );


      return {
        weekStart:
          weekStartClamped,

        weekEnd:
          weekEndClamped,

        label:
          (
            `${formatShortDate(weekStartClamped)}`
            +
            '–'
            +
            `${formatShortDate(weekEndClamped)}`
          ),

        trackedSeconds,

        trackedHours:
          round(
            trackedSeconds
            /
            3600,
            2
          ),

        activeDays:
          unique(
            group.activities
              .map(
                activity =>
                  localDate(
                    activity.from,
                    offsetMinutes
                  )
              )
          )
          .length,

        screenshotCount:
          group.screenshots.length,

        evidenceCoveragePercent:
          coverage.evidenceCoveragePercent,

        activeDayCoveragePercent:
          coverage.activeDayCoveragePercent,

        categories,

        topApps:
          appSummary,

        notes
      };
    }
  );
}


/* ==========================================================
   PREVIOUS-PERIOD COMPARISON
   ========================================================== */

function comparison(
  current,
  previous
) {

  if(
    !previous
  ){

    return {
      available:
        false
    };
  }


  return {
    available:
      true,

    trackedHoursDelta:
      round(
        current.metrics.trackedHours
        -
        previous.metrics.trackedHours,
        2
      ),

    trackedHoursPercentChange:
      previous.metrics.trackedHours
      >
      0

        ? round(
            (
              (
                current.metrics.trackedHours
                -
                previous.metrics.trackedHours
              )
              /
              previous.metrics.trackedHours
            )
            *
            100,
            1
          )

        : null,

    activeDaysDelta:
      current.metrics.activeDays
      -
      previous.metrics.activeDays,

    screenshotCountDelta:
      current.evidence.screenshotCount
      -
      previous.evidence.screenshotCount,

    evidenceCoverageDeltaPoints:
      round(
        current.evidence.evidenceCoveragePercent
        -
        previous.evidence.evidenceCoveragePercent,
        1
      )
  };
}


/* ==========================================================
   REVIEW RULES
   ========================================================== */

function reviewAssessment(
  analytics
) {

  const reasons =
    [];


  if(
    analytics.metrics.trackedHours
    <=
    0
  ){

    reasons.push(
      'No tracked time was returned for the selected period.'
    );
  }


  if(
    analytics.metrics.scheduleCoveragePercent
    !==
    null
    &&
    analytics.metrics.scheduleCoveragePercent
    <
    85
  ){

    reasons.push(
      'Schedule coverage is below the prototype review threshold and may require context.'
    );
  }


  if(
    analytics.evidence.evidenceCoveragePercent
    <
    75
    &&
    analytics.metrics.trackedHours
    >
    0
  ){

    reasons.push(
      'A material portion of tracked activity does not have linked screenshot evidence.'
    );
  }


  if(
    analytics.evidence.activeDayCoveragePercent
    <
    80
    &&
    analytics.metrics.activeDays
    >
    0
  ){

    reasons.push(
      'Some active workdays do not have screenshot evidence.'
    );
  }


  if(
    analytics.metrics.trackedHours
    >
    0
    &&
    analytics.evidence.screenshotCount
    ===
    0
  ){

    reasons.push(
      'Tracked time exists but no screenshot evidence was returned.'
    );
  }


  return {
    /*
      V1.6 does NOT automatically assign Red.
      Red should eventually require a specifically
      configured higher-priority rule or reviewer action.
    */

    status:
      reasons.length

        ? 'Yellow'

        : 'Green',

    reasons,

    note:
      reasons.length

        ? 'Human context or evidence review is required before release.'

        : 'No review-worthy issue was detected in the available evidence under the current prototype rules.'
  };
}


/* ==========================================================
   PERIOD ANALYTICS ENGINE
   ========================================================== */

async function buildPeriodAnalytics(
  env,
  input
) {

  const connectionId =
    input.connectionId;


  const employmentId =
    input.employmentId;


  const from =
    input.from;


  const to =
    input.to;


  const offsetMinutes =
    Number(
      input.timezoneOffsetMinutes
      ||
      0
    );


  const expectedHours =
    Number(
      input.expectedHours
      ||
      0
    );


  if(
    !employmentId
    ||
    !from
    ||
    !to
  ){

    throw new Error(
      'employmentId, from and to are required'
    );
  }


  const range =
    epochRange(
      from,
      to,
      offsetMinutes
    );


  const commonResult =
    await scrinFetchWithConnection(
      env,
      connectionId,
      '/api/v2/GetCommonData',
      {}
    );


  const activityResult =
    await scrinFetchWithConnection(
      env,
      connectionId,
      '/api/v2/GetActivities',
      [
        {
          employmentId:
            String(
              employmentId
            ),

          from:
            range.from,

          to:
            range.to
        }
      ]
    );


  const activities =
    Array.isArray(
      activityResult.data
    )

      ? activityResult.data

      : [];


  /*
    Fetch all screenshot metadata associated
    with the returned activity records.
  */

  const screenshots =
    await fetchScreenshotsChunked(
      env,
      connectionId,
      activities.map(
        activity =>
          activity.id
      )
    );


  const metrics =
    summarizeActivities(
      activities,
      expectedHours,
      offsetMinutes
    );


  const evidence =
    buildEvidenceCoverage(
      activities,
      screenshots,
      offsetMinutes
    );


  const screenshotSummary =
    summarizeScreenshots(
      screenshots
    );


  const projects =
    projectSummary(
      metrics,
      commonResult.data
    );


  const categories =
    buildCategorySummary(
      activities,
      screenshots
    );


  const weeks =
    buildWeeklyAnalytics(
      activities,
      screenshots,
      from,
      to,
      offsetMinutes
    );


  const notes =
    unique(
      activities
        .map(
          activity =>
            String(
              activity?.note
              ||
              ''
            )
            .trim()
        )
    )
    .slice(
      0,
      30
    );


  const analytics = {
    period: {
      from,
      to,

      dayCount:
        dayCountInclusive(
          from,
          to
        )
    },

    connection:
      publicConnection(
        commonResult.connection
      ),

    metrics,

    evidence,

    projects,

    categories,

    apps:
      screenshotSummary
        .apps
        .slice(
          0,
          15
        ),

    averageActivityLevel:
      screenshotSummary
        .averageActivityLevel,

    notes,

    weeks,

    /*
      Preview remains intentionally small
      because reports do not need to render
      thousands of images.
      The Screenshots page has the separate
      full-day endpoint below.
    */

    screenshotPreview:
      screenshotPreview(
        screenshots,
        offsetMinutes,
        24
      ),

    analysisDisclosure: {
      activityRecordsAnalyzedPercent:
        100,

      screenshotMetadataAnalyzedPercent:
        screenshots.length
        ? 100
        : 0,

      screenshotImageContentAnalyzedPercent:
        0,

      note:
        'WGM calculations use activity records and screenshot metadata/application data. Screenshot image pixels are not analyzed by the AI in this prototype.'
    },

    versions: {
      analysisVersion:
        ANALYSIS_VERSION,

      rulesVersion:
        RULES_VERSION
    }
  };


  analytics.review =
    reviewAssessment(
      analytics
    );


  return analytics;
}


async function buildPreviousPeriodAnalytics(
  env,
  input
) {

  if(
    input.includePrevious
    ===
    false
  ){

    return null;
  }


  const days =
    dayCountInclusive(
      input.from,
      input.to
    );


  if(
    !days
  ){

    return null;
  }


  const previousTo =
    addDays(
      input.from,
      -1
    );


  const previousFrom =
    addDays(
      previousTo,
      -(
        days
        -
        1
      )
    );


  return buildPeriodAnalytics(
    env,
    {
      ...input,

      from:
        previousFrom,

      to:
        previousTo,

      /*
        We do not assume the prior period
        had the same expected schedule.
        Supply previousExpectedHours later
        when that data exists.
      */

      expectedHours:
        Number(
          input.previousExpectedHours
          ||
          0
        ),

      includePrevious:
        false
    }
  );
}


/* ==========================================================
   FALLBACK REPORT NARRATIVE
   ========================================================== */

function fallbackReport(
  input
) {

  const analytics =
    input.analytics
    ||
    {};


  const metrics =
    analytics.metrics
    ||
    {};


  const evidence =
    analytics.evidence
    ||
    {};


  const comparisonData =
    input.comparison
    ||
    {};


  const review =
    analytics.review
    ||
    {};


  const categories =
    Array.isArray(
      analytics.categories
    )

      ? analytics.categories

      : [];


  const weeks =
    Array.isArray(
      analytics.weeks
    )

      ? analytics.weeks

      : [];


  const topCategories =
    categories
      .slice(
        0,
        3
      )
      .map(
        item =>
          item.name
      );


  const scheduleText =
    metrics.scheduleCoveragePercent
    ===
    null

      ? 'Expected schedule hours were not supplied for this period.'

      : `Schedule coverage was ${metrics.scheduleCoveragePercent}%.`;


  const evidenceText =
    (
      `Evidence coverage was ${evidence.evidenceCoveragePercent ?? 0}% `
      +
      `of tracked activity segments, with screenshots on `
      +
      `${evidence.daysWithScreenshots ?? 0} of `
      +
      `${evidence.activeDays ?? 0} active day(s).`
    );


  const comparisonSummary =
    comparisonData.available

      ? (
          'Compared with the immediately preceding equal-length period, '
          +
          `tracked time changed by `
          +
          `${comparisonData.trackedHoursDelta >= 0 ? '+' : ''}`
          +
          `${comparisonData.trackedHoursDelta} hours `
          +
          'and evidence coverage changed by '
          +
          `${comparisonData.evidenceCoverageDeltaPoints >= 0 ? '+' : ''}`
          +
          `${comparisonData.evidenceCoverageDeltaPoints} percentage points.`
        )

      : 'A comparable preceding period was not available for this report.';


  return {
    headline:
      review.status
      ===
      'Green'

        ? 'Recorded work and available evidence were sufficiently consistent for standard human review.'

        : 'The reporting period requires human context or evidence review before release.',


    executiveSummary:
      (
        `${metrics.trackedHours ? round(metrics.trackedHours,2) : 0} `
        +
        `tracked hours were recorded across `
        +
        `${metrics.activeDays || 0} active workday(s). `
        +
        `${scheduleText} `
        +
        `${evidenceText}`
      ),


    strengths: [
      metrics.trackedHours
      >
      0

        ? 'Recorded time was successfully reconciled for the selected period.'

        : 'The selected period was processed successfully.',


      evidence.screenshotCount
      >
      0

        ? `${evidence.screenshotCount} screenshot metadata record(s) were linked to the reporting period.`

        : 'The report clearly identifies the absence of screenshot evidence.',


      topCategories.length

        ? `Observed work was concentrated in ${topCategories.join(', ')}.`

        : 'Available project and application evidence was preserved without inventing work categories.'
    ],


    coaching:
      review.reasons?.length

        ? review.reasons.join(
            ' '
          )

        : 'Continue clear project labeling, notes, and context so future reviews remain fast and evidence-based.',


    clientContext:
      input.context
      ||
      'No additional client context was supplied for this report run.',


    nextFocus:
      review.status
      ===
      'Yellow'

        ? 'Resolve the identified context or evidence limitation before release, then continue monitoring the next reporting period.'

        : 'Maintain current tracking practices and continue monitoring for meaningful changes in schedule or evidence coverage.',


    integrity:
      review.status
      ===
      'Green'

        ? 'No review-worthy integrity flag was detected in the available evidence under the current WGM prototype rules. This is not a certification of the absence of fraud or misconduct.'

        : 'The available evidence requires human review. WGM has not made an automated misconduct finding.',


    comparisonSummary,


    evidenceSummary:
      (
        `${evidenceText} `
        +
        'WGM analyzed activity records and screenshot metadata/application data; '
        +
        'screenshot image pixels were not analyzed by the AI in this prototype.'
      ),


    recurringPatterns:
      topCategories.length

        ? topCategories.map(
            name =>
              `${name} appeared repeatedly in the period evidence.`
          )

        : [
            'No reliable recurring work category could be derived from the available metadata.'
          ],


    weeklyInsights:
      weeks.map(
        week => ({
          label:
            week.label,

          summary:
            (
              `${round(week.trackedHours,2)} tracked hours, `
              +
              `${week.evidenceCoveragePercent}% evidence coverage, `
              +
              `${week.screenshotCount} screenshot record(s).`
              +
              (
                week.categories?.[0]?.name

                  ? ` Leading observed category: ${week.categories[0].name}.`

                  : ''
              )
            )
        })
      )
  };
}


/* ==========================================================
   OPENAI REPORT
   ========================================================== */

async function openAiReport(
  env,
  input
) {

  const benchmark =
    fallbackReport(
      input
    );


  if(
    !env.OPENAI_API_KEY
    ||
    !env.OPENAI_MODEL
  ){

    return benchmark;
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
            'application/json'
        },

        body:
          JSON.stringify({
            model:
              env.OPENAI_MODEL,

            input: [
              {
                role:
                  'system',

                content:
                  SYSTEM_PROMPT
              },

              {
                role:
                  'user',

                content:
                  (
                    'Create the WGM monthly report narrative from this verified input. '
                    +
                    'Objective metrics are already calculated and must not be changed.\n\n'
                    +
                    JSON.stringify({
                      ...input,

                      fallbackReference:
                        benchmark
                    })
                  )
              }
            ],

            text: {
              format: {
                type:
                  'json_schema',

                name:
                  'wgm_monthly_report',

                strict:
                  true,

                schema:
                  REPORT_SCHEMA
              }
            }
          })
      }
    );


  const data =
    await response.json();


  if(
    !response.ok
  ){

    throw new Error(
      `OpenAI ${response.status}: ${JSON.stringify(data).slice(0,400)}`
    );
  }


  const text =
    data.output_text

    ||

    data.output
      ?.flatMap(
        item =>
          item.content
          ||
          []
      )
      .find(
        item =>
          item.type
          ===
          'output_text'
      )
      ?.text;


  if(
    !text
  ){

    throw new Error(
      'No structured report returned'
    );
  }


  return JSON.parse(
    text
  );
}


/* ==========================================================
   DEMO ANALYTICS
   ========================================================== */

function demoPeriodAnalytics(
  input
) {

  const metrics = {
    trackedSeconds:
      161.4167
      *
      3600,

    trackedHours:
      161.4167,

    activeDays:
      20,

    expectedHours:
      Number(
        input.expectedHours
        ||
        160
      ),

    scheduleCoveragePercent:
      100,

    projectSeconds:
      {}
  };


  const evidence = {
    evidenceCoveragePercent:
      96,

    activeDayCoveragePercent:
      100,

    trackedSeconds:
      metrics.trackedSeconds,

    coveredTrackedSeconds:
      metrics.trackedSeconds
      *
      0.96,

    activityRecords:
      482,

    activitiesWithScreenshots:
      463,

    activeDays:
      20,

    daysWithScreenshots:
      20,

    screenshotCount:
      1842,

    screenshotDensityPerTrackedHour:
      11.41
  };


  const analytics = {
    period: {
      from:
        input.from,

      to:
        input.to,

      dayCount:
        dayCountInclusive(
          input.from,
          input.to
        )
    },


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
        'demo'
    },


    metrics,

    evidence,


    projects:
      [],


    categories: [
      {
        name:
          'Marketing & content',

        sharePercent:
          30
      },

      {
        name:
          'Property research & listings',

        sharePercent:
          22
      },

      {
        name:
          'Documents & administration',

        sharePercent:
          16
      },

      {
        name:
          'Email & communication',

        sharePercent:
          13
      },

      {
        name:
          'CRM & lead follow-up',

        sharePercent:
          11
      },

      {
        name:
          'Other business activity',

        sharePercent:
          8
      }
    ],


    apps: [
      {
        name:
          'Outlook / Microsoft',

        sharePercent:
          31
      },

      {
        name:
          'Canva',

        sharePercent:
          20
      },

      {
        name:
          'NavicaMLS',

        sharePercent:
          18
      }
    ],


    averageActivityLevel:
      72,


    notes:
      [],


    weeks: [
      {
        label:
          'Aug 3–Aug 9',

        trackedHours:
          40.47,

        activeDays:
          5,

        screenshotCount:
          461,

        evidenceCoveragePercent:
          97,

        activeDayCoveragePercent:
          100,

        categories: [
          {
            name:
              'Marketing & content',

            sharePercent:
              31
          }
        ],

        topApps:
          [],

        notes:
          []
      },

      {
        label:
          'Aug 10–Aug 16',

        trackedHours:
          40.53,

        activeDays:
          5,

        screenshotCount:
          458,

        evidenceCoveragePercent:
          95,

        activeDayCoveragePercent:
          100,

        categories: [
          {
            name:
              'Property research & listings',

            sharePercent:
              24
          }
        ],

        topApps:
          [],

        notes:
          []
      },

      {
        label:
          'Aug 17–Aug 23',

        trackedHours:
          40.18,

        activeDays:
          5,

        screenshotCount:
          462,

        evidenceCoveragePercent:
          96,

        activeDayCoveragePercent:
          100,

        categories: [
          {
            name:
              'Documents & administration',

            sharePercent:
              21
          }
        ],

        topApps:
          [],

        notes:
          []
      },

      {
        label:
          'Aug 24–Aug 30',

        trackedHours:
          40.23,

        activeDays:
          5,

        screenshotCount:
          461,

        evidenceCoveragePercent:
          96,

        activeDayCoveragePercent:
          100,

        categories: [
          {
            name:
              'Marketing & content',

            sharePercent:
              29
          }
        ],

        topApps:
          [],

        notes:
          []
      }
    ],


    screenshotPreview:
      [],


    analysisDisclosure: {
      activityRecordsAnalyzedPercent:
        100,

      screenshotMetadataAnalyzedPercent:
        100,

      screenshotImageContentAnalyzedPercent:
        0,

      note:
        'Demo analytics use activity records and screenshot metadata. Screenshot pixels are not analyzed by the AI.'
    },


    versions: {
      analysisVersion:
        ANALYSIS_VERSION,

      rulesVersion:
        RULES_VERSION
    }
  };


  analytics.review =
    reviewAssessment(
      analytics
    );


  return analytics;
}


/* ==========================================================
   ROUTES
   ========================================================== */

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(
        request.url
      );


    /* ------------------------------------------------------
       HEALTH
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/health'
    ){

      let connectionCount =
        0;


      try {

        connectionCount =
          parseConnections(
            env
          )
          .length;

      } catch {}


      return json({
        ok:
          true,

        mode:
          env.DEMO_MODE
          ===
          'false'

            ? 'live'

            : 'demo',

        connectionCount,

        analysisVersion:
          ANALYSIS_VERSION,

        rulesVersion:
          RULES_VERSION
      });
    }


    /* ------------------------------------------------------
       CONNECTION LIST
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/scrin/connections'
    ){

      try {

        const demo =
          env.DEMO_MODE
          !==
          'false';


        if(
          demo
        ){

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
                  'demo'
              }
            ]
          });
        }


        return json({
          demo:
            false,

          connections:
            parseConnections(
              env
            )
            .map(
              publicConnection
            )
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       SINGLE CONNECTION COMMON DATA
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/scrin/common'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const body =
          await readJson(
            request
          );


        const demo =
          env.DEMO_MODE
          !==
          'false';


        if(
          demo
        ){

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
              'demo'
          };


          const normalized =
            normalizeCommon(
              demoCommon(),
              connection
            );


          return json({
            demo:
              true,

            connection:
              publicConnection(
                connection
              ),

            companyCount:
              normalized
                .companies
                .length,

            employees:
              normalized
                .employees,

            companies:
              normalized
                .companies
          });
        }


        const result =
          await scrinFetchWithConnection(
            env,
            body.connectionId,
            '/api/v2/GetCommonData',
            {}
          );


        const normalized =
          normalizeCommon(
            result.data,
            result.connection
          );


        return json({
          demo:
            false,

          connection:
            publicConnection(
              result.connection
            ),

          companyCount:
            normalized
              .companies
              .length,

          employees:
            normalized
              .employees,

          companies:
            normalized
              .companies
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       SYNC ALL CONNECTIONS
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/scrin/all-common'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const demo =
          env.DEMO_MODE
          !==
          'false';


        if(
          demo
        ){

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
              'demo'
          };


          const normalized =
            normalizeCommon(
              demoCommon(),
              connection
            );


          return json({
            demo:
              true,

            connections: [
              {
                ...publicConnection(
                  connection
                ),

                status:
                  'connected',

                employeeCount:
                  normalized
                    .employees
                    .length
              }
            ],

            employees:
              normalized
                .employees,

            errors:
              []
          });
        }


        const connections =
          parseConnections(
            env
          );


        const allEmployees =
          [];


        const publicConnections =
          [];


        const errors =
          [];


        for(
          const connection
          of connections
        ){

          try {

            const result =
              await scrinFetchWithConnection(
                env,
                connection.id,
                '/api/v2/GetCommonData',
                {}
              );


            const normalized =
              normalizeCommon(
                result.data,
                connection
              );


            allEmployees.push(
              ...normalized.employees
            );


            publicConnections.push({
              ...publicConnection(
                connection
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
                  .length
            });


          } catch(error) {

            errors.push({
              connectionId:
                connection.id,

              connectionName:
                connection.name,

              error:
                error.message
            });


            publicConnections.push({
              ...publicConnection(
                connection
              ),

              status:
                'error',

              employeeCount:
                0,

              error:
                error.message
            });
          }
        }


        return json({
          demo:
            false,

          connections:
            publicConnections,

          employees:
            allEmployees,

          errors
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       RAW ACTIVITIES
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/scrin/activities'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const body =
          await readJson(
            request
          );


        if(
          !Array.isArray(
            body.ranges
          )
        ){

          return json(
            {
              error:
                'Expected { connectionId, ranges: [{ employmentId, from, to }] }'
            },
            400
          );
        }


        const result =
          await scrinFetchWithConnection(
            env,
            body.connectionId,
            '/api/v2/GetActivities',
            body.ranges
          );


        return json({
          connection:
            publicConnection(
              result.connection
            ),

          activities:
            result.data
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       RAW SCREENSHOTS
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/scrin/screenshots'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const body =
          await readJson(
            request
          );


        if(
          !Array.isArray(
            body.activityIds
          )
        ){

          return json(
            {
              error:
                'Expected { connectionId, activityIds: [...] }'
            },
            400
          );
        }


        const result =
          await scrinFetchWithConnection(
            env,
            body.connectionId,
            '/api/v2/GetScreenshots',
            body.activityIds
          );


        return json({
          connection:
            publicConnection(
              result.connection
            ),

          screenshots:
            result.data
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       COMPLETE DAILY MONITORING DATA
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/wgm/day-data'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const body =
          await readJson(
            request
          );


        if(
          env.DEMO_MODE
          !==
          'false'
        ){

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
                  3600
              },

              {
                from:
                  '12:42 PM',

                to:
                  '5:12 PM',

                seconds:
                  4.5
                  *
                  3600
              }
            ],

            screenshots:
              []
          });
        }


        if(
          !body.employmentId
          ||
          !body.date
        ){

          return json(
            {
              error:
                'employmentId and date are required'
            },
            400
          );
        }


        const offsetMinutes =
          Number(
            body.timezoneOffsetMinutes
            ||
            0
          );


        const range =
          epochRange(
            body.date,
            body.date,
            offsetMinutes
          );


        const activityResult =
          await scrinFetchWithConnection(
            env,
            body.connectionId,
            '/api/v2/GetActivities',
            [
              {
                employmentId:
                  String(
                    body.employmentId
                  ),

                from:
                  range.from,

                to:
                  range.to
              }
            ]
          );


        const activities =
          Array.isArray(
            activityResult.data
          )

            ? activityResult.data

            : [];


        const screenshots =
          await fetchScreenshotsChunked(
            env,
            body.connectionId,
            activities.map(
              activity =>
                activity.id
            )
          );


        const intervals =
          activities

            .filter(
              activity =>
                activityDuration(
                  activity
                )
                >
                0
            )

            .sort(
              (a,b) =>
                Number(
                  a.from
                )
                -
                Number(
                  b.from
                )
            );


        const firstTracked =
          intervals.length

            ? Number(
                intervals[0].from
              )

            : null;


        const lastTracked =
          intervals.length

            ? Math.max(
                ...intervals.map(
                  activity =>
                    Number(
                      activity.to
                    )
                )
              )

            : null;


        const sessions =
          [];


        const rawIntervals =
          intervals.map(
            activity => [
              Number(
                activity.from
              ),

              Number(
                activity.to
              )
            ]
          );


        if(
          rawIntervals.length
        ){

          let start =
            rawIntervals[0][0];


          let end =
            rawIntervals[0][1];


          const tolerance =
            90;


          for(
            let i=1;
            i<rawIntervals.length;
            i++
          ){

            const [
              nextStart,
              nextEnd
            ] =
              rawIntervals[i];


            if(
              nextStart
              <=
              end
              +
              tolerance
            ){

              end =
                Math.max(
                  end,
                  nextEnd
                );

            } else {

              sessions.push({
                from:
                  localTimeLabel(
                    start,
                    offsetMinutes
                  ),

                to:
                  localTimeLabel(
                    end,
                    offsetMinutes
                  ),

                seconds:
                  end
                  -
                  start
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
                offsetMinutes
              ),

            to:
              localTimeLabel(
                end,
                offsetMinutes
              ),

            seconds:
              end
              -
              start
          });
        }


        return json({
          demo:
            false,

          connection:
            publicConnection(
              activityResult.connection
            ),

          date:
            body.date,

          firstTracked:
            localTimeLabel(
              firstTracked,
              offsetMinutes
            ),

          lastTracked:
            localTimeLabel(
              lastTracked,
              offsetMinutes
            ),

          trackedSeconds:
            unionSeconds(
              activities
            ),

          activityCount:
            activities.length,

          screenshotCount:
            screenshots.length,

          sessions,

          screenshots:
            screenshots.map(
              screenshot => {

                const applications =
                  Array.isArray(
                    screenshot?.applications
                  )

                    ? screenshot.applications

                    : [];


                const foreground =
                  applications.find(
                    app =>
                      app?.fromScreen
                  )

                  ||

                  applications[0];


                return {
                  id:
                    screenshot.id,

                  activityId:
                    screenshot.activityId,

                  taken:
                    screenshot.taken,

                  time:
                    localTimeLabel(
                      screenshot.taken,
                      offsetMinutes
                    ),

                  application:
                    foreground?.applicationName
                    ||
                    'Screenshot',

                  activityLevel:
                    Number(
                      screenshot.activityLevel
                    )
                    ||
                    null,

                  thumbUrl:
                    screenshot.thumbUrl
                    ||
                    screenshot.url
                    ||
                    null,

                  url:
                    screenshot.url
                    ||
                    screenshot.thumbUrl
                    ||
                    null
                };
              }
            )
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       LEGACY PERIOD DATA
       Keeps V1.5 frontend compatible during deployment.
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/wgm/period-data'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const body =
          await readJson(
            request
          );


        let analytics;


        if(
          env.DEMO_MODE
          !==
          'false'
        ){

          analytics =
            demoPeriodAnalytics(
              body
            );

        } else {

          analytics =
            await buildPeriodAnalytics(
              env,
              body
            );
        }


        return json({
          connection:
            analytics.connection,

          metrics:
            analytics.metrics,

          workstreams:
            analytics.projects.map(
              item => [
                item.name,
                item.sharePercent
              ]
            ),

          apps:
            analytics.apps.map(
              item => [
                item.name,
                item.sharePercent
              ]
            ),

          averageActivityLevel:
            analytics.averageActivityLevel,

          screenshotCount:
            analytics.evidence
              .screenshotCount,

          screenshotPreview:
            analytics.screenshotPreview,

          screenshotEvidenceSummary: {
            count:
              analytics.evidence
                .screenshotCount,

            evidenceCoveragePercent:
              analytics.evidence
                .evidenceCoveragePercent,

            activeDayCoveragePercent:
              analytics.evidence
                .activeDayCoveragePercent,

            topApplications:
              analytics.apps
                .slice(
                  0,
                  6
                )
          }
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       V1.6 PERIOD ANALYTICS
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/wgm/period-analytics'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const body =
          await readJson(
            request
          );


        if(
          !body.employmentId
          ||
          !body.from
          ||
          !body.to
        ){

          return json(
            {
              error:
                'employmentId, from and to are required'
            },
            400
          );
        }


        if(
          env.DEMO_MODE
          !==
          'false'
        ){

          const current =
            demoPeriodAnalytics(
              body
            );


          const previous =
            body.includePrevious
            ===
            false

              ? null

              : demoPeriodAnalytics({
                  ...body,

                  from:
                    addDays(
                      body.from,
                      -dayCountInclusive(
                        body.from,
                        body.to
                      )
                    ),

                  to:
                    addDays(
                      body.from,
                      -1
                    ),

                  expectedHours:
                    Number(
                      body.previousExpectedHours
                      ||
                      0
                    )
                });


          if(
            previous
          ){

            previous.metrics.trackedHours =
              154.27;

            previous.metrics.trackedSeconds =
              154.27
              *
              3600;

            previous.metrics.activeDays =
              20;

            previous.evidence.evidenceCoveragePercent =
              94;

            previous.evidence.screenshotCount =
              1760;
          }


          return json({
            current,

            previous,

            comparison:
              comparison(
                current,
                previous
              ),

            metadata: {
              generatedAt:
                new Date()
                  .toISOString(),

              analysisVersion:
                ANALYSIS_VERSION,

              rulesVersion:
                RULES_VERSION
            }
          });
        }


        const current =
          await buildPeriodAnalytics(
            env,
            body
          );


        const previous =
          await buildPreviousPeriodAnalytics(
            env,
            body
          );


        return json({
          current,

          previous,

          comparison:
            comparison(
              current,
              previous
            ),

          metadata: {
            generatedAt:
              new Date()
                .toISOString(),

            analysisVersion:
              ANALYSIS_VERSION,

            rulesVersion:
              RULES_VERSION
          }
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       REPORT GENERATION
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/reports/generate'
      &&
      request.method
      ===
      'POST'
    ){

      try {

        const body =
          await readJson(
            request
          );


        const report =
          await openAiReport(
            env,
            body
          );


        return json({
          report,

          generatedBy:
            env.OPENAI_API_KEY
            &&
            env.OPENAI_MODEL

              ? 'openai'

              : 'wgm-fallback',

          requiresHumanReview:
            true,

          metadata: {
            generatedAt:
              new Date()
                .toISOString(),

            model:
              env.OPENAI_MODEL
              ||
              null,

            promptVersion:
              PROMPT_VERSION,

            analysisVersion:
              body.analytics
                ?.versions
                ?.analysisVersion

              ||
              ANALYSIS_VERSION,

            rulesVersion:
              body.analytics
                ?.versions
                ?.rulesVersion

              ||
              RULES_VERSION
          }
        });


      } catch(error) {

        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }


    /* ------------------------------------------------------
       RELEASE
       ------------------------------------------------------ */

    if(
      url.pathname
      ===
      '/api/reports/release'
      &&
      request.method
      ===
      'POST'
    ){

      const body =
        await readJson(
          request
        );


      return json({
        status:
          'released',

        deliveryEvent:
          'queued',

        ghlIntegrated:
          false,

        recipient:
          body.recipient
          ||
          null,

        releasedAt:
          new Date()
            .toISOString()
      });
    }


    return env.ASSETS.fetch(
      request
    );
  }
};
