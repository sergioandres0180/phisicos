// Optional real HTTP/TLS integration check. Requires Apache 2.4 and OpenSSL locally.
const pages=require('./locales/pages.cjs'),{kinds}=require('./locales/site.cjs'),legacy=require('./locales/legacy-routes.cjs'),pageCount=Object.keys(pages).length*kinds.length;
// Defaults to macOS Apache; override APACHE_BIN, APACHE_MODULE_DIR and APACHE_MIME_TYPES elsewhere.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const http=require('node:http'),https=require('node:https'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {execFileSync,spawn}=require('node:child_process');
const apache=process.env.APACHE_BIN || '/usr/sbin/httpd';
const modules=process.env.APACHE_MODULE_DIR || '/usr/libexec/apache2';
const mime=process.env.APACHE_MIME_TYPES || '/etc/apache2/mime.types';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'phisicos-apache-'));
const root=path.join(__dirname,'release/public_html');
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
let server,output='';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const plain=await freePort(),secure=await freePort();
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',temp+'/key.pem','-out',temp+'/cert.pem','-days','1','-subj','/CN=phisicos.com'],{stdio:'ignore'});
 const enabled=['mpm_prefork','unixd','authz_core','authz_host','dir','autoindex','mime','rewrite','headers','filter','deflate','ssl'];
 const conf=`ServerRoot "${temp}"
ServerName phisicos.com:${plain}
DefaultRuntimeDir "${temp}"
Mutex file:${temp} default
PidFile "${temp}/httpd.pid"
ErrorLog "${temp}/error.log"
${enabled.map(m=>`LoadModule ${m}_module "${modules}/mod_${m}.so"`).join('\n')}
Listen 127.0.0.1:${plain}
Listen 127.0.0.1:${secure}
User ${os.userInfo().username}
Group ${execFileSync('id',['-gn'],{encoding:'utf8'}).trim()}
TypesConfig "${mime}"
DocumentRoot "${root}"
<Directory "${root}">
 AllowOverride All
 Require all granted
</Directory>
<VirtualHost 127.0.0.1:${secure}>
 ServerName phisicos.com:443
 UseCanonicalName On
 UseCanonicalPhysicalPort Off
 SSLEngine On
 SSLCertificateFile "${temp}/cert.pem"
 SSLCertificateKeyFile "${temp}/key.pem"
</VirtualHost>
`;
 fs.writeFileSync(temp+'/httpd.conf',conf);
 execFileSync(apache,['-t','-f',temp+'/httpd.conf'],{stdio:'pipe'});
 server=spawn(apache,['-f',temp+'/httpd.conf','-DFOREGROUND'],{detached:true,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 const request=(route,{tls=true,host='phisicos.com',headers={},method='GET'}={})=>new Promise((resolve,reject)=>{
  const r=(tls?https:http).request({hostname:'127.0.0.1',port:tls?secure:plain,path:route,method,rejectUnauthorized:false,servername:'phisicos.com',headers:{Host:host,...headers}},res=>{
   const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });r.setTimeout(5000,()=>r.destroy(new Error('Apache request timed out')));r.on('error',reject);r.end();
 });
 let ready=false;
 for(let i=0;i<60;i++){try{await request('/');ready=true;break;}catch{if(server.exitCode!==null)break;await delay(100);}}
 assert.ok(ready,'Apache did not start: '+output);
 for(const opts of [{tls:false},{host:'www.phisicos.com'},{tls:false,host:'www.phisicos.com'}]){
  const r=await request(pages.en.lander+'?mission=eco',opts);
  assert.equal(r.status,301);assert.equal(r.headers.location,'https://phisicos.com'+pages.en.lander+'?mission=eco');
 }
 console.log('PASS Apache HTTP and www redirects preserve path and query');
 for(const p of Object.values(pages))for(const route of kinds.map(kind=>p[kind])){
  const r=await request(route);assert.equal(r.status,200,route);assert.ok(r.body.includes(`href="https://phisicos.com${route}"`));
  const duplicate=await request(route+'index.html');assert.equal(duplicate.status,301);assert.equal(duplicate.headers.location,'https://phisicos.com'+route);
  if(route!=='/'){const slash=await request(route.slice(0,-1));assert.equal(slash.status,301);assert.equal(slash.headers.location,'https://phisicos.com'+route);}
 }
 console.log(`PASS Apache serves all ${pageCount} canonical pages and redirects their duplicate URLs`);
 for(const [lang,map] of Object.entries(legacy))for(const [kind,from] of Object.entries(map))for(const variant of [from,from.slice(0,-1),from+'index.html',from+'?ref=old']){
  const r=await request(variant);assert.equal(r.status,301,variant);assert.equal(r.headers.location,'https://phisicos.com'+pages[lang][kind]+(variant.includes('?')?'?ref=old':''),variant);
 }
 console.log('PASS Apache redirects every old game route to its topic route in one hop, keeping the query');
 for(const route of ['/missing-page/','/es/juegos/no-existe/','/assets/no-such-file.css']){
  const r=await request(route);assert.equal(r.status,404);assert.ok(r.body.includes('<title>404 | Phisicos</title>'));assert.equal(r.headers['x-robots-tag'],'noindex');
 }
 const listing=await request('/assets/');assert.equal(listing.status,403);
 const head=await request(pages.en.lander,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.body.length,0);
 const gzip=await request(pages.en.lander,{headers:{'Accept-Encoding':'gzip'}});
 assert.equal(gzip.headers['content-encoding'],'gzip');assert.ok(zlib.gunzipSync(gzip.body).includes('<!doctype html>'));
 assert.equal(gzip.headers['cache-control'],'public, max-age=0, must-revalidate');
 const css=await request('/assets/site.css');assert.equal(css.status,200);assert.equal(css.headers['cache-control'],'public, max-age=86400');assert.match(css.headers['content-type'],/text\/css/);
 const guide=await request('/design-guidelines.md');assert.equal(guide.headers['x-robots-tag'],'noindex');
 const robots=await request('/robots.txt');assert.equal(robots.status,200);assert.ok(robots.body.includes('Allow: /'));
 const sitemap=await request('/sitemap.xml');assert.equal(sitemap.status,200);assert.equal((sitemap.body.toString().match(/<loc>/g)||[]).length,pageCount);
 console.log('PASS Apache real 404s, no directory listing, HEAD, gzip, caching, robots and sitemap');
})().catch(e=>{
 console.error(e);if(fs.existsSync(temp+'/error.log'))console.error(fs.readFileSync(temp+'/error.log','utf8'));
 process.exitCode=1;
}).finally(async()=>{
 if(server && server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
 fs.rmSync(temp,{recursive:true,force:true});
});
