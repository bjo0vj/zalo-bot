// zalo-bot.js
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');
const defaultState = { running:false, target:1, current_submitters:[], last_setnguoi:1 };

async function loadState(){
  try { return {...defaultState, ...JSON.parse(await fs.readFile(STATE_FILE,'utf8'))}; }
  catch(e){ await saveState(defaultState); return {...defaultState}; }
}
async function saveState(s){ await fs.writeFile(STATE_FILE, JSON.stringify(s,null,2),'utf8'); }
function uniqueById(arr,id){ return arr.findIndex(x=>x.id===id)!==-1; }
function timestampForFile(){ const d=new Date(); const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }

(async()=>{
  const state = await loadState();
  const userDataDir = './chrome-profile'; // thư mục lưu login Zalo

  const browser = await puppeteer.launch({
    headless:false, 
    args:['--no-sandbox','--disable-setuid-sandbox'],
    userDataDir
  });

  const page = (await browser.pages())[0];
  await page.goto('https://chat.zalo.me', {waitUntil:'networkidle2'});
  console.log('Đăng nhập Zalo và mở nhóm muốn bot lắng nghe. Nhấn ENTER khi sẵn sàng.');
  await new Promise(resolve => process.stdin.once('data',_=>resolve()));

  await page.exposeFunction('onNewMessage', async msg=>{
    const s = await loadState();

    // Lệnh
    if(msg.text && msg.text.startsWith('!')){
      const t=msg.text.trim();
      if(t==='!menu'){ await sendGroupMessage(page,'Lệnh: !menu !setnguoi <số> !start !check !exit'); return; }
      if(t.startsWith('!setnguoi')){ const n=parseInt(t.split(' ')[1]); if(!isNaN(n)&&n>0){ s.target=n; s.last_setnguoi=n; await saveState(s); await sendGroupMessage(page,`Đã đặt mục tiêu ${n} người.`); } else await sendGroupMessage(page,'Cú pháp: !setnguoi <số>'); return; }
      if(t==='!start'){ s.running=true; s.current_submitters=[]; await saveState(s); await sendGroupMessage(page,`Bắt đầu đếm. Mục tiêu: ${s.target} người.`); return; }
      if(t==='!check'){ const n=s.current_submitters.length; let r=`Đã có ${n} người:\n`; r+=s.current_submitters.map(x=>x.name).join('\n'); await sendGroupMessage(page,r); return; }
      if(t==='!exit'){ s.running=false; s.current_submitters=[]; await saveState(s); await sendGroupMessage(page,`Đã dừng đếm. last_setnguoi=${s.last_setnguoi}`); return; }
    }

    // Xử lý ảnh
    if(s.running && msg.hasImage){
      const id = msg.senderId||msg.senderName||('unknown_'+Math.random());
      if(!uniqueById(s.current_submitters,id)){
        s.current_submitters.push({id,name:msg.senderName||id});
        await saveState(s);
        await sendGroupMessage(page,`${msg.senderName} đã được ghi nhận (${s.current_submitters.length}/${s.target})`);
      }
      if(s.current_submitters.length>=s.target){
        const fname=`submissions_${timestampForFile()}.txt`;
        await fs.writeFile(fname,s.current_submitters.map(x=>x.name).join('\n'),'utf8');
        await sendGroupMessage(page,`Đã đủ người nộp. Lưu vào ${fname}. Bộ đếm reset.`);
        s.running=false; s.current_submitters=[]; s.target=s.last_setnguoi||s.target; await saveState(s);
      }
    }
  });

  // Chèn observer vào Zalo Web
  await page.evaluate(()=>{
    function extract(node){
      let text=''; try{text=node.innerText||'';}catch(e){}
      const hasImage=!!node.querySelector('img');
      let senderName=''; try{const s=node.querySelector('.name,.author-name'); if(s) senderName=s.innerText.trim();}catch(e){}
      return {text,hasImage,senderName,senderId:senderName};
    }
    const container=document.querySelector('.messages')||document.body;
    const obs=new MutationObserver(muts=>{for(const m of muts){for(const n of Array.from(m.addedNodes)){if(!(n instanceof HTMLElement)) continue; setTimeout(()=>{const info=extract(n); if(info.hasImage||info.text.startsWith('!')) window.onNewMessage(info);},150);}}});
    obs.observe(container,{childList:true,subtree:true});
  });

  async function sendGroupMessage(page,text){
    await page.evaluate(t=>{
      const input=document.querySelector('[contenteditable="true"]'); if(!input){console.warn('Không tìm thấy ô chat'); return;}
      input.focus(); document.execCommand('insertText',false,t);
      const btn=document.querySelector('button[type="submit"]'); if(btn) btn.click(); else input.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Enter',code:'Enter'}));
    },text);
  }

  console.log('Bot đang chạy. Gõ !menu trong nhóm.');
})();
