// Exercise public-host metadata in an isolated fixture, never in the preview.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'phisicos-seo-'));
try{
 for(const item of ['build.cjs','locales','src','DESIGN_GUIDELINES.md'])fs.cpSync(path.join(__dirname,item),path.join(fixture,item),{recursive:true});
 const run=(siteURL)=>spawnSync(process.execPath,['build.cjs'],{cwd:fixture,env:{...process.env,SITE_URL:siteURL},encoding:'utf8'});
 for(const invalid of ['', 'http://localhost:4173', 'https://phisicos.test/path', 'https://user:password@phisicos.test'])assert.notEqual(run(invalid).status,0,'accepted invalid production origin');
 console.log('PASS production build rejects missing, local, insecure, and malformed origins');
 const result=run('https://phisicos.test');assert.equal(result.status,0,result.stderr);
 const pages=require('./locales/pages.cjs'),kinds=['home','game',...require('./locales/games.cjs').map(g=>g.kind)];
 for(const p of Object.values(pages))for(const route of kinds.map(kind=>p[kind])){
   const html=fs.readFileSync(path.join(fixture,'dist',route,'index.html'),'utf8');
   assert.ok(html.includes(`rel="canonical" href="https://phisicos.test${route}"`));
   assert.ok(html.includes('content="index, follow, max-snippet:-1, max-image-preview:large"'));
   assert.ok(!html.includes('localhost') && !html.includes('noindex'));
 }
 const robots=fs.readFileSync(path.join(fixture,'dist/robots.txt'),'utf8');
 assert.equal(robots,'User-agent: *\nAllow: /\nSitemap: https://phisicos.test/sitemap.xml\n');
 const sitemap=fs.readFileSync(path.join(fixture,'dist/sitemap.xml'),'utf8');assert.equal((sitemap.match(/https:\/\/phisicos\.test/g)||[]).length,Object.keys(pages).length*kinds.length);
 console.log('PASS production metadata, hreflang origins, sitemap and robots use the configured public domain');
}finally{fs.rmSync(fixture,{recursive:true,force:true});}
