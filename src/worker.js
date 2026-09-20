const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 5
    },
    coaching: { type: 'string' },
    clientContext: { type: 'string' },
    nextFocus: { type: 'string' },
    integrity: { type: 'string' }
  },
  required: [
    'headline',
    'summary',
    'strengths',
    'coaching',
    'clientContext',
    'nextFocus',
    'integrity'
  ],
  additionalProperties: false
};

const SYSTEM_PROMPT = `
You are the White Glove Monitor reporting engine.

Produce concise founder-facing workforce reporting from verified calculations,
tracking metadata, and supplied context.

Rules:
- Never recalculate or contradict supplied objective metrics.
- Device activity is evidence, not a standalone productivity score.
- Treat projects as broad workstreams and notes as descriptions of actual work.
- Do not invent outputs, misconduct, fraud, or performance problems.
- Apply approved leave, schedule changes and business context before describing an exception.
- A month with no material concern is a valid result.
- Human review follows this draft, so surface only defensible, evidence-backed conclusions.
- Keep the language professional, non-punitive, concise and useful to a busy founder.
`;

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        'cache-control': 'no-store'
      }
    }
  );
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/* ==========================================================
   SCRIN CONNECTION CONFIGURATION
   ========================================================== */

function parseConnections(env) {
  const out = [];

  /*
    Preferred multi-connection setup:

    Store a Cloudflare SECRET named:

    SCRIN_CONNECTIONS_JSON

    Example secret value:

    [
      {
        "id": "wgh-main",
        "name": "WGH Main Scrin Account",
        "type": "shared",
        "employer": "",
        "token": "TOKEN_1"
      },
      {
        "id": "michael-green",
        "name": "Michael Green Fine Homes Scrin",
        "type": "dedicated",
        "employer": "Michael Green Fine Homes",
        "token": "TOKEN_2"
      }
    ]

    IMPORTANT:
    This stays in Cloudflare Secrets.
    Never place the tokens in GitHub.
  */

  if (env.SCRIN_CONNECTIONS_JSON) {
    let parsed;

    try {
      parsed = JSON.parse(env.SCRIN_CONNECTIONS_JSON);
    } catch {
      throw new Error(
        'SCRIN_CONNECTIONS_JSON is not valid JSON'
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        'SCRIN_CONNECTIONS_JSON must be a JSON array'
      );
    }

    for (const raw of parsed) {
      if (!raw || !raw.id || !raw.token) {
        continue;
      }

      const type =
        raw.type === 'dedicated'
          ? 'dedicated'
          : 'shared';

      if (
        type === 'dedicated' &&
        !String(raw.employer || '').trim()
      ) {
        throw new Error(
          `Dedicated connection ${raw.id} requires an employer`
        );
      }

      out.push({
        id: String(raw.id),
        name: String(raw.name || raw.id),
        provider: 'scrin',
        type,
        employer: String(raw.employer || ''),
        token: String(raw.token),
        enabled: raw.enabled !== false
      });
    }
  }

  /*
    Backward compatibility.

    Your current working SCRIN_TOKEN still works.
    This means we do NOT have to change your existing
    Cloudflare secret right now.
  */

  if (!out.length && env.SCRIN_TOKEN) {
    out.push({
      id: 'wgh-main',
      name: 'WGH Main Scrin Account',
      provider: 'scrin',
      type: 'shared',
      employer: '',
      token: String(env.SCRIN_TOKEN),
      enabled: true
    });
  }

  return out.filter(
    connection => connection.enabled
  );
}

function publicConnection(connection) {
  return {
    id: connection.id,
    name: connection.name,
    provider: connection.provider,
    type: connection.type,
    employer: connection.employer || '',
    employerLocked:
      connection.type === 'dedicated',
    status: 'configured'
  };
}

function getConnection(env, connectionId) {
  const connections =
    parseConnections(env);

  if (!connections.length) {
    throw new Error(
      'No Scrin connection is configured'
    );
  }

  if (connectionId) {
    const found =
      connections.find(
        connection =>
          connection.id === String(connectionId)
      );

    if (!found) {
      throw new Error(
        `Unknown Scrin connection: ${connectionId}`
      );
    }

    return found;
  }

  /*
    Existing frontend compatibility:
    if there is only one Scrin connection,
    it does not need to send connectionId yet.
  */

  if (connections.length === 1) {
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
      env.SCRIN_API_BASE_URL ||
      'https://scrin.io'
    ).replace(/\/$/, '');

  const response =
    await fetch(
      base + path,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-SSM-Token': connection.token
        },
        body: JSON.stringify(body)
      }
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Scrin ${response.status} (${connection.name}): ${text.slice(0, 300)}`
    );
  }

  return {
    connection,
    data:
      text
        ? JSON.parse(text)
        : null
  };
}

/* ==========================================================
   DEMO DATA
   ========================================================== */

function demoCommon() {
  return {
    companies: [
      {
        id: 477279,
        name: 'WGH Scrin Account',
        isManager: true,
        employments: [
          {
            id: 477279,
            name: 'Maria Gadin',
            email: 'masked@example.com',
            registered: true
          },
          {
            id: 500002,
            name: 'VA 2 — sync to reveal',
            email: 'masked2@example.com',
            registered: true
          },
          {
            id: 500003,
            name: 'VA 3 — sync to reveal',
            email: 'masked3@example.com',
            registered: true
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
    Array.isArray(data?.companies)
      ? data.companies
      : (
          Array.isArray(data)
            ? data
            : []
        );

  const employees = [];

  for (const company of companies) {
    const employments =
      Array.isArray(company?.employments)
        ? company.employments
        : [];

    for (const person of employments) {
      employees.push({
        /*
          Source identity is now connection + employment ID.

          This prevents collisions between two different
          Scrin accounts.
        */
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
          connection.type === 'dedicated',

        employmentId:
          person.id,

        name:
          person.name ||
          person.email ||
          `Employment ${person.id}`,

        email:
          person.email || null,

        scrinCompanyId:
          company.id,

        scrinCompany:
          company.name ||
          `Scrin Company ${company.id}`,

        registered:
          person.registered,

        lastActive:
          person.lastActive,

        source:
          connection.type === 'dedicated'
            ? 'Standalone WGM'
            : 'WGH Managed',

        role:
          'Virtual Assistant',

        reportingStatus:
          'Synced',

        /*
          Dedicated connections automatically inherit
          their employer.

          Shared WGH connections remain blank until WGM
          maps each employee.
        */
        employer:
          connection.type === 'dedicated'
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
   DATE / ACTIVITY CALCULATIONS
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
    offsetMinutes * 60 * 1000;

  const endUtc =
    Date.parse(
      `${to}T23:59:59Z`
    )
    -
    offsetMinutes * 60 * 1000;

  if (
    !Number.isFinite(startUtc) ||
    !Number.isFinite(endUtc) ||
    endUtc < startUtc
  ) {
    throw new Error(
      'Invalid date range'
    );
  }

  return {
    from:
      Math.floor(
        startUtc / 1000
      ),

    to:
      Math.floor(
        endUtc / 1000
      )
  };
}

function localDate(
  epochSeconds,
  offsetMinutes = 0
) {
  return new Date(
    (
      Number(epochSeconds) *
      1000
    )
    +
    (
      offsetMinutes *
      60000
    )
  )
  .toISOString()
  .slice(0, 10);
}

function summarizeActivities(
  activities = [],
  expectedHours = 0,
  offsetMinutes = 0
) {
  let seconds = 0;

  const days =
    new Set();

  const projects = {};

  for (const activity of activities || []) {
    const from =
      Number(activity.from);

    const to =
      Number(activity.to);

    if (
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      to > from
    ) {
      seconds +=
        to - from;

      days.add(
        localDate(
          from,
          offsetMinutes
        )
      );

      const key =
        activity.projectId == null
          ? 'Unassigned'
          : String(
              activity.projectId
            );

      projects[key] =
        (
          projects[key] ||
          0
        )
        +
        (
          to - from
        );
    }
  }

  const trackedHours =
    seconds / 3600;

  return {
    trackedSeconds:
      seconds,

    trackedHours,

    activeDays:
      days.size,

    expectedHours:
      Number(
        expectedHours || 0
      ),

    coverage:
      Number(expectedHours) > 0
        ? Math.min(
            100,
            (
              trackedHours /
              Number(expectedHours)
            )
            *
            100
          )
        : null,

    projectSeconds:
      projects
  };
}

/* ==========================================================
   SCREENSHOTS
   ========================================================== */

async function fetchScreenshotsChunked(
  env,
  connectionId,
  activityIds
) {
  const out = [];

  const ids =
    [
      ...new Set(
        (
          activityIds ||
          []
        )
        .filter(Boolean)
      )
    ];

  for (
    let i = 0;
    i < ids.length;
    i += 100
  ) {
    const part =
      ids.slice(
        i,
        i + 100
      );

    const result =
      await scrinFetchWithConnection(
        env,
        connectionId,
        '/api/v2/GetScreenshots',
        part
      );

    if (
      Array.isArray(result.data)
    ) {
      out.push(
        ...result.data
      );
    }
  }

  return out;
}

function summarizeScreenshots(
  screenshots = []
) {
  const apps = {};

  let activitySum = 0;
  let activityCount = 0;

  for (
    const screenshot
    of screenshots || []
  ) {
    if (
      Number.isFinite(
        Number(
          screenshot.activityLevel
        )
      )
    ) {
      activitySum +=
        Number(
          screenshot.activityLevel
        );

      activityCount++;
    }

    const applications =
      Array.isArray(
        screenshot.applications
      )
        ? screenshot.applications
        : [];

    for (
      const application
      of applications
    ) {
      const name =
        application.applicationName ||
        'Unknown';

      apps[name] =
        (
          apps[name] ||
          0
        )
        +
        Number(
          application.duration ||
          0
        );
    }
  }

  const totalApp =
    Object
      .values(apps)
      .reduce(
        (a,b) => a+b,
        0
      )
    ||
    1;

  const appSummary =
    Object
      .entries(apps)
      .sort(
        (a,b) =>
          b[1] - a[1]
      )
      .slice(0,10)
      .map(
        ([name,seconds]) => [
          name,
          Math.round(
            (
              seconds /
              totalApp
            )
            *
            100
          )
        ]
      );

  const preview =
    (
      screenshots ||
      []
    )
    .slice(0,24)
    .map(
      screenshot => [
        new Date(
          Number(
            screenshot.taken
          )
          *
          1000
        )
        .toISOString()
        .slice(11,16),

        screenshot
          .applications
          ?.find(
            app =>
              app.fromScreen
          )
          ?.applicationName
        ||
        screenshot
          .applications
          ?.[0]
          ?.applicationName
        ||
        'Screenshot',

        Number(
          screenshot.activityLevel
        )
        ||
        null,

        screenshot.thumbUrl
        ||
        screenshot.url
        ||
        null
      ]
    );

  return {
    averageActivityLevel:
      activityCount
        ? Math.round(
            activitySum /
            activityCount
          )
        : null,

    apps:
      appSummary,

    preview
  };
}

/* ==========================================================
   PROJECT / WORKSTREAM SUMMARY
   ========================================================== */

function projectSummary(
  metrics,
  common
) {
  const nameMap = {};

  const walk = value => {
    if (
      !value ||
      typeof value !== 'object'
    ) {
      return;
    }

    if (
      Array.isArray(value)
    ) {
      for (
        const child
        of value
      ) {
        walk(child);
      }

      return;
    }

    for (
      const [key,item]
      of Object.entries(value)
    ) {
      if (
        key === 'projects' &&
        Array.isArray(item)
      ) {
        for (
          const project
          of item
        ) {
          if (
            project?.id != null
          ) {
            nameMap[
              String(
                project.id
              )
            ] =
              project.name ||
              `Project ${project.id}`;
          }
        }
      } else if (
        item &&
        typeof item === 'object'
      ) {
        walk(item);
      }
    }
  };

  walk(common);

  const total =
    Object
      .values(
        metrics.projectSeconds ||
        {}
      )
      .reduce(
        (a,b) => a+b,
        0
      )
    ||
    1;

  return Object
    .entries(
      metrics.projectSeconds ||
      {}
    )
    .sort(
      (a,b) =>
        b[1] - a[1]
    )
    .map(
      ([id,seconds]) => [
        nameMap[id]
        ||
        `Project ${id}`,

        Math.round(
          (
            seconds /
            total
          )
          *
          100
        )
      ]
    );
}

/* ==========================================================
   OPENAI REPORT GENERATION
   ========================================================== */

async function openAiReport(
  env,
  input
) {
  if (
    !env.OPENAI_API_KEY ||
    !env.OPENAI_MODEL
  ) {
    return (
      input.benchmark
      ||
      {
        headline:
          'WGM generated a structured draft from the verified tracking period.',

        summary:
          'Objective time and workstream data were prepared for human review. Configure OPENAI_API_KEY and OPENAI_MODEL to generate live narrative.',

        strengths: [
          'Verified calculations are available for review.'
        ],

        coaching:
          'Review project labels and context before release.',

        clientContext:
          'Human review is required.',

        nextFocus:
          'Complete reviewer validation.',

        integrity:
          'No integrity conclusion generated without live AI and reviewer validation.'
      }
    );
  }

  const response =
    await fetch(
      'https://api.openai.com/v1/responses',
      {
        method:'POST',

        headers:{
          Authorization:
            `Bearer ${env.OPENAI_API_KEY}`,

          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify({
            model:
              env.OPENAI_MODEL,

            input:[
              {
                role:'system',
                content:
                  SYSTEM_PROMPT
              },
              {
                role:'user',
                content:
                  `Create the WGM monthly report draft from this verified input. Do not infer facts that are not present.\n\n${JSON.stringify(input)}`
              }
            ],

            text:{
              format:{
                type:'json_schema',
                name:'wgm_monthly_report',
                strict:true,
                schema:REPORT_SCHEMA
              }
            }
          })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
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
          item.content ||
          []
      )
      .find(
        item =>
          item.type ===
          'output_text'
      )
      ?.text;

  if (!text) {
    throw new Error(
      'No structured report returned'
    );
  }

  return JSON.parse(text);
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

    /* ------------------------------
       HEALTH
       ------------------------------ */

    if (
      url.pathname ===
      '/api/health'
    ) {
      let connectionCount = 0;

      try {
        connectionCount =
          parseConnections(env)
            .length;
      } catch {}

      return json({
        ok:true,

        mode:
          env.DEMO_MODE === 'false'
            ? 'live'
            : 'demo',

        connectionCount
      });
    }

    /* ------------------------------
       CONNECTION LIST
       ------------------------------ */

    if (
      url.pathname ===
      '/api/scrin/connections'
    ) {
      try {
        const demo =
          env.DEMO_MODE !==
          'false';

        if (demo) {
          return json({
            demo:true,

            connections:[
              {
                id:'demo-main',
                name:'Demo Scrin Connection',
                provider:'scrin',
                type:'shared',
                employer:'',
                employerLocked:false,
                status:'demo'
              }
            ]
          });
        }

        const connections =
          parseConnections(env)
            .map(
              publicConnection
            );

        return json({
          demo:false,
          connections
        });

      } catch (error) {
        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }

    /* ------------------------------
       SINGLE CONNECTION COMMON DATA
       ------------------------------ */

    if (
      url.pathname ===
        '/api/scrin/common'
      &&
      request.method === 'POST'
    ) {
      try {
        const body =
          await readJson(
            request
          );

        const demo =
          env.DEMO_MODE !==
          'false';

        if (demo) {
          const connection = {
            id:'demo-main',
            name:'Demo Scrin Connection',
            provider:'scrin',
            type:'shared',
            employer:'',
            token:'demo'
          };

          const normalized =
            normalizeCommon(
              demoCommon(),
              connection
            );

          return json({
            demo:true,

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
          demo:false,

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

      } catch (error) {
        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }

    /* ------------------------------
       SYNC ALL CONNECTIONS
       ------------------------------ */

    if (
      url.pathname ===
        '/api/scrin/all-common'
      &&
      request.method === 'POST'
    ) {
      try {
        const demo =
          env.DEMO_MODE !==
          'false';

        if (demo) {
          const connection = {
            id:'demo-main',
            name:'Demo Scrin Connection',
            provider:'scrin',
            type:'shared',
            employer:'',
            token:'demo'
          };

          const normalized =
            normalizeCommon(
              demoCommon(),
              connection
            );

          return json({
            demo:true,

            connections:[
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

            errors:[]
          });
        }

        const connections =
          parseConnections(env);

        const allEmployees = [];

        const publicConnections = [];

        const errors = [];

        for (
          const connection
          of connections
        ) {
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

          } catch (error) {
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
          demo:false,
          connections:
            publicConnections,
          employees:
            allEmployees,
          errors
        });

      } catch (error) {
        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }

    /* ------------------------------
       RAW ACTIVITIES
       ------------------------------ */

    if (
      url.pathname ===
        '/api/scrin/activities'
      &&
      request.method === 'POST'
    ) {
      try {
        const body =
          await readJson(
            request
          );

        if (
          !Array.isArray(
            body.ranges
          )
        ) {
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

      } catch (error) {
        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }

    /* ------------------------------
       RAW SCREENSHOTS
       ------------------------------ */

    if (
      url.pathname ===
        '/api/scrin/screenshots'
      &&
      request.method === 'POST'
    ) {
      try {
        const body =
          await readJson(
            request
          );

        if (
          !Array.isArray(
            body.activityIds
          )
        ) {
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

      } catch (error) {
        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }

    /* ------------------------------
       WGM NORMALIZED PERIOD DATA
       ------------------------------ */

    if (
      url.pathname ===
        '/api/wgm/period-data'
      &&
      request.method === 'POST'
    ) {
      try {
        const body =
          await readJson(
            request
          );

        if (
          env.DEMO_MODE !==
          'false'
        ) {
          return json(
            {
              error:
                'Switch DEMO_MODE=false to query live Scrin period data.'
            },
            409
          );
        }

        /*
          connectionId is optional only while there is
          exactly one configured Scrin account.

          Once multiple accounts exist, frontend sends it.
        */

        if (
          !body.employmentId ||
          !body.from ||
          !body.to
        ) {
          return json(
            {
              error:
                'employmentId, from and to are required'
            },
            400
          );
        }

        const range =
          epochRange(
            body.from,
            body.to,
            Number(
              body.timezoneOffsetMinutes ||
              0
            )
          );

        const commonResult =
          await scrinFetchWithConnection(
            env,
            body.connectionId,
            '/api/v2/GetCommonData',
            {}
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

        const metrics =
          summarizeActivities(
            activities,

            Number(
              body.expectedHours ||
              0
            ),

            Number(
              body.timezoneOffsetMinutes ||
              0
            )
          );

        const workstreams =
          projectSummary(
            metrics,
            commonResult.data
          );

        let screenshots = [];

        let screenshotSummary = {
          apps:[],
          preview:[],
          averageActivityLevel:null
        };

        if (
          body.includeScreenshots
        ) {
          screenshots =
            await fetchScreenshotsChunked(
              env,

              body.connectionId,

              activities.map(
                activity =>
                  activity.id
              )
            );

          screenshotSummary =
            summarizeScreenshots(
              screenshots
            );
        }

        return json({
          connection:
            publicConnection(
              commonResult.connection
            ),

          metrics,

          workstreams,

          apps:
            screenshotSummary.apps,

          averageActivityLevel:
            screenshotSummary
              .averageActivityLevel,

          screenshotCount:
            screenshots.length,

          screenshotPreview:
            screenshotSummary.preview,

          screenshotEvidenceSummary:{
            count:
              screenshots.length,

            averageActivityLevel:
              screenshotSummary
                .averageActivityLevel,

            topApplications:
              screenshotSummary
                .apps
                .slice(0,6)
          }
        });

      } catch (error) {
        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }

    /* ------------------------------
       REPORT GENERATION
       ------------------------------ */

    if (
      url.pathname ===
        '/api/reports/generate'
      &&
      request.method === 'POST'
    ) {
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
            env.OPENAI_API_KEY &&
            env.OPENAI_MODEL
              ? 'openai'
              : 'prototype',

          requiresHumanReview:
            true
        });

      } catch (error) {
        return json(
          {
            error:
              error.message
          },
          500
        );
      }
    }

    /* ------------------------------
       RELEASE EVENT
       ------------------------------ */

    if (
      url.pathname ===
        '/api/reports/release'
      &&
      request.method === 'POST'
    ) {
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
          body.recipient ||
          null
      });
    }

    return env.ASSETS.fetch(
      request
    );
  }
};
