/* CURSOR */
const cur=document.getElementById('cur'),curR=document.getElementById('curR');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px'});
(function raf(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;curR.style.left=rx+'px';curR.style.top=ry+'px';requestAnimationFrame(raf)})();
document.querySelectorAll('a,button,.pc,.skcat,.ac,.tc').forEach(el=>{
  el.addEventListener('mouseenter',()=>{cur.style.transform='translate(-50%,-50%) scale(2)';curR.style.opacity='.7'});
  el.addEventListener('mouseleave',()=>{cur.style.transform='translate(-50%,-50%) scale(1)';curR.style.opacity='.4'});
});

/* THEME */
document.getElementById('themeBtn').addEventListener('click',()=>{
  const d=document.documentElement,dark=d.dataset.theme==='dark';
  d.dataset.theme=dark?'light':'dark';
  document.getElementById('tIcon').textContent=dark?'☾':'☀';
  document.getElementById('tLabel').textContent=dark?'Dark':'Light';
});

/* READ PROGRESS */
window.addEventListener('scroll',()=>{
  const h=document.documentElement;
  document.getElementById('readProg').style.width=((h.scrollTop||document.body.scrollTop)/(h.scrollHeight-h.clientHeight)*100)+'%';
});

/* FADE IN */
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('v')}),{threshold:.08});
document.querySelectorAll('.fi').forEach(el=>obs.observe(el));

/* SKILL BARS */
const bObs=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting)e.target.querySelectorAll('.sbf').forEach(b=>b.style.width=b.dataset.w+'%');
}),{threshold:.3});
document.querySelectorAll('.skcat').forEach(el=>bObs.observe(el));

/* TYPED */
const phrases=['Aspiring Data Scientist ','ML Model Builder ','Was an AI Community Lead ','Mulearn Campus Lead ','Data → Decisions '];
let pi=0,ci=0,del=false;
const tel=document.getElementById('typed');
function typeLoop(){
  const p=phrases[pi];
  if(!del){tel.textContent=p.slice(0,++ci);if(ci===p.length){del=true;setTimeout(typeLoop,1900);return}}
  else{tel.textContent=p.slice(0,--ci);if(ci===0){del=false;pi=(pi+1)%phrases.length}}
  setTimeout(typeLoop,del?42:82);
}typeLoop();

/* HERO PARTICLE CANVAS */
(function(){
  const cv=document.getElementById('heroCanvas'),ctx=cv.getContext('2d');
  let W,H,pts=[];
  function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight}
  resize();window.addEventListener('resize',resize);
  for(let i=0;i<55;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5});
  function draw(){
    ctx.clearRect(0,0,W,H);
    const dark=document.documentElement.dataset.theme!=='light';
    const dc=dark?'rgba(125,249,194,':'rgba(0,122,82,';
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=dc+'.4)';ctx.fill();
    });
    pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{
      const d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<110){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=dc+(0.12*(1-d/110))+')';ctx.lineWidth=.5;ctx.stroke()}
    }));
    requestAnimationFrame(draw);
  }draw();
})();

/* GITHUB REPOS */
async function loadGH(){
  const container=document.getElementById('ghRepos');
  try{
    const res=await fetch('https://api.github.com/users/Aju6010/repos?sort=updated&per_page=12');
    if(!res.ok)throw new Error();
    const repos=await res.json();
    if(!repos.length){container.innerHTML='<p class="gh-err">No public repos found yet.</p>';return}
    container.innerHTML='';
    repos.forEach(r=>{
      const card=document.createElement('div');
      card.className='pc';card.style.cursor='pointer';
      const lang=r.language||'Misc';
      const desc=r.description||'No description provided.';
      card.innerHTML=`
        <div class="pt">${lang} · ${new Date(r.updated_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</div>
        <h3>${r.name.replace(/[-_]/g,' ')}</h3>
        <p>${desc}</p>
        <div class="ptechs">
          ${r.language?`<span class="tpill">${r.language}</span>`:''}
          ${r.stargazers_count>0?`<span class="tpill"> ${r.stargazers_count}</span>`:''}
          ${r.forks_count>0?`<span class="tpill">🍴 ${r.forks_count}</span>`:''}
        </div>
        <div class="plink">View on GitHub ↗</div>`;
      card.addEventListener('click',()=>{
        document.getElementById('mTitle').textContent=r.name.replace(/[-_]/g,' ');
        document.getElementById('mLang').textContent=`${lang} ·  ${r.stargazers_count} stars · 🍴 ${r.forks_count} forks`;
        document.getElementById('mDesc').textContent=desc;
        document.getElementById('mLink').href=r.html_url;
        document.getElementById('modal').classList.add('open');
      });
      container.appendChild(card);
    });
  }catch(e){container.innerHTML=`<p class="gh-err">Could not load repos. <a href="https://github.com/Aju6010" target="_blank" style="color:var(--accent)">Visit GitHub directly ↗</a></p>`}
}loadGH();

/* MODAL */
function closeModal(){document.getElementById('modal').classList.remove('open')}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* CONTACT FORM */
function sendMsg(){
  const n=document.getElementById('cfn').value.trim();
  const e=document.getElementById('cfe').value.trim();
  const s=document.getElementById('cfs').value;
  const m=document.getElementById('cfm').value.trim();
  const msgEl=document.getElementById('fmsg');
  const btn=document.getElementById('sbtn');
  msgEl.className='fmsg';msgEl.style.display='none';
  if(!n||!e||!m){msgEl.className='fmsg err';msgEl.textContent='⚠ Please fill in your name, email, and message.';return}
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){msgEl.className='fmsg err';msgEl.textContent='⚠ Please enter a valid email address.';return}
  btn.classList.add('sending');document.getElementById('sbtnT').textContent='Sending…';
  const mailto=`mailto:ajueldo6010@gmail.com?subject=${encodeURIComponent(s||'Portfolio Enquiry — '+n)}&body=${encodeURIComponent('From: '+n+'\nEmail: '+e+'\n\n'+m)}`;
  window.open(mailto,'_blank');
  setTimeout(()=>{
    btn.classList.remove('sending');document.getElementById('sbtnT').textContent='Send Message →';
    msgEl.className='fmsg ok';
    msgEl.textContent='✓ Your email client should have opened! You can also reach Aju directly at ajueldo6010@gmail.com';
    document.getElementById('cfn').value='';document.getElementById('cfe').value='';document.getElementById('cfs').value='';document.getElementById('cfm').value='';
  },800);
}
