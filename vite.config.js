import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const redirect=(req,res,next)=>{if(req.url==='/food-prices'||req.url.startsWith('/food-prices#')){res.writeHead(302,{Location:'/food-prices/'+req.url.slice('/food-prices'.length)});res.end();}else next();};
export default defineConfig({base:'/food-prices/',plugins:[react(),{name:'base-redirect',configureServer(server){server.middlewares.use(redirect);},configurePreviewServer(server){server.middlewares.use(redirect);}}],build:{outDir:'dist/food-prices'}});
