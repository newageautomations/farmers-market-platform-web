const {createRequire}=require('node:module');const path=require('node:path');const assert=require('node:assert/strict');
const rb=createRequire(path.resolve(__dirname,'../../farmers-market-platform/package.json'));
rb('ts-node').register({project:path.resolve(__dirname,'../../farmers-market-platform/scripts/market-operations-demo/tsconfig.json')});
const environment=rb('./scripts/market-operations-demo/environment.ts');const env=environment.loadDemoEnvironment();environment.assertDemoEnvironment(env);
const {Client}=rb('pg');
async function main(){const c=new Client({host:env.DB_HOST,port:Number(env.DB_PORT),database:env.DB_NAME,user:env.DB_USERNAME,password:env.DB_PASSWORD});await c.connect();try{const {rows:[t]}=await c.query('select current_database() db,host(inet_server_addr()) host');assert.equal(t.db,'vendure_demo_market_ops');assert.ok(['127.0.0.1','::1'].includes(t.host));

await c.query('BEGIN');
try {
await c.query("select pg_advisory_xact_lock(7319037)");
const {rows:[vendor]}=await c.query("select id,name from platform_vendor where id=7 and name='Manna Roots'");assert.ok(vendor);
const {rows:units}=await c.query(`select u.id,u.gross,u.discount,s."customerId" customer,s."customerOrderId" order_id
from unit_financial_allocation u join purchase_financial_snapshot s on s.id=u."purchaseId" join "order" o on o.id=s."customerOrderId"
where u."vendorId"=7 and s.currency='USD' and s."customerId" is not null and o.state<>'Cancelled'
and s."customerId" in (select s2."customerId" from unit_financial_allocation u2 join purchase_financial_snapshot s2 on s2.id=u2."purchaseId" where u2."vendorId"=7 and s2."customerId" is not null group by 1 order by count(*) desc,s2."customerId" limit 12)
order by u.id`);
assert.ok(new Set(units.map(u=>u.customer)).size>=6);
await c.query('insert into loyalty_program(vendor_id,enabled) values(7,true) on conflict do nothing');
let {rows:[reward]}=await c.query(`select v.id,v.terms from loyalty_reward_version v join loyalty_reward r on r.id=v.reward_id where r.vendor_id=7 and v.terms->>'name'='Manna Roots demo thank-you reward'`);
if(!reward){const {rows:[r]}=await c.query("insert into loyalty_reward(vendor_id,status) values(7,'ACTIVE') returning id");const terms={name:'Manna Roots demo thank-you reward',kind:'FIXED',points:200,value:20,maximum:1500,minimum:0,variantIds:[],quantity:1,startsAt:null,endsAt:null,limit:null};({rows:[reward]}=await c.query('insert into loyalty_reward_version(reward_id,version,terms) values($1,1,$2) returning id,terms',[r.id,terms]));}
const wallets=new Map();let awards=0,redemptions=0;
const base=new Date();base.setUTCHours(12,0,0,0);base.setUTCDate(base.getUTCDate()-89);
async function entry(wallet,event,key,available,pending,reserved,date,order,unit=null,redemption=null){await c.query(`insert into loyalty_ledger(wallet_id,event,idempotency_key,available,pending,reserved,reason,created_at,order_id,unit_id,redemption_id) values($1,$2,$3,$4,$5,$6,'Explicit Manna Roots 90-day demo loyalty fixture',$7,$8,$9,$10) on conflict(idempotency_key) do nothing`,[wallet,event,key,available,pending,reserved,date,order,unit,redemption]);}
for(let i=0;i<units.length;i++){
const u=units[i];if(!wallets.has(u.customer)){const {rows:[w]}=await c.query('insert into loyalty_wallet(vendor_id,customer_id) values(7,$1) on conflict(vendor_id,customer_id) do update set vendor_id=excluded.vendor_id returning id',[u.customer]);wallets.set(u.customer,w.id);}
const wallet=wallets.get(u.customer),points=Number(u.gross)-Number(u.discount);assert.ok(Number.isSafeInteger(points)&&points>=0);
const date=new Date(base.getTime()+Math.floor(i*89/Math.max(1,units.length-1))*86400000);
const {rowCount}=await c.query("insert into loyalty_award_unit(unit_id,wallet_id,points,state) values($1,$2,$3,'AVAILABLE') on conflict do nothing",[u.id,wallet,points]);
if(rowCount&&points){await entry(wallet,'PENDING_AWARD','manna90:pending:'+u.id,0,points,0,date,u.order_id,u.id);await entry(wallet,'AWARD_FINALIZED','manna90:earned:'+u.id,points,-points,0,date,u.order_id,u.id);awards++;}
}
for(const [customer,wallet] of wallets){
await c.query('insert into loyalty_qualification(wallet_id,version_id,created_at) values($1,$2,$3) on conflict do nothing',[wallet,reward.id,base]);
const orders=[...new Set(units.filter(u=>u.customer===customer).map(u=>u.order_id))];
for(let i=0;i<orders.length;i++){const order=orders[i];const {rows:[balance]}=await c.query('select coalesce(sum(available),0)::text balance from loyalty_ledger where wallet_id=$1',[wallet]);if(Number(balance.balance)<200)continue;
const date=new Date(base.getTime()+(Math.floor(i*65/Math.max(1,orders.length-1))+24)*86400000);
const {rows:[d]}=await c.query(`insert into loyalty_redemption(wallet_id,version_id,order_id,terms,status,discount,created_at,completed_at) values($1,$2,$3,$4,'COMPLETED',20,$5,$5) on conflict do nothing returning id`,[wallet,reward.id,order,reward.terms,date]);
if(d){await entry(wallet,'REDEMPTION_RESERVED','manna90:reserve:'+d.id,-200,0,200,date,order,null,d.id);await entry(wallet,'REDEMPTION_COMPLETED','manna90:redeem:'+d.id,0,0,-200,date,order,null,d.id);redemptions++;}
}}
const {rows:check}=await c.query(`select w.id from loyalty_wallet w where w.vendor_id=7 and w.id=any($1::int[]) and coalesce((select sum(available) from loyalty_ledger where wallet_id=w.id),0) <> coalesce((select sum(points) from loyalty_award_unit where wallet_id=w.id and state='AVAILABLE'),0)-coalesce((select sum((terms->>'points')::int) from loyalty_redemption where wallet_id=w.id and status in ('RESERVED','COMPLETED')),0)+coalesce((select sum(available) from loyalty_ledger where wallet_id=w.id and event in ('DEMO_ADJUSTMENT','MANUAL_ADJUSTMENT')),0)`,[[...wallets.values()]]);assert.equal(check.length,0,'Wallet balances must reconcile');
await c.query('COMMIT');console.log(JSON.stringify({database:t.db,vendor:vendor.name,customers:wallets.size,newAwards:awards,newRedemptions:redemptions,from:base.toISOString().slice(0,10),through:new Date().toISOString().slice(0,10),balancesReconcile:true}));
}catch(e){await c.query('ROLLBACK');throw e;}
}finally{await c.end();}}main().catch(e=>{console.error(e.message);process.exitCode=1});

