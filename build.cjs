const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, 'dist');
fs.mkdirSync(target, {recursive:true});
for (const file of ['index.html','BLUEPRINT.md']) {
  fs.copyFileSync(path.join(__dirname,'public',file),path.join(target,file));
}
console.log('Static output ready in dist/');
