const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'dist');
const port = Number(process.env.PORT || 4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.js':'text/javascript; charset=utf-8'};
if(!fs.existsSync(path.join(root,'index.html')))throw new Error('Build the site before starting the preview.');
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  let file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
  try{
    if(fs.statSync(file).isDirectory()){
      if(!pathname.endsWith('/')){res.writeHead(308,{Location:pathname+'/'});return res.end();}
      file=path.join(file,'index.html');
    }
    if(!fs.statSync(file).isFile())throw new Error('missing');
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  }catch{file=path.join(root,'404.html');res.writeHead(404,{'Content-Type':types['.html']});}
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(file).pipe(res);
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}/`));
