const {createRequire}=require('node:module');
const b=createRequire(require('node:path').resolve('../farmers-market-platform/package.json'));
require('tsx/cjs');
const {loadDemoEnvironment}=b('./scripts/market-operations-demo/environment.ts');
const e=loadDemoEnvironment();
const {Client}=b('pg');
(async()=>{const db=new Client({host:e.DB_HOST,port:+e.DB_PORT,database:e.DB_NAME,user:e.DB_USERNAME,password:e.DB_PASSWORD});await db.connect();try{await db.query('BEGIN READ ONLY');console.log(JSON.stringify((await db.query(`SELECT current_database() AS db,host(inet_server_addr()) AS host`)).rows));console.log(JSON.stringify((await db.query(`SELECT v.id,v.slug,v."primaryChannelId",c.token,c."defaultCurrencyCode",p.enabled FROM platform_vendor v JOIN channel c ON c.id=v."primaryChannelId" LEFT JOIN loyalty_program p ON p.vendor_id=v.id WHERE v.slug='manna-roots'`)).rows));console.log(JSON.stringify((await db.query(`SELECT code,permissions FROM role WHERE code='testing-vendor:manna-roots'`)).rows));await db.query('ROLLBACK');}finally{await db.end()}})().catch(e=>{console.error(e.message);process.exitCode=1});

