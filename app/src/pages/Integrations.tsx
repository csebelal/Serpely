import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getSection } from '@/lib/api';

// ── Syntax highlighter ─────────────────────────────────────────────────────
type TT = 'comment'|'string'|'keyword'|'number'|'fn'|'prop'|'ident'|'op'|'punc'|'ws'|'other';
type Tok = { t: TT; v: string };
const KW = new Set(['const','let','var','await','async','function','return','if','else','for','while','import','export','from','new','this','null','undefined','true','false','typeof','void']);
const C: Record<TT,string> = {comment:'#6A9955',string:'#CE9178',keyword:'#569CD6',number:'#B5CEA8',fn:'#DCDCAA',prop:'#9CDCFE',ident:'#9CDCFE',op:'#D4D4D4',punc:'#D4D4D4',ws:'inherit',other:'#D4D4D4'};
function tokenize(code:string):Tok[]{const out:Tok[]=[]; let i=0; while(i<code.length){if(code[i]==='/'&&code[i+1]==='/'){const nl=code.indexOf('\n',i),end=nl===-1?code.length:nl;out.push({t:'comment',v:code.slice(i,end)});i=end;continue;}if(code[i]==="'"||code[i]==='"'){const q=code[i];let j=i+1;while(j<code.length&&code[j]!==q&&code[j]!=='\n'){if(code[j]==='\\')j++;j++;}if(j<code.length&&code[j]===q)j++;out.push({t:'string',v:code.slice(i,j)});i=j;continue;}if(code[i]==='\n'||code[i]===' '||code[i]==='\t'){let j=i;while(j<code.length&&(code[j]==='\n'||code[j]===' '||code[j]==='\t'))j++;out.push({t:'ws',v:code.slice(i,j)});i=j;continue;}if(/\d/.test(code[i])){let j=i;while(j<code.length&&/[\d.]/.test(code[j]))j++;out.push({t:'number',v:code.slice(i,j)});i=j;continue;}if(/[a-zA-Z_$]/.test(code[i])){let j=i;while(j<code.length&&/[a-zA-Z0-9_$]/.test(code[j]))j++;const word=code.slice(i,j);const prev=out.filter(t=>t.t!=='ws').at(-1);const type:TT=KW.has(word)?'keyword':code[j]==='('?'fn':prev?.v==='.'?'prop':'ident';out.push({t:type,v:word});i=j;continue;}if(/[()[\]{},;.]/.test(code[i])){out.push({t:'punc',v:code[i]});i++;continue;}if(/[=+\-*/<>!&|^~?:]/.test(code[i])){out.push({t:'op',v:code[i]});i++;continue;}out.push({t:'other',v:code[i]});i++;}return out;}
function SyntaxCode({code}:{code:string}){return <>{tokenize(code).map((tok,i)=><span key={i} style={{color:C[tok.t]}}>{tok.v}</span>)}</>;}
// ──────────────────────────────────────────────────────────────────────────

const CODE = `// Get keyword rankings
const response = await fetch(
  'https://api.serpely.com/v1/rankings',
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
  }
);

const data = await response.json();
console.log(data.rankings);`;

function useTypewriter(text:string,speed=22,pauseAfter=1800){
  const [displayed,setDisplayed]=useState('');
  const [done,setDone]=useState(false);
  const idx=useRef(0);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    function startLoop(){idx.current=0;setDisplayed('');setDone(false);
      const id=setInterval(()=>{idx.current+=1;setDisplayed(text.slice(0,idx.current));if(idx.current>=text.length){clearInterval(id);setDone(true);timer.current=setTimeout(startLoop,pauseAfter);}},speed);
      return ()=>clearInterval(id);}
    const cleanup=startLoop();
    return ()=>{cleanup();if(timer.current)clearTimeout(timer.current);};
  },[text,speed,pauseAfter]);
  return {displayed,done};
}

// ─── CountUp ────────────────────────────────────────────────────────────────
function CountUp({ to, duration=1100 }: { to:number; duration?:number }) {
  const [val,setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const obs = new IntersectionObserver(([e])=>{
      if(!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      function tick(now:number){
        const t = Math.min((now-start)/duration,1);
        setVal(Math.round((1-(1-t)**3)*to));
        if(t<1) requestAnimationFrame(tick); else setVal(to);
      }
      requestAnimationFrame(tick);
    },{threshold:0.5});
    obs.observe(el);
    return ()=>obs.disconnect();
  },[to,duration]);
  return <span ref={ref}>{val}</span>;
}

// ─── HeroCanvas ─────────────────────────────────────────────────────────────
type HNode = {x:number;y:number;vx:number;vy:number;r:number;color:string;abbr:string;phase:number};

function HeroCanvas({ integrations }:{ integrations:IntegrationCategory[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initRef   = useRef(integrations);

  useEffect(()=>{
    const canvas = canvasRef.current; if(!canvas) return;
    const wrap   = canvas.parentElement; if(!wrap) return;
    let W = wrap.offsetWidth, H = wrap.offsetHeight;
    const dpr = window.devicePixelRatio||1;
    const resize = ()=>{
      W=wrap.offsetWidth; H=wrap.offsetHeight;
      canvas.width=W*dpr; canvas.height=H*dpr;
      canvas.style.width=W+'px'; canvas.style.height=H+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    canvas.width=W*dpr; canvas.height=H*dpr;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr,dpr);

    const items = initRef.current.flatMap(c=>c.items);
    const NUM=32;
    const nodes:HNode[] = Array.from({length:NUM},(_,i)=>{
      const it = items[i % Math.max(items.length,1)];
      return {
        x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-.5)*.38, vy:(Math.random()-.5)*.38,
        r:Math.random()*8+13,
        color: it?.color||'#00C27A',
        abbr:  it?.abbr||'SY',
        phase: Math.random()*Math.PI*2,
      };
    });

    const MAX_D=185; let raf:number; let t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      t+=.007;
      for(const n of nodes){
        n.x+=n.vx; n.y+=n.vy;
        if(n.x<-50)n.x=W+50; if(n.x>W+50)n.x=-50;
        if(n.y<-50)n.y=H+50; if(n.y>H+50)n.y=-50;
      }
      // connection lines
      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
          const d=Math.sqrt(dx*dx+dy*dy);
          if(d<MAX_D){
            ctx.beginPath();
            ctx.strokeStyle=`rgba(0,194,122,${(1-d/MAX_D)*0.14})`;
            ctx.lineWidth=1;
            ctx.moveTo(nodes[i].x,nodes[i].y);
            ctx.lineTo(nodes[j].x,nodes[j].y);
            ctx.stroke();
          }
        }
      }
      // node circles
      for(const n of nodes){
        const pulse=1+Math.sin(t+n.phase)*.07;
        const r=n.r*pulse;
        const a=.48+Math.sin(t*.6+n.phase)*.12;
        ctx.save();
        ctx.globalAlpha=a;
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2);
        ctx.fillStyle=n.color+'1a'; ctx.fill();
        ctx.strokeStyle=n.color+'55'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.globalAlpha=a*.9;
        ctx.fillStyle=n.color;
        ctx.font=`700 ${Math.floor(r*.5)}px system-ui,sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(n.abbr,n.x,n.y);
        ctx.restore();
      }
      raf=requestAnimationFrame(draw);
    }
    draw();
    const ro=new ResizeObserver(resize); ro.observe(wrap);
    return ()=>{ cancelAnimationFrame(raf); ro.disconnect(); };
  },[]);

  return <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:2}} />;
}
// ────────────────────────────────────────────────────────────────────────────

interface IntegrationItem { name:string; description:string; img:string; abbr:string; color:string; connected:boolean; }
interface IntegrationCategory { category:string; items:IntegrationItem[]; }

const defaultIntegrations: IntegrationCategory[] = [
  { category:'Analytics', items:[
    { name:'Google Analytics',      description:'Track website traffic and user behavior',    img:'/Other Logos/Google_Analytics_Logo_2019.svg.png', abbr:'GA', color:'#E37400', connected:true  },
    { name:'Google Search Console', description:'Monitor search performance and indexing',    img:'/processed-logos/ribbon-gsc.png',                  abbr:'SC', color:'#4285F4', connected:true  },
    { name:'Adobe Analytics',       description:'Enterprise analytics and reporting',         img:'',                                                 abbr:'AA', color:'#E34220', connected:false },
  ]},
  { category:'CMS', items:[
    { name:'WordPress',  description:"The world's most popular CMS",          img:'/processed-logos/ribbon-wordpress.png', abbr:'WP', color:'#21759B', connected:true  },
    { name:'Shopify',    description:'E-commerce platform for online stores', img:'',                                     abbr:'SH', color:'#96BF48', connected:false },
    { name:'Webflow',    description:'Visual website builder',                img:'/processed-logos/ribbon-webflow.png',  abbr:'WF', color:'#4353FF', connected:false },
    { name:'Contentful', description:'Headless CMS for modern websites',      img:'',                                     abbr:'CF', color:'#2478CC', connected:false },
  ]},
  { category:'Communication', items:[
    { name:'Slack',           description:'Get alerts and reports in Slack',  img:'/Other Logos/Slack-logo.png', abbr:'SL', color:'#4A154B', connected:false },
    { name:'Microsoft Teams', description:'Collaborate with your team',       img:'',                            abbr:'MT', color:'#4B53BC', connected:false },
    { name:'Discord',         description:'Community and team communication', img:'',                            abbr:'DC', color:'#5865F2', connected:false },
  ]},
  { category:'Project Management', items:[
    { name:'Jira',   description:'Track SEO tasks and projects', img:'', abbr:'JI', color:'#0052CC', connected:false },
    { name:'Asana',  description:'Manage SEO workflows',         img:'', abbr:'AS', color:'#F06A6A', connected:false },
    { name:'Trello', description:'Visual project management',    img:'', abbr:'TR', color:'#0079BF', connected:false },
  ]},
  { category:'Data & Reporting', items:[
    { name:'Google Data Studio', description:'Create custom SEO dashboards', img:'', abbr:'DS', color:'#669DF6', connected:false },
    { name:'Tableau',            description:'Advanced data visualization',  img:'', abbr:'TB', color:'#E97627', connected:false },
    { name:'Zapier',             description:'Automate workflows',           img:'', abbr:'ZP', color:'#FF4A00', connected:false },
  ]},
];

export function Integrations() {
  const [searchQuery,setSearchQuery]       = useState('');
  const [activeCategory,setActiveCategory] = useState('All');
  const {displayed,done}                   = useTypewriter(CODE,22);

  const [heroHeadline,setHeroHeadline]     = useState('Connect your favorite tools');
  const [heroSubtext,setHeroSubtext]       = useState('Serpely integrates seamlessly with the tools you already use, making it easy to incorporate SEO into your existing workflow.');
  const [integrations,setIntegrations]     = useState<IntegrationCategory[]>(defaultIntegrations);
  const [apiHeadline,setApiHeadline]       = useState('Build custom integrations');
  const [apiBody,setApiBody]               = useState('Our comprehensive API allows you to build custom integrations and automate your SEO workflows. Access all Serpely features programmatically.');
  const [apiFeatures,setApiFeatures]       = useState(['RESTful API with comprehensive documentation','Webhook support for real-time updates','SDKs for popular programming languages','Rate limits that scale with your plan']);
  const [apiButtonText,setApiButtonText]   = useState('View API Documentation');
  const [apiButtonHref,setApiButtonHref]   = useState('#');

  useEffect(()=>{
    getSection('integrations').then(r=>{
      const d=r.data.data as Record<string,unknown>;
      if(typeof d.heroHeadline==='string')   setHeroHeadline(d.heroHeadline);
      if(typeof d.heroSubtext==='string')    setHeroSubtext(d.heroSubtext);
      if(Array.isArray(d.integrations))      setIntegrations(d.integrations as IntegrationCategory[]);
      if(typeof d.apiHeadline==='string')    setApiHeadline(d.apiHeadline);
      if(typeof d.apiBody==='string')        setApiBody(d.apiBody);
      if(Array.isArray(d.apiFeatures))       setApiFeatures(d.apiFeatures as string[]);
      if(typeof d.apiButtonText==='string')  setApiButtonText(d.apiButtonText);
      if(typeof d.apiButtonHref==='string')  setApiButtonHref(d.apiButtonHref);
    }).catch(()=>{});
  },[]);

  const totalCount     = integrations.reduce((s,c)=>s+c.items.length,0);
  const connectedCount = integrations.reduce((s,c)=>s+c.items.filter(i=>i.connected).length,0);
  const categories     = ['All',...integrations.map(c=>c.category)];

  const filtered = integrations
    .filter(cat=>activeCategory==='All'||cat.category===activeCategory)
    .map(cat=>({...cat, items:cat.items.filter(item=>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )}))
    .filter(cat=>cat.items.length>0);

  const allItems = filtered.flatMap(c=>c.items);

  return (
    <div style={{background:'var(--bg)',color:'var(--text)'}}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden" style={{minHeight:520}}>
        {/* Animated node-graph canvas */}
        <HeroCanvas integrations={integrations} />
        {/* Radial vignette — blends canvas into bg at edges */}
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 90% 110% at 50% 55%, transparent 20%, var(--bg) 72%)',zIndex:3}} />
        {/* Top brand glow */}
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 55% 38% at 50% 0%, rgba(0,194,122,0.07) 0%, transparent 65%)',zIndex:4}} />

        <div className="max-w-3xl mx-auto text-center relative" style={{zIndex:5}}>
          {/* Badge */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <span className="pill-s">Integrations</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:'rgba(0,194,122,0.1)',color:'#00A868',border:'1px solid rgba(0,194,122,0.2)'}}>
              <CountUp to={totalCount} />+ available
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-black mb-4" style={{fontSize:'clamp(2.4rem,6vw,4rem)',letterSpacing:'-0.05em',lineHeight:1.04}}>
            {heroHeadline}
          </h1>
          <p className="text-base font-medium mx-auto mb-10" style={{color:'var(--text-soft)',lineHeight:1.65,maxWidth:520}}>
            {heroSubtext}
          </p>

          {/* Count-up stat strip */}
          <div className="intg-stats inline-flex items-center mb-12" style={{border:'1px solid hsl(var(--border))',borderRadius:14,overflow:'hidden'}}>
            {([
              {to:totalCount,           suf:'+', label:'Integrations'},
              {to:integrations.length,  suf:'',  label:'Categories'},
              {to:connectedCount,       suf:'',  label:'Live'},
            ] as const).map((s,i)=>(
              <div key={i} className="intg-stat-cell" style={{padding:'14px 28px',background:'var(--card-bg)',borderRight:i<2?'1px solid hsl(var(--border))':'none',minWidth:96,textAlign:'center'}}>
                <p className="font-black text-2xl" style={{letterSpacing:'-0.04em',color:'var(--text)'}}><CountUp to={s.to}/>{s.suf}</p>
                <p className="text-[11px] font-bold uppercase" style={{color:'var(--text-faint)',letterSpacing:'0.06em',marginTop:2}}>{s.label}</p>
              </div>
            ))}
          </div>
          <style>{`
            @media (max-width: 480px) {
              .intg-stats { display: flex !important; width: 100%; }
              .intg-stat-cell { flex: 1; padding: 12px 10px !important; min-width: 0 !important; }
            }
          `}</style>

          {/* Search + filter */}
          <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'center',width:'100%',maxWidth:640,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',width:'100%',maxWidth:380,border:'1px solid hsl(var(--border))',borderRadius:8,background:'var(--card-bg)',paddingLeft:10,paddingRight:4,transition:'border-color 0.15s'}}
              onFocusCapture={e=>(e.currentTarget as HTMLDivElement).style.borderColor='#00C27A'}
              onBlurCapture={e=>(e.currentTarget as HTMLDivElement).style.borderColor='hsl(var(--border))'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{flexShrink:0,width:13,height:13,color:'var(--text-faint)'}}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Search integrations…" value={searchQuery}
                onChange={e=>{setSearchQuery(e.target.value);setActiveCategory('All');}}
                style={{flex:1,border:'none',background:'transparent',color:'var(--text)',fontSize:12,outline:'none',padding:'7px 8px 7px 6px'}}
              />
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center'}}>
              {categories.map(cat=>{
                const count = cat==='All' ? totalCount : (integrations.find(c=>c.category===cat)?.items.length??0);
                const isActive = activeCategory===cat;
                return (
                  <button key={cat} onClick={()=>setActiveCategory(cat)} style={{
                    display:'flex',alignItems:'center',gap:5,padding:'8px 13px',borderRadius:9,border:'1px solid',
                    borderColor: isActive ? '#00C27A' : 'hsl(var(--border))',
                    background: isActive ? 'rgba(0,194,122,0.08)' : 'var(--card-bg)',
                    color: isActive ? '#00C27A' : 'var(--text-soft)',
                    fontWeight:600,fontSize:12,cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap',
                  }}>
                    {cat}
                    <span style={{fontSize:10,fontWeight:700,padding:'1px 5px',borderRadius:5,background:isActive?'rgba(0,194,122,0.15)':'var(--tag-bg)',color:isActive?'#00A868':'var(--text-faint)'}}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <section className="pb-24 px-6" style={{borderTop:'1px solid hsl(var(--border))'}}>
        <div className="max-w-5xl mx-auto pt-10">

          {searchQuery && (
            <p className="mb-6 text-sm" style={{color:'var(--text-faint)'}}>
              <strong style={{color:'var(--text)'}}>{allItems.length}</strong> result{allItems.length!==1?'s':''} for "{searchQuery}"
            </p>
          )}

          {filtered.length > 0 ? (
            filtered.map((cat,ci)=>(
              <div key={ci} className="mb-14">
                {/* Category header */}
                <div className="flex items-center gap-3 mb-5 pb-3" style={{borderBottom:'1px solid hsl(var(--border))'}}>
                  <h2 className="font-black text-[12px] uppercase" style={{color:'var(--text-faint)',letterSpacing:'0.1em'}}>{cat.category}</h2>
                  <div style={{height:1,flex:1,background:'hsl(var(--border))'}} />
                  <span className="text-[11px] font-bold" style={{color:'var(--text-faint)'}}>{cat.items.length} integration{cat.items.length!==1?'s':''}</span>
                </div>

                {/* Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.items.map((item,ii)=>(
                    <div key={ii}
                      style={{
                        borderRadius:12,
                        background:'var(--card-bg)',
                        border:'1px solid hsl(var(--border))',
                        overflow:'hidden',
                        cursor:'default',
                        transition:'border-color 0.2s, box-shadow 0.2s',
                        display:'flex',
                        flexDirection:'column',
                      }}
                      onMouseEnter={e=>{
                        const el=e.currentTarget as HTMLElement;
                        el.style.borderColor=item.color+'60';
                        el.style.boxShadow=`0 4px 24px ${item.color}12`;
                      }}
                      onMouseLeave={e=>{
                        const el=e.currentTarget as HTMLElement;
                        el.style.borderColor='hsl(var(--border))';
                        el.style.boxShadow='';
                      }}
                    >
                      {/* Logo strip — neutral bg, full-width, handles any logo shape */}
                      <div style={{
                        height:72,
                        background:'var(--tag-bg)',
                        borderBottom:'1px solid hsl(var(--border))',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        padding:'12px 20px',
                        position:'relative',
                      }}>
                        {item.connected && (
                          <div style={{position:'absolute',top:8,right:8,display:'flex',alignItems:'center',gap:4,padding:'2px 7px',borderRadius:20,background:'rgba(0,194,122,0.1)',border:'1px solid rgba(0,194,122,0.2)'}}>
                            <span style={{width:5,height:5,borderRadius:'50%',background:'#00C27A',display:'inline-block'}}/>
                            <span style={{fontSize:9,fontWeight:800,color:'#00A868',letterSpacing:'0.04em',textTransform:'uppercase'}}>Live</span>
                          </div>
                        )}
                        {item.img ? (
                          <img
                            src={item.img}
                            alt={item.name}
                            style={{
                              maxWidth:'100%',
                              maxHeight:36,
                              width:'auto',
                              height:'auto',
                              objectFit:'contain',
                              opacity:0.85,
                            }}
                          />
                        ) : (
                          <div style={{
                            width:44,height:44,borderRadius:12,
                            background:item.color,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-0.02em',
                          }}>
                            {item.abbr}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{padding:'12px 14px 14px',flex:1,display:'flex',flexDirection:'column'}}>
                        <p style={{fontWeight:700,fontSize:13,letterSpacing:'-0.01em',marginBottom:4}}>{item.name}</p>
                        <p style={{fontSize:11.5,color:'var(--text-soft)',lineHeight:1.55,flex:1,marginBottom:12,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                          {item.description}
                        </p>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,letterSpacing:'0.04em',textTransform:'uppercase',
                            background:item.connected?'rgba(0,194,122,0.08)':'var(--tag-bg)',
                            color:item.connected?'#00A868':'var(--text-faint)',
                            border:`1px solid ${item.connected?'rgba(0,194,122,0.2)':'hsl(var(--border))'}`,
                          }}>
                            {item.connected?'Connected':'Available'}
                          </span>
                          <button style={{
                            fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:7,border:'1px solid',cursor:'pointer',
                            borderColor:item.connected?'hsl(var(--border))':item.color+'50',
                            background:item.connected?'transparent':item.color+'0d',
                            color:item.connected?'var(--text-soft)':item.color,
                            transition:'all 0.15s',
                          }}
                            onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background=item.color;el.style.color='#fff';el.style.borderColor=item.color;}}
                            onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background=item.connected?'transparent':item.color+'0d';el.style.color=item.connected?'var(--text-soft)':item.color;el.style.borderColor=item.connected?'hsl(var(--border))':item.color+'50';}}
                          >
                            {item.connected?'Configure':'Connect'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{textAlign:'center',padding:'80px 0'}}>
              <div style={{width:48,height:48,borderRadius:12,background:'var(--card-bg)',border:'1px solid hsl(var(--border))',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                <svg viewBox="0 0 24 24" style={{width:20,height:20,color:'var(--text-faint)'}} fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <p style={{fontWeight:600,fontSize:14,marginBottom:4}}>No integrations found</p>
              <p style={{fontSize:13,color:'var(--text-faint)'}}>Try adjusting your search or filter</p>
            </div>
          )}

          {/* Request box */}
          <div style={{borderRadius:14,border:'1px dashed hsl(var(--border))',padding:'24px 28px',display:'flex',flexDirection:'column' as const,gap:12,background:'var(--card-bg)'}}>
            <div className="sm:flex sm:items-center sm:justify-between" style={{gap:16}}>
              <div>
                <p style={{fontWeight:700,fontSize:14,marginBottom:4}}>Don't see the tool you need?</p>
                <p style={{fontSize:13,color:'var(--text-soft)',margin:0}}>Request an integration — we prioritize based on demand.</p>
              </div>
              <Link to="/contact" className="btn-secondary-s" style={{marginTop:12,display:'inline-flex',whiteSpace:'nowrap' as const,flexShrink:0}}>
                Request Integration →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── API Access ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{borderTop:'1px solid hsl(var(--border))'}}>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 items-start">

            {/* Left */}
            <div>
              <span className="pill-s mb-5 inline-block">REST API</span>
              <h2 className="font-display font-black mb-4" style={{fontSize:'clamp(1.7rem,4vw,2.4rem)',letterSpacing:'-0.04em',lineHeight:1.1}}>
                {apiHeadline}
              </h2>
              <p style={{fontSize:14,lineHeight:1.7,color:'var(--text-soft)',marginBottom:24,fontWeight:500}}>
                {apiBody}
              </p>

              {/* Feature list */}
              <div style={{display:'flex',flexDirection:'column',gap:0,marginBottom:28,border:'1px solid hsl(var(--border))',borderRadius:12,overflow:'hidden'}}>
                {apiFeatures.map((f,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<apiFeatures.length-1?'1px solid hsl(var(--border))':'none',background:'var(--card-bg)'}}>
                    <svg viewBox="0 0 24 24" style={{width:14,height:14,flexShrink:0,color:'#00C27A'}} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{fontSize:13,fontWeight:500,color:'var(--text-soft)'}}>{f}</span>
                  </div>
                ))}
              </div>

              <Link to={apiButtonHref} className="btn-accent-s" style={{display:'inline-flex'}}>{apiButtonText}</Link>
            </div>

            {/* Right: code */}
            <div style={{borderRadius:16,overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,0.28)',border:'1px solid rgba(255,255,255,0.04)'}}>
              {/* Tab bar */}
              <div style={{background:'#111827',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 16px',display:'flex',alignItems:'center',gap:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px',borderBottom:'2px solid #00C27A',marginBottom:-1}}>
                  <svg viewBox="0 0 24 24" style={{width:12,height:12,color:'#00C27A'}} fill="none" stroke="currentColor" strokeWidth={2}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  <span style={{fontSize:11,fontWeight:700,color:'#00C27A',fontFamily:'monospace'}}>serpely-api.js</span>
                </div>
                <div style={{flex:1}}/>
                <div style={{display:'flex',gap:5}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:'#ff5f57',display:'inline-block'}}/>
                  <span style={{width:8,height:8,borderRadius:'50%',background:'#febc2e',display:'inline-block'}}/>
                  <span style={{width:8,height:8,borderRadius:'50%',background:'#28c840',display:'inline-block'}}/>
                </div>
              </div>

              {/* Code + line numbers */}
              <div style={{background:'#0d1117',display:'flex',overflowX:'auto'}}>
                <div style={{padding:'20px 0 24px',userSelect:'none',minWidth:36}}>
                  {CODE.split('\n').map((_,li)=>(
                    <div key={li} style={{padding:'0 12px',fontSize:11,lineHeight:1.7,color:'rgba(255,255,255,0.2)',fontFamily:'monospace',textAlign:'right'}}>{li+1}</div>
                  ))}
                </div>
                <div style={{padding:'20px 24px 24px',borderLeft:'1px solid rgba(255,255,255,0.04)',flex:1}}>
                  <pre style={{margin:0,fontSize:12,lineHeight:1.7,color:'#e6edf3',fontFamily:"'Fira Code','Cascadia Code',monospace",whiteSpace:'pre'}}>
                    <SyntaxCode code={displayed}/>
                    {!done&&<span style={{display:'inline-block',width:2,height:'1em',background:'#00C27A',marginLeft:1,verticalAlign:'text-bottom',animation:'blink 0.7s step-end infinite'}}/>}
                  </pre>
                </div>
              </div>

              {/* Footer bar */}
              <div style={{background:'#111827',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#00C27A',boxShadow:'0 0 6px rgba(0,194,122,0.6)'}}/>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:'monospace'}}>GET /v1/rankings · 200 OK</span>
                </div>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontFamily:'monospace'}}>serpely.com/docs</span>
              </div>
              <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
