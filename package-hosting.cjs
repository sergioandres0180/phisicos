// Run locally; the uploaded website needs neither Node.js nor PHP execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=__dirname,release=path.join(root,'release');
const {siteUrl}=require('./deployment.json');
const env={...process.env,SITE_URL:siteUrl,SITE_OUTPUT:'release/public_html'};
const run=file=>execFileSync(process.execPath,[file],{cwd:root,env,stdio:'inherit'});
execFileSync(process.execPath,['build.cjs','--hosting'],{cwd:root,env,stdio:'inherit'});
run('verify-site.cjs');
run('verify-hosting.cjs');
const archive=path.join(release,'phisicos.com-upload.zip');
fs.rmSync(archive,{force:true});
execFileSync('zip',['-q','-r',archive,'.'],{cwd:path.join(release,'public_html')});
execFileSync('unzip',['-tq',archive],{stdio:'inherit'});
const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8'}).split('\n');
assert.ok(entries.includes('.htaccess') && entries.includes('index.html'));
assert.ok(!entries.some(p=>/^(?:public_html|src|locales|node_modules|\.git)\//.test(p)));
fs.copyFileSync(path.join(root,'UPLOAD_GUIDE.md'),path.join(release,'UPLOAD_GUIDE.md'));
console.log(`\nUpload package: ${archive}\nInstructions: ${path.join(release,'UPLOAD_GUIDE.md')}`);
