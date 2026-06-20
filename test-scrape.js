const KNITWEAR_KEYWORDS = ['трикотаж','вязан','пряжа','свитер','кардиган','джемпер','пуловер','шерсть','вязк','спицы','меринос','кашемир','хлопок','акрил','вискоза','палантин','снуд','плед','туника','шарф','шапк'];

async function scrapeSite(url) {
  const r = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)});
  const h = await r.text();
  const a = [];
  const re = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;
  let m;
  while((m=re.exec(h))!==null) {
    let t=m[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    if(t.length<30||t.length>300) continue;
    if(m[1].match(/\.(jpg|png|svg|css|js|ico|pdf)/)) continue;
    if(m[1].match(/pinterest|twitter|facebook|linkedin|instagram|youtube|t\.me/)) continue;
    a.push({title:t,link:m[1]});
    if(a.length>20) break;
  }
  return a;
}

(async()=>{
  const arts = await scrapeSite('https://moda247.ru/news/');
  console.log('=== ALL TITLES from moda247 (first 10) ===');
  arts.slice(0,10).forEach(a=>console.log(' - '+a.title));
})().catch(e=>console.log('Fatal:',e.message));
