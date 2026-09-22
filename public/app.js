/* WHITE GLOVE MONITOR — V1.8 | FIXED FRAUD SCREENING REPORT */
const WGM_LOGO='/wgm-logo.png';

const state={
  page:'dashboard',
  tab:'overview',
  mode:'DEMO',
  employees:[],
  connections:[],
  selectedEmployeeId:'',
  role:localStorage.getItem('wgmRole')||'owner',
  portalEmployer:localStorage.getItem('wgmPortalEmployer')||'',
  period:{from:'2026-09-01',to:'2026-09-30'},
  reportStatus:'Not generated',
  reportEmployeeId:'',
  report:null,
  analytics:null,
  meta:null,
  reviewerChecks:[true,true,true,true,true],
  reviewerName:localStorage.getItem('wgmReviewerName')||'White Glove Reviewer',
  reviewedShotIds:[],
  resolvedFindings:[],
  released:[],
  notifications:[],
  selectedReleaseId:'',
  syncMessage:'Demo data loaded. Connect Scrin to load live employees.',
  toast:null
};

const demo=[{
  id:'demo-main::477279',
  connectionId:'demo-main',
  connectionName:'Demo Scrin Connection',
  employmentId:'477279',
  name:'Sample team member',
  initials:'ST',
  employer:'Sample employer',
  role:'Virtual Assistant',
  timezone:'Pacific time',
  timezoneOffsetMinutes:-420,
  expectedHours:160,
  excluded:false,
  reportingStatus:'Ready',
  shots:[],
  daySummary:null,
  lastAnalytics:null
}];

const load=(k,f)=>{
  try{
    return JSON.parse(localStorage.getItem(k)||'null')??f;
  }catch{
    return f;
  }
};

const save=(k,v)=>{
  try{
    localStorage.setItem(k,JSON.stringify(v));
  }catch{}
};

state.employees=load('wgmEmployees',demo);
state.connections=load('wgmConnections',[]);
state.released=load('wgmFraudReleasedReports',[]);
state.notifications=load('wgmFraudNotifications',[]);
state.selectedEmployeeId=state.employees[0]?.id||'';

const saveEmployees=()=>save('wgmEmployees',state.employees);
const saveConnections=()=>save('wgmConnections',state.connections);
const saveReleased=()=>save('wgmFraudReleasedReports',state.released);
const saveNotifications=()=>save('wgmFraudNotifications',state.notifications);

const esc=(v='')=>String(v).replace(
  /[&<>"']/g,
  c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c])
);

const ini=(n='')=>
  n.split(/\s+/)
   .filter(Boolean)
   .slice(0,2)
   .map(x=>x[0])
   .join('')
   .toUpperCase()||'VA';

const hrs=(h=0)=>{
  const m=Math.max(
    0,
    Math.round(Number(h||0)*60)
  );

  return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`;
};

const statusCls=(s='')=>
  /Released|Approved|Ready|Connected|Clear|Green|Complete|Active/i.test(s)
    ?'green'
    :/Review|Pending|Draft|Yellow|Queued|Configured/i.test(s)
      ?'amber'
      :/Failed|Error|Red/i.test(s)
        ?'red'
        :'blue';

const active=()=>state.employees.filter(e=>!e.excluded);

const empById=id=>
  state.employees.find(
    e=>String(e.id)===String(id)
  );

const employers=()=>[
  ...new Set(
    active()
      .map(e=>e.employer)
      .filter(Boolean)
  )
];

const month=d=>
  d
    ?new Date(`${d}T00:00:00Z`).toLocaleString(
        'en-US',
        {
          month:'long',
          year:'numeric',
          timeZone:'UTC'
        }
      )
    :'Reporting period';

const timezone=e=>
  e?.baseline?.timezone||
  e?.timezone||
  'Employee timezone';

const metric=(l,v,s)=>`
  <div class="card metric">
    <div class="label">${l}</div>
    <div class="value">${v}</div>
    <div class="delta">${s}</div>
  </div>
`;

function toast(m){
  state.toast=m;
  render();

  setTimeout(
    ()=>{
      state.toast=null;
      render();
    },
    2300
  );
}

function ensureEmployer(){
  const es=employers();

  if(
    !state.portalEmployer||
    !es.includes(state.portalEmployer)
  ){
    state.portalEmployer=es[0]||'';

    localStorage.setItem(
      'wgmPortalEmployer',
      state.portalEmployer
    );
  }

  const t=active().filter(
    e=>e.employer===state.portalEmployer
  );

  if(
    t.length&&
    !t.some(
      e=>String(e.id)===String(state.selectedEmployeeId)
    )
  ){
    state.selectedEmployeeId=t[0].id;
  }
}

const portal=()=>{
  ensureEmployer();

  return active().filter(
    e=>e.employer===state.portalEmployer
  );
};

function currentEmployee(){
  if(state.role==='employer'){
    return (
      portal().find(
        e=>String(e.id)===String(state.selectedEmployeeId)
      )||
      portal()[0]||
      null
    );
  }

  if(state.role==='employee'){
    return (
      empById(state.selectedEmployeeId)||
      active()[0]||
      null
    );
  }

  return (
    empById(state.selectedEmployeeId)||
    active()[0]||
    null
  );
}

const unread=employer=>
  state.notifications.filter(
    n=>
      n.employer===employer&&
      !n.read
  ).length;

const employerReports=employer=>
  state.released
    .filter(
      r=>r.employer===employer
    )
    .sort(
      (a,b)=>
        String(b.releasedAt)
          .localeCompare(String(a.releasedAt))
    );

const employeeReports=id=>
  state.released
    .filter(
      r=>String(r.employeeId)===String(id)
    )
    .sort(
      (a,b)=>
        String(b.releasedAt)
          .localeCompare(String(a.releasedAt))
    );

const nextVersion=(id,p)=>
  state.released.filter(
    r=>
      String(r.employeeId)===String(id)&&
      r.period?.from===p.from&&
      r.period?.to===p.to
  ).length+1;

function setRole(r){
  state.role=r;

  localStorage.setItem(
    'wgmRole',
    r
  );

  state.page='dashboard';
  state.tab='overview';

  if(r==='employer'){
    ensureEmployer();
  }

  render();
}

const roleName=()=>({
  owner:'WGM Owner',
  reviewer:'White Glove Reviewer',
  employer:'Employer Portal',
  employee:'Employee Portal'
})[state.role]||'WGM Owner';

function navBtn(id,label,b=''){
  return `
    <button
      data-page="${id}"
      class="${state.page===id?'active':''}"
    >
      <span>${label}</span>

      ${
        b
          ?`<span class="badge">${b}</span>`
          :''
      }
    </button>
  `;
}

function nav(){
  if(state.role==='reviewer'){
    return (
      navBtn('dashboard','Reviewer Home')+
      navBtn(
        'review',
        'Review Queue',
        state.reportStatus==='Draft ready'?'1':''
      )+
      navBtn('reports','Reports')+
      navBtn('monitoring','Evidence Review')
    );
  }

  if(state.role==='employer'){
    const n=unread(state.portalEmployer);

    return (
      navBtn(
        'dashboard',
        'Overview',
        n?String(n):''
      )+
      navBtn('employees','My Team')+
      navBtn(
        'reports',
        'Reports',
        n?String(n):''
      )+
      navBtn('monitoring','Monitoring')
    );
  }

  if(state.role==='employee'){
    return (
      navBtn('dashboard','My Activity')+
      navBtn('monitoring','My Monitoring')+
      navBtn('reports','My Reports')
    );
  }

  return (
    navBtn('dashboard','Dashboard')+
    navBtn('employees','Employees')+
    navBtn('monitoring','Monitoring')+
    navBtn('reports','Reports')+
    navBtn(
      'review',
      'Review Queue',
      state.reportStatus==='Draft ready'?'1':''
    )+
    navBtn('dataSources','Data Sources')+
    navBtn('settings','Settings')
  );
}

function shell(content,title){
  const n=
    state.role==='employer'
      ?unread(state.portalEmployer)
      :0;

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
          ${nav()}
        </nav>

        <div class="sidebar-bottom">

          <div class="user-chip">

            <div class="avatar">W</div>

            <div>

              <b>${roleName()}</b>

              <div
                style="
                  font-size:11px;
                  opacity:.7
                "
              >
                ${
                  state.role==='reviewer'
                    ?'Human Review'
                    :'Prototype'
                }
              </div>

            </div>

          </div>

        </div>

      </aside>

      <main class="main">

        <header class="topbar">

          <h1>${title}</h1>

          <div
            style="
              display:flex;
              align-items:center;
              gap:10px
            "
          >

            ${
              n
                ?`
                  <span class="status amber">
                    <span class="dot"></span>
                    ${n} new
                  </span>
                `
                :''
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
                ${state.role==='owner'?'selected':''}
              >
                WGM Owner
              </option>

              <option
                value="reviewer"
                ${state.role==='reviewer'?'selected':''}
              >
                White Glove Reviewer
              </option>

              <option
                value="employer"
                ${state.role==='employer'?'selected':''}
              >
                Employer Portal
              </option>

              <option
                value="employee"
                ${state.role==='employee'?'selected':''}
              >
                Employee Portal
              </option>

            </select>

            <div class="mode-pill">
              ${state.mode} MODE · FRAUD SCREENING
            </div>

          </div>

        </header>

        <section class="content">
          ${content}
        </section>

      </main>

      ${
        state.toast
          ?`
            <div class="toast">
              ${esc(state.toast)}
            </div>
          `
          :''
      }

    </div>
  `;
}

function dashboard(){
  if(state.role==='employer'){
    return employerDashboard();
  }

  if(state.role==='reviewer'){
    return reviewerDashboard();
  }

  if(state.role==='employee'){
    return employeeDashboard();
  }

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>WGM Command Center</h2>

        <p>
          Scrin supplies monitoring evidence.
          WGM screens screenshots,
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
          state.connections.length||1,
          'Scrin sources'
        )
      }

      ${
        metric(
          'Employers',
          employers().length,
          'Mapped organizations'
        )
      }

      ${
        metric(
          'Employees',
          active().length,
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
            active().map(
              e=>{
                const r=employeeReports(e.id)[0];

                return `
                  <tr>

                    <td>
                      <span
                        class="row-link"
                        data-open-id="${esc(e.id)}"
                      >
                        ${esc(e.name)}
                      </span>
                    </td>

                    <td>
                      ${esc(e.employer||'Unassigned')}
                    </td>

                    <td>
                      ${esc(e.connectionName||'Scrin')}
                    </td>

                    <td>
                      ${
                        r
                          ?`${esc(month(r.period.from))} · v${r.version}`
                          :'—'
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
    'Dashboard'
  );
}

function employerDashboard(){
  const team=portal();

  const notices=
    state.notifications
      .filter(
        n=>
          n.employer===state.portalEmployer&&
          !n.read
      )
      .sort(
        (a,b)=>
          String(b.createdAt)
            .localeCompare(String(a.createdAt))
      );

  const latest=notices[0];

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          ${esc(state.portalEmployer||'Employer')}
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
          employers().map(
            e=>`
              <option
                value="${esc(e)}"
                ${e===state.portalEmployer?'selected':''}
              >
                ${esc(e)}
              </option>
            `
          ).join('')
        }

      </select>

    </div>

    ${
      latest
        ?`
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

                <h3>${esc(latest.title)}</h3>

                <p>${esc(latest.message)}</p>

              </div>

              <button
                class="btn gold"
                data-view-release="${esc(latest.reportId)}"
              >
                View Report
              </button>

            </div>

          </div>
        `
        :''
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
          employerReports(state.portalEmployer).length,
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
            team.map(
              e=>{
                const r=employeeReports(e.id)[0];

                return `
                  <tr>

                    <td>${esc(e.name)}</td>

                    <td>
                      ${
                        r
                          ?`${esc(month(r.period.from))} · v${r.version}`
                          :'No released report'
                      }
                    </td>

                    <td>

                      ${
                        r
                          ?`
                            <span class="status green">
                              <span class="dot"></span>
                              Released
                            </span>
                          `
                          :'—'
                      }

                    </td>

                    <td>

                      ${
                        r
                          ?`
                            <button
                              class="btn"
                              data-view-release="${esc(r.id)}"
                            >
                              View
                            </button>
                          `
                          :''
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
    'Employer Portal'
  );
}

function reviewerDashboard(){
  return shell(
    `
    <div class="header-row">

      <div>

        <h2>Reviewer Workspace</h2>

        <p>
          The gold HUMAN REVIEWED stamp
          is applied only after sign-off.
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
          active().length,
          'Authorized'
        )
      }

      ${
        metric(
          'Current status',
          state.reportStatus,
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
        ?`
          <div class="card panel">
            ${reviewSummary()}
          </div>
        `
        :`
          <div class="card empty">
            Generate a screening report first.
          </div>
        `
    }
    `,
    'Reviewer Home'
  );
}

function employeeDashboard(){
  const e=currentEmployee();
  const r=e?employeeReports(e.id)[0]:null;

  return shell(
    e
      ?`
        <div class="header-row">

          <div>

            <h2>My Activity</h2>

            <p>
              ${esc(e.name)}
              ·
              ${esc(e.employer||'')}
            </p>

          </div>

        </div>

        <div class="grid metrics">

          ${
            metric(
              'Latest report',
              r?month(r.period.from):'None',
              r
                ?'Released by White Glove'
                :'No report'
            )
          }

          ${
            metric(
              'Connection',
              esc(e.connectionName||'Scrin'),
              'Monitoring source'
            )
          }

          ${
            metric(
              'Timezone',
              esc(timezone(e)),
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
          r
            ?`
              <button
                class="btn primary"
                data-view-release="${esc(r.id)}"
              >
                View latest report
              </button>
            `
            :`
              <div class="card empty">
                No released report yet.
              </div>
            `
        }
      `
      :`
        <div class="card empty">
          No employee selected.
        </div>
      `,
    'Employee Portal'
  );
}

function employees(){
  const list=
    state.role==='employer'
      ?portal()
      :state.role==='employee'
        ?[currentEmployee()].filter(Boolean)
        :active();

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>
          ${
            state.role==='employer'
              ?'My Team'
              :'Employees'
          }
        </h2>

        <p>
          Open an employee to inspect evidence.
        </p>

      </div>

      ${
        state.role==='owner'
          ?`
            <button
              class="btn"
              id="syncScrin"
            >
              Sync Scrin
            </button>
          `
          :''
      }

    </div>

    <div class="card panel">

      ${
        state.role==='owner'
          ?`
            <div class="callout">
              <strong>Connection status</strong>
              ${esc(state.syncMessage)}
            </div>
          `
          :''
      }

      <table>

        <thead>

          <tr>
            <th>Employee</th>
            <th>Employer</th>
            <th>Connection</th>
            <th>Latest screening</th>
          </tr>

        </thead>

        <tbody>

          ${
            list.map(
              e=>{
                const r=employeeReports(e.id)[0];

                return `
                  <tr>

                    <td>

                      <span
                        class="row-link"
                        data-open-id="${esc(e.id)}"
                      >
                        ${esc(e.name)}
                      </span>

                    </td>

                    <td>
                      ${esc(e.employer||'Unassigned')}
                    </td>

                    <td>
                      ${esc(e.connectionName||'Scrin')}
                    </td>

                    <td>
                      ${
                        r
                          ?`${esc(month(r.period.from))} · Released`
                          :'—'
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
    state.role==='employer'
      ?'My Team'
      :'Employees'
  );
}

function monitoring(){
  const e=currentEmployee();

  if(!e){
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
          ${esc(e.initials||ini(e.name))}
        </div>

        <div>

          <h2 style="margin:0">
            ${esc(e.name)}
          </h2>

          <div class="small">
            ${esc(e.employer||'Unassigned')}
            ·
            ${esc(e.connectionName||'Scrin')}
          </div>

        </div>

      </div>

      <div class="tabs">

        ${
          ['overview','screenshots','reports'].map(
            t=>`
              <button
                class="tab ${state.tab===t?'active':''}"
                data-tab="${t}"
              >
                ${t[0].toUpperCase()+t.slice(1)}
              </button>
            `
          ).join('')
        }

      </div>

      ${monitorTab(e)}

    </div>
    `,
    'Employee Monitoring'
  );
}

function monitorTab(e){
  if(state.tab==='screenshots'){
    return screenshotView(e);
  }

  if(state.tab==='reports'){
    const rs=employeeReports(e.id);

    return rs.length
      ?releaseTable(rs)
      :`
        <div class="empty">
          No released reports.
        </div>
      `;
  }

  const a=e.lastAnalytics;

  return `
    <div class="grid metrics">

      ${
        metric(
          'Tracked time',
          a?hrs(a.metrics?.trackedHours||0):'—',
          'Last analyzed period'
        )
      }

      ${
        metric(
          'Screenshots',
          a?.evidence?.screenshotCount??'—',
          'Monthly metadata'
        )
      }

      ${
        metric(
          'Capture dates',
          a?.screenshotDates?.length??'—',
          'Month'
        )
      }

      ${
        metric(
          'Evidence status',
          a?.review?.status||'—',
          'Coverage'
        )
      }

    </div>

    <div class="callout">

      <strong>Human review rule</strong>

      The report can be generated by AI,
      but the HUMAN REVIEWED stamp appears only
      after a reviewer checks the screenshot sample
      and approves release.

    </div>
  `;
}

function shotCard(s){
  return `
    <div class="shot">

      <div class="shot-img">

        ${
          s[3]
            ?`
              <a
                href="${esc(s[4]||s[3])}"
                target="_blank"
              >
                <img
                  src="${esc(s[3])}"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block
                  "
                >
              </a>
            `
            :`
              <div class="empty">
                No image
              </div>
            `
        }

      </div>

      <div class="shot-meta">

        <strong>${esc(s[0])}</strong>

        ${esc(s[1])}

        <br>

        <span class="small">
          Activity ${s[2]??'—'}%
        </span>

      </div>

    </div>
  `;
}

function screenshotView(e){
  const d=e.daySummary;
  const date=d?.date||state.period.to;

  return `
    <div class="toolbar">

      <div class="field">

        <label>Date</label>

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
      d
        ?`
          <div
            class="grid metrics"
            style="margin:16px 0"
          >

            ${
              metric(
                'First tracked',
                esc(d.firstTracked||'—'),
                'Selected day'
              )
            }

            ${
              metric(
                'Last tracked',
                esc(d.lastTracked||'—'),
                'Selected day'
              )
            }

            ${
              metric(
                'Recorded time',
                hrs(
                  Number(d.trackedSeconds||0)/3600
                ),
                'Scrin intervals'
              )
            }

            ${
              metric(
                'Screenshots',
                d.screenshotCount||0,
                'Evidence captures'
              )
            }

          </div>
        `
        :''
    }

    <div class="shot-grid">

      ${
        (e.shots||[])
          .map(shotCard)
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

async function loadLiveDay(){
  const e=currentEmployee();

  const date=
    document.getElementById('screenDate')?.value;

  if(!e||!date){
    return;
  }

  if(state.mode!=='LIVE'){
    toast('Live Scrin connection required.');
    return;
  }

  try{
    const r=await fetch(
      '/api/wgm/day-data',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          connectionId:e.connectionId,
          employmentId:e.employmentId,
          date,
          timezoneOffsetMinutes:
            e.timezoneOffsetMinutes||0
        })
      }
    );

    const d=await r.json();

    if(!r.ok){
      throw Error(
        d.error||
        'Could not load day'
      );
    }

    e.shots=
      (d.screenshots||[]).map(
        s=>[
          s.time,
          s.application,
          s.activityLevel,
          s.thumbUrl,
          s.url
        ]
      );

    e.daySummary={
      date:d.date,
      firstTracked:d.firstTracked,
      lastTracked:d.lastTracked,
      trackedSeconds:d.trackedSeconds,
      screenshotCount:d.screenshotCount
    };

    saveEmployees();
    render();

  }catch(err){
    toast(
      `Could not load workday: ${err.message}`
    );
  }
}

function reports(){
  if(state.role==='employer'){
    const rs=employerReports(
      state.portalEmployer
    );

    return shell(
      `
      <div class="header-row">

        <div>

          <h2>Reports</h2>

          <p>
            Human-reviewed reports for
            ${esc(state.portalEmployer||'your company')}.
          </p>

        </div>

      </div>

      <div class="card panel">

        ${
          rs.length
            ?releaseTable(rs)
            :`
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

  if(state.role==='employee'){
    const e=currentEmployee();
    const rs=e?employeeReports(e.id):[];

    return shell(
      `
      <div class="header-row">

        <div>

          <h2>My Reports</h2>

          <p>
            Only released reports are visible.
          </p>

        </div>

      </div>

      <div class="card panel">

        ${
          rs.length
            ?releaseTable(rs)
            :`
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

        <h2>Fraud Screening Report</h2>

        <p>
          Choose the VA and month.
          The template is fixed;
          only the report data changes.
        </p>

      </div>

    </div>

    <div class="card panel">

      <div class="toolbar">

        <div class="field">

          <label>From</label>

          <input
            id="fromDate"
            type="date"
            value="${state.period.from}"
          >

        </div>

        <div class="field">

          <label>To</label>

          <input
            id="toDate"
            type="date"
            value="${state.period.to}"
          >

        </div>

        <div class="field">

          <label>Employee</label>

          <select id="reportEmployee">

            ${
              active().map(
                e=>`
                  <option
                    value="${esc(e.id)}"
                    ${e.id===state.selectedEmployeeId?'selected':''}
                  >
                    ${esc(e.name)}
                    —
                    ${esc(e.employer||'Unassigned')}
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
          Generate Screening Report
        </button>

      </div>

    </div>

    <div
      class="card panel"
      style="margin-top:16px"
    >

      <div class="panel-title">
        Fixed template mapping
      </div>

      <div class="grid two-col">

        <div class="context-box">

          <h4>From Scrin/WGM</h4>

          <p>
            VA,
            month,
            timezone,
            screenshot dates,
            recorded hours
            and evidence counts.
          </p>

        </div>

        <div class="context-box">

          <h4>From review</h4>

          <p>
            Four screening outcomes,
            human-checked sample count,
            findings,
            reviewer sign-off
            and release.
          </p>

        </div>

      </div>

    </div>
    `,
    'Reports'
  );
}

function releaseTable(rs){
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
          rs.map(
            r=>`
              <tr>

                <td>
                  ${esc(r.employeeName)}
                </td>

                <td>
                  ${esc(r.employer||'')}
                </td>

                <td>
                  ${esc(month(r.period.from))}
                </td>

                <td>
                  v${r.version}
                </td>

                <td>
                  ${new Date(r.releasedAt).toLocaleString()}
                </td>

                <td>

                  <button
                    class="btn"
                    data-view-release="${esc(r.id)}"
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

async function generateReport(){
  const id=
    document.getElementById('reportEmployee')?.value||
    state.selectedEmployeeId;

  const e=empById(id);

  state.period={
    from:
      document.getElementById('fromDate')?.value||
      state.period.from,

    to:
      document.getElementById('toDate')?.value||
      state.period.to
  };

  if(
    !e||
    e.excluded||
    !e.employer
  ){
    toast(
      'Map this employee to an employer first.'
    );

    return;
  }

  state.selectedEmployeeId=e.id;
  state.reportEmployeeId=e.id;
  state.report=null;
  state.analytics=null;
  state.meta=null;
  state.reviewedShotIds=[];
  state.resolvedFindings=[];
  state.reviewerChecks=[
    true,
    true,
    true,
    true,
    true
  ];

  state.reportStatus='Loading evidence';

  render();

  try{
    const ar=await fetch(
      '/api/wgm/period-analytics',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          connectionId:e.connectionId,
          employmentId:e.employmentId,
          from:state.period.from,
          to:state.period.to,
          timezoneOffsetMinutes:
            e.timezoneOffsetMinutes||0,
          expectedHours:
            Number(e.expectedHours||0),
          adjustedExpectedHours:
            Number(e.expectedHours||0),
          maxVisionScreenshots:12
        })
      }
    );

    const ad=await ar.json();

    if(!ar.ok){
      throw Error(
        ad.error||
        'Analytics failed'
      );
    }

    state.analytics=ad.current;

    e.lastAnalytics=state.analytics;

    e.trackedHours=
      Number(
        state.analytics.metrics?.trackedHours||0
      );

    e.reportingStatus='Screening';

    saveEmployees();

    state.reportStatus='AI screening';

    render();

    const rr=await fetch(
      '/api/reports/generate',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          employee:{
            id:e.id,
            name:e.name,
            employer:e.employer,
            role:e.role,
            timezone:timezone(e)
          },
          period:state.period,
          analytics:state.analytics
        })
      }
    );

    const rd=await rr.json();

    if(!rr.ok){
      throw Error(
        rd.error||
        'Screening failed'
      );
    }

    state.report=rd.report;

    state.meta={
      ...(rd.metadata||{}),
      generatedBy:
        rd.generatedBy||'unknown',
      warning:
        rd.warning||null
    };

    state.reportStatus='Draft ready';

    e.reportingStatus='Draft ready';

    saveEmployees();

    state.page='review';

    render();

  }catch(err){
    state.reportStatus='Generation failed';

    render();

    toast(
      `Screening report failed: ${err.message}`
    );
  }
}

const unresolved=()=>{
  const f=state.report?.findings||[];

  return f.filter(
    (_,i)=>!state.resolvedFindings.includes(i)
  ).length;
};

const humanChecked=()=>
  state.reviewedShotIds.length;

function reviewSummary(){
  const e=
    empById(state.reportEmployeeId)||
    currentEmployee();

  return `
    <table>

      <thead>

        <tr>
          <th>Employee</th>
          <th>Month</th>
          <th>AI-screened</th>
          <th>Human checked</th>
          <th>Unresolved</th>
          <th>Status</th>
        </tr>

      </thead>

      <tbody>

        <tr>

          <td>
            ${esc(e?.name||'—')}
          </td>

          <td>
            ${esc(month(state.period.from))}
          </td>

          <td>
            ${state.meta?.visionScreenshotsSent??0}
          </td>

          <td>
            ${humanChecked()}
          </td>

          <td>
            ${unresolved()}
          </td>

          <td>
            ${esc(state.reportStatus)}
          </td>

        </tr>

      </tbody>

    </table>
  `;
}

const checkTitle=k=>({
  repeated_frozen:
    'Repeated or frozen screens',

  repetitive_cycling:
    'Repetitive screen cycling',

  activity_simulation:
    'Visible activity-simulation tools',

  repeated_across_days:
    'Repeated sequences across days'
})[k]||k;

function review(){
  const e=
    empById(state.reportEmployeeId)||
    currentEmployee();

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>Human Review</h2>

        <p>
          The circular HUMAN REVIEWED stamp
          is valid only after sign-off.
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
        ?reviewConsole(e)
        :`
          <div class="card empty">
            Generate a screening report first.
          </div>
        `
    }
    `,
    'Review Queue'
  );
}

function reviewConsole(e){
  const shots=
    state.analytics?.selectedScreenshotEvidence||[];

  const findings=
    state.report?.findings||[];

  return `
    <div class="card panel">

      <div class="employee-head">

        <div class="employee-avatar">
          ${esc(e?.initials||ini(e?.name||'VA'))}
        </div>

        <div>

          <h2 style="margin:0">
            ${esc(e?.name||'')}
            —
            ${esc(month(state.period.from))}
          </h2>

          <div class="small">
            ${esc(e?.employer||'')}
            ·
            Screenshot fraud screening
          </div>

        </div>

        <div class="spacer"></div>

        <span
          class="status ${statusCls(state.reportStatus)}"
        >

          <span class="dot"></span>

          ${esc(state.reportStatus)}

        </span>

      </div>

      ${
        state.meta?.warning
          ?`
            <div class="callout">

              <strong>Generation note</strong>

              ${esc(state.meta.warning)}

            </div>
          `
          :''
      }

      <div class="grid two-col">

        <div>

          <div class="panel-title">
            AI screening draft
          </div>

          <div class="context-box">

            <h4>
              ${esc(state.report.screeningHeadline||'')}
            </h4>

            <p>
              ${esc(state.report.screeningSubtext||'')}
            </p>

          </div>

          ${
            (state.report.checks||[])
              .map(
                c=>`
                  <div class="context-box">

                    <h4>
                      ${esc(checkTitle(c.key))}
                      ·
                      ${esc(c.status)}
                    </h4>

                    <p>
                      ${esc(c.detail)}
                    </p>

                  </div>
                `
              ).join('')
          }

        </div>

        <div>

          <div class="panel-title">
            Reviewer sign-off
          </div>

          <div class="field">

            <label>Reviewer name</label>

            <input
              id="reviewerName"
              value="${esc(state.reviewerName)}"
            >

          </div>

          <div class="checklist">

            ${
              [
                'I reviewed the AI conclusion',
                'I checked the supplied screenshot sample',
                'I reviewed every flagged sequence',
                'The wording does not overstate the evidence',
                'The report is appropriate for employer release'
              ].map(
                (x,i)=>`
                  <label class="check">

                    <input
                      type="checkbox"
                      data-check="${i}"
                      ${state.reviewerChecks[i]?'checked':''}
                    >

                    ${x}

                  </label>
                `
              ).join('')
            }

          </div>

          <div class="actions">

            <button
              class="btn"
              id="previewReport"
            >
              Preview report
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
        style="margin-top:18px"
      >
        Screenshot sample · ${shots.length}
      </div>

      <div class="shot-grid">

        ${
          shots.length
            ?shots.map(
                s=>`
                  <div
                    class="shot"
                    style="position:relative"
                  >

                    <label
                      style="
                        position:absolute;
                        z-index:3;
                        top:8px;
                        left:8px;
                        background:#fff;
                        border-radius:8px;
                        padding:6px;
                        font-size:12px
                      "
                    >

                      <input
                        type="checkbox"
                        data-review-shot="${esc(s.screenshotId)}"
                        ${
                          state.reviewedShotIds.includes(s.screenshotId)
                            ?'checked'
                            :''
                        }
                      >

                      Human checked

                    </label>

                    <div class="shot-img">

                      <a
                        href="${esc(s.imageUrl||s.thumbUrl||'')}"
                        target="_blank"
                      >

                        <img
                          src="${esc(s.thumbUrl||s.imageUrl||'')}"
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
                        ${esc(s.dateTime||'')}
                      </strong>

                      ${esc(s.application||'')}

                    </div>

                  </div>
                `
              ).join('')
            :`
              <div class="empty">
                No visual screenshot sample available.
              </div>
            `
        }

      </div>

      ${
        shots.length
          ?`
            <div
              class="actions"
              style="margin-top:10px"
            >

              <button
                class="btn"
                id="markAllReviewed"
              >
                Mark all visible screenshots reviewed
              </button>

            </div>
          `
          :''
      }

      <div
        class="panel-title"
        style="margin-top:18px"
      >
        AI findings
      </div>

      ${
        findings.length
          ?findings.map(
              (f,i)=>`
                <div class="context-box">

                  <h4>
                    Finding ${i+1}
                  </h4>

                  <p>
                    ${esc(f.reason)}
                  </p>

                  <label class="check">

                    <input
                      type="checkbox"
                      data-resolve-finding="${i}"
                      ${
                        state.resolvedFindings.includes(i)
                          ?'checked'
                          :''
                      }
                    >

                    Reviewed / resolved by human reviewer

                  </label>

                </div>
              `
            ).join('')
          :`
            <div class="context-box">

              <h4>
                No AI finding recorded
              </h4>

              <p>
                No review-worthy visual pattern
                was returned by the screening draft.
              </p>

            </div>
          `
      }

      ${
        /Approved|Released/.test(state.reportStatus)
          ?`
            <div class="callout">

              <strong>
                Human review approved
              </strong>

              The report can now be released
              with the HUMAN REVIEWED stamp.

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
                  state.reportStatus==='Released'
                    ?'Released · Employer notified'
                    :'Release to Employer'
                }
              </button>

            </div>
          `
          :''
      }

    </div>
  `;
}

function reportStyles(){
  return `
    <style>

      @page{
        size:A4 portrait;
        margin:0;
      }

      .fs-wrap{
        max-width:210mm;
        margin:0 auto;
      }

      .fs-actions{
        display:flex;
        justify-content:space-between;
        gap:10px;
        margin-bottom:16px;
      }

      .fs-page{
        width:210mm;
        height:297mm;
        background:#fff;
        box-sizing:border-box;
        padding:12mm 12mm 9mm;
        margin:0 auto 24px;
        box-shadow:0 8px 30px rgba(0,0,0,.10);
        color:#192c4e;
        font-family:Aptos,Arial,sans-serif;
        overflow:hidden;
      }

      .fs-top{
        display:flex;
        justify-content:space-between;
      }

      .fs-logo{
        width:29mm;
        height:auto;
      }

      .fs-sample{
        background:#f7efd9;
        color:#8a6818;
        border-radius:7px;
        padding:7px 12px;
        font-size:8px;
        font-weight:800;
      }

      .fs-title{
        font-size:27px;
        line-height:1.05;
        margin:13mm 0 3mm;
        font-weight:800;
        color:#1a2d4f;
      }

      .fs-meta{
        display:flex;
        gap:24px;
        font-size:9px;
        color:#8a919c;
        margin-bottom:7mm;
      }

      .fs-meta strong{
        color:#1b2d4d;
      }

      .fs-hero{
        background:#1d3154;
        border-radius:16px;
        padding:8mm 10mm;
        display:flex;
        align-items:center;
        gap:9mm;
        color:#fff;
      }

      .fs-stamp{
        width:31mm;
        height:31mm;
        border:2.4px solid #d7ad2d;
        border-radius:50%;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
        color:#d7ad2d;
        flex:0 0 auto;
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
        margin-bottom:2mm;
      }

      .fs-stamp b{
        font-size:8px;
        letter-spacing:.13em;
        line-height:1.45;
      }

      .fs-stamp small{
        font-size:4.5px;
        color:#aab4c4;
        margin-top:2mm;
      }

      .fs-hero .eyebrow{
        font-size:8px;
        color:#e0b62f;
        font-weight:800;
        letter-spacing:.08em;
      }

      .fs-hero h2{
        font-size:21px;
        line-height:1.08;
        margin:3mm 0 2mm;
        color:#fff;
      }

      .fs-hero p{
        font-size:9px;
        color:#aeb9ca;
        margin:0;
      }

      .fs-pending{
        font-size:7px;
        color:#e0b62f;
        margin-top:2mm;
      }

      .fs-kpis{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:4mm;
        margin:6mm 0 7mm;
      }

      .fs-kpi{
        border-radius:11px;
        padding:6mm 5mm;
        background:#e9eff6;
      }

      .fs-kpi.gold{
        background:#f8f0da;
      }

      .fs-kpi strong{
        display:block;
        font-size:23px;
        color:#1a2d4f;
      }

      .fs-kpi.gold strong{
        color:#9a771a;
      }

      .fs-kpi b{
        display:block;
        font-size:8px;
        margin-top:2mm;
      }

      .fs-kpi span{
        display:block;
        font-size:7px;
        color:#7a8390;
        margin-top:1mm;
      }

      .fs-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2.5mm;
      }

      .fs-head h3{
        font-size:15px;
        margin:0;
      }

      .fs-head span{
        font-size:7px;
        font-weight:800;
        color:#9a771a;
      }

      .fs-checks{
        border:1px solid #dce2e9;
        border-radius:10px;
        padding:0 5mm;
      }

      .fs-check{
        display:grid;
        grid-template-columns:8mm 1fr auto;
        gap:3mm;
        align-items:center;
        padding:4mm 0;
        border-bottom:1px solid #e3e7ec;
      }

      .fs-check:last-child{
        border-bottom:0;
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
        font-weight:900;
      }

      .fs-check.review .fs-icon{
        background:#fff0e6;
        color:#a84b19;
      }

      .fs-check.na .fs-icon{
        background:#eef1f4;
        color:#76808f;
      }

      .fs-copy b{
        display:block;
        font-size:8.5px;
      }

      .fs-copy p{
        font-size:7.2px;
        color:#737c8a;
        margin:1mm 0 0;
      }

      .fs-pill{
        border-radius:99px;
        padding:2mm 4mm;
        background:#f8f0da;
        color:#8e6a18;
        font-size:6.3px;
        font-weight:800;
      }

      .fs-pill.review{
        background:#fff0e6;
        color:#a84b19;
      }

      .fs-pill.na{
        background:#eef1f4;
        color:#697483;
      }

      .fs-bottom{
        display:grid;
        grid-template-columns:1.25fr .95fr;
        gap:5mm;
        margin-top:6mm;
      }

      .fs-card{
        border:1px solid #dce2e9;
        border-radius:10px;
        padding:5mm;
        min-height:69mm;
      }

      .fs-cardhead{
        display:flex;
        justify-content:space-between;
        margin-bottom:4mm;
      }

      .fs-cardhead b{
        font-size:10px;
      }

      .fs-cardhead span{
        font-size:6.5px;
        color:#6f7987;
        font-weight:700;
      }

      .fs-weekdays,
      .fs-cal{
        display:grid;
        grid-template-columns:repeat(7,1fr);
        gap:2mm;
        text-align:center;
      }

      .fs-weekdays div{
        font-size:6px;
        color:#8d949f;
      }

      .fs-day{
        width:8.2mm;
        height:8.2mm;
        margin:0 auto;
        border-radius:4px;
        background:#f0f2f5;
        color:#c0c4ca;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:7px;
      }

      .fs-day.has{
        background:#1d3154;
        color:#fff;
      }

      .fs-day.blank{
        visibility:hidden;
      }

      .fs-legend{
        display:flex;
        gap:5mm;
        font-size:6.5px;
        color:#7b8490;
        margin-top:4mm;
      }

      .fs-legend i{
        display:inline-block;
        width:3mm;
        height:3mm;
        border-radius:1px;
        margin-right:1.5mm;
      }

      .fs-legend .yes{
        background:#1d3154;
      }

      .fs-legend .no{
        background:#e3e6ea;
      }

      .fs-note{
        font-size:6.3px;
        color:#9aa0aa;
        margin-top:3mm;
      }

      .fs-cover-title{
        font-size:8px;
        font-weight:800;
      }

      .fs-big{
        font-size:25px;
        font-weight:800;
        margin-top:5mm;
      }

      .fs-biglabel{
        font-size:8px;
        font-weight:700;
      }

      .fs-muted{
        font-size:7px;
        color:#818a98;
        margin-top:1.5mm;
      }

      .fs-divider{
        height:1px;
        background:#e1e5ea;
        margin:5mm 0;
      }

      .fs-row{
        display:flex;
        justify-content:space-between;
        font-size:7.5px;
      }

      .fs-sign{
        border-top:1px solid #dce2e9;
        margin-top:6mm;
        padding-top:4mm;
        display:grid;
        grid-template-columns:7mm 1fr;
        gap:3mm;
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
        font-weight:900;
      }

      .fs-sign b{
        font-size:8px;
      }

      .fs-sign p{
        font-size:6.8px;
        color:#737c8a;
        margin:1mm 0 0;
      }

      .fs-foot{
        font-size:5.5px;
        color:#a0a6af;
        margin-top:1.5mm;
      }

      @media print{

        body{
          background:#fff!important;
        }

        .sidebar,
        .topbar,
        .fs-actions{
          display:none!important;
        }

        .main,
        .content{
          margin:0!important;
          padding:0!important;
          width:100%!important;
        }

        .fs-page{
          box-shadow:none!important;
          margin:0!important;
          width:210mm!important;
          height:297mm!important;
          -webkit-print-color-adjust:exact;
          print-color-adjust:exact;
        }

      }

    </style>
  `;
}

function monthDays(p){
  const s=new Date(`${p.from}T00:00:00Z`);
  const y=s.getUTCFullYear();
  const m=s.getUTCMonth();

  const n=
    new Date(
      Date.UTC(y,m+1,0)
    ).getUTCDate();

  return Array.from(
    {length:n},
    (_,i)=>{
      const d=
        new Date(
          Date.UTC(y,m,i+1)
        );

      return {
        day:i+1,
        iso:d.toISOString().slice(0,10),
        weekday:d.getUTCDay()
      };
    }
  );
}

function calendar(p,dates){
  const ds=monthDays(p);

  const set=
    new Set(
      (dates||[]).map(String)
    );

  const offset=
    ((ds[0]?.weekday??1)+6)%7;

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
          {length:offset},
          ()=>`
            <div class="fs-day blank">
              0
            </div>
          `
        ).join('')
      }

      ${
        ds.map(
          d=>`
            <div
              class="fs-day ${set.has(d.iso)?'has':''}"
            >
              ${d.day}
            </div>
          `
        ).join('')
      }

    </div>
  `;
}

function mappedChecks(report){
  const m=
    new Map(
      (report?.checks||[])
        .map(c=>[c.key,c])
    );

  return [
    [
      'repeated_frozen',
      'Repeated or frozen screens'
    ],
    [
      'repetitive_cycling',
      'Repetitive screen cycling'
    ],
    [
      'activity_simulation',
      'Visible activity-simulation tools'
    ],
    [
      'repeated_across_days',
      'Repeated sequences across days'
    ]
  ].map(
    ([key,title])=>({
      key,
      title,
      ...(
        m.get(key)||
        {
          status:'not_assessed',
          detail:'This check was not assessed.'
        }
      )
    })
  );
}

function checkView(c){
  return c.status==='review'
    ?{
      cls:'review',
      icon:'!',
      pill:'REVIEW'
    }
    :c.status==='not_assessed'
      ?{
        cls:'na',
        icon:'–',
        pill:'NOT ASSESSED'
      }
      :{
        cls:'',
        icon:'✓',
        pill:'CHECKED'
      };
}

function reportMarkup({
  e,
  report,
  a,
  meta,
  p,
  status,
  reviewer,
  checked,
  unresolvedCount,
  version=null,
  released=false
}){
  const human=
    /Approved|Released/.test(status);

  const screened=
    Number(
      meta?.visionScreenshotsSent??0
    );

  const dates=
    a?.screenshotDates||[];

  const days=
    monthDays(p).length;

  const noDates=
    Math.max(
      0,
      days-dates.length
    );

  const checks=
    mappedChecks(report);

  const done=
    checks.filter(
      c=>c.status!=='not_assessed'
    ).length;

  const needs=
    report?.overallResult==='review'||
    unresolvedCount>0;

  const recorded=
    a?.metrics?.trackedHours;

  const expected=
    Number(
      a?.metrics?.expectedHours||0
    );

  const badge=
    state.mode!=='LIVE'&&!released
      ?`
        <div class="fs-sample">
          DESIGN MOCK-UP / SAMPLE DATA
        </div>
      `
      :'';

  return `
    ${reportStyles()}

    <div class="fs-wrap">

      <div class="fs-actions">

        <button
          class="btn"
          data-page="${released?'reports':'review'}"
        >
          Back
        </button>

        <div>

          <span
            class="status ${statusCls(status)}"
          >

            <span class="dot"></span>

            ${esc(status)}

            ${
              version
                ?` · v${version}`
                :''
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
            src="${WGM_LOGO}"
            alt="White Glove Monitor"
          >

          ${badge}

        </div>

        <div class="fs-title">
          Fraud screening &amp; activity review
        </div>

        <div class="fs-meta">

          <strong>${esc(e.name)}</strong>

          <span>
            ${esc(month(p.from))}
          </span>

          <span>
            Screenshot-based review
          </span>

          <span>
            ${esc(timezone(e))}
          </span>

        </div>

        <div class="fs-hero">

          <div class="fs-stamp">

            <div class="tick">
              ✓
            </div>

            <b>
              ${
                human
                  ?'HUMAN'
                  :'REVIEW'
              }
              <br>
              ${
                human
                  ?'REVIEWED'
                  :'PENDING'
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
              ${
                esc(
                  report?.screeningHeadline||
                  (
                    needs
                      ?'Patterns require human review.'
                      :'No suspicious patterns found.'
                  )
                )
              }
            </h2>

            <p>
              ${
                esc(
                  report?.screeningSubtext||
                  'In the screenshots reviewed for this report.'
                )
              }
            </p>

            ${
              human
                ?''
                :`
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
              AI screening of supplied images
            </span>

          </div>

          <div class="fs-kpi">

            <strong>
              ${Number(checked||0).toLocaleString()}
            </strong>

            <b>
              Human-checked screenshots
            </b>

            <span>
              A sample across capture dates
            </span>

          </div>

          <div class="fs-kpi">

            <strong>
              ${Number(unresolvedCount||0)}
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
            ${done}
            CHECK${done===1?'':'S'}
            COMPLETED
          </span>

        </div>

        <div class="fs-checks">

          ${
            checks.map(
              c=>{
                const v=checkView(c);

                return `
                  <div class="fs-check ${v.cls}">

                    <div class="fs-icon">
                      ${v.icon}
                    </div>

                    <div class="fs-copy">

                      <b>
                        ${esc(c.title)}
                      </b>

                      <p>
                        ${esc(c.detail)}
                      </p>

                    </div>

                    <div class="fs-pill ${v.cls}">
                      ${v.pill}
                    </div>

                  </div>
                `;
              }
            ).join('')
          }

        </div>

        <div class="fs-bottom">

          <div class="fs-card">

            <div class="fs-cardhead">

              <b>
                Screenshot dates
              </b>

              <span>
                ${esc(month(p.from).toUpperCase())}
              </span>

            </div>

            ${calendar(p,dates)}

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
              ${dates.length}
            </div>

            <div class="fs-biglabel">
              dates with screenshots
            </div>

            <div class="fs-muted">
              ${noDates}
              dates without supplied screenshots
            </div>

            <div class="fs-divider"></div>

            <div class="fs-row">

              <span>
                Recorded hours
              </span>

              <b>
                ${
                  Number.isFinite(Number(recorded))
                    ?hrs(recorded)
                    :'Not supplied'
                }
              </b>

            </div>

            <div
              class="fs-muted"
              style="margin-top:4mm"
            >
              Shown from Scrin.io tracked time when supplied.
              Screenshot spacing is not used to calculate hours.
            </div>

            <div
              class="fs-muted"
              style="margin-top:4mm"
            >
              ${
                expected
                  ?`Schedule context: ${hrs(expected)} expected for the selected period.`
                  :'No schedule or attendance target applied.'
              }
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
                human
                  ?`Human review signed off | ${esc(reviewer||'White Glove Reviewer')}`
                  :'Human review pending'
              }
            </b>

            <p>
              ${
                human
                  ?`${Number(checked||0)} sample screenshot${Number(checked||0)===1?'':'s'} checked; all flagged sequences reviewed.`
                  :'This draft cannot be released with the HUMAN REVIEWED stamp until reviewer sign-off.'
              }
            </p>

            <div class="fs-foot">
              ${
                esc(
                  report?.scopeNote||
                  'Review scope: Supplied screenshots only. Hidden automation and physical mouse movers may not be visible.'
                )
              }
            </div>

          </div>

        </div>

      </section>

    </div>
  `;
}

function reportPreview(){
  const e=
    empById(state.reportEmployeeId)||
    currentEmployee();

  return shell(
    e&&state.report
      ?reportMarkup({
          e,
          report:state.report,
          a:state.analytics,
          meta:state.meta,
          p:state.period,
          status:state.reportStatus,
          reviewer:state.reviewerName,
          checked:humanChecked(),
          unresolvedCount:unresolved()
        })
      :`
        <div class="card empty">
          No current report.
        </div>
      `,
    'Fraud Screening Report'
  );
}

function releasedView(){
  const r=
    state.released.find(
      x=>x.id===state.selectedReleaseId
    );

  if(!r){
    return shell(
      `
      <div class="card empty">
        Released report not found.
      </div>
      `,
      'Released Report'
    );
  }

  const e={
    id:r.employeeId,
    name:r.employeeName,
    employer:r.employer,
    role:r.role,
    timezone:r.timezone
  };

  return shell(
    reportMarkup({
      e,
      report:r.report,
      a:r.analytics,
      meta:r.meta,
      p:r.period,
      status:'Released',
      reviewer:r.reviewerName,
      checked:r.humanChecked,
      unresolvedCount:r.unresolved,
      version:r.version,
      released:true
    }),
    'Released Report'
  );
}

function viewRelease(id){
  state.selectedReleaseId=id;

  state.notifications.forEach(
    n=>{
      if(n.reportId===id){
        n.read=true;
      }
    }
  );

  saveNotifications();

  state.page='releasedReport';

  render();
}

async function releaseCurrent(){
  const e=
    empById(state.reportEmployeeId)||
    currentEmployee();

  if(
    !e||
    !state.report||
    state.reportStatus!=='Approved'
  ){
    return;
  }

  try{
    const res=await fetch(
      '/api/reports/release',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          employeeId:e.id,
          employer:e.employer,
          period:state.period
        })
      }
    );

    const d=await res.json();

    const id=
      d.releaseId||
      `wgm_${Date.now()}`;

    const version=
      nextVersion(
        e.id,
        state.period
      );

    const snap={
      id,
      employeeId:e.id,
      employeeName:e.name,
      employer:e.employer,
      role:e.role||'Virtual Assistant',
      timezone:timezone(e),
      period:
        JSON.parse(
          JSON.stringify(state.period)
        ),
      version,
      report:
        JSON.parse(
          JSON.stringify(state.report)
        ),
      analytics:
        JSON.parse(
          JSON.stringify(state.analytics)
        ),
      meta:
        JSON.parse(
          JSON.stringify(state.meta||{})
        ),
      reviewerName:
        state.reviewerName,
      humanChecked:
        humanChecked(),
      unresolved:
        unresolved(),
      releasedAt:
        d.releasedAt||
        new Date().toISOString(),
      status:'Released'
    };

    state.released.push(snap);

    saveReleased();

    state.notifications.push({
      id:`notice_${id}`,
      employer:e.employer,
      employeeId:e.id,
      reportId:id,
      title:
        `${month(state.period.from)} Fraud Screening & Activity Review — ${e.name}`,
      message:
        `White Glove has completed human review and released the ${month(state.period.from)} screening report for ${e.name}.`,
      read:false,
      createdAt:snap.releasedAt
    });

    saveNotifications();

    state.reportStatus='Released';

    e.reportingStatus='Released';

    saveEmployees();

    render();

    toast(
      'Report released. Employer notification created.'
    );

  }catch(err){
    toast(
      `Could not release report: ${err.message}`
    );
  }
}

function dataSources(){
  const cs=
    state.connections.length
      ?state.connections
      :[
        {
          id:'wgh-main',
          name:'WGH Main Scrin Account',
          type:'shared',
          status:
            state.mode==='LIVE'
              ?'connected'
              :'configured'
        }
      ];

  return shell(
    `
    <div class="header-row">

      <div>

        <h2>Data Sources</h2>

        <p>
          Scrin is the current capture provider.
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
            cs.map(
              c=>`
                <tr>

                  <td>
                    ${esc(c.name||c.id)}
                  </td>

                  <td>
                    ${
                      c.type==='dedicated'
                        ?'Dedicated Employer'
                        :'WGH Shared'
                    }
                  </td>

                  <td>

                    <span
                      class="status ${statusCls(c.status||'configured')}"
                    >

                      <span class="dot"></span>

                      ${esc(c.status||'configured')}

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
    `,
    'Data Sources'
  );
}

function settings(){
  return shell(
    `
    <div class="header-row">

      <div>

        <h2>Settings</h2>

        <p>
          Map each active Scrin employee
          to the correct employer.
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
          Fixed Fraud Screening & Activity Review template.
        </p>

        <span class="status green">

          <span class="dot"></span>

          wgm-fraud-screening-1.0

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
            <th>Exclude</th>
            <th>Expected hours</th>
          </tr>

        </thead>

        <tbody>

          ${
            state.employees.map(
              e=>`
                <tr>

                  <td>
                    ${esc(e.name)}
                  </td>

                  <td>

                    ${
                      e.employerLocked
                        ?`
                          <input
                            class="map-input"
                            value="${esc(e.employer||e.connectionEmployer||'')}"
                            disabled
                          >
                        `
                        :`
                          <input
                            class="map-input"
                            data-map-employer="${esc(e.id)}"
                            value="${esc(e.employer||'')}"
                          >
                        `
                    }

                  </td>

                  <td>

                    ${
                      e.employerLocked
                        ?'N/A'
                        :`
                          <input
                            type="checkbox"
                            data-map-excluded="${esc(e.id)}"
                            ${e.excluded?'checked':''}
                          >
                        `
                    }

                  </td>

                  <td>

                    <input
                      class="map-input"
                      data-map-hours="${esc(e.id)}"
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

function saveMappings(){
  document
    .querySelectorAll('[data-map-employer]')
    .forEach(
      x=>{
        const e=empById(x.dataset.mapEmployer);

        if(e&&!e.employerLocked){
          e.employer=x.value.trim();
        }
      }
    );

  document
    .querySelectorAll('[data-map-excluded]')
    .forEach(
      x=>{
        const e=empById(x.dataset.mapExcluded);

        if(e&&!e.employerLocked){
          e.excluded=x.checked;
        }
      }
    );

  document
    .querySelectorAll('[data-map-hours]')
    .forEach(
      x=>{
        const e=empById(x.dataset.mapHours);

        if(e){
          e.expectedHours=
            Number(x.value||0);
        }
      }
    );

  state.employees.forEach(
    e=>{
      if(e.employerLocked){
        e.employer=
          e.connectionEmployer||
          e.employer;

        e.excluded=false;
      }
    }
  );

  saveEmployees();

  const bad=
    state.employees.filter(
      e=>
        !e.excluded&&
        !String(e.employer||'').trim()
    );

  if(bad.length){
    toast(
      `${bad.length} active employee(s) need an employer mapping.`
    );

    return;
  }

  ensureEmployer();

  toast('Mappings saved.');
}

function mergeEmployee(x,prior){
  const old=
    prior.find(
      o=>String(o.id)===String(x.id)
    )||{};

  const ded=
    x.employerLocked
      ?(
        x.connectionEmployer||
        x.employer||
        ''
      )
      :null;

  return {
    ...old,
    ...x,
    id:
      x.id||
      `${x.connectionId||'scrin'}::${x.employmentId}`,
    initials:
      ini(x.name),
    employer:
      ded!==null
        ?ded
        :(
          old.employer||
          x.employer||
          ''
        ),
    excluded:
      x.employerLocked
        ?false
        :Boolean(old.excluded),
    expectedHours:
      Number(
        old.expectedHours??
        x.expectedHours??
        160
      ),
    timezone:
      old.timezone||
      x.timezone||
      'Employee timezone',
    timezoneOffsetMinutes:
      Number(
        old.timezoneOffsetMinutes??
        x.timezoneOffsetMinutes??
        0
      ),
    shots:
      old.shots||[],
    daySummary:
      old.daySummary||null,
    lastAnalytics:
      old.lastAnalytics||null,
    reportingStatus:
      old.reportingStatus||
      x.reportingStatus||
      'Synced'
  };
}

async function syncScrin(){
  state.syncMessage='Syncing…';

  render();

  try{
    const r=await fetch(
      '/api/scrin/all-common',
      {
        method:'POST'
      }
    );

    const d=await r.json();

    if(!r.ok){
      throw Error(
        d.error||
        'Sync failed'
      );
    }

    const prior=[
      ...state.employees
    ];

    state.connections=
      Array.isArray(d.connections)
        ?d.connections
        :state.connections;

    state.employees=
      (
        Array.isArray(d.employees)
          ?d.employees
          :[]
      ).map(
        x=>mergeEmployee(x,prior)
      );

    if(!state.employees.length){
      throw Error(
        'No employment records returned'
      );
    }

    if(
      !state.employees.some(
        e=>String(e.id)===String(state.selectedEmployeeId)
      )
    ){
      state.selectedEmployeeId=
        active()[0]?.id||
        state.employees[0].id;
    }

    saveEmployees();
    saveConnections();

    state.mode=
      d.demo
        ?'DEMO'
        :'LIVE';

    state.syncMessage=
      `${state.employees.length} employment record(s) loaded from ${state.connections.length} connection(s).`;

  }catch(err){
    state.syncMessage=
      `Sync failed: ${err.message}`;
  }

  render();
}

async function refreshConnections(){
  try{
    const r=await fetch(
      '/api/scrin/connections'
    );

    const d=await r.json();

    if(!r.ok){
      throw Error(
        d.error||
        'Could not load'
      );
    }

    state.connections=
      Array.isArray(d.connections)
        ?d.connections
        :[];

    saveConnections();

    toast(
      `${state.connections.length} connection(s) configured.`
    );

  }catch(err){
    toast(
      `Could not refresh: ${err.message}`
    );
  }
}

async function testScrin(){
  try{
    const r=await fetch(
      '/api/scrin/all-common',
      {
        method:'POST'
      }
    );

    const d=await r.json();

    if(!r.ok){
      throw Error(
        d.error||
        'Not configured'
      );
    }

    state.mode=
      d.demo
        ?'DEMO'
        :'LIVE';

    toast(
      `${d.employees?.length||0} employment record(s) available.`
    );

  }catch(err){
    toast(
      `Connection test failed: ${err.message}`
    );
  }
}

function render(){
  let o='';

  if(state.page==='dashboard'){
    o=dashboard();
  }else if(state.page==='employees'){
    o=employees();
  }else if(state.page==='monitoring'){
    o=monitoring();
  }else if(state.page==='reports'){
    o=reports();
  }else if(state.page==='review'){
    o=review();
  }else if(state.page==='dataSources'){
    o=dataSources();
  }else if(state.page==='settings'){
    o=settings();
  }else if(state.page==='reportPreview'){
    o=reportPreview();
  }else if(state.page==='releasedReport'){
    o=releasedView();
  }

  document
    .getElementById('app')
    .innerHTML=o;

  bind();
}

function bind(){
  document
    .querySelectorAll('[data-page]')
    .forEach(
      x=>
        x.onclick=()=>{
          state.page=x.dataset.page;
          render();
        }
    );

  document
    .querySelectorAll('[data-open-id]')
    .forEach(
      x=>
        x.onclick=()=>{
          const e=empById(x.dataset.openId);

          if(
            state.role==='employer'&&
            e?.employer!==state.portalEmployer
          ){
            toast(
              'Employee is outside this employer portal.'
            );

            return;
          }

          state.selectedEmployeeId=x.dataset.openId;
          state.page='monitoring';
          state.tab='overview';

          render();
        }
    );

  document
    .querySelectorAll('[data-tab]')
    .forEach(
      x=>
        x.onclick=()=>{
          state.tab=x.dataset.tab;
          render();
        }
    );

  document
    .querySelectorAll('[data-view-release]')
    .forEach(
      x=>
        x.onclick=()=>
          viewRelease(
            x.dataset.viewRelease
          )
    );

  document
    .querySelectorAll('[data-check]')
    .forEach(
      x=>
        x.onchange=()=>{
          state.reviewerChecks[
            Number(x.dataset.check)
          ]=x.checked;
        }
    );

  document
    .querySelectorAll('[data-review-shot]')
    .forEach(
      x=>
        x.onchange=()=>{
          const id=x.dataset.reviewShot;

          if(
            x.checked&&
            !state.reviewedShotIds.includes(id)
          ){
            state.reviewedShotIds.push(id);
          }

          if(!x.checked){
            state.reviewedShotIds=
              state.reviewedShotIds.filter(
                v=>v!==id
              );
          }

          render();
        }
    );

  document
    .querySelectorAll('[data-resolve-finding]')
    .forEach(
      x=>
        x.onchange=()=>{
          const i=
            Number(x.dataset.resolveFinding);

          if(
            x.checked&&
            !state.resolvedFindings.includes(i)
          ){
            state.resolvedFindings.push(i);
          }

          if(!x.checked){
            state.resolvedFindings=
              state.resolvedFindings.filter(
                v=>v!==i
              );
          }

          render();
        }
    );

  const role=
    document.getElementById('roleSwitcher');

  if(role){
    role.onchange=()=>
      setRole(role.value);
  }

  const sw=
    document.getElementById('employerSwitcher');

  if(sw){
    sw.onchange=()=>{
      state.portalEmployer=sw.value;

      localStorage.setItem(
        'wgmPortalEmployer',
        state.portalEmployer
      );

      state.selectedEmployeeId=
        portal()[0]?.id||'';

      render();
    };
  }

  const sync=
    document.getElementById('syncScrin');

  if(sync){
    sync.onclick=syncScrin;
  }

  const test=
    document.getElementById('testScrin');

  if(test){
    test.onclick=testScrin;
  }

  const ref=
    document.getElementById('refreshConnections');

  if(ref){
    ref.onclick=refreshConnections;
  }

  const sm=
    document.getElementById('saveMappings');

  if(sm){
    sm.onclick=saveMappings;
  }

  const ld=
    document.getElementById('loadLiveDay');

  if(ld){
    ld.onclick=loadLiveDay;
  }

  const gen=
    document.getElementById('generateBtn');

  if(gen){
    gen.onclick=generateReport;
  }

  const all=
    document.getElementById('markAllReviewed');

  if(all){
    all.onclick=()=>{
      state.reviewedShotIds=
        (
          state.analytics?.selectedScreenshotEvidence||
          []
        ).map(
          s=>s.screenshotId
        );

      render();
    };
  }

  const rn=
    document.getElementById('reviewerName');

  if(rn){
    rn.oninput=()=>{
      state.reviewerName=rn.value;

      localStorage.setItem(
        'wgmReviewerName',
        state.reviewerName
      );
    };
  }

  const p=
    document.getElementById('previewReport');

  if(p){
    p.onclick=()=>{
      state.page='reportPreview';
      render();
    };
  }

  const p2=
    document.getElementById('previewReport2');

  if(p2){
    p2.onclick=()=>{
      state.page='reportPreview';
      render();
    };
  }

  const approve=
    document.getElementById('approveBtn');

  if(approve){
    approve.onclick=()=>{
      const shots=
        state.analytics?.selectedScreenshotEvidence||
        [];

      if(
        !state.reviewerChecks.every(Boolean)
      ){
        toast(
          'Complete the reviewer checklist.'
        );

        return;
      }

      if(
        shots.length&&
        !humanChecked()
      ){
        toast(
          'Check at least one screenshot before approval.'
        );

        return;
      }

      if(unresolved()>0){
        toast(
          'Resolve every AI finding before approval.'
        );

        return;
      }

      if(!state.reviewerName.trim()){
        toast(
          'Enter reviewer name.'
        );

        return;
      }

      state.reportStatus='Approved';

      const e=
        empById(state.reportEmployeeId);

      if(e){
        e.reportingStatus='Approved';
      }

      saveEmployees();

      render();

      toast(
        'Human review approved. HUMAN REVIEWED stamp is now active.'
      );
    };
  }

  const rel=
    document.getElementById('releaseBtn');

  if(rel){
    rel.onclick=releaseCurrent;
  }

  const pr=
    document.getElementById('printReport');

  if(pr){
    pr.onclick=()=>window.print();
  }
}

async function init(){
  try{
    const r=await fetch('/api/health');
    const h=await r.json();

    state.mode=
      h.mode==='live'
        ?'LIVE'
        :'DEMO';

    if(state.mode==='LIVE'){
      state.syncMessage=
        `Live Scrin detected. ${h.connectionCount??'—'} connection(s). ${h.analysisVersion||''}`;
    }

  }catch{}

  try{
    const r=await fetch(
      '/api/scrin/connections'
    );

    const d=await r.json();

    if(
      r.ok&&
      Array.isArray(d.connections)
    ){
      state.connections=d.connections;
      saveConnections();
    }

  }catch{}

  if(state.role==='employer'){
    ensureEmployer();
  }

  render();
}

init();
