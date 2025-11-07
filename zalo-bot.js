const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');
const defaultState = { running: false, target: 1, current_submitters: [], last_setnguoi: 1 };

// Load / save state
async function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(await fs.readFile(STATE_FILE, 'utf8')) };
  } catch (e) {
    await saveState(defaultState);
    return { ...defaultState };
  }
}

async function saveState(s) {
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

// Kiểm tra ID có duy nhất
function isUnique(arr, id) {
  return arr.findIndex(x => x.id === id) === -1;
}

// Timestamp cho file
function timestampForFile() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

(async () => {
  const state = await loadState();
  const userDataDir = path.join(__dirname, 'chrome-profile');

  const browser = await puppeteer.launch({
    headless: True, // hiện Chrome để quét QR
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userDataDir
  });

  const [page] = await browser.pages();
  await page.goto('https://chat.zalo.me', { waitUntil: 'networkidle2' });
  console.log('Quét QR Zalo lần đầu, nhấn ENTER khi đăng nhập xong.');
  await new Promise(resolve => process.stdin.once('data', _ => resolve()));

  // Gửi tin nhắn nhóm
  async function sendGroupMessage(page, text) {
    await page.evaluate(t => {
      const input = document.querySelector('[contenteditable="true"]');
      if (!input) return console.warn('Không tìm thấy ô chat');
      input.focus();
      document.execCommand('insertText', false, t);
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
      else input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter' }));
    }, text);
  }

  // Lắng nghe tin nhắn
  await page.exposeFunction('onNewMessage', async msg => {
    const s = await loadState();

    if (msg.text && msg.text.startsWith('!')) {
      const t = msg.text.trim();
      if (t === '!menu') {
        await sendGroupMessage(page, 'Lệnh: !menu !setnguoi <số> !start !check !exit');
        return;
      }
      if (t.startsWith('!setnguoi')) {
        const n = parseInt(t.split(' ')[1]);
        if (!isNaN(n) && n > 0) {
          s.target = n;
          s.last_setnguoi = n;
          await saveState(s);
          await sendGroupMessage(page, `Đã đặt mục tiêu ${n} người.`);
        } else await sendGroupMessage(page, 'Cú pháp: !setnguoi <số>');
        return;
      }
      if (t === '!start') {
        s.running = true;
        s.current_submitters = [];
        await saveState(s);
        await sendGroupMessage(page, `Bắt đầu đếm. Mục tiêu: ${s.target} người.`);
        return;
      }
      if (t === '!check') {
        let r = `Đã có ${s.current_submitters.length} người:\n`;
        r += s.current_submitters.map(x => x.name).join('\n');
        await sendGroupMessage(page, r);
        return;
      }
      if (t === '!exit') {
        s.running = false;
        s.current_submitters = [];
        await saveState(s);
        await sendGroupMessage(page, `Đã dừng đếm. last_setnguoi=${s.last_setnguoi}`);
        return;
      }
    }

    if (s.running && msg.hasImage) {
      const id = msg.senderId || msg.senderName || ('unknown_' + Math.random());
      if (isUnique(s.current_submitters, id)) {
        s.current_submitters.push({ id, name: msg.senderName || id });
        await saveState(s);
        await sendGroupMessage(page, `${msg.senderName} đã được ghi nhận (${s.current_submitters.length}/${s.target})`);
      }
      if (s.current_submitters.length >= s.target) {
        const fname = `submissions_${timestampForFile()}.txt`;
        await fs.writeFile(fname, s.current_submitters.map(x => x.name).join('\n'), 'utf8');
        await sendGroupMessage(page, `Đã đủ người nộp. Lưu vào ${fname}. Bộ đếm reset.`);
        s.running = false;
        s.current_submitters = [];
        s.target = s.last_setnguoi || s.target;
        await saveState(s);
      }
    }
  });

  // Observer DOM Zalo Web
  await page.evaluate(() => {
    function extract(node) {
      let text = '', hasImage = !!node.querySelector('img'), senderName = '';
      try { text = node.innerText || ''; } catch (e) { }
      try { senderName = node.querySelector('.name,.author-name')?.innerText.trim() || ''; } catch (e) { }
      return { text, hasImage, senderName, senderId: senderName };
    }

    const container = document.querySelector('.messages') || document.body;
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        Array.from(m.addedNodes).forEach(n => {
          if (!(n instanceof HTMLElement)) return;
          setTimeout(() => { const info = extract(n); if (info.hasImage || info.text.startsWith('!')) window.onNewMessage(info); }, 150);
        });
      });
    });
    obs.observe(container, { childList: true, subtree: true });
  });

  console.log('Bot đang chạy. Gõ !menu trong nhóm.');
})();
