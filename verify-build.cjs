// Exercise public-host metadata in an isolated fixture, never in the preview.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'motion-lab-seo-'));
try{
 for(const item of ['build.cjs','locales','src','DESIGN_GUIDELINES.md'])fs.cpSync(path.join(__dirname,item),path.join(fixture,item),{recursive:true});
 const run=(siteURL)=>spawnSync(process.execPath,['build.cjs'],{cwd:fixture,env:{...process.env,SITE_URL:siteURL},encoding:'utf8'});
 for(const invalid of ['', 'http://localhost:4173', 'https://motion-lab.test/path', 'https://user:password@motion-lab.test'])assert.notEqual(run(invalid).status,0,'accepted invalid production origin');
 console.log('PASS production build rejects missing, local, insecure, and malformed origins');
 const result=run('https://motion-lab.test');assert.equal(result.status,0,result.stderr);
 const pages=require('./locales/pages.cjs');
 for(const p of Object.values(pages))for(const route of [p.home,p.game,p.lander]){
   const html=fs.readFileSync(path.join(fixture,'dist',route,'index.html'),'utf8');
   assert.ok(html.includes(`rel="canonical" href="https://motion-lab.test${route}"`));
   assert.ok(html.includes('content="index, follow, max-snippet:-1, max-image-preview:large"'));
   assert.ok(!html.includes('localhost') && !html.includes('noindex'));
 }
 const robots=fs.readFileSync(path.join(fixture,'dist/robots.txt'),'utf8');
 assert.equal(robots,'User-agent: *\nAllow: /\nSitemap: https://motion-lab.test/sitemap.xml\n');
 const sitemap=fs.readFileSync(path.join(fixture,'dist/sitemap.xml'),'utf8');assert.equal((sitemap.match(/https:\/\/motion-lab\.test/g)||[]).length,24);
 console.log('PASS production metadata, hreflang origins, sitemap and robots use the configured public domain');
}finally{fs.rmSync(fixture,{recursive:true,force:true});}
