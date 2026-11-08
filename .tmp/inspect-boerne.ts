import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const backend = createRequire(resolve('../farmers-market-platform/package.json'));
const {loadDemoEnvironment,assertDemoEnvironment}=backend('./scripts/market-operations-demo/environment.ts');
const env=loadDemoEnvironment();assertDemoEnvironment(env);
const {Client}=backend('pg');const db=new Client({host:env.DB_HOST,port:Number(env.DB_PORT),database:env.DB_NAME,user:env.DB_USERNAME,password:env.DB_PASSWORD});
await db.connect();try{
const target=(await db.query('SELECT current_database() AS database,host(inet_server_addr()) AS address')).rows[0];assert.equal(target.database,'vendure_demo_market_ops');assert.ok(['127.0.0.1','::1'].includes(target.address));
console.log(JSON.stringify({target,markets:(await db.query(`SELECT id,name,slug,"channelId" FROM farmers_market WHERE name ILIKE '%boerne%'`)).rows},null,2));
}finally{await db.end();}


