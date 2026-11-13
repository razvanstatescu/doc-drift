// Exploration helper: node tools/capture/q.mjs '<js expression evaluated in the page>' [urlMatch]
// or: node tools/capture/q.mjs --goto <url> ['<expr>']. Prints JSON. Emulates 1920x1080@2 while connected.
import { connect, sleep } from './lib.mjs';

const args = process.argv.slice(2);
let gotoUrl = null;
if (args[0] === '--goto') {
  gotoUrl = args[1];
  args.splice(0, 2);
}
const expr = args[0] || 'document.title';
const s = await connect(args[1]);
if (gotoUrl) await s.goto(gotoUrl, 4000);
else await sleep(800);
const res = await s.page.evaluate((e) => {
  // eslint-disable-next-line no-eval
  const v = (0, eval)(e);
  return v;
}, expr);
console.log(JSON.stringify(res, null, 1));
await s.close();
process.exit(0);
