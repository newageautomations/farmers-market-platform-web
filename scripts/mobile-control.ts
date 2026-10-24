import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { nativeHandoffId } from '../packages/api/src/native-mobile';
const dir = resolve(
    process.argv.includes('--stage-g')
      ? '.pos-stage-g-demo'
      : '.pos-stage-e-demo',
  ),
  action = process.argv[2],
  handoffId = nativeHandoffId(`market-pos://checkout/${process.argv[3]}`);
assert.ok(
  ['SUCCESS', 'DECLINE', 'CANCEL', 'INTERRUPT', 'RECOVER'].includes(
    action ?? '',
  ),
);
const ready = JSON.parse(readFileSync(resolve(dir, 'ready.json'), 'utf8'));
assert.match(ready.database, /^vendure_test_pos_demo_\d+_[a-f0-9]+$/);
assert.ok(
  !existsSync(resolve(dir, 'request.json')),
  'A controlled request is already pending',
);
const requestId = randomUUID();
writeFileSync(
  resolve(dir, 'request.json'),
  JSON.stringify({ requestId, database: ready.database, handoffId, action }),
  { flag: 'wx' },
);
for (let i = 0; i < 120; i++) {
  const file = resolve(dir, 'response.json');
  if (existsSync(file)) {
    const response = JSON.parse(readFileSync(file, 'utf8'));
    if (response.requestId === requestId) {
      console.log(JSON.stringify(response));
      if (response.error) process.exitCode = 1;
      break;
    }
  }
  if (i === 119)
    throw new Error(
      'Controlled adapter response timed out. Recover the original payment before retrying',
    );
  await new Promise((r) => setTimeout(r, 250));
}
