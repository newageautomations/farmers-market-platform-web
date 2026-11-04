const {createRequire}=require('node:module');const path=require('node:path');
const rb=createRequire(path.resolve('../farmers-market-platform/package.json'));
rb('ts-node').register({project:path.resolve('../farmers-market-platform/scripts/market-operations-demo/tsconfig.json'),transpileOnly:true});
const env=rb('./scripts/market-operations-demo/environment.ts').loadDemoEnvironment();
const {Client}=rb('pg');
(async()=>{const c=new Client({host:env.DB_HOST,port:Number(env.DB_PORT),database:env.DB_NAME,user:env.DB_USERNAME,password:env.DB_PASSWORD});await c.connect();for(const sql of ["select a.detail->>'occurrenceId' as occurrence_id,count(*) as orders,array_agg(distinct o.state) as states,count(distinct o.id) as unique_orders from market_operations_audit a join \"order\" o on o.id=(a.detail->>'orderId')::int where a.action like 'MANNA_PICKUP_V1_%' group by 1 order by 1"])console.log(JSON.stringify((await c.query(sql)).rows));await c.end()})().catch(e=>{console.error(e.message);process.exitCode=1});

