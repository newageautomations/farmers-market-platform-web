const {writeFile}=await import('node:fs/promises');
const photos=[['extension-cord','https://upload.wikimedia.org/wikipedia/commons/a/a8/Cable_reel_extension_cord.jpg'],['handwashing-station','https://upload.wikimedia.org/wikipedia/commons/8/8e/Public_Health_Prevents_Disease_in_Pods_%286824531%29.jpg']];
for(const [name,url] of photos){const r=await fetch(url);if(!r.ok)throw Error(`${name}: ${r.status}`);await writeFile(`apps/admin/public/rental-stock/${name}.jpg`,Buffer.from(await r.arrayBuffer()));console.log(name);}
