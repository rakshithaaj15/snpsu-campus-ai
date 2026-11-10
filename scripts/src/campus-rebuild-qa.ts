/// <reference lib="dom" />
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const base=process.env.REPLIT_DEV_DOMAIN?`https://${process.env.REPLIT_DEV_DOMAIN}`:'http://127.0.0.1:80';
const browser=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
const runtime:string[]=[];
page.on('pageerror',(e)=>runtime.push(e.message));
const go=async(path:string)=>{await page.goto(base+path);await page.waitForTimeout(300);};
const click=async(id:string)=>page.getByTestId(id).click();
const roles=['student','newstudent','parent','faculty','organizer','admin'];
const expected=['/portal','/portal','/portal','/portal','/portal/event-management','/portal/intelligence'];
const check=(ok:unknown,msg:string)=>{if(!ok)throw new Error(msg);};
const persona=async(role:string)=>{await go('/demo');await click('demo-role-'+role);await expect(page).toHaveURL(new RegExp(expected[roles.indexOf(role)]+'$'));};
try{
  const manifest=JSON.parse(await readFile(root+'/docs/approved-reference-integrity.json','utf8'));
  for(const file of manifest.originalFiles){const bytes=await readFile(root+'/'+file);check(createHash('sha256').update(bytes).digest('hex')===manifest.sha256,'Original reference changed: '+file);}
  await go('/register');
  await page.getByTestId('input-register-name').fill('QA User');
  await page.getByTestId('input-register-email').fill('qa@example.test');
  await page.getByTestId('input-register-password').fill('SamplePass1!');
  await click('button-register-submit');
  await expect(page.getByTestId('error-register-form')).toBeVisible();
  check(!await page.evaluate(()=>JSON.parse(localStorage.getItem('sac:profile')||'null')),'Unconfigured real registration created a profile');
  await go('/login');await click('button-google');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  console.log('PASS real auth remains separate and unconfigured');
  for(const role of roles){await persona(role);await expect(page.getByText('Sample data / Demo',{exact:true}).first()).toBeVisible();if(role!=='student'){await go('/portal');await expect(page.getByTestId('text-no-home-schedule')).toBeVisible();}}
  console.log('PASS all six one-click personas and role-aware timetables');
  for(const role of ['student','newstudent','parent','faculty']){
    await persona(role);await go('/onboarding');await click('button-onboarding-next');
    if(role==='student'){await page.getByTestId('input-onboarding-srn').fill('DEMO-S-106');await click('button-check-srn');await page.getByTestId('checkbox-ack').check();}
    if(role==='parent'){await page.getByTestId('input-onboarding-ward').fill('DEMO-S-106');await click('button-check-ward');await page.getByTestId('checkbox-ack').check();}
    if(role==='newstudent')await page.getByTestId('input-onboarding-srn').fill('PROV-QA-204');
    await click('button-onboarding-finish');await expect(page).toHaveURL(/\/portal$/);
    check(await page.evaluate(()=>JSON.parse(localStorage.getItem('sac:profile')||'null')?.role)===role,'Onboarding lost role context');
  }
  console.log('PASS four-role onboarding and authorized/provisional academic context');
  await persona('student');await go('/portal/events?event=robotics');
  await click('button-register-event-robotics');
  await expect(page.getByTestId('button-register-event-robotics')).toContainText(/Cancel/i);
  await page.reload();await expect(page.getByTestId('button-register-event-robotics')).toContainText(/Cancel/i);
  await click('link-event-venue');await expect(page).toHaveURL(/focus=aud/);
  await go('/portal/notifications');await expect(page.getByText('Registered: AI & Robotics Workshop',{exact:true})).toBeVisible();
  await persona('parent');await go('/portal/notifications');await expect(page.getByText('Registered: AI & Robotics Workshop',{exact:true})).toHaveCount(0);
  await go('/portal/events?event=robotics');await expect(page.getByTestId('button-register-event-robotics')).not.toContainText(/Cancel/i);
  await go('/portal/event-management');await expect(page.getByTestId('panel-event-access')).toBeVisible();
  console.log('PASS registration persistence, persona isolation, venue map and notifications');
  await persona('organizer');await click('button-create-event');
  for(const [field,value]of Object.entries({title:'QA Connected Event',date:'2026-10-09',time:'10:00',endTime:'12:00',room:'Seminar Hall QA',capacity:'25',description:'A connected sample event for campus QA.',requirements:'No real booking or payment.'})){
    await page.getByTestId('input-event-'+field).fill(value);
  }
  await page.getByTestId('input-event-venue').selectOption('lib');
  await page.getByTestId('select-event-status').selectOption('Published');
  await click('button-save-event');
  await expect(page.getByText('QA Connected Event',{exact:true}).first()).toBeVisible();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('sac:events')||'[]').find((e:{title:string})=>e.title==='QA Connected Event')?.id) as string;
  check(id,'Event did not persist');
  await go('/portal/events?event='+id);await expect(page.getByText('QA Connected Event',{exact:true}).first()).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('sac:scenario','10'));
  await go('/portal/predictions');await expect(page.getByText(/QA Connected Event/).first()).toBeVisible();
  await go('/portal/event-management');await click('button-edit-event-'+id);await page.getByTestId('input-event-title').fill('QA Edited Event');await click('button-save-event');
  await expect(page.getByText('QA Edited Event',{exact:true}).first()).toBeVisible();
  await click('button-delete-event-'+id);await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:/Delete|Remove/}).click();
  await expect(page.getByText('QA Edited Event',{exact:true})).toHaveCount(0);
  console.log('PASS event create/publish/edit/confirmed-delete and predictions context');
  await persona('admin');
  await page.evaluate(()=>localStorage.setItem('sac:cctv',JSON.stringify([{id:'qa-review',ref:'QA-CASE',area:'Library',window:'10:00–10:30',reason:'Uncertain sample loss window. No footage is accessed.',at:new Date().toISOString(),status:'Pending review'}])));
  await go('/portal/investigation');await click('approve-cctv-qa-review');await expect(page.getByTestId('cctv-status-qa-review')).toHaveText('Approved for review');
  await persona('student');await go('/portal/investigation');await expect(page.getByTestId('panel-cctv-log')).toHaveCount(0);
  console.log('PASS authorized sample administrator review, no student request-log access');
  const directory=root+'/screenshots/rebuild';await mkdir(directory,{recursive:true});
  const findings:unknown[]=[];
  for(const theme of ['light','dark']){
    await page.evaluate((theme)=>{localStorage.setItem('sac:prefs',JSON.stringify({theme,liveLocation:false,finderOptIn:true,showName:false}));},theme);
    for(const role of roles){await persona(role);check(await page.locator('html').getAttribute('data-theme')===theme,'Persona reset theme');}
    await persona('organizer');
    for(const route of ['/demo','/portal/events','/portal/event-management']){
      await go(route);
      const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      findings.push(...result.violations.map((v)=>({theme,route,id:v.id,nodes:v.nodes.map((n)=>n.target)})));
      for(const width of [320,390,768,1440]){
        await page.setViewportSize({width,height:900});await page.waitForTimeout(60);
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflows ${width}/${theme}`);
      }
      await page.screenshot({path:`${directory}/${theme}-${route.split('/').pop()}.jpg`,type:'jpeg',quality:85});
    }
    await go('/');await page.screenshot({path:`${directory}/${theme}-landing.jpg`,type:'jpeg',quality:88});
  }
  await writeFile('/tmp/campus-rebuild-qa.json',JSON.stringify({findings,runtime},null,2));
  check(!findings.length,'Accessibility findings: '+JSON.stringify(findings));
  check(!runtime.length,'Runtime errors: '+runtime.join('; '));
  console.log('PASS both themes, responsive new screens, accessibility, original image integrity');
}finally{await browser.close();}
