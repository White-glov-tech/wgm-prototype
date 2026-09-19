const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
    coaching: { type: 'string' },
    clientContext: { type: 'string' },
    nextFocus: { type: 'string' },
    integrity: { type: 'string' }
  },
  required: ['headline','summary','strengths','coaching','clientContext','nextFocus','integrity'],
  additionalProperties: false
};

const SYSTEM_PROMPT = `You are the White Glove Monitor reporting engine. Produce concise founder-facing workforce reporting from verified calculations, tracking metadata, and supplied context.
Rules:
- Never recalculate or contradict supplied objective metrics.
- Device activity is evidence, not a standalone productivity score.
- Treat projects as broad workstreams and notes as descriptions of actual work.
- Do not invent outputs, misconduct, fraud, or performance problems.
- Apply approved leave, schedule changes and business context before describing an exception.
- A month with no material concern is a valid result.
- Human review follows this draft, so surface only defensible, evidence-backed conclusions.
- Keep the language professional, non-punitive, concise and useful to a busy founder.`;

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}})}
async function readJson(req){try{return await req.json()}catch{return {}}}
async function scrinFetch(env,path,body){
  if(!env.SCRIN_TOKEN) throw new Error('SCRIN_TOKEN is not configured');
  const base=(env.SCRIN_API_BASE_URL||'https://scrin.io').replace(/\/$/,'');
  const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json','X-SSM-Token':env.SCRIN_TOKEN},body:JSON.stringify(body)});
  const text=await r.text(); if(!r.ok) throw new Error(`Scrin ${r.status}: ${text.slice(0,300)}`); return text?JSON.parse(text):null;
}
function demoCommon(){return {companies:[{id:477279,name:'WGH Scrin Account',isManager:true,employments:[{id:477279,name:'Maria Gadin',email:'masked@example.com',registered:true},{id:500002,name:'VA 2 — sync to reveal',email:'masked2@example.com',registered:true},{id:500003,name:'VA 3 — sync to reveal',email:'masked3@example.com',registered:true}]}]}}
function normalizeCommon(data){
  const companies=Array.isArray(data?.companies)?data.companies:(Array.isArray(data)?data:[]); const employees=[];
  for(const c of companies){for(const e of (Array.isArray(c?.employments)?c.employments:[])){employees.push({id:`scrin-${e.id}`,employmentId:e.id,name:e.name||e.email||`Employment ${e.id}`,email:e.email||null,scrinCompanyId:c.id,scrinCompany:c.name||`Scrin Company ${c.id}`,registered:e.registered,lastActive:e.lastActive,source:'WGH Managed',role:'Virtual Assistant',reportingStatus:'Synced'});}}
  return {companies,employees};
}
function epochRange(from,to,offsetMinutes=0){
  const startUtc=Date.parse(`${from}T00:00:00Z`) - offsetMinutes*60*1000;
  const endUtc=Date.parse(`${to}T23:59:59Z`) - offsetMinutes*60*1000;
  if(!Number.isFinite(startUtc)||!Number.isFinite(endUtc)||endUtc<startUtc) throw new Error('Invalid date range');
  return {from:Math.floor(startUtc/1000),to:Math.floor(endUtc/1000)};
}
function localDate(epochSeconds,offsetMinutes=0){return new Date((Number(epochSeconds)*1000)+(offsetMinutes*60000)).toISOString().slice(0,10)}
function summarizeActivities(activities=[],expectedHours=0,offsetMinutes=0){
  let seconds=0; const days=new Set(); const projects={};
  for(const a of activities||[]){const from=Number(a.from),to=Number(a.to);if(Number.isFinite(from)&&Number.isFinite(to)&&to>from){seconds+=to-from;days.add(localDate(from,offsetMinutes));const key=a.projectId==null?'Unassigned':String(a.projectId);projects[key]=(projects[key]||0)+(to-from);}}
  const trackedHours=seconds/3600; return {trackedSeconds:seconds,trackedHours,activeDays:days.size,expectedHours:Number(expectedHours||0),coverage:Number(expectedHours)>0?Math.min(100,(trackedHours/Number(expectedHours))*100):null,projectSeconds:projects};
}
async function fetchScreenshotsChunked(env,activityIds){
  const out=[]; const ids=[...new Set((activityIds||[]).filter(Boolean))];
  for(let i=0;i<ids.length;i+=100){const part=ids.slice(i,i+100);const data=await scrinFetch(env,'/api/v2/GetScreenshots',part);if(Array.isArray(data))out.push(...data);}
  return out;
}
function summarizeScreenshots(shots=[]){
  const apps={}; let activitySum=0,activityCount=0;
  for(const s of shots||[]){if(Number.isFinite(Number(s.activityLevel))){activitySum+=Number(s.activityLevel);activityCount++;}for(const a of (Array.isArray(s.applications)?s.applications:[])){const name=a.applicationName||'Unknown';apps[name]=(apps[name]||0)+Number(a.duration||0);}}
  const totalApp=Object.values(apps).reduce((a,b)=>a+b,0)||1;
  const appSummary=Object.entries(apps).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,seconds])=>[name,Math.round((seconds/totalApp)*100)]);
  const preview=(shots||[]).slice(0,12).map(s=>[new Date(Number(s.taken)*1000).toISOString().slice(11,16),s.applications?.find(a=>a.fromScreen)?.applicationName||s.applications?.[0]?.applicationName||'Screenshot',Number(s.activityLevel)||null,s.thumbUrl||s.url||null]);
  return {averageActivityLevel:activityCount?Math.round(activitySum/activityCount):null,apps:appSummary,preview};
}
function projectSummary(metrics,common){
  const nameMap={}; const walk=(x)=>{if(!x||typeof x!=='object')return;if(Array.isArray(x)){for(const v of x)walk(v);return;}if(x.id!=null&&typeof x.name==='string'&&/project/i.test(x.constructor?.name||'')===false){/* best-effort generic id/name map */}for(const [k,v] of Object.entries(x)){if(k==='projects'&&Array.isArray(v)){for(const p of v){if(p?.id!=null)nameMap[String(p.id)]=p.name||`Project ${p.id}`;}}else if(v&&typeof v==='object')walk(v);}}; walk(common);
  const total=Object.values(metrics.projectSeconds||{}).reduce((a,b)=>a+b,0)||1;return Object.entries(metrics.projectSeconds||{}).sort((a,b)=>b[1]-a[1]).map(([id,sec])=>[nameMap[id]||`Project ${id}`,Math.round((sec/total)*100)]);
}
async function openAiReport(env,input){
  if(!env.OPENAI_API_KEY || !env.OPENAI_MODEL) return input.benchmark || {
    headline:'WGM generated a structured draft from the verified tracking period.',summary:'Objective time and workstream data were prepared for human review. Configure OPENAI_API_KEY and OPENAI_MODEL to generate live narrative.',strengths:['Verified calculations are available for review.'],coaching:'Review project labels and context before release.',clientContext:'Human review is required.',nextFocus:'Complete reviewer validation.',integrity:'No integrity conclusion generated without live AI and reviewer validation.'
  };
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_MODEL,input:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:`Create the WGM monthly report draft from this verified input. Do not infer facts that are not present.\n\n${JSON.stringify(input)}`}],text:{format:{type:'json_schema',name:'wgm_monthly_report',strict:true,schema:REPORT_SCHEMA}}})});
  const data=await response.json();if(!response.ok)throw new Error(`OpenAI ${response.status}: ${JSON.stringify(data).slice(0,400)}`);const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;if(!text)throw new Error('No structured report returned');return JSON.parse(text);
}

export default {async fetch(request,env){const url=new URL(request.url);
  if(url.pathname==='/api/health') return json({ok:true,mode:env.DEMO_MODE==='false'?'live':'demo'});
  if(url.pathname==='/api/scrin/common'&&request.method==='POST'){try{const demo=env.DEMO_MODE!=='false';const raw=demo?demoCommon():await scrinFetch(env,'/api/v2/GetCommonData',{});const n=normalizeCommon(raw);return json({demo,companyCount:n.companies.length,employees:n.employees,companies:n.companies});}catch(e){return json({error:e.message},500)}}
  if(url.pathname==='/api/scrin/activities'&&request.method==='POST'){try{const body=await readJson(request);if(!Array.isArray(body.ranges))return json({error:'Expected { ranges: [{ employmentId, from, to }] }'},400);const data=await scrinFetch(env,'/api/v2/GetActivities',body.ranges);return json({activities:data});}catch(e){return json({error:e.message},500)}}
  if(url.pathname==='/api/scrin/screenshots'&&request.method==='POST'){try{const body=await readJson(request);if(!Array.isArray(body.activityIds))return json({error:'Expected { activityIds: [...] }'},400);const data=await scrinFetch(env,'/api/v2/GetScreenshots',body.activityIds);return json({screenshots:data});}catch(e){return json({error:e.message},500)}}
  if(url.pathname==='/api/wgm/period-data'&&request.method==='POST'){try{
    const body=await readJson(request);if(env.DEMO_MODE!=='false')return json({error:'Switch DEMO_MODE=false to query live Scrin period data.'},409);
    if(!body.employmentId||!body.from||!body.to)return json({error:'employmentId, from and to are required'},400);
    const range=epochRange(body.from,body.to,Number(body.timezoneOffsetMinutes||0));
    const [common,activities]=await Promise.all([scrinFetch(env,'/api/v2/GetCommonData',{}),scrinFetch(env,'/api/v2/GetActivities',[{employmentId:String(body.employmentId),from:range.from,to:range.to}])]);
    const metrics=summarizeActivities(Array.isArray(activities)?activities:[],Number(body.expectedHours||0),Number(body.timezoneOffsetMinutes||0));
    const workstreams=projectSummary(metrics,common); let shots=[],shotSummary={apps:[],preview:[],averageActivityLevel:null};
    if(body.includeScreenshots){shots=await fetchScreenshotsChunked(env,(activities||[]).map(a=>a.id));shotSummary=summarizeScreenshots(shots)}
    return json({metrics,workstreams,apps:shotSummary.apps,averageActivityLevel:shotSummary.averageActivityLevel,screenshotCount:shots.length,screenshotPreview:shotSummary.preview.map(([time,app,level,url])=>[time,app,level,url]),screenshotEvidenceSummary:{count:shots.length,averageActivityLevel:shotSummary.averageActivityLevel,topApplications:shotSummary.apps.slice(0,6)}});
  }catch(e){return json({error:e.message},500)}}
  if(url.pathname==='/api/reports/generate'&&request.method==='POST'){try{const body=await readJson(request);const report=await openAiReport(env,body);return json({report,generatedBy:env.OPENAI_API_KEY&&env.OPENAI_MODEL?'openai':'prototype',requiresHumanReview:true});}catch(e){return json({error:e.message},500)}}
  if(url.pathname==='/api/reports/release'&&request.method==='POST'){const body=await readJson(request);return json({status:'released',deliveryEvent:'queued',ghlIntegrated:false,recipient:body.recipient||null});}
  return env.ASSETS.fetch(request);
}};
