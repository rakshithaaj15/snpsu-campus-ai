/// <reference lib="dom" />
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser = await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
const errors:string[]=[];
const speechMock = String.raw`
window.__voiceTest={starts:0,aborts:0,spoken:[],rec:null,current:null,error:null};
window.SpeechRecognition=class {
  start(){window.__voiceTest.rec=this;window.__voiceTest.starts++;if(window.__voiceTest.error){this.onerror({error:window.__voiceTest.error});return;}if(this.onstart)this.onstart();}
  abort(){window.__voiceTest.aborts++;}
  stop(){if(this.onend)this.onend();}
};
window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
  speak(u){window.__voiceTest.spoken.push(u.text);window.__voiceTest.current=u;if(u.onstart)u.onstart();},
  cancel(){const u=window.__voiceTest.current;window.__voiceTest.current=null;if(u&&u.onend)u.onend();}
}});
`;
async function makeContext(theme='light',mockVoice=true) {
  const context=await browser.newContext();
  await context.addInitScript((theme)=>{
    localStorage.setItem('sac:profile',JSON.stringify({name:'Guide QA',role:'student',srn:'DEMO-S-106',dept:'Computer Science',year:'2',section:'A',academicStatus:'registered'}));
    localStorage.setItem('sac:prefs',JSON.stringify({theme,liveLocation:false,finderOptIn:true,showName:false}));
  },theme);
  if(mockVoice)await context.addInitScript(speechMock);
  const page=await context.newPage();
  page.on('pageerror',(e)=>errors.push(e.stack||e.message));
  return {context,page};
}
try {
  const {context,page}=await makeContext();
  const status=await context.request.get(base+'/api/campus-guide/status');
  expect(status.status()).toBe(200);
  expect((await status.json()).mode).toBe('demo');
  const invalid=await context.request.post(base+'/api/campus-guide/chat',{data:{message:''}});
  expect(invalid.status()).toBe(400);
  const apiAnswer=await context.request.post(base+'/api/campus-guide/chat',{data:{message:'Library?',history:[],context:{role:'parent',page:'Campus Map',facts:'Demo only',demoReply:{text:'Demo only',actions:[{label:'Invalid',href:'javascript:alert(1)'},{label:'Map',href:'/portal/map'}]}}}});
  expect(apiAnswer.status()).toBe(200);
  const result=await apiAnswer.json();
  expect(result.source).toBe('demo');expect(result.model).toBe(null);expect(result.actions).toEqual([{label:'Map',href:'/portal/map'}]);
  await page.goto(base+'/portal');
  await expect(page.getByTestId('chat-log')).toBeVisible();
  expect(await page.evaluate('window.__voiceTest.starts')).toBe(0);
  await page.getByRole('button',{name:'How do I register for an event?',exact:true}).click();
  await expect(page.getByTestId('chat-log')).toContainText('sample registration');
  await page.getByRole('button',{name:'How do I report a lift issue?',exact:true}).click();
  await expect(page.getByTestId('chat-log')).toContainText('confirm the location');
  await page.getByRole('button',{name:'Open Campus Guide',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('guide-log')).toContainText('sample registration');
  await expect(page.getByTestId('input-chat')).toHaveCount(0);
  await page.getByTestId('input-guide').fill('Where is the library?');
  await page.getByTestId('button-send-guide').click();
  await expect(page.getByTestId('guide-state-guide')).toHaveText('Idle');
  await expect(page.getByTestId('guide-log')).toContainText('Library');
  await page.getByTestId('guide-log').getByRole('link',{name:'Route to Library',exact:true}).click();
  await expect(page).toHaveURL(/\/portal\/map/);
  await page.getByRole('button',{name:'Open Campus Guide',exact:true}).click();
  await expect(page.getByTestId('guide-log')).toContainText('Where is the library?');
  await page.getByRole('button',{name:'How do I use this website?',exact:true}).click();
  await expect(page.getByTestId('guide-log')).toContainText('Campus Map: search');
  await page.getByRole('button',{name:'Start voice input',exact:true}).click();
  await expect(page.getByTestId('guide-state-guide')).toHaveText('Listening');
  await page.evaluate(String.raw`window.__voiceTest.rec.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'Where is the library?'}}]});`);
  await expect(page.getByTestId('guide-state-guide')).toHaveText('Speaking');
  expect(await page.evaluate('window.__voiceTest.spoken.length')).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Mute voice',exact:true}).click();
  await expect(page.getByTestId('guide-state-guide')).toHaveText('Idle');
  await page.getByRole('button',{name:'Start voice input',exact:true}).click();
  const before=await page.evaluate('window.__voiceTest.spoken.length');
  await page.evaluate(String.raw`window.__voiceTest.rec.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'How do I report a lift issue?'}}]});`);
  await expect(page.getByTestId('guide-state-guide')).toHaveText('Idle');
  expect(await page.evaluate('window.__voiceTest.spoken.length')).toBe(before);
  await page.getByRole('button',{name:'Unmute voice',exact:true}).click();
  await page.evaluate("window.__voiceTest.error='not-allowed'");
  await page.getByRole('button',{name:'Start voice input',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('permission denied');
  await expect(page.getByRole('button',{name:'Retry microphone',exact:true})).toBeVisible();
  await page.evaluate("window.__voiceTest.error=null");
  await page.getByRole('button',{name:'Retry microphone',exact:true}).click();
  await expect(page.getByTestId('guide-state-guide')).toHaveText('Listening');
  await page.getByRole('button',{name:'Close guide',exact:true}).click();
  expect(await page.evaluate('window.__voiceTest.rec.onresult')).toBe(null);
  await page.getByRole('button',{name:'Open Campus Guide',exact:true}).click();
  await expect(page.getByTestId('guide-state-guide')).toHaveText('Idle');
  await page.route('**/api/campus-guide/chat',(route)=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Service unavailable"}'}));
  await page.getByTestId('input-guide').fill('How do I use this website?');
  await page.getByTestId('button-send-guide').click();
  await expect(page.getByTestId('guide-log')).toContainText('Guide API unavailable');
  await page.unroute('**/api/campus-guide/chat');
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(page.getByTestId('guide-state-guide')).not.toHaveText('Thinking');
  await page.getByRole('button',{name:'Close guide',exact:true}).click();
  await page.route('**/api/campus-guide/chat',async(route)=>{await new Promise((r)=>setTimeout(r,1500));await route.fulfill({json:{text:'Stale reply must not appear',source:'demo',actions:[],notice:'test',model:null}}).catch(()=>{});});
  await page.getByRole('button',{name:'Open Campus Guide',exact:true}).click();
  await page.getByTestId('input-guide').fill('Where is the library?');
  await page.getByTestId('button-send-guide').click();
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  await expect(page.getByTestId('guide-log')).toContainText('Request stopped');
  await page.waitForTimeout(1600);
  await expect(page.getByTestId('guide-log')).not.toContainText('Stale reply must not appear');
  await page.unroute('**/api/campus-guide/chat');
  await page.getByRole('button',{name:'Clear conversation',exact:true}).click();
  await expect(page.getByTestId('guide-log')).not.toContainText('Where is the library?');
  await context.close();
  console.log('PASS actual demo API, validation/action allowlist, connected help, persistent shared chat, speech transcript/replies, mute, denied permission/retry, close/stop/cancel and API-failure fallback');

  await mkdir('../screenshots/campus-guide',{recursive:true});
  for(const theme of ['light','dark']){
    const {context,page}=await makeContext(theme);
    await page.goto(base+'/portal/predictions');
    await page.getByRole('button',{name:'Open Campus Guide',exact:true}).click();
    await page.getByRole('button',{name:'How do I use this website?',exact:true}).click();
    await expect(page.getByTestId('guide-log')).toContainText('Predictions:');
    await page.waitForTimeout(300);
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(axe.violations.map((v)=>({id:v.id,nodes:v.nodes.map((n)=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
    await page.screenshot({path:`../screenshots/campus-guide/${theme}-desktop.jpg`});
    for(const width of [320,390]){
      await page.setViewportSize({width,height:760});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      const box=await page.getByRole('dialog').boundingBox();
      expect(box!.width).toBeLessThanOrEqual(width);expect(box!.x).toBeGreaterThanOrEqual(0);
      await expect(page.getByTestId('input-guide')).toBeInViewport();
      await page.screenshot({path:`../screenshots/campus-guide/${theme}-${width}.jpg`});
    }
    await page.setViewportSize({width:320,height:568});
    await expect(page.getByTestId('input-guide')).toBeInViewport();
    await expect(page.getByTestId('guide-log')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Open Campus Guide',exact:true})).toBeFocused();
    await context.close();
    console.log(`PASS ${theme}: current-page guide, accessible modal/focus/Escape, contrast and responsive 320/390px`);
  }
  const unsupported=await makeContext('light',false);
  await unsupported.context.addInitScript("delete window.SpeechRecognition;delete window.webkitSpeechRecognition;Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true})");
  await unsupported.page.goto(base+'/portal');
  await expect(unsupported.page.locator('main')).toContainText('Voice input is unavailable');
  await expect(unsupported.page.locator('main')).toContainText('Spoken replies are unavailable');
  await unsupported.page.getByTestId('input-chat').fill('Where is the library?');
  await unsupported.page.getByTestId('button-send-chat').click();
  await expect(unsupported.page.getByTestId('chat-log')).toContainText('Library');
  await unsupported.context.close();
  expect(errors).toEqual([]);
  console.log('PASS unsupported speech services retain working text chat; no uncaught browser errors');
}finally{await browser.close();}
