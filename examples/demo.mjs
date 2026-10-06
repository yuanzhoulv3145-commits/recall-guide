// Recall Guide -- runs the whole chain with a FAKE small model and FAKE vectors.
// No API key needed. Swap fakeAskJson / fakeEmbed for real ones in your app.
//   npm install && node demo.mjs

import fs from 'node:fs';
import Database from 'better-sqlite3';
import { recall, MEMORY_HEADER } from './recall.js';
import { saveEntity, matchEntities, formatEntities, markGiven } from './entities.js';

const db = new Database(':memory:');
db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));

const now = Date.parse('2026-10-06T06:00:00Z');          // a Tuesday, Beijing afternoon
const memories = [
  ['m1', '米娅不吃香菜和葱', '2026-09-03 10:00:00', [1, 0, 0]],
  ['m2', '阿澈不喜欢榴莲的味道', '2026-09-04 10:00:00', [0.9, 0.1, 0]],
  ['m3', '米娅和阿澈上周三去吃了牛油火锅，她说下次要点鸳鸯锅', '2026-10-01 12:00:00', [0, 1, 0]],
  ['m4', '米娅以前很爱吃火锅', '2026-07-01 12:00:00', [0, 0.95, 0.05]],
  ['m5', '米娅以前吃香菜（已更正）', '2026-06-01 12:00:00', [1, 0, 0]],
];
for (const [id, content, at] of memories) db.prepare('INSERT INTO memory(id, content, created_at) VALUES(?,?,?)').run(id, content, at);
db.prepare("UPDATE memory SET status='retired' WHERE id='m5'").run();
const vectors = memories.map(([id, , , v]) => ({ id, vector: v }));
db.prepare("INSERT INTO chats(sender, content, img_desc, created_at) VALUES('user', '[img]/photos/cat.jpg', '一只橘猫趴在窗台上晒太阳', '2026-10-04 03:00:00')").run();
saveEntity(db, { name: '小鹿', aliases: ['鹿鹿'], kind: 'person', note: '米娅的大学室友，常一起去图书馆', status: 'active' });

// --- fakes -----------------------------------------------------------------
// A real small model reads the prompt; this one pattern-matches the demo lines.
async function fakeAskJson(system, user) {
  if (system.includes('听懂器')) {
    const said = user.split('她现在说：')[1];
    if (/抱抱|晚安/.test(said)) return { search: false, topic: '', keywords: [], image: false, date: null };
    if (/不吃什么/.test(said)) return { search: true, topic: '米娅自己的忌口', keywords: ['不吃'], image: false, date: null };
    if (/火锅/.test(said)) return { search: true, topic: '米娅和阿澈上周三吃的火锅', keywords: ['火锅', '上周三'], image: false, date: { from: '2026-09-30', to: '2026-09-30' } };
    if (/猫/.test(said)) return { search: true, topic: '米娅发过的猫的照片', keywords: ['猫'], image: true, date: { from: '2026-10-04', to: '2026-10-04' } };
    if (/鹿鹿/.test(said)) return { search: true, topic: '小鹿是谁、和米娅的近况', keywords: ['鹿鹿'], image: false, date: null };
    return { search: false };
  }
  // picker: a real model judges; this one takes the first candidate about 米娅
  // (not 阿澈's own taste) that contains the thing the topic is about.
  const topic = user.match(/话题：(.*)/)[1];
  const want = /忌口/.test(topic) ? '不吃' : /火锅/.test(topic) ? '火锅' : /猫/.test(topic) ? '猫' : null;
  const lines = user.split('候选：\n')[1].split('\n');
  const i = want ? lines.findIndex(l => l.includes('米娅') && l.includes(want)) : -1;
  return { pick: i >= 0 ? i : null };
}
const fakeEmbed = async ([text]) => [/忌口|香菜/.test(text) ? [1, 0, 0] : /火锅/.test(text) ? [0, 1, 0] : [0, 0, 1]];

// --- run ---------------------------------------------------------------------
const lines = ['老公抱抱', '我不吃什么来着', '上周三那家火锅店叫啥来着', '前天发的那张猫猫图你还记得吗', '鹿鹿今天又来找我了'];
for (const line of lines) {
  const entities = matchEntities(db, line, { now });
  markGiven(db, entities, now);
  const r = await recall(db, line, { askJson: fakeAskJson, embed: fakeEmbed, vectors, now });
  const memoryBlock = r.items.length ? `${MEMORY_HEADER}\n- ${r.items[0].content}` : '';
  console.log(`\n她说：${line}`);
  console.log(`  路由：${r.reason}${r.route.date ? `，日期 ${r.route.date.from}${r.route.date.fallback ? '（窗口里没有，退回全部）' : ''}` : ''}，关键词 ${JSON.stringify(r.route.keywords)}`);
  const injected = [formatEntities(entities), memoryBlock].filter(Boolean).join('\n\n');
  console.log(injected ? injected.replace(/^/gm, '  │ ') : '  （这一轮不给记忆）');
}
