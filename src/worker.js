const ANALYSIS_VERSION = 'wgm-reconciled-resilient-screening-2.1.1';
const RULES_VERSION = 'wgm-fraud-review-rules-2.1.1';
const PROMPT_VERSION = 'wgm-full-month-vision-prompt-2.1.1';
const PROFILE_VERSION = 'wgm-employee-profile-2.1.1';
const BATCH_SIZE_DEFAULT = 20;
const BATCH_OVERLAP_DEFAULT = 4;
const BATCH_MAX = 24;
const HUMAN_SAMPLE_MIN = 30;
const HUMAN_SAMPLE_MAX = 66;
const MIN_SCREENING_COVERAGE = 75;
const STAGNATION_SECONDS = 600;

const CHECK_KEYS = [
  'repeated_frozen',
  'repetitive_cycling',
  'activity_simulation',
  'repeated_across_days',
  'prolonged_stagnation_10m',
];

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
          reasons: { type: 'array', maxItems: 5, items: { type: 'string' } },
          signals: {
            type: 'array', maxItems: 5, items: {
              type: 'string',
              enum: ['repeated_frozen','repetitive_cycling','activity_simulation','replay_candidate','prolonged_stagnation_10m'],
            },
          },
        },
        required: ['screenshotId','status','visualKey','reasons','signals'],
        additionalProperties: false,
      },
    },
    checks: {
      type: 'array', minItems: 5, maxItems: 5,
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', enum: CHECK_KEYS },
          status: { type: 'string', enum: ['clear','review','not_assessed'] },
          detail: { type: 'string' },
          screenshotIds: { type: 'array', maxItems: 24, items: { type: 'string' } },
        },
        required: ['key','status','detail','screenshotIds'],
        additionalProperties: false,
      },
    },
  },
  required: ['screenshots','checks'],
  additionalProperties: false,
};

const CROSS_DAY_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['clear','review','not_assessed'] },
    detail: { type: 'string' },
    screenshotIds: { type: 'array', maxItems: 24, items: { type: 'string' } },
  },
  required: ['status','detail','screenshotIds'],
  additionalProperties: false,
};

const BATCH_PROMPT = `You are the White Glove Monitor screenshot-screening engine.
Inspect every supplied screenshot and its verified timestamp metadata. Your job is to identify visual patterns that warrant human review, not to judge productivity, competence, effort, intent, fraud, theft, or misconduct.

Screen for FIVE categories:
1. repeated_frozen — materially unchanged screens repeated across successive captures in a way that warrants human context.
2. repetitive_cycling — mechanical-looking A→B→A→B or similar repeated screen cycling with little meaningful change.
3. activity_simulation — visible mouse-jiggler, auto-clicker, macro, or activity-simulation interfaces being used to create artificial activity.
4. repeated_across_days — replay-like repeated sequences across different dates. Only assess inside a batch when supplied images span multiple dates; a separate full-period pass runs later.
5. prolonged_stagnation_10m — the materially same screen/tab remains visually stagnant for MORE THAN 10 MINUTES based on screenshot timestamps. This is a review flag only. Meetings, calls, webinars, training, reading, research, document review, videos, waiting on systems, or phone work can legitimately produce a stagnant screen. If meeting/call/training context is visibly apparent, still flag a >10-minute stagnant sequence but say that context may explain it.

Rules:
- Repeated use of the same CRM, inbox, dashboard, spreadsheet, browser, document template, listing system, AI tool, or normal business workflow is not suspicious by itself.
- Low activity level alone is not a visual fraud signal.
- Do not infer hidden automation or physical mouse movers that are not visibly supported.
- prolonged_stagnation_10m requires a timestamp span greater than 600 seconds AND materially unchanged visual content, not merely the same application.
- Return one screenshot result for EVERY supplied screenshotId.
- visualKey must be short lower_snake_case: primary application + screen type + broad layout/content class. Ignore timestamps, names, unique IDs, and minor text changes. Use the same key for materially similar screens where possible.
- Keep wording neutral. Human review is mandatory before release.`;

const CROSS_DAY_PROMPT = `You are the White Glove Monitor cross-day replay verification engine. Candidate screenshots were selected because first-pass semantic fingerprints found similar sequences on different dates. Decide whether the actual images support a review-worthy replay-like repeated sequence across days. Recurring use of the same CRM, inbox, dashboard, spreadsheet, browser, template, listing system, or other normal business tool is not suspicious by itself. Similar layouts with changing legitimate content are normal. Do not infer fraud or misconduct. If evidence is insufficient, return not_assessed.`;

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json;charset=UTF-8', 'cache-control':'no-store' } });
const round = (v, d = 1) => { const f = 10 ** d; return Math.round(Number(v || 0) * f) / f; };
const unique = (a = []) => [...new Set(a.filter(Boolean))];
const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v || 0)));
const readJson = async (r) => { try { return await r.json(); } catch { return {}; } };

function addDays(date, n) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); }
function dayCount(from, to) { const a = Date.parse(`${from}T00:00:00Z`), b = Date.parse(`${to}T00:00:00Z`); return Number.isFinite(a)&&Number.isFinite(b)&&b>=a ? Math.floor((b-a)/86400000)+1 : 0; }
function hash32(s) { let h = 0x811c9dc5; for (const c of String(s||'')) { h ^= c.charCodeAt(0); h = Math.imul(h,0x01000193); } return h>>>0; }
function rng32(seed) { let a=seed>>>0; return ()=>{ a+=0x6d2b79f5; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function shuffle(a,rng) { const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; }
function sessionKey(i) { return `wgm_${hash32([i.connectionId,i.employmentId,i.from,i.to,i.timezone,i.timezoneOffsetMinutes||0].join('|')).toString(16).padStart(8,'0')}`; }
function first(obj, keys, fallback=null) { for(const k of keys){const v=obj?.[k]; if(v!==undefined&&v!==null&&v!=='') return v;} return fallback; }
function fields(o){ return o&&typeof o==='object'&&!Array.isArray(o) ? Object.keys(o).sort() : []; }

function parseConnections(env) {
  const out=[];
  if(env.SCRIN_CONNECTIONS_JSON){
    let p; try{p=JSON.parse(env.SCRIN_CONNECTIONS_JSON);}catch{throw new Error('SCRIN_CONNECTIONS_JSON is not valid JSON');}
    if(!Array.isArray(p)) throw new Error('SCRIN_CONNECTIONS_JSON must be a JSON array');
    for(const x of p){ if(!x?.id||!x?.token||x.enabled===false) continue; const type=x.type==='dedicated'?'dedicated':'shared'; out.push({id:String(x.id),name:String(x.name||x.id),type,employer:String(x.employer||''),token:String(x.token),provider:'scrin'}); }
  }
  if(!out.length&&env.SCRIN_TOKEN) out.push({id:'wgh-main',name:'WGH Main Scrin Account',type:'shared',employer:'',token:String(env.SCRIN_TOKEN),provider:'scrin'});
  return out;
}

function publicConnection(c){ return {id:c.id,name:c.name,provider:'scrin',type:c.type,employer:c.employer||'',employerLocked:c.type==='dedicated',status:'configured'}; }

function connection(env,id){
  const all=parseConnections(env);
  if(!all.length) throw new Error('No Scrin connection configured');

  if(id){
    const c=all.find(x=>x.id===String(id));
    if(!c) throw new Error(`Unknown Scrin connection: ${id}`);
    return c;
  }

  if(all.length===1) return all[0];

  throw new Error('connectionId is required');
}

async function scrin(env,id,path,body){
  const c=connection(env,id);
  const base=String(env.SCRIN_API_BASE_URL||'https://scrin.io').replace(/\/$/,'');

  const r=await fetch(base+path,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      'X-SSM-Token':c.token
    },
    body:JSON.stringify(body)
  });

  const t=await r.text();

  if(!r.ok) throw new Error(`Scrin ${r.status} (${c.name}): ${t.slice(0,300)}`);

  try{
    return {
      connection:c,
      data:t?JSON.parse(t):null
    };
  }catch{
    throw new Error(`Scrin returned non-JSON data from ${path}`);
  }
}

function projectList(data, company){
  const arrays=[company?.projects,company?.Projects,data?.projects,data?.Projects];
  const seen=new Set();
  const out=[];

  for(const a of arrays){
    if(!Array.isArray(a)) continue;

    for(const p of a){
      const id=first(p,['id','projectId','projectID']);
      const name=first(p,['name','projectName','title'],'');
      const k=id!=null?`id:${id}`:`name:${String(name).toLowerCase()}`;

      if((id==null&&!name)||seen.has(k)) continue;

      seen.add(k);

      out.push({
        id,
        name:String(name||`Project ${id}`),
        client:String(first(p,['clientName','client','customerName','companyName'],'')||''),
        sourceFields:fields(p)
      });
    }
  }

  return out;
}

function employmentSource(p){
  return {
    registered:first(p,['registered','isRegistered']),
    archived:first(p,['archived','isArchived']),
    active:first(p,['active','isActive']),
    role:first(p,['role','position','title']),
    timezone:first(p,['timezone','timeZone','tz']),
    hourlyRate:Number.isFinite(Number(first(p,['hourlyRate','hourRate','ratePerHour','paymentRate','rate'])))?Number(first(p,['hourlyRate','hourRate','ratePerHour','paymentRate','rate'])):null,
    currency:first(p,['currency','currencyCode']),
    invitedAt:first(p,['invitedAt','inviteDate','createdAt','createdOn']),
    fields:fields(p)
  };
}

function commonNormalize(data,c){
  const companies=Array.isArray(data?.companies)?data.companies:Array.isArray(data)?data:[];
  const employees=[];
  const projects=[];

  for(const co of companies){
    const cps=projectList(data,co);

    projects.push(...cps.map(p=>({
      ...p,
      scrinCompanyId:co.id??null,
      scrinCompany:co.name||''
    })));

    for(const p of Array.isArray(co?.employments)?co.employments:[]){
      const s=employmentSource(p);

      employees.push({
        id:`${c.id}::${p.id}`,
        connectionId:c.id,
        connectionName:c.name,
        connectionType:c.type,
        connectionEmployer:c.employer||'',
        employerLocked:c.type==='dedicated',
        employmentId:p.id,
        name:p.name||p.email||`Employment ${p.id}`,
        email:p.email||null,
        scrinCompanyId:co.id,
        scrinCompany:co.name||'',
        scrinRegistered:s.registered,
        scrinArchived:s.archived,
        scrinActive:s.active,
        scrinRole:s.role,
        scrinTimezone:s.timezone,
        scrinHourlyRate:s.hourlyRate,
        scrinCurrency:s.currency,
        scrinInvitedAt:s.invitedAt,
        sourceEmploymentFields:s.fields,
        sourceCompanyFields:fields(co),
        sourceProjectCount:cps.length,
        source:c.type==='dedicated'?'Standalone WGM':'WGH Managed',
        role:'Virtual Assistant',
        reportingStatus:'Synced',
        employer:c.type==='dedicated'?c.employer:''
      });
    }
  }

  return {companies,employees,projects};
}

function findEmployment(data,id){
  const companies=Array.isArray(data?.companies)?data.companies:Array.isArray(data)?data:[];

  for(const company of companies){
    for(const person of Array.isArray(company?.employments)?company.employments:[]){
      if(String(person?.id)===String(id)) return {company,person};
    }
  }

  return {company:null,person:null};
}

function validTz(tz){
  if(!tz) return false;

  try{
    new Intl.DateTimeFormat('en-US',{timeZone:tz}).format(new Date());
    return true;
  }catch{
    return false;
  }
}

function offsetMs(ms,tz){
  const p=new Intl.DateTimeFormat('en-US',{
    timeZone:tz,
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hourCycle:'h23'
  }).formatToParts(new Date(ms));

  const m={};

  for(const x of p){
    if(x.type!=='literal') m[x.type]=Number(x.value);
  }

  return Date.UTC(m.year,m.month-1,m.day,m.hour,m.minute,m.second)-ms;
}

function zonedUtc(date,tz){
  const [y,m,d]=date.split('-').map(Number);
  const guess=Date.UTC(y,m-1,d);

  let off=offsetMs(guess,tz);
  let utc=guess-off;

  const off2=offsetMs(utc,tz);

  if(off2!==off) utc=guess-off2;

  return utc;
}

function epochRange(from,to,tz='',offsetMinutes=0){
  let a,b;

  if(validTz(tz)){
    a=zonedUtc(from,tz);
    b=zonedUtc(addDays(to,1),tz)-1000;
  } else {
    a=Date.parse(`${from}T00:00:00Z`)-Number(offsetMinutes||0)*60000;
    b=Date.parse(`${to}T23:59:59Z`)-Number(offsetMinutes||0)*60000;
  }

  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a){
    throw new Error('Invalid date range');
  }

  return {
    from:Math.floor(a/1000),
    to:Math.floor(b/1000)
  };
}

function localDate(sec,tz='',off=0){
  const ms=Number(sec)*1000;

  if(validTz(tz)){
    const p=new Intl.DateTimeFormat('en-CA',{
      timeZone:tz,
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).formatToParts(new Date(ms));

    const m={};

    for(const x of p){
      if(x.type!=='literal') m[x.type]=x.value;
    }

    return `${m.year}-${m.month}-${m.day}`;
  }

  return new Date(ms+Number(off||0)*60000).toISOString().slice(0,10);
}

function localTime(sec,tz='',off=0){
  if(sec==null) return '—';

  const ms=Number(sec)*1000;

  if(validTz(tz)){
    return new Intl.DateTimeFormat('en-US',{
      timeZone:tz,
      hour:'numeric',
      minute:'2-digit',
      hour12:true
    }).format(new Date(ms));
  }

  const d=new Date(ms+Number(off||0)*60000);

  let h=d.getUTCHours();

  const m=String(d.getUTCMinutes()).padStart(2,'0');
  const s=h>=12?'PM':'AM';

  h%=12;

  if(!h) h=12;

  return `${h}:${m} ${s}`;
}

function duration(a){
  const f=Number(a?.from);
  const t=Number(a?.to);

  return Number.isFinite(f)&&Number.isFinite(t)&&t>f?t-f:0;
}

function clipActivities(raw,range){
  const used=[];

  let outside=0;
  let clipped=0;
  let invalid=0;

  for(const a of raw){
    const f=Number(a?.from);
    const t=Number(a?.to);

    if(!Number.isFinite(f)||!Number.isFinite(t)||t<=f){
      invalid++;
      continue;
    }

    const from=Math.max(f,range.from);
    const to=Math.min(t,range.to);

    if(to<=from){
      outside++;
      continue;
    }

    if(from!==f||to!==t) clipped++;

    used.push({
      ...a,
      from,
      to,
      _originalFrom:f,
      _originalTo:t
    });
  }

  return {used,outside,clipped,invalid};
}

function unionSeconds(a=[]){
  const x=a
    .map(v=>[Number(v.from),Number(v.to)])
    .filter(([f,t])=>Number.isFinite(f)&&Number.isFinite(t)&&t>f)
    .sort((a,b)=>a[0]-b[0]);

  if(!x.length) return 0;

  let total=0;
  let [s,e]=x[0];

  for(let i=1;i<x.length;i++){
    const [ns,ne]=x[i];

    if(ns<=e){
      e=Math.max(e,ne);
    } else {
      total+=e-s;
      s=ns;
      e=ne;
    }
  }

  return total+e-s;
}

function requireReportingTimezone(tz){
  const v=String(tz||'').trim();

  if(!validTz(v)){
    throw new Error(
      'Set a valid IANA reporting timezone for this VA before loading monitored data or running AI screening (for example America/Los_Angeles, America/New_York, America/Chicago, Europe/London, or Africa/Lagos).'
    );
  }

  return v;
}

function workPolicy(i={}){
  const allowed=new Set([
    'fixed_schedule',
    'flexible_daily',
    'weekly_target',
    'monthly_target',
    'on_demand'
  ]);

  const legacy=Number(i.adjustedExpectedHours??i.expectedHours??0);
  const req=String(i.workPolicyType||'');

  return {
    type:allowed.has(req)?req:(legacy>0?'flexible_daily':'on_demand'),
    expectedDailyHours:Number(i.expectedDailyHours||0),
    expectedWeeklyHours:Number(i.expectedWeeklyHours||0),
    expectedMonthlyHours:Number(i.expectedMonthlyHours||0),
    expectedPeriodHours:legacy,
    scheduledDays:Array.isArray(i.scheduledDays)?i.scheduledDays.map(String):[],
    startTime:String(i.startTime||''),
    endTime:String(i.endTime||''),
    graceMinutes:Math.max(0,Number(i.graceMinutes||0)),
    offlineWorkAllowed:i.offlineWorkAllowed!==false
  };
}

function activitySummary(a,expected=0,tz='',off=0,policy=null){
  const all=unionSeconds(a);

  const online=unionSeconds(
    a.filter(x=>!(x?.offline===true||x?.offline===1))
  );

  const offline=unionSeconds(
    a.filter(x=>x?.offline===true||x?.offline===1)
  );

  const days=new Set();

  for(const x of a){
    if(duration(x)>0) days.add(localDate(x.from,tz,off));
  }

  const target=Number(expected||policy?.expectedPeriodHours||0);

  return {
    trackedSeconds:all,
    trackedHours:all/3600,
    onlineTrackedSeconds:online,
    onlineTrackedHours:online/3600,
    offlineSeconds:offline,
    offlineHours:offline/3600,
    activeDays:days.size,
    expectedHours:target,
    scheduleCoveragePercent:target>0
      ?round(Math.min(100,(all/3600/target)*100),1)
      :null,
    workPolicy:policy
  };
}

async function screenshotsDetailed(env,id,activityIds){
  const raw=[];
  const ids=unique(activityIds);

  for(let i=0;i<ids.length;i+=100){
    const r=await scrin(
      env,
      id,
      '/api/v2/GetScreenshots',
      ids.slice(i,i+100)
    );

    if(Array.isArray(r.data)){
      raw.push(...r.data);
    }
  }

  const map=new Map();

  for(const s of raw){
    const k=String(
      s?.id||
      `${s?.activityId||'activity'}:${s?.taken||0}:${s?.url||s?.thumbUrl||''}`
    );

    if(!map.has(k)){
      map.set(k,s);
    }
  }

  const screenshots=[...map.values()]
    .sort((a,b)=>Number(a?.taken||0)-Number(b?.taken||0));

  return {
    raw,
    screenshots,
    rawCount:raw.length,
    dedupedCount:screenshots.length,
    duplicateCount:raw.length-screenshots.length
  };
}

function inRangeScreenshots(a,range){
  const out=[];

  let outside=0;
  let invalid=0;

  for(const s of a){
    const t=Number(s?.taken);

    if(!Number.isFinite(t)){
      invalid++;
      continue;
    }

    if(t<range.from||t>range.to){
      outside++;
      continue;
    }

    out.push(s);
  }

  return {out,outside,invalid};
}

async function evidence(env,i){
  const tz=requireReportingTimezone(i.timezone);
  const off=Number(i.timezoneOffsetMinutes||0);

  const range=epochRange(
    i.from,
    i.to,
    tz,
    off
  );

  const ar=await scrin(
    env,
    i.connectionId,
    '/api/v2/GetActivities',
    [{
      employmentId:String(i.employmentId),
      from:range.from,
      to:range.to
    }]
  );

  const raw=Array.isArray(ar.data)
    ?ar.data
    :[];

  const ac=clipActivities(
    raw,
    range
  );

  /*
    IMPORTANT:
    We fetch screenshot records for all raw activity IDs returned by Scrin,
    then independently validate screenshot.taken against the exact reporting
    window. This prevents screenshots attached to a boundary-crossing
    activity from leaking into the selected day/month.
  */
  const sr=await screenshotsDetailed(
    env,
    i.connectionId,
    raw.map(x=>x.id)
  );

  const sf=inRangeScreenshots(
    sr.screenshots,
    range
  );

  return {
    connection:ar.connection,
    range,
    tz,
    off,
    rawActivities:raw,
    activities:ac.used,
    screenshots:sf.out,

    reconciliation:{
      rawActivitiesReturned:raw.length,
      activitiesUsed:ac.used.length,
      activitiesExcludedOutsideRange:ac.outside,
      activitiesClippedAtBoundary:ac.clipped,
      invalidActivityRecords:ac.invalid,

      rawScreenshotRecordsReturned:sr.rawCount,
      dedupedScreenshotRecords:sr.dedupedCount,
      duplicateScreenshotRecordsRemoved:sr.duplicateCount,

      screenshotsExcludedOutsideRange:sf.outside,
      screenshotsExcludedInvalidTimestamp:sf.invalid,

      finalScreenshotCount:sf.out.length,

      reportingTimezone:validTz(tz)?tz:null,
      fallbackOffsetMinutes:off,
      reportingRangeFromEpoch:range.from,
      reportingRangeToEpoch:range.to
    }
  };
}

function manifest(shots,tz='',off=0){
  return shots
    .filter(s=>Number.isFinite(Number(s?.taken)))
    .sort((a,b)=>Number(a.taken)-Number(b.taken))
    .map((s,index)=>{
      const apps=Array.isArray(s?.applications)?s.applications:[];
      const fg=apps.find(a=>a?.fromScreen)||apps[0];

      return {
        index,
        screenshotId:String(s.id||`${s.activityId||'activity'}:${s.taken}`),
        activityId:s.activityId?String(s.activityId):'',
        taken:Number(s.taken),
        date:localDate(s.taken,tz,off),
        time:localTime(s.taken,tz,off),
        dateTime:`${localDate(s.taken,tz,off)} ${localTime(s.taken,tz,off)}`,
        application:fg?.applicationName||'Screenshot',
        activityLevel:Number.isFinite(Number(s.activityLevel))
          ?Number(s.activityLevel)
          :null,
        imageUrl:s.url||null,
        thumbUrl:s.thumbUrl||null
      };
    });
}

function dateCounts(m){
  const o={};

  for(const x of m){
    o[x.date]=(o[x.date]||0)+1;
  }

  return o;
}

function humanSample(m,key){
  if(!m.length){
    return {
      target:0,
      count:0,
      screenshots:[]
    };
  }

  const rng=rng32(
    hash32(`${key}|human`)
  );

  const targetWanted=
    HUMAN_SAMPLE_MIN+
    Math.floor(
      rng()*
      (HUMAN_SAMPLE_MAX-HUMAN_SAMPLE_MIN+1)
    );

  const target=Math.min(
    m.length,
    targetWanted
  );

  const by=new Map();

  for(const x of m){
    if(!by.has(x.date)){
      by.set(x.date,[]);
    }

    by.get(x.date).push(x);
  }

  const pools=shuffle(
    [...by.keys()].sort(),
    rng
  ).map(d=>({
    a:shuffle(by.get(d),rng),
    i:0
  }));

  const sel=[];
  const seen=new Set();

  let progress=true;

  while(sel.length<target&&progress){
    progress=false;

    for(const p of pools){
      while(p.i<p.a.length){
        const x=p.a[p.i++];

        if(!seen.has(x.screenshotId)){
          seen.add(x.screenshotId);
          sel.push(x);
          progress=true;
          break;
        }
      }

      if(sel.length>=target){
        break;
      }
    }
  }

  return {
    target:targetWanted,
    count:sel.length,
    screenshots:sel.sort((a,b)=>a.taken-b.taken)
  };
}

function appStats(shots){
  const t={};

  for(const s of shots){
    for(const a of Array.isArray(s?.applications)?s.applications:[]){
      const n=String(a?.applicationName||'Unknown').trim()||'Unknown';
      const d=Number(a?.duration||0);

      t[n]=(t[n]||0)+(Number.isFinite(d)?d:0);
    }
  }

  const total=Object.values(t).reduce((a,b)=>a+b,0)||1;

  return Object.entries(t)
    .sort((a,b)=>b[1]-a[1])
    .map(([name,seconds])=>({
      name,
      seconds,
      hours:round(seconds/3600,2),
      sharePercent:round(seconds/total*100,1)
    }));
}

function urlStats(shots){
  const t={};

  for(const s of shots){
    for(const a of Array.isArray(s?.applications)?s.applications:[]){
      let v=first(
        a,
        ['url','webUrl','website','domain','host','hostname'],
        ''
      );

      if(!v) continue;

      try{
        v=new URL(
          /^[a-z][\w+.-]*:\/\//i.test(v)
            ?v
            :`https://${v}`
        ).hostname||v;
      }catch{}

      const d=Number(a?.duration||0);

      t[v]=(t[v]||0)+(Number.isFinite(d)?d:0);
    }
  }

  const total=Object.values(t).reduce((a,b)=>a+b,0)||1;

  return Object.entries(t)
    .sort((a,b)=>b[1]-a[1])
    .map(([domain,seconds])=>({
      domain,
      seconds,
      hours:round(seconds/3600,2),
      sharePercent:round(seconds/total*100,1)
    }));
}

function avgActivity(shots){
  let t=0;
  let n=0;

  for(const s of shots){
    const v=Number(s?.activityLevel);

    if(Number.isFinite(v)){
      t+=v;
      n++;
    }
  }

  return n?round(t/n,1):null;
}

function notes(a,limit=20){
  return unique(
    a.map(x=>String(x?.note||'').trim())
      .filter(Boolean)
  ).slice(0,limit);
}

function firstLast(a,tz='',off=0){
  const x=a
    .filter(v=>duration(v)>0)
    .sort((a,b)=>Number(a.from)-Number(b.from));

  if(!x.length){
    return {
      firstTracked:null,
      lastTracked:null
    };
  }

  const f=Number(x[0].from);
  const l=Math.max(...x.map(v=>Number(v.to)));

  return {
    firstTracked:{
      epoch:f,
      date:localDate(f,tz,off),
      time:localTime(f,tz,off)
    },

    lastTracked:{
      epoch:l,
      date:localDate(l,tz,off),
      time:localTime(l,tz,off)
    }
  };
}

function projectUsage(a,projects){
  const map=new Map(
    projects
      .filter(p=>p.id!=null)
      .map(p=>[String(p.id),p])
  );

  const tot=new Map();

  for(const x of a){
    const k=
      x?.projectId==null||
      x?.projectId===''
        ?'unassigned'
        :String(x.projectId);

    tot.set(
      k,
      (tot.get(k)||0)+duration(x)
    );
  }

  const total=[...tot.values()]
    .reduce((a,b)=>a+b,0)||1;

  return [...tot.entries()]
    .sort((a,b)=>b[1]-a[1])
    .map(([k,seconds])=>({
      projectId:k==='unassigned'?null:k,
      name:k==='unassigned'
        ?'Unassigned'
        :map.get(k)?.name||`Project ${k}`,
      client:map.get(k)?.client||'',
      seconds,
      hours:round(seconds/3600,2),
      sharePercent:round(seconds/total*100,1)
    }));
}

async function prepare(env,i){
  const e=await evidence(env,i);
  const pol=workPolicy(i);

  const m=manifest(
    e.screenshots,
    e.tz,
    e.off
  );

  const metrics=activitySummary(
    e.activities,
    Number(i.adjustedExpectedHours??i.expectedHours??0),
    e.tz,
    e.off,
    pol
  );

  const key=sessionKey(i);

  const eligible=m.filter(
    x=>x.imageUrl||x.thumbUrl
  );

  const sample=humanSample(
    eligible,
    key
  );

  const batchSize=clamp(
    Number(i.batchSize||BATCH_SIZE_DEFAULT),
    8,
    BATCH_MAX
  );

  /*
    Minimum overlap of 4 gives the AI enough chronological context
    to detect patterns that cross batch boundaries, including
    >10-minute stagnant sequences at typical Scrin capture frequency.
  */
  const overlap=clamp(
    Math.max(
      BATCH_OVERLAP_DEFAULT,
      Number(i.overlapSize??BATCH_OVERLAP_DEFAULT)
    ),
    0,
    Math.min(6,batchSize-1)
  );

  const newPerBatch=Math.max(
    1,
    batchSize-overlap
  );

  return {
    sessionKey:key,

    connection:publicConnection(
      e.connection
    ),

    period:{
      from:i.from,
      to:i.to,
      dayCount:dayCount(i.from,i.to)
    },

    timezone:{
      iana:validTz(e.tz)?e.tz:null,
      fallbackOffsetMinutes:e.off,
      label:validTz(e.tz)
        ?e.tz
        :`UTC${e.off>=0?'+':''}${round(e.off/60,2)}`,
      configurationRecommended:!validTz(e.tz)
    },

    workPolicy:pol,
    metrics,
    reconciliation:e.reconciliation,

    screenshotCount:m.length,
    screenshotDates:unique(m.map(x=>x.date)).sort(),
    screenshotDateCounts:dateCounts(m),

    manifest:m,
    humanSample:sample,

    scanPlan:{
      batchSize,
      overlapSize:overlap,
      newPerBatch,
      totalBatches:m.length
        ?Math.ceil(m.length/newPerBatch)
        :0,
      internalBatching:true
    },

    apps:appStats(e.screenshots).slice(0,15),

    review:{
      status:metrics.trackedHours>0&&m.length
        ?'Green'
        :'Yellow',

      reasons:
        metrics.trackedHours<=0
          ?['No tracked time returned.']
          :m.length
            ?[]
            :['Tracked time exists but no screenshots returned.'],

      note:'Evidence package prepared for full screenshot screening.'
    },

    versions:{
      analysisVersion:ANALYSIS_VERSION,
      rulesVersion:RULES_VERSION,
      promptVersion:PROMPT_VERSION,
      profileVersion:PROFILE_VERSION
    }
  };
}

async function employeeProfile(env,i){
  const common=await scrin(
    env,
    i.connectionId,
    '/api/v2/GetCommonData',
    {}
  );

  const match=findEmployment(
    common.data,
    i.employmentId
  );

  if(!match.person){
    throw new Error(
      `Employment ${i.employmentId} was not found in Scrin common data`
    );
  }

  const e=await evidence(env,i);
  const pol=workPolicy(i);

  const metrics=activitySummary(
    e.activities,
    Number(i.expectedHours||0),
    e.tz,
    e.off,
    pol
  );

  const fl=firstLast(
    e.activities,
    e.tz,
    e.off
  );

  const src=employmentSource(
    match.person
  );

  const projects=projectList(
    common.data,
    match.company
  );

  const apps=appStats(
    e.screenshots
  );

  const urls=urlStats(
    e.screenshots
  );

  const dates=unique(
    e.screenshots.map(
      s=>localDate(s.taken,e.tz,e.off)
    )
  ).sort();

  return {
    profileVersion:PROFILE_VERSION,
    generatedAt:new Date().toISOString(),
    demo:false,

    employee:{
      employmentId:String(match.person.id),
      name:match.person.name||match.person.email||`Employment ${match.person.id}`,
      email:match.person.email||null,

      registered:src.registered,
      archived:src.archived,
      active:src.active,

      sourceRole:src.role,
      sourceTimezone:src.timezone,
      sourceHourlyRate:src.hourlyRate,
      sourceCurrency:src.currency,
      invitedAt:src.invitedAt,

      scrinCompanyId:match.company?.id??null,
      scrinCompany:match.company?.name||'',

      connectionId:common.connection.id,
      connectionName:common.connection.name
    },

    period:{
      from:i.from,
      to:i.to,
      timezone:validTz(e.tz)?e.tz:null,
      fallbackOffsetMinutes:e.off
    },

    workPolicy:pol,

    workSummary:{
      trackedSeconds:metrics.trackedSeconds,
      trackedHours:round(metrics.trackedHours,2),

      onlineTrackedSeconds:metrics.onlineTrackedSeconds,
      onlineTrackedHours:round(metrics.onlineTrackedHours,2),

      offlineSeconds:metrics.offlineSeconds,
      offlineHours:round(metrics.offlineHours,2),

      activeDays:metrics.activeDays,
      expectedHours:metrics.expectedHours,
      scheduleCoveragePercent:metrics.scheduleCoveragePercent,

      activityRecords:e.activities.length,

      noteCount:e.activities
        .filter(a=>String(a?.note||'').trim())
        .length,

      uniqueNoteCount:notes(
        e.activities,
        1000
      ).length,

      firstTracked:fl.firstTracked,
      lastTracked:fl.lastTracked
    },

    monitoring:{
      screenshotCount:e.screenshots.length,
      captureDates:dates.length,
      screenshotDates:dates,
      averageActivityLevel:avgActivity(e.screenshots),
      screenshotsPerTrackedHour:
        metrics.trackedHours>0
          ?round(e.screenshots.length/metrics.trackedHours,2)
          :0
    },

    reconciliation:e.reconciliation,

    projects:projectUsage(
      e.activities,
      projects
    ),

    availableProjects:projects,

    applications:apps.slice(0,20),
    urls:urls.slice(0,20),
    notes:notes(e.activities,20),

    sourceSchema:{
      employmentFields:fields(match.person),
      companyFields:fields(match.company),

      projectFields:unique(
        projects.flatMap(
          p=>p.sourceFields||[]
        )
      ).sort(),

      screenshotApplicationFields:unique(
        e.screenshots.flatMap(
          s=>
            (Array.isArray(s?.applications)
              ?s.applications
              :[]
            ).flatMap(
              a=>fields(a)
            )
        )
      ).sort()
    },

    sourceCapabilities:{
      commonData:true,
      activities:true,
      screenshots:true,
      appsAndUrls:apps.length>0||urls.length>0,
      projectsReturnedInCommonData:projects.length>0
    }
  };
}

function responseText(d){
  if(typeof d?.output_text==='string'&&d.output_text){
    return d.output_text;
  }

  for(const o of Array.isArray(d?.output)?d.output:[]){
    for(const c of Array.isArray(o?.content)?o.content:[]){
      if(c?.type==='output_text'&&typeof c.text==='string'){
        return c.text;
      }
    }
  }

  return '';
}

async function aiJson(env,system,user,schemaName,schema){
  const model=env.OPENAI_SCREENING_MODEL||env.OPENAI_MODEL;

  if(!env.OPENAI_API_KEY||!model){
    throw new Error(
      'AI screening requires OPENAI_API_KEY and OPENAI_SCREENING_MODEL (or OPENAI_MODEL).'
    );
  }

  let lastError=null;

  for(let attempt=0;attempt<3;attempt++){
    const r=await fetch(
      'https://api.openai.com/v1/responses',
      {
        method:'POST',

        headers:{
          Authorization:`Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type':'application/json'
        },

        body:JSON.stringify({
          model,

          input:[
            {
              role:'system',
              content:system
            },
            {
              role:'user',
              content:user
            }
          ],

          text:{
            format:{
              type:'json_schema',
              name:schemaName,
              strict:true,
              schema
            }
          }
        })
      }
    );

    let d={};

    try{
      d=await r.json();
    }catch{}

    if(r.ok){
      const t=responseText(d);

      if(!t){
        throw new Error(
          'OpenAI returned no structured output text'
        );
      }

      return {
        parsed:JSON.parse(t),
        model,
        responseId:d.id||null
      };
    }

    const e=new Error(
      `OpenAI ${r.status}: ${JSON.stringify(d).slice(0,700)}`
    );

    lastError=e;

    const retryable=[
      408,
      409,
      429,
      500,
      502,
      503,
      504
    ].includes(r.status);

    if(!retryable||attempt===2){
      throw e;
    }

    const retryAfter=Number(
      r.headers.get('retry-after')||0
    );

    const waitMs=
      retryAfter>0
        ?retryAfter*1000
        :700*(attempt+1);

    await new Promise(
      resolve=>setTimeout(resolve,waitMs)
    );
  }

  throw lastError||
    new Error('OpenAI request failed');
}

function normalizeShot(x){
  return {
    screenshotId:String(x?.screenshotId||''),
    activityId:String(x?.activityId||''),
    taken:Number(x?.taken||0),
    date:String(x?.date||''),
    time:String(x?.time||''),
    dateTime:String(x?.dateTime||''),
    application:String(x?.application||'Screenshot'),

    activityLevel:Number.isFinite(Number(x?.activityLevel))
      ?Number(x.activityLevel)
      :null,

    imageUrl:x?.imageUrl||null,
    thumbUrl:x?.thumbUrl||null
  };
}

function batchContent(shots,counted,batch,total){
  const c=[
    {
      type:'input_text',

      text:
        `Screening batch ${batch+1} of ${total}. `+
        `Some screenshots overlap the prior batch. `+
        `Counted IDs: ${JSON.stringify(counted)}. `+
        `Return one screenshot object for every supplied screenshotId.`
    }
  ];

  for(const s of shots){
    c.push({
      type:'input_text',

      text:
        `SCREENSHOT id=${s.screenshotId}; `+
        `date=${s.date}; `+
        `time=${s.time}; `+
        `application=${s.application}; `+
        `activityLevel=${s.activityLevel??'unknown'}`
    });

    c.push({
      type:'input_image',
      image_url:s.imageUrl,
      detail:'auto'
    });
  }

  return c;
}

function normalizeChecks(checks=[]){
  const map=new Map(
    (Array.isArray(checks)?checks:[])
      .map(x=>[x.key,x])
  );

  return CHECK_KEYS.map(
    k=>map.get(k)||{
      key:k,

      status:
        k==='repeated_across_days'
          ?'not_assessed'
          :'clear',

      detail:
        k==='repeated_across_days'
          ?'Cross-day replay assessment is finalized after the full-period first pass.'
          :'No review-worthy pattern returned in this segment.',

      screenshotIds:[]
    }
  );
}

function invalidImageError(e){
  const m=String(e?.message||e||'').toLowerCase();

  return (
    m.includes('does not represent a valid image')||
    m.includes('invalid image')||
    m.includes('unsupported image')||
    m.includes('image data you provided')||
    m.includes('failed to download image')||
    m.includes('could not download image')||
    m.includes('error while downloading')||
    m.includes('invalid_image')||
    (
      m.includes('invalid_value')&&
      m.includes('image')
    )
  );
}

function unavailable(s,reason){
  return {
    screenshotId:s.screenshotId,
    taken:s.taken,
    date:s.date,
    time:s.time,
    dateTime:s.dateTime,
    application:s.application,

    status:'review',
    visualKey:'evidence_unavailable',

    reasons:[
      reason
    ],

    signals:[],

    evidenceStatus:'unavailable',
    imageSource:'none',
    usedImageUrl:null
  };
}

function normalizeAi(ai,shots,source){
  const map=new Map(
    (Array.isArray(ai.parsed?.screenshots)
      ?ai.parsed.screenshots
      :[]
    ).map(
      x=>[String(x.screenshotId),x]
    )
  );

  const results=[];
  const missing=[];

  for(const s of shots){
    const r=map.get(
      s.screenshotId
    );

    if(!r){
      missing.push(
        s.screenshotId
      );

      results.push({
        screenshotId:s.screenshotId,
        taken:s.taken,
        date:s.date,
        time:s.time,
        dateTime:s.dateTime,
        application:s.application,

        status:'review',
        visualKey:'unclassified_missing_ai_result',

        reasons:[
          'AI response omitted this screenshot.'
        ],

        signals:[],

        evidenceStatus:'missing_ai_result',
        imageSource:source,
        usedImageUrl:s.imageUrl
      });

      continue;
    }

    results.push({
      screenshotId:s.screenshotId,
      taken:s.taken,
      date:s.date,
      time:s.time,
      dateTime:s.dateTime,
      application:s.application,

      status:r.status,

      visualKey:String(
        r.visualKey||'unclassified'
      ).slice(0,120),

      reasons:Array.isArray(r.reasons)
        ?r.reasons.slice(0,5)
        :[],

      signals:Array.isArray(r.signals)
        ?r.signals.slice(0,5)
        :[],

      evidenceStatus:'screened',
      imageSource:source,
      usedImageUrl:s.imageUrl
    });
  }

  return {
    results,
    missing,

    checks:normalizeChecks(
      ai.parsed?.checks
    ),

    call:{
      model:ai.model,
      responseId:ai.responseId
    }
  };
}

function mergeChecks(sets){
  return CHECK_KEYS.map(k=>{
    let status=
      k==='repeated_across_days'
        ?'not_assessed'
        :'clear';

    const details=[];
    const ids=new Set();

    for(const set of sets){
      const c=(set||[])
        .find(x=>x.key===k);

      if(!c) continue;

      if(c.status==='review'){
        status='review';
      } else if(
        c.status==='not_assessed'&&
        status!=='review'
      ){
        status='not_assessed';
      }

      if(c.detail){
        details.push(
          c.detail
        );
      }

      for(const id of c.screenshotIds||[]){
        ids.add(
          String(id)
        );
      }
    }

    return {
      key:k,
      status,

      detail:
        unique(details)
          .slice(0,3)
          .join(' ')||
        (
          status==='clear'
            ?'No review-worthy pattern returned.'
            :'Additional assessment required.'
        ),

      screenshotIds:[
        ...ids
      ]
    };
  });
}

async function scanSubset(env,shots,counted,batch,total,depth=0){
  if(!shots.length){
    return {
      results:[],
      missing:[],
      unavailableIds:[],
      checks:normalizeChecks([]),
      calls:[]
    };
  }

  try{
    const ai=await aiJson(
      env,
      BATCH_PROMPT,
      batchContent(
        shots,
        counted,
        batch,
        total
      ),
      'wgm_full_month_screening_batch',
      BATCH_SCHEMA
    );

    const n=normalizeAi(
      ai,
      shots,
      depth?'isolated_primary':'primary'
    );

    return {
      results:n.results,
      missing:n.missing,
      unavailableIds:[],
      checks:n.checks,
      calls:[n.call]
    };

  }catch(e){
    /*
      If OpenAI reports an invalid image somewhere in a multi-image
      batch, split the batch in half until the bad screenshot is
      isolated. Good screenshots continue screening normally.
    */
    if(!invalidImageError(e)){
      throw e;
    }

    if(shots.length===1){
      const s=shots[0];

      /*
        Primary URL failed. Try Scrin thumbnail before marking the
        evidence unavailable.
      */
      if(
        s.thumbUrl&&
        s.thumbUrl!==s.imageUrl
      ){
        try{
          const ts={
            ...s,
            imageUrl:s.thumbUrl
          };

          const ai=await aiJson(
            env,
            BATCH_PROMPT,
            batchContent(
              [ts],
              counted.filter(
                id=>id===s.screenshotId
              ),
              batch,
              total
            ),
            'wgm_full_month_screening_batch',
            BATCH_SCHEMA
          );

          const n=normalizeAi(
            ai,
            [ts],
            'thumbnail'
          );

          return {
            results:n.results,
            missing:n.missing,
            unavailableIds:[],
            checks:n.checks,
            calls:[n.call]
          };

        }catch(te){
          if(!invalidImageError(te)){
            throw te;
          }
        }
      }

      /*
        Both versions failed. Do NOT kill the report. Record the
        evidence gap and continue.
      */
      return {
        results:[
          unavailable(
            s,
            'Primary and thumbnail image evidence could not be read as a valid image. Screening continued with the remaining screenshots.'
          )
        ],

        missing:[],

        unavailableIds:[
          s.screenshotId
        ],

        checks:normalizeChecks([]),
        calls:[]
      };
    }

    const mid=Math.ceil(
      shots.length/2
    );

    const left=shots.slice(
      0,
      mid
    );

    const right=shots.slice(
      mid
    );

    const lr=await scanSubset(
      env,
      left,
      counted.filter(
        id=>left.some(
          s=>s.screenshotId===id
        )
      ),
      batch,
      total,
      depth+1
    );

    const rr=await scanSubset(
      env,
      right,
      counted.filter(
        id=>right.some(
          s=>s.screenshotId===id
        )
      ),
      batch,
      total,
      depth+1
    );

    return {
      results:[
        ...lr.results,
        ...rr.results
      ],

      missing:unique([
        ...lr.missing,
        ...rr.missing
      ]),

      unavailableIds:unique([
        ...lr.unavailableIds,
        ...rr.unavailableIds
      ]),

      checks:mergeChecks([
        lr.checks,
        rr.checks
      ]),

      calls:[
        ...lr.calls,
        ...rr.calls
      ]
    };
  }
}

async function scanBatch(env,i){
  const shots=(
    Array.isArray(i.screenshots)
      ?i.screenshots
      :[]
  )
    .map(normalizeShot)
    .filter(x=>x.screenshotId);

  if(!shots.length){
    throw new Error(
      'screenshots[] is required'
    );
  }

  if(shots.length>BATCH_MAX){
    throw new Error(
      `A screening batch may contain at most ${BATCH_MAX} images`
    );
  }

  const ids=new Set(
    shots.map(x=>x.screenshotId)
  );

  const counted=unique(
    (
      Array.isArray(i.countedScreenshotIds)
        ?i.countedScreenshotIds
        :shots.map(x=>x.screenshotId)
    )
      .map(String)
      .filter(id=>ids.has(id))
  );

  const batch=Math.max(
    0,
    Number(i.batchIndex||0)
  );

  const total=Math.max(
    1,
    Number(i.totalBatches||1)
  );

  /*
    Screenshots without any image URL are marked unavailable
    immediately. They do not abort the batch.
  */
  const none=shots.filter(
    s=>!s.imageUrl&&!s.thumbUrl
  );

  const withImage=shots
    .filter(
      s=>s.imageUrl||s.thumbUrl
    )
    .map(
      s=>({
        ...s,
        imageUrl:s.imageUrl||s.thumbUrl
      })
    );

  const r=await scanSubset(
    env,
    withImage,
    counted,
    batch,
    total
  );

  const no=none.map(
    s=>unavailable(
      s,
      'No primary or thumbnail image URL was supplied by Scrin. Screening continued with the remaining screenshots.'
    )
  );

  const all=[
    ...r.results,
    ...no
  ];

  const unavailableIds=unique([
    ...r.unavailableIds,
    ...no.map(
      x=>x.screenshotId
    )
  ]);

  const success=all
    .filter(
      x=>x.evidenceStatus==='screened'
    )
    .map(
      x=>x.screenshotId
    );

  const reviewed=counted.filter(
    id=>success.includes(id)
  );

  const unavailCounted=counted.filter(
    id=>unavailableIds.includes(id)
  );

  return {
    batchIndex:batch,
    totalBatches:total,

    suppliedScreenshotCount:shots.length,
    countedScreenshotCount:counted.length,

    countedReviewedCount:reviewed.length,
    countedReviewedIds:reviewed,

    countedUnavailableCount:unavailCounted.length,
    countedUnavailableIds:unavailCounted,

    missingScreenshotIds:r.missing,
    unavailableScreenshotIds:unavailableIds,

    screenshots:all,
    checks:r.checks,

    ai:{
      calls:r.calls,
      callCount:r.calls.length
    }
  };
}

function resultMap(batches){
  const map=new Map();

  const rank=r=>
    r?.evidenceStatus==='screened'
      ?3
      :r?.evidenceStatus==='unavailable'
        ?2
        :r?.evidenceStatus==='missing_ai_result'
          ?1
          :0;

  for(const b of batches||[]){
    for(const r of b?.screenshots||[]){
      const id=String(
        r?.screenshotId||''
      );

      if(!id) continue;

      const old=map.get(id);

      if(!old||rank(r)>rank(old)){
        map.set(id,r);
      }
    }
  }

  return map;
}

function clearDetail(k){
  return {
    repeated_frozen:
      'No concerning unchanged-screen sequence was identified in screened evidence.',

    repetitive_cycling:
      'No suspicious repeated screen cycling pattern was identified in screened evidence.',

    activity_simulation:
      'No visible activity-simulation interface was identified in screened evidence.',

    repeated_across_days:
      'No concerning replay-like repeated sequence across different dates was confirmed in screened evidence.',

    prolonged_stagnation_10m:
      'No materially unchanged screen sequence lasting more than 10 minutes was identified in screened evidence.'
  }[k];
}

function aggregateChecks(batches){
  return [
    'repeated_frozen',
    'repetitive_cycling',
    'activity_simulation',
    'prolonged_stagnation_10m'
  ].map(k=>{
    let status='clear';

    const d=[];
    const ids=new Set();

    for(const b of batches||[]){
      const c=(b?.checks||[])
        .find(x=>x.key===k);

      if(!c) continue;

      if(c.status==='review'){
        status='review';
      } else if(
        c.status==='not_assessed'&&
        status!=='review'
      ){
        status='not_assessed';
      }

      if(c.detail){
        d.push(c.detail);
      }

      for(const id of c.screenshotIds||[]){
        ids.add(String(id));
      }
    }

    return {
      key:k,
      status,

      detail:
        status==='review'
          ?unique(d).slice(0,2).join(' ')
          :status==='not_assessed'
            ?'This check requires additional review because one or more screening segments were incomplete.'
            :clearDetail(k),

      screenshotIds:[
        ...ids
      ]
    };
  });
}

function replayCandidates(map){
  const by=new Map();

  for(const r of map.values()){
    if(
      !r?.date||
      !r?.visualKey||
      [
        'evidence_unavailable',
        'unclassified_missing_ai_result'
      ].includes(r.visualKey)
    ){
      continue;
    }

    if(!by.has(r.date)){
      by.set(r.date,[]);
    }

    by.get(r.date).push(r);
  }

  for(const a of by.values()){
    a.sort(
      (x,y)=>Number(x.taken||0)-Number(y.taken||0)
    );
  }

  const seq=new Map();

  for(const [date,a] of by){
    for(let i=0;i<=a.length-3;i++){
      const slice=a.slice(i,i+3);

      const sig=slice
        .map(x=>x.visualKey)
        .join('>>');

      if(!seq.has(sig)){
        seq.set(sig,[]);
      }

      seq.get(sig).push({
        date,
        screenshotIds:slice.map(
          x=>x.screenshotId
        )
      });
    }
  }

  const out=[];

  for(const [signature,occurrences] of seq){
    const dates=unique(
      occurrences.map(x=>x.date)
    );

    if(dates.length<2){
      continue;
    }

    out.push({
      signature,
      dates,
      occurrences,

      screenshotIds:unique(
        occurrences.flatMap(
          x=>x.screenshotIds
        )
      ).slice(0,24)
    });
  }

  return out
    .sort(
      (a,b)=>b.dates.length-a.dates.length
    )
    .slice(0,8);
}

async function crossDay(env,candidates,m,map){
  if(!candidates.length){
    return {
      key:'repeated_across_days',
      status:'clear',
      detail:clearDetail('repeated_across_days'),
      screenshotIds:[],
      candidateGroupsReviewed:0
    };
  }

  const mm=new Map(
    m.map(
      x=>[String(x.screenshotId),x]
    )
  );

  const content=[
    {
      type:'input_text',
      text:`Cross-day candidates: ${JSON.stringify(candidates.map(x=>({dates:x.dates,screenshotIds:x.screenshotIds})))}`
    }
  ];

  for(
    const id of unique(
      candidates.flatMap(
        x=>x.screenshotIds
      )
    ).slice(0,24)
  ){
    const shot=mm.get(id);
    const screened=map.get(id);

    const url=
      screened?.usedImageUrl||
      shot?.imageUrl||
      shot?.thumbUrl;

    if(!shot||!url){
      continue;
    }

    content.push(
      {
        type:'input_text',

        text:
          `CANDIDATE id=${shot.screenshotId}; `+
          `date=${shot.date}; `+
          `time=${shot.time}; `+
          `application=${shot.application}`
      },
      {
        type:'input_image',
        image_url:url,
        detail:'auto'
      }
    );
  }

  try{
    const ai=await aiJson(
      env,
      CROSS_DAY_PROMPT,
      content,
      'wgm_cross_day_replay_check',
      CROSS_DAY_SCHEMA
    );

    return {
      key:'repeated_across_days',
      status:ai.parsed.status,
      detail:ai.parsed.detail,

      screenshotIds:unique(
        ai.parsed.screenshotIds||[]
      ),

      candidateGroupsReviewed:candidates.length,

      ai:{
        model:ai.model,
        responseId:ai.responseId
      }
    };

  }catch(e){
    /*
      Cross-day verification should not destroy an otherwise usable
      screening run. It becomes not_assessed and is disclosed.
    */
    return {
      key:'repeated_across_days',
      status:'not_assessed',

      detail:
        `Cross-day replay verification could not be completed: ${e.message}`,

      screenshotIds:[],
      candidateGroupsReviewed:candidates.length
    };
  }
}

async function finalize(env,i){
  const m=(
    Array.isArray(i.manifest)
      ?i.manifest
      :[]
  )
    .map(normalizeShot)
    .filter(x=>x.screenshotId);

  const b=Array.isArray(i.batchResults)
    ?i.batchResults
    :[];

  const expected=Number(
    i.expectedScreenshots??
    m.length??
    0
  );

  const map=resultMap(b);

  const success=unique(
    [...map.values()]
      .filter(
        r=>
          r.evidenceStatus==='screened'&&
          ![
            'evidence_unavailable',
            'unclassified_missing_ai_result'
          ].includes(r.visualKey)
      )
      .map(
        r=>String(r.screenshotId)
      )
  );

  const unavailableIds=unique(
    b.flatMap(
      x=>
        Array.isArray(x?.unavailableScreenshotIds)
          ?x.unavailableScreenshotIds.map(String)
          :[]
    )
  );

  const missing=m
    .map(x=>x.screenshotId)
    .filter(
      id=>
        !success.includes(id)&&
        !unavailableIds.includes(id)
    );

  const coverage=
    expected>0
      ?round(
          success.length/expected*100,
          1
        )
      :100;

  const full=
    expected===0||
    success.length===expected;

  const complete=
    expected===0||
    coverage>=MIN_SCREENING_COVERAGE;

  const gap=Math.max(
    0,
    expected-success.length
  );

  const candidates=replayCandidates(
    map
  );

  const cross=
    complete
      ?await crossDay(
          env,
          candidates,
          m,
          map
        )
      :{
          key:'repeated_across_days',
          status:'not_assessed',

          detail:
            `Cross-day replay verification was not finalized because visual screening coverage was ${coverage}%, below the ${MIN_SCREENING_COVERAGE}% completion threshold.`,

          screenshotIds:[],
          candidateGroupsReviewed:0
        };

  const checks=[
    ...aggregateChecks(b),
    cross
  ];

  const findings=checks
    .filter(
      x=>x.status==='review'
    )
    .map(
      x=>({
        type:x.key,
        reason:x.detail,
        screenshotIds:unique(
          x.screenshotIds||[]
        )
      })
    );

  if(gap>0){
    findings.push({
      type:complete
        ?'evidence_gap'
        :'incomplete_screening',

      reason:
        complete
          ?`${gap} of ${expected} supplied screenshot records were unavailable for successful AI visual review. Visual screening coverage was ${coverage}%. Human review should account for this evidence gap.`
          :`Only ${coverage}% of supplied screenshot records were successfully screened. At least ${MIN_SCREENING_COVERAGE}% coverage is required.`,

      screenshotIds:unique([
        ...unavailableIds,
        ...missing
      ]).slice(0,24)
    });
  }

  const flagged=unique(
    findings
      .filter(
        x=>![
          'evidence_gap',
          'incomplete_screening'
        ].includes(x.type)
      )
      .flatMap(
        x=>x.screenshotIds||[]
      )
  );

  const headline=
    !complete
      ?`Screening incomplete — ${coverage}% visual coverage.`
      :flagged.length
        ?`${flagged.length} questionable screenshot${flagged.length===1?'':'s'} need human context.`
        :!full
          ?'No suspicious patterns identified in the screenshots successfully screened.'
          :'No suspicious patterns found.';

  return {
    overallResult:
      findings.length
        ?'review'
        :'clear',

    screeningHeadline:
      headline,

    screeningSubtext:
      full
        ?`AI successfully screened all ${success.length.toLocaleString()} supplied screenshot images. Human review is still required before release.`
        :`AI successfully screened ${success.length.toLocaleString()} of ${expected.toLocaleString()} supplied screenshot records (${coverage}% visual coverage). ${gap.toLocaleString()} record(s) were unavailable or unresolved.`,

    checks,
    findings,

    aiFlaggedScreenshotIds:
      flagged,

    screenedScreenshots:
      success.length,

    totalScreenshots:
      expected,

    screeningCoveragePercent:
      coverage,

    screeningCoverageMinimumPercent:
      MIN_SCREENING_COVERAGE,

    screeningComplete:
      complete,

    /*
      fullCoverage tells us whether literally every image was read.
      allScreenshotsScreened is retained for compatibility with the
      current reviewer UI and now means the screening met the V2.1
      completion threshold.
    */
    fullCoverage:
      full,

    allScreenshotsScreened:
      complete,

    unavailableScreenshots:
      unavailableIds.length,

    unavailableScreenshotIds:
      unavailableIds,

    missingScreenshotIds:
      missing,

    evidenceGapCount:
      gap,

    crossDayCandidateGroups:
      candidates.length,

    scopeNote:
      `Review scope: supplied Scrin screenshot images and verified metadata. ${coverage}% of supplied screenshot records were successfully visually screened. Hidden automation and physical mouse movers may not be visible. Screening flags are not automated findings of misconduct.`,

    versions:{
      analysisVersion:ANALYSIS_VERSION,
      rulesVersion:RULES_VERSION,
      promptVersion:PROMPT_VERSION,
      profileVersion:PROFILE_VERSION
    }
  };
}

function demoCommon(){
  return {
    companies:[
      {
        id:1,
        name:'Demo Company',

        projects:[
          {
            id:10,
            name:'Demo Project'
          }
        ],

        employments:[
          {
            id:100,
            name:'Sample VA',
            email:'sample@example.com',
            registered:true
          }
        ]
      }
    ]
  };
}

function demoPrepared(i={}){
  const from=i.from||'2026-09-01';
  const to=i.to||from;

  const key=sessionKey({
    ...i,
    from,
    to
  });

  const m=[];

  for(
    let d=0;
    d<Math.min(5,dayCount(from,to)||1);
    d++
  ){
    const date=addDays(from,d);

    for(let n=0;n<6;n++){
      m.push({
        index:m.length,

        screenshotId:
          `demo_${m.length+1}`,

        activityId:
          `a${d}`,

        taken:
          Date.parse(
            `${date}T${String(9+Math.floor(n/2)).padStart(2,'0')}:${n%2?'35':'05'}:00Z`
          )/1000,

        date,

        time:
          `${9+Math.floor(n/2)}:${n%2?'35':'05'} AM`,

        dateTime:
          `${date} demo`,

        application:
          n%2?'Email':'CRM',

        activityLevel:70,
        imageUrl:null,
        thumbUrl:null
      });
    }
  }

  const pol=workPolicy(i);

  const batch=clamp(
    Number(i.batchSize||BATCH_SIZE_DEFAULT),
    8,
    BATCH_MAX
  );

  const overlap=Math.min(
    BATCH_OVERLAP_DEFAULT,
    batch-1
  );

  const np=batch-overlap;

  return {
    sessionKey:key,

    connection:{
      id:'demo-main',
      name:'Demo Scrin Connection',
      provider:'scrin',
      type:'shared',
      employer:'',
      employerLocked:false,
      status:'demo'
    },

    period:{
      from,
      to,
      dayCount:dayCount(from,to)
    },

    timezone:{
      iana:'America/Los_Angeles',
      fallbackOffsetMinutes:-420,
      label:'America/Los_Angeles'
    },

    workPolicy:pol,

    metrics:{
      trackedSeconds:8*3600,
      trackedHours:8,

      onlineTrackedSeconds:8*3600,
      onlineTrackedHours:8,

      offlineSeconds:0,
      offlineHours:0,

      activeDays:1,

      expectedHours:Number(
        i.expectedHours||8
      ),

      scheduleCoveragePercent:100
    },

    reconciliation:{
      rawActivitiesReturned:1,
      activitiesUsed:1,
      activitiesExcludedOutsideRange:0,
      activitiesClippedAtBoundary:0,
      invalidActivityRecords:0,

      rawScreenshotRecordsReturned:m.length,
      dedupedScreenshotRecords:m.length,
      duplicateScreenshotRecordsRemoved:0,

      screenshotsExcludedOutsideRange:0,
      screenshotsExcludedInvalidTimestamp:0,

      finalScreenshotCount:m.length,
      reportingTimezone:'America/Los_Angeles'
    },

    screenshotCount:m.length,

    screenshotDates:unique(
      m.map(x=>x.date)
    ),

    screenshotDateCounts:
      dateCounts(m),

    manifest:m,

    humanSample:
      humanSample([],key),

    scanPlan:{
      batchSize:batch,
      overlapSize:overlap,
      newPerBatch:np,

      totalBatches:
        m.length
          ?Math.ceil(m.length/np)
          :0,

      internalBatching:true
    },

    apps:[],

    review:{
      status:'Green',
      reasons:[],
      note:'Demo evidence package.'
    },

    versions:{
      analysisVersion:ANALYSIS_VERSION,
      rulesVersion:RULES_VERSION,
      promptVersion:PROMPT_VERSION,
      profileVersion:PROFILE_VERSION
    }
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const demo = env.DEMO_MODE !== 'false';

    if (url.pathname === '/api/health') {
      return json({
        ok:true,
        mode:demo?'demo':'live',

        connectionCount:
          parseConnections(env).length,

        analysisVersion:
          ANALYSIS_VERSION,

        rulesVersion:
          RULES_VERSION,

        promptVersion:
          PROMPT_VERSION,

        profileVersion:
          PROFILE_VERSION,

        screeningMode:
          'reconciled_resilient_full_month_batch',

        defaultScanBatchSize:
          BATCH_SIZE_DEFAULT,

        humanSampleRange:[
          HUMAN_SAMPLE_MIN,
          HUMAN_SAMPLE_MAX
        ],

        minimumScreeningCoveragePercent:
          MIN_SCREENING_COVERAGE,

        stagnationThresholdMinutes:
          STAGNATION_SECONDS/60
      });
    }

    if (url.pathname === '/api/scrin/connections') {
      return json(
        demo
          ?{
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
            }
          :{
              demo:false,

              connections:
                parseConnections(env)
                  .map(publicConnection)
            }
      );
    }

    if (
      url.pathname === '/api/scrin/all-common' &&
      request.method === 'POST'
    ) {
      if(demo){
        const c={
          id:'demo-main',
          name:'Demo Scrin Connection',
          provider:'scrin',
          type:'shared',
          employer:'',
          token:'demo'
        };

        const n=commonNormalize(
          demoCommon(),
          c
        );

        return json({
          demo:true,

          connections:[
            {
              ...publicConnection(c),
              status:'connected',
              employeeCount:n.employees.length
            }
          ],

          employees:n.employees,
          projects:n.projects,
          errors:[]
        });
      }

      const employees=[];
      const projects=[];
      const connections=[];
      const errors=[];

      for(const c of parseConnections(env)){
        try{
          const r=await scrin(
            env,
            c.id,
            '/api/v2/GetCommonData',
            {}
          );

          const n=commonNormalize(
            r.data,
            c
          );

          employees.push(
            ...n.employees
          );

          projects.push(
            ...n.projects.map(
              p=>({
                ...p,
                connectionId:c.id,
                connectionName:c.name
              })
            )
          );

          connections.push({
            ...publicConnection(c),
            status:'connected',
            employeeCount:n.employees.length,
            companyCount:n.companies.length
          });

        }catch(e){
          errors.push({
            connectionId:c.id,
            connectionName:c.name,
            error:e.message
          });

          connections.push({
            ...publicConnection(c),
            status:'error',
            employeeCount:0,
            error:e.message
          });
        }
      }

      return json({
        demo:false,
        connections,
        employees,
        projects,
        errors
      });
    }

    if (
      url.pathname === '/api/scrin/activities' &&
      request.method === 'POST'
    ) {
      try{
        const b=await readJson(request);

        if(!Array.isArray(b.ranges)){
          return json(
            {
              error:'Expected { connectionId, ranges: [...] }'
            },
            400
          );
        }

        const r=await scrin(
          env,
          b.connectionId,
          '/api/v2/GetActivities',
          b.ranges
        );

        return json({
          connection:
            publicConnection(r.connection),

          activities:
            r.data
        });

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/scrin/screenshots' &&
      request.method === 'POST'
    ) {
      try{
        const b=await readJson(request);

        if(!Array.isArray(b.activityIds)){
          return json(
            {
              error:'Expected { connectionId, activityIds: [...] }'
            },
            400
          );
        }

        const r=await scrin(
          env,
          b.connectionId,
          '/api/v2/GetScreenshots',
          b.activityIds
        );

        return json({
          connection:
            publicConnection(r.connection),

          screenshots:
            r.data
        });

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/wgm/employee-profile' &&
      request.method === 'POST'
    ) {
      try{
        const b=await readJson(request);

        if(demo){
          return json({
            profileVersion:PROFILE_VERSION,
            demo:true,

            employee:{
              employmentId:String(
                b.employmentId||100
              ),

              name:'Sample VA',
              scrinCompany:'Demo Company'
            },

            period:{
              from:b.from,
              to:b.to
            },

            workPolicy:
              workPolicy(b),

            workSummary:{
              trackedHours:8,
              activeDays:1
            },

            monitoring:{
              screenshotCount:96,
              captureDates:1
            },

            reconciliation:{
              finalScreenshotCount:96
            },

            projects:[],
            applications:[],
            urls:[],
            notes:[],
            sourceSchema:{},

            sourceCapabilities:{
              commonData:true,
              activities:true,
              screenshots:true
            }
          });
        }

        return json(
          await employeeProfile(
            env,
            b
          )
        );

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/wgm/screening/prepare' &&
      request.method === 'POST'
    ) {
      try{
        const b=await readJson(request);

        return json(
          demo
            ?demoPrepared(b)
            :await prepare(env,b)
        );

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/wgm/screening/batch' &&
      request.method === 'POST'
    ) {
      if(demo){
        return json(
          {
            error:'Demo mode has no real screenshot image URLs.'
          },
          400
        );
      }

      try{
        return json(
          await scanBatch(
            env,
            await readJson(request)
          )
        );

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/wgm/screening/finalize' &&
      request.method === 'POST'
    ) {
      try{
        return json(
          await finalize(
            env,
            await readJson(request)
          )
        );

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/wgm/day-data' &&
      request.method === 'POST'
    ) {
      try{
        const b=await readJson(request);

        if(demo){
          return json({
            demo:true,
            date:b.date,

            firstTracked:
              '8:03 AM',

            lastTracked:
              '5:12 PM',

            trackedSeconds:
              8.03*3600,

            onlineTrackedSeconds:
              8.03*3600,

            offlineSeconds:
              0,

            activityCount:
              24,

            screenshotCount:
              96,

            reconciliation:{
              finalScreenshotCount:96
            },

            sessions:[],
            screenshots:[]
          });
        }

        if(
          !b.employmentId||
          !b.date
        ){
          return json(
            {
              error:'employmentId and date are required'
            },
            400
          );
        }

        const e=await evidence(
          env,
          {
            ...b,
            from:b.date,
            to:b.date
          }
        );

        const intervals=e.activities
          .filter(x=>duration(x)>0)
          .sort(
            (a,b)=>Number(a.from)-Number(b.from)
          );

        const sessions=[];

        if(intervals.length){
          let s=Number(
            intervals[0].from
          );

          let end=Number(
            intervals[0].to
          );

          for(
            let i=1;
            i<intervals.length;
            i++
          ){
            const ns=Number(
              intervals[i].from
            );

            const ne=Number(
              intervals[i].to
            );

            if(ns<=end+90){
              end=Math.max(
                end,
                ne
              );
            } else {
              sessions.push({
                from:localTime(
                  s,
                  e.tz,
                  e.off
                ),

                to:localTime(
                  end,
                  e.tz,
                  e.off
                ),

                seconds:end-s
              });

              s=ns;
              end=ne;
            }
          }

          sessions.push({
            from:localTime(
              s,
              e.tz,
              e.off
            ),

            to:localTime(
              end,
              e.tz,
              e.off
            ),

            seconds:end-s
          });
        }

        const m=manifest(
          e.screenshots,
          e.tz,
          e.off
        );

        const metrics=activitySummary(
          e.activities,
          0,
          e.tz,
          e.off,
          workPolicy(b)
        );

        return json({
          demo:false,

          connection:
            publicConnection(
              e.connection
            ),

          date:b.date,

          timezone:{
            iana:validTz(e.tz)
              ?e.tz
              :null,

            fallbackOffsetMinutes:
              e.off,

            configurationRecommended:
              !validTz(e.tz)
          },

          firstTracked:
            intervals.length
              ?localTime(
                  intervals[0].from,
                  e.tz,
                  e.off
                )
              :'—',

          lastTracked:
            intervals.length
              ?localTime(
                  Math.max(
                    ...intervals.map(
                      x=>Number(x.to)
                    )
                  ),
                  e.tz,
                  e.off
                )
              :'—',

          trackedSeconds:
            metrics.trackedSeconds,

          onlineTrackedSeconds:
            metrics.onlineTrackedSeconds,

          offlineSeconds:
            metrics.offlineSeconds,

          activityCount:
            e.activities.length,

          screenshotCount:
            m.length,

          reconciliation:
            e.reconciliation,

          sessions,

          screenshots:m.map(
            x=>({
              id:x.screenshotId,
              activityId:x.activityId,
              taken:x.taken,
              time:x.time,
              application:x.application,
              activityLevel:x.activityLevel,
              thumbUrl:x.thumbUrl,
              url:x.imageUrl
            })
          )
        });

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/wgm/period-analytics' &&
      request.method === 'POST'
    ) {
      try{
        const b=await readJson(request);

        const p=
          demo
            ?demoPrepared(b)
            :await prepare(env,b);

        return json({
          current:{
            period:p.period,
            connection:p.connection,
            metrics:p.metrics,
            workPolicy:p.workPolicy,
            reconciliation:p.reconciliation,

            evidence:{
              screenshotCount:p.screenshotCount,
              activeDays:p.metrics.activeDays,
              daysWithScreenshots:p.screenshotDates.length,
              evidenceCoveragePercent:p.screenshotCount?100:0
            },

            apps:p.apps,
            screenshotDates:p.screenshotDates,

            selectedScreenshotEvidence:
              p.humanSample.screenshots.slice(0,12),

            humanSample:p.humanSample,
            scanPlan:p.scanPlan,
            review:p.review,
            versions:p.versions
          },

          previous:null,

          comparison:{
            available:false
          },

          metadata:{
            generatedAt:new Date().toISOString(),
            analysisVersion:ANALYSIS_VERSION,
            rulesVersion:RULES_VERSION
          }
        });

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/wgm/period-data' &&
      request.method === 'POST'
    ) {
      try{
        const b=await readJson(request);

        const p=
          demo
            ?demoPrepared(b)
            :await prepare(env,b);

        return json({
          connection:p.connection,
          metrics:p.metrics,
          workPolicy:p.workPolicy,
          reconciliation:p.reconciliation,

          workstreams:[],

          apps:p.apps.map(
            x=>[
              x.name,
              x.sharePercent
            ]
          ),

          averageActivityLevel:null,

          screenshotCount:
            p.screenshotCount,

          screenshotDates:
            p.screenshotDates,

          selectedScreenshotEvidence:
            p.humanSample.screenshots.slice(0,12),

          screenshotEvidenceSummary:{
            count:p.screenshotCount,
            captureDates:p.screenshotDates.length,
            topApplications:p.apps.slice(0,6)
          }
        });

      }catch(e){
        return json(
          {
            error:e.message
          },
          500
        );
      }
    }

    if (
      url.pathname === '/api/reports/generate' &&
      request.method === 'POST'
    ) {
      return json({
        report:{
          overallResult:'review',

          screeningHeadline:
            'Full-period screening required.',

          screeningSubtext:
            'Use the V2.1 full-period screening workflow before human approval and release.',

          checks:CHECK_KEYS.map(
            key=>({
              key,
              status:'not_assessed',
              detail:'Full-period screening has not been completed.'
            })
          ),

          findings:[],

          scopeNote:
            'Legacy compatibility draft only.'
        },

        generatedBy:
          'wgm-fallback',

        requiresHumanReview:
          true,

        warning:
          'Legacy compatibility endpoint used.',

        metadata:{
          generatedAt:
            new Date().toISOString(),

          promptVersion:
            PROMPT_VERSION,

          analysisVersion:
            ANALYSIS_VERSION,

          rulesVersion:
            RULES_VERSION,

          reportType:
            'fraud_screening_activity_review',

          legacyCompatibilityEndpoint:
            true
        }
      });
    }

    if (
      url.pathname === '/api/reports/release' &&
      request.method === 'POST'
    ) {
      const b=await readJson(request);

      return json({
        status:'released',

        releaseId:
          `wgm_${Date.now()}`,

        deliveryEvent:
          'queued',

        ghlIntegrated:
          false,

        employeeId:
          b.employeeId||null,

        employer:
          b.employer||null,

        period:
          b.period||null,

        releasedAt:
          new Date().toISOString()
      });
    }

    return env.ASSETS.fetch(request);
  },
};
