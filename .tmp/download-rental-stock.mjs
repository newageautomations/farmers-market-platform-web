const {writeFile}=await import('node:fs/promises');
const ids=[26832125,8392460,4268526,8101095,33206680,2826787];
await Promise.all(ids.map(async id=>{const response=await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`);if(!response.ok)throw Error(`${id}: ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());await writeFile(`apps/admin/public/rental-stock/pexels-${id}.jpg`,bytes);console.log(id,bytes.length);}));
