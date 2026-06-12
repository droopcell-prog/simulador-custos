// ====== STORAGE ======
const SK={produtos:'sp_p',veiculos:'sp_v',eventos:'sp_e',theme:'sp_t'}
function ld(k){try{return JSON.parse(localStorage.getItem(k))||[]}catch{return[]}}
function sv(k,d){localStorage.setItem(k,JSON.stringify(d))}

let state={
  produtos:ld(SK.produtos),veiculos:ld(SK.veiculos),eventos:ld(SK.eventos),
  currentModule:'dashboard',editingId:null,veiculoType:'carro',veiculoSub:'passeio',veiculoMode:'simples'
}

// Theme
let dark=localStorage.getItem(SK.theme)==='dark'
if(dark)document.body.classList.add('dark')
function toggleTheme(){dark=!dark;document.body.classList.toggle('dark',dark);localStorage.setItem(SK.theme,dark?'dark':'light');const b=document.getElementById('themeBtn');if(b)b.textContent=dark?'☀️':'🌙'}
document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('themeBtn');if(b)b.textContent=dark?'☀️':'🌙'})

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

function switchModule(mod){
  state.currentModule=mod;state.editingId=null;state.veiculoType='carro';state.veiculoSub='passeio'
  document.querySelectorAll('.sidebar a,.bottom-nav a').forEach(a=>a.classList.toggle('active',a.dataset.module===mod))
  render()
}

// ====== DATA ======
function exportData(){
  const d={version:1,exportedAt:new Date().toISOString(),produtos:ld(SK.produtos),veiculos:ld(SK.veiculos),eventos:ld(SK.eventos)}
  const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'})
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`simulador-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)
}
function importData(e){
  const f=e.target.files[0];if(!f)return
  const r=new FileReader()
  r.onload=function(ev){try{const d=JSON.parse(ev.target.result);if(!d.produtos||!d.veiculos||!d.eventos){alert('Arquivo inv\u00e1lido');return}if(!confirm('Substituir TODOS os dados?'))return;sv(SK.produtos,d.produtos);sv(SK.veiculos,d.veiculos);sv(SK.eventos,d.eventos);state.produtos=d.produtos;state.veiculos=d.veiculos;state.eventos=d.eventos;render();alert('Importado!')}catch{alert('Arquivo inv\u00e1lido')}}
  r.readAsText(f);e.target.value=''
}
function clearAllData(){
  if(!confirm('Apagar TODOS os dados?'))return;if(!confirm('Confirma\u00e7\u00e3o final?'))return
  state.produtos=[];state.veiculos=[];state.eventos=[]
  sv(SK.produtos,[]);sv(SK.veiculos,[]);sv(SK.eventos,[]);render()
}

// ====== CALC ======
function calcProduto(p){
  const ct=(p.mp||0)+(p.emb||0)+(p.mo||0)+(p.cf||0)+(p.log||0)+(p.tax||0)
  const mk=1/(1-((p.impostos||0)+(p.margem||0))/100),pv=ct*mk
  const l=pv-ct-(pv*(p.impostos||0)/100)
  return{custoTotal:ct,markup:mk,precoVenda:pv,lucro:l}
}
function getDep(tipo,sub){return tipo==='carro'?{passeio:10,utilitario:15,pesado:20}[sub]||10:{particular:12,trabalho:15}[sub]||12}
function calcVeiculo(v){
  const dp=getDep(v.tipo,v.sub),vl=v.valor||0,da=vl*dp/100,dm=da/12
  const cm=((v.ipva||0)/12)+(v.seguro||0)+(v.manut||0)+(v.comb||0)+(v.est||0)+dm+(v.fin||0)
  const km=v.kmMes||(v.kmAno?Math.round(v.kmAno/12):0)||0,ka=km*12,ca=cm*12,ck=ka>0?ca/ka:0
  return{depPct:dp,deprAnual:da,deprMensal:dm,custoMensal:cm,custoAnual:ca,custoKm:ck}
}
function calcEvento(e){
  const cs=Object.values(e.custos||{}).reduce((a,b)=>a+(parseFloat(b)||0),0)
  const ft=parseFloat(e.faturamento)||0,qtd=parseInt(e.qtdVendas)||0,tk=parseFloat(e.ticketMedio)||0
  const rc=Math.max(ft,qtd*tk),lb=rc-cs,roi=cs>0?(lb/cs)*100:0
  const mg=rc>0?(lb/rc)*100:0,ds=parseInt(e.dias)||1,ld=ds>0?lb/ds:0
  const pe=cs/(rc>0?rc/ds:1)
  return{custoTotal:cs,receita:rc,lucroBruto:lb,roi:roi,margem:mg,lucroDia:ld,pontoEquilibrio:pe}
}
const EVT_CAT=['Aluguel de espa\u00e7o','Buffet','Decora\u00e7\u00e3o','Ilumina\u00e7\u00e3o e som','Seguran\u00e7a','Limpeza','Materiais gr\u00e1ficos','Brindes','Equipe de apoio','Transporte','Hospedagem','Coffee break','Seguro','Licen\u00e7as','Marketing','Imprevistos']

function fmt(v){return'R$ '+(parseFloat(v)||0).toFixed(2).replace('.',',')}
function pct(v){return(parseFloat(v)||0).toFixed(1).replace('.',',')+'%'}

// ====== CHART (pure canvas, no dependencies) ======
function drawChart(canvasId,labels,datasets){
  const canvas=document.getElementById(canvasId);if(!canvas)return
  const ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1
  const rect=canvas.parentElement.getBoundingClientRect()
  canvas.width=rect.width*dpr;canvas.height=220*dpr
  canvas.style.width=rect.width+'px';canvas.style.height='220px'
  ctx.scale(dpr,dpr);const w=rect.width,h=220
  ctx.clearRect(0,0,w,h)
  const pad={t:20,r:10,b:40,l:55},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b
  const textColor=getComputedStyle(document.body).getPropertyValue('--text2').trim()||'#888'
  let mx=0;datasets.forEach(ds=>ds.data.forEach(v=>{if(v>mx)mx=v}))
  if(mx===0)mx=1;mx=Math.ceil(mx*1.1/1000)*1000
  ctx.strokeStyle='rgba(128,128,128,.1)';ctx.lineWidth=1
  for(let i=0;i<=4;i++){const y=pad.t+ch-i*ch/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke()}
  ctx.fillStyle=textColor;ctx.font='11px system-ui,sans-serif';ctx.textAlign='right'
  for(let i=0;i<=4;i++){const y=pad.t+ch-i*ch/4;ctx.fillText('R$'+(mx*i/4/1000).toFixed(1)+'k',pad.l-6,y+4)}
  const n=labels.length,bg=Math.max(1,cw/n-8)
  datasets.forEach((ds,di)=>{ds.data.forEach((v,i)=>{const x=pad.l+i*(bg+8)+4+di*0.5,barW=Math.max(2,bg*0.4);const x2=x+di*barW,h2=ch*(v/mx),y2=pad.t+ch-h2;ctx.fillStyle=ds.colors?ds.colors[i]:ds.color;ctx.beginPath();ctx.roundRect(x2,y2,barW,Math.max(0,h2),2);ctx.fill()})})
  ctx.fillStyle=textColor;ctx.font='10px system-ui,sans-serif';ctx.textAlign='center'
  labels.forEach((l,i)=>{ctx.fillText(l.length>10?l.slice(0,10)+'\u2026':l,pad.l+i*(bg+8)+bg/2,h-6)})
  ctx.font='11px system-ui,sans-serif';ctx.textAlign='left'
  datasets.forEach((ds,i)=>{const lx=pad.l+i*120,ly=10;ctx.fillStyle=ds.color;ctx.beginPath();ctx.roundRect(lx,ly-7,10,10,2);ctx.fill();ctx.fillStyle=textColor;ctx.fillText(ds.label,lx+14,ly+4)})
}

// ====== RENDER ======
function render(){
  const app=document.getElementById('app')
  switch(state.currentModule){
    case'produtos':renderProdutos(app);break
    case'veiculos':renderVeiculos(app);break
    case'eventos':renderEventos(app);break
    default:renderDashboard(app)
  }
}

// ====== DASHBOARD ======
function renderDashboard(app){
  const p=state.produtos,v=state.veiculos,e=state.eventos
  const tp=p.reduce((s,x)=>s+(calcProduto(x).precoVenda||0),0)
  const tv=v.reduce((s,x)=>s+(calcVeiculo(x).custoMensal||0),0)
  const le=e.reduce((s,x)=>s+(calcEvento(x).lucroBruto||0),0)
  app.innerHTML='<h2 style="margin-bottom:12px">\u{1f4ca} Dashboard</h2>'+
    '<div class="grid-3">'+
    '<div class="card"><div style="font-size:.75rem;color:var(--text2)">\u{1f4e6} Produtos</div><div style="font-size:1.3rem;font-weight:700;margin:4px 0">'+p.length+'</div><div style="font-size:.78rem;color:var(--text2)">Total: '+fmt(tp)+'</div></div>'+
    '<div class="card"><div style="font-size:.75rem;color:var(--text2)">\u{1f697} Ve\u00edculos</div><div style="font-size:1.3rem;font-weight:700;margin:4px 0">'+v.length+'</div><div style="font-size:.78rem;color:var(--text2)">Custo/m\u00eas: '+fmt(tv)+'</div></div>'+
    '<div class="card"><div style="font-size:.75rem;color:var(--text2)">\u{1f3aa} Eventos</div><div style="font-size:1.3rem;font-weight:700;margin:4px 0">'+e.length+'</div><div style="font-size:.78rem;color:var(--text2)">Lucro: <span style="color:'+(le>=0?'var(--success)':'var(--danger)')+'">'+fmt(le)+'</span></div></div>'+
    '</div>'+
    '<div class="card" style="text-align:center;padding:24px">'+
    '<p style="color:var(--text2);margin-bottom:6px;font-size:.85rem">Use o menu ao lado para gerenciar dados.</p>'+
    '<p style="font-size:.78rem;color:var(--text2)">\u{1f4e4} Exporte regularmente para backup.</p>'+
    '<button class="btn btn-danger" style="margin-top:10px" onclick="clearAllData()">\u{1f5d1}\ufe0f Limpar dados</button></div>'
}

// ====== PRODUTOS ======
function renderProdutos(app){
  const ed=state.produtos.find(x=>x.id===state.editingId)
  app.innerHTML='<h2 style="margin-bottom:12px">\u{1f4e6} Produtos</h2><div class="grid-2">'+
    '<div class="card '+(state.editingId?'editing':'')+'">'+
    '<h2>'+(state.editingId?'\u270f\ufe0f Editar':'\u2795 Novo Produto')+'</h2>'+
    '<div class="form-group"><label>Nome</label><input id="pf_n" value="'+esc(ed?.nome||'')+'" placeholder="Ex: Camiseta"></div>'+
    '<div class="form-row"><div class="form-group"><label>Mat.-prima (R$)</label><input id="pf_mp" type="number" step=".01" min="0" value="'+(ed?.mp||'')+'"></div><div class="form-group"><label>Embalagem (R$)</label><input id="pf_emb" type="number" step=".01" min="0" value="'+(ed?.emb||'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>M\u00e3o de obra (R$)</label><input id="pf_mo" type="number" step=".01" min="0" value="'+(ed?.mo||'')+'"></div><div class="form-group"><label>Custo fixo (R$)</label><input id="pf_cf" type="number" step=".01" min="0" value="'+(ed?.cf||'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Log\u00edstica (R$)</label><input id="pf_log" type="number" step=".01" min="0" value="'+(ed?.log||'')+'"></div><div class="form-group"><label>Taxas (R$)</label><input id="pf_tax" type="number" step=".01" min="0" value="'+(ed?.tax||'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Impostos (%)</label><input id="pf_imp" type="number" step=".1" min="0" max="100" value="'+(ed?.impostos??'')+'"></div><div class="form-group"><label>Margem Desejada (%)</label><input id="pf_marg" type="number" step=".1" min="0" max="100" value="'+(ed?.margem??'')+'"></div></div>'+
    '<div style="display:flex;gap:6px;margin-top:12px">'+
    '<button class="btn btn-primary" onclick="saveProduto()">\u{1f4be} Salvar</button>'+
    (state.editingId?'<button class="btn btn-outline" onclick="cancelEdit()">Cancelar</button>':'')+
    '<button class="btn btn-outline" onclick="clearProdForm()">Limpar</button></div>'+
    (ed?calcProdutoPreview(ed):'')+'</div>'+
    '<div class="card"><h2>\u{1f4cb} Produtos</h2>'+
    (state.produtos.length===0?'<div class="empty"><p>Nenhum produto</p></div>':
    '<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Custo</th><th>Pre\u00e7o</th><th>Margem</th><th></th></tr></thead><tbody>'+
    state.produtos.map(p=>{const c=calcProduto(p);return'<tr><td><strong>'+esc(p.nome||'-')+'</strong></td><td>'+fmt(c.custoTotal)+'</td><td>'+fmt(c.precoVenda)+'</td><td><span class="badge '+(c.lucro>=0?'badge-success':'badge-danger')+'">'+pct(c.lucro/c.precoVenda*100||0)+'</span></td><td style="white-space:nowrap"><button class="btn btn-outline btn-sm" onclick="editProduto(\''+p.id+'\')">\u270f\ufe0f</button><button class="btn btn-danger btn-sm" onclick="deleteProduto(\''+p.id+'\')">\u{1f5d1}\ufe0f</button></td></tr>'}).join('')+
    '</tbody></table></div>')+'</div></div>'
  bindCalc()
}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function calcProdutoPreview(p){const c=calcProduto(p);return'<div style="margin-top:12px;padding-top:10px;border-top:2px solid var(--primary)"><div class="result-row"><span class="label">Custo total</span><span class="value">'+fmt(c.custoTotal)+'</span></div><div class="result-row"><span class="label">Markup</span><span class="value">'+c.markup.toFixed(2)+'x</span></div><div class="result-row total"><span class="label">\u{1f4b0} Pre\u00e7o venda</span><span class="value">'+fmt(c.precoVenda)+'</span></div><div class="result-row '+(c.lucro>=0?'positive':'negative')+'"><span class="label">Lucro</span><span class="value">'+fmt(c.lucro)+' ('+pct(c.lucro/c.precoVenda*100||0)+')</span></div></div>'}
function clearProdForm(){document.getElementById('pf_n').value='';document.querySelectorAll('#app input[type=number]').forEach(i=>i.value='')}
function saveProduto(){
  const n=document.getElementById('pf_n').value.trim();if(!n){alert('Digite o nome');return}
  const d={nome:n,mp:parseFloat(document.getElementById('pf_mp').value)||0,emb:parseFloat(document.getElementById('pf_emb').value)||0,mo:parseFloat(document.getElementById('pf_mo').value)||0,cf:parseFloat(document.getElementById('pf_cf').value)||0,log:parseFloat(document.getElementById('pf_log').value)||0,tax:parseFloat(document.getElementById('pf_tax').value)||0,impostos:parseFloat(document.getElementById('pf_imp').value)||0,margem:parseFloat(document.getElementById('pf_marg').value)||0}
  if(state.editingId){const i=state.produtos.findIndex(x=>x.id===state.editingId);if(i>=0)state.produtos[i]={...state.produtos[i],...d};state.editingId=null}else state.produtos.push({id:uid(),...d})
  sv(SK.produtos,state.produtos);render()
}
function editProduto(id){state.editingId=id;render()}
function deleteProduto(id){if(!confirm('Excluir?'))return;state.produtos=state.produtos.filter(x=>x.id!==id);if(state.editingId===id)state.editingId=null;sv(SK.produtos,state.produtos);render()}
function cancelEdit(){state.editingId=null;render()}
function bindCalc(){
  document.querySelectorAll('#app input').forEach(inp=>{
    inp.addEventListener('input',()=>{
      const c=document.querySelector('.card.editing');if(!c)return
      const n=document.getElementById('pf_n')?.value?.trim();if(!n)return
      const d={nome:n,mp:parseFloat(document.getElementById('pf_mp')?.value)||0,emb:parseFloat(document.getElementById('pf_emb')?.value)||0,mo:parseFloat(document.getElementById('pf_mo')?.value)||0,cf:parseFloat(document.getElementById('pf_cf')?.value)||0,log:parseFloat(document.getElementById('pf_log')?.value)||0,tax:parseFloat(document.getElementById('pf_tax')?.value)||0,impostos:parseFloat(document.getElementById('pf_imp')?.value)||0,margem:parseFloat(document.getElementById('pf_marg')?.value)||0}
      const r=calcProduto(d),rows=c.querySelectorAll('.result-row')
      if(rows.length>=4){const v=rows[0].querySelector('.value');const v2=rows[1].querySelector('.value');const v3=rows[2].querySelector('.value');const v4=rows[3].querySelector('.value');if(v)v.textContent=fmt(r.custoTotal);if(v2)v2.textContent=r.markup.toFixed(2)+'x';if(v3)v3.textContent=fmt(r.precoVenda);if(v4){v4.textContent=fmt(r.lucro)+' ('+pct((r.lucro/r.precoVenda*100)||0)+')';v4.closest('.result-row').className='result-row '+(r.lucro>=0?'positive':'negative')}}
    })
  })
}

// ====== VEICULOS ======
let _fipeMarcas=null,_fipeModelos=null,_fipeAnos=null,_fipeLoading=false,_fipeLastResult=null
const DEP_INFO={passeio:'Usado para ve\u00edculos de passeio convencionais.',utilitario:'Aplicado a ve\u00edculos utilit\u00e1rios como vans e picapes.',pesado:'Para ve\u00edculos pesados como caminh\u00f5es e \u00f4nibus.',particular:'Percentual para motos de uso particular.',trabalho:'Percentual para motos utilizadas para trabalho/entrega.'}

function renderVeiculos(app){
  const ed=state.veiculos.find(x=>x.id===state.editingId)
  const mode=ed&&ed.mode?ed.mode:state.veiculoMode
  const isM=state.veiculoType==='moto'
  const subs=isM?['particular','trabalho']:['passeio','utilitario','pesado']
  const sl={passeio:'Passeio (10%)',utilitario:'Utilit\u00e1rio (15%)',pesado:'Pesado (20%)',particular:'Particular (12%)',trabalho:'Trabalho (15%)'}
  const sel=ed?ed.sub:state.veiculoSub

  // Mode toggle
  const toggle='<div class="mode-toggle"><button class="mode-btn'+(mode==='simples'?' active':'')+'" onclick="setVeicMode(\'simples\')">\u{1f4cb} Simples</button><button class="mode-btn'+(mode==='empresarial'?' active':'')+'" onclick="setVeicMode(\'empresarial\')">\u{1f3e2} Empresarial</button></div>'

  app.innerHTML='<h2 style="margin-bottom:12px">\u{1f697} Ve\u00edculos</h2>'+toggle

  if(mode==='empresarial'){renderVeiculosEmpresarial(app,ed,isM)}
  else{renderVeiculosSimples(app,ed,isM,subs,sl,sel)}
}
function renderVeiculosSimples(app,ed,isM,subs,sl,sel){
  const depPct=getDep(state.veiculoType,sel)
  if(ed&&ed.fipeData){_fipeLastResult={valor:ed.fipeValor,data:ed.fipeData,codigo:ed.fipeCodigo||''}}else if(!state.editingId)_fipeLastResult=null
  const fd=ed?.fipeData||'',fc=ed?.fipeCodigo||''
  app.innerHTML+='<div class="grid-2">'+
    '<div class="card '+(state.editingId?'editing':'')+'">'+
    '<h2>'+(state.editingId?'\u270f\ufe0f Editar':'\u2795 Novo Ve\u00edculo')+'</h2>'+

    '<div class="section-title">\u{1f3f7}\ufe0f Identifica\u00e7\u00e3o</div>'+
    '<div class="form-group"><label>Nome do Ve\u00edculo</label><input id="vf_n" value="'+esc(ed?.nome||'')+'" placeholder="Ex: Fiorino 2020"></div>'+
    '<div class="sub-tabs"><button class="sub-tab '+(!isM?'active':'')+'" onclick="setVT(\'carro\')">\u{1f697} Carro</button><button class="sub-tab '+(isM?'active':'')+'" onclick="setVT(\'moto\')">\u{1f3cd}\ufe0f Moto</button></div>'+
    '<div class="sub-tabs">'+subs.map(s=>'<button class="sub-tab '+(sel===s?'active':'')+'" onclick="setVS(\''+s+'\')">'+sl[s]+'</button>').join('')+'</div>'+

    '<div class="depreciation-info"><div class="help-text">'+
    '<span class="tooltip-wrap">Deprecia\u00e7\u00e3o anual estimada: <strong>'+depPct+'%</strong>'+
    '<span class="tooltip-icon" title="">\u2139\ufe0f</span>'+
    '<span class="tooltip-bubble">Percentual anual de desvaloriza\u00e7\u00e3o do ve\u00edculo. Ex: um ve\u00edculo de R$ 50.000 com 10% ao ano perde R$ 5.000 no primeiro ano. Este valor \u00e9 rateado nos custos mensais.</span></span>'+
    '</div><div style="font-size:.7rem;color:var(--text2);margin-top:2px">'+DEP_INFO[sel]+' '+
    'Este percentual \u00e9 aplicado sobre o valor do ve\u00edculo para calcular a perda mensal.</div></div>'+

    '<div class="section-title">\u{1f50d} Consulta FIPE</div>'+
    '<div class="fipe-row">'+
    '<div class="form-group"><label>Marca</label><select id="vf_fipeMarca" onchange="onFipeMarcaChange()"><option value="">Selecione...</option></select></div>'+
    '<div class="form-group"><label>Modelo</label><select id="vf_fipeModelo" onchange="onFipeModeloChange()" disabled><option value="">Primeiro selecione a marca</option></select></div>'+
    '<div class="form-group"><label>Ano</label><select id="vf_fipeAno" onchange="onFipeAnoChange()" disabled><option value="">Selecione o modelo</option></select></div>'+
    '<button class="fipe-btn" id="vf_fipeBtn" onclick="consultarFipe()" disabled>\u{1f50e} Consultar</button>'+
    '</div>'+
    '<div id="vf_fipeStatus" class="fipe-status"></div>'+

    '<div class="section-title">\u{1f4b0} Valor e Custos Mensais</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Valor do Ve\u00edculo (R$)</label><input id="vf_vl" type="number" step=".01" min="0" value="'+(ed?.valor||'')+'">'+
    (fd?'<div style="font-size:.65rem;color:var(--text2);margin-top:1px">\u00daltima consulta FIPE: '+new Date(fd).toLocaleDateString('pt-BR')+(fc?' (c\u00f3d. '+fc+')':'')+'</div>':'')+
    '</div>'+
    '<div class="form-group"><label>IPVA anual (R$)</label><input id="vf_ip" type="number" step=".01" min="0" value="'+(ed?.ipva||'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Seguro mensal (R$)</label><input id="vf_sg" type="number" step=".01" min="0" value="'+(ed?.seguro||'')+'"></div><div class="form-group"><label>Manuten\u00e7\u00e3o mensal (R$)</label><input id="vf_mn" type="number" step=".01" min="0" value="'+(ed?.manut||'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Combust\u00edvel mensal (R$)</label><input id="vf_cb" type="number" step=".01" min="0" value="'+(ed?.comb||'')+'"></div><div class="form-group"><label>Estacionamento mensal (R$)</label><input id="vf_es" type="number" step=".01" min="0" value="'+(ed?.est||'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Financiamento mensal (R$)</label><input id="vf_fn" type="number" step=".01" min="0" value="'+(ed?.fin||'')+'"></div><div class="form-group"></div></div>'+

    '<div class="section-title">\u{1f4cd} Quilometragem</div>'+
    '<div class="form-group"><label>KM rodados por m\u00eas</label><input id="vf_km" type="number" step="1" min="0" value="'+(ed?.kmMes||(ed?.kmAno?Math.round(ed.kmAno/12):'')||'')+'">'+
    '<div class="help-text">Informe a m\u00e9dia de quil\u00f4metros percorridos pelo ve\u00edculo em um m\u00eas. Ex: 2.500 km/m\u00eas = 30.000 km/ano. Usado para calcular o <strong>custo por quil\u00f4metro</strong>.</div></div>'+

    '<div style="display:flex;gap:6px;margin-top:16px">'+
    '<button class="btn btn-primary" onclick="saveVeiculo()">\u{1f4be} Salvar</button>'+
    (state.editingId?'<button class="btn btn-outline" onclick="cancelEdit()">Cancelar</button>':'')+
    '<button class="btn btn-outline" onclick="clearVeicForm()">Limpar</button></div>'+

    '<div id="vf_validation" style="margin-top:8px"></div>'+

    '<div class="summary-card" id="vf_summary">'+
    buildVeiculoSummary(ed?ed:{nome:'',tipo:state.veiculoType,sub:state.veiculoSub,valor:0,ipva:0,seguro:0,manut:0,comb:0,est:0,fin:0,kmMes:0})+
    '</div>'+

    '</div>'+

    '<div class="card"><h2>\u{1f4cb} Ve\u00edculos Cadastrados</h2>'+
    (state.veiculos.length===0?'<div class="empty"><p>Nenhum ve\u00edculo cadastrado</p></div>':
    '<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Custo/m\u00eas</th><th>Custo/km</th><th></th></tr></thead><tbody>'+
    state.veiculos.map(v=>{const c=v.mode==='empresarial'?calcVeiculoEmpresarial(v):calcVeiculo(v);const fipeTag=v.fipeData?' <span class="fipe-tag">FIPE</span>':'';const modeTag=v.mode==='empresarial'?' <span class="mode-tag mode-emp">\u{1f3e2}</span>':' <span class="mode-tag mode-sim">\u{1f4cb}</span>';return'<tr><td><strong>'+esc(v.nome||'-')+'</strong>'+fipeTag+modeTag+'</td><td><span class="module-tag">'+(v.tipo==='moto'?'\u{1f3cd}\ufe0f':'\u{1f697}')+' '+v.sub+'</span></td><td>'+fmt(c.custoMensal)+'</td><td>'+fmt(c.custoKm)+'</td><td style="white-space:nowrap"><button class="btn btn-outline btn-sm" onclick="editVeiculo(\''+v.id+'\')">\u270f\ufe0f</button><button class="btn btn-outline btn-sm" onclick="exportVeiculoReport(\''+v.id+'\')">\u{1f4c4}</button><button class="btn btn-danger btn-sm" onclick="deleteVeiculo(\''+v.id+'\')">\u{1f5d1}\ufe0f</button></td></tr>'}).join('')+
    '</tbody></table></div>')+'</div></div>'
  bindVeiculoCalc()
  populateFipeSelectsFromCache()
  if(ed)restoreFipeEditValues()
  if(!_fipeMarcas&&!_fipeLoading)setTimeout(()=>fetchMarcas(),300)
}

// ====== MODO EMPRESARIAL ======
function setVeicMode(m){state.veiculoMode=m;state.editingId=null;render()}
function calcVeiculoEmpresarial(v){
  const valAq=v.valorAquisicao||0,valVd=v.valorVenda||0,depTotal=Math.max(0,valAq-valVd)
  const prazo=v.prazoTroca||0,meses=v.prazoTrocaUnidade==='anos'?prazo*12:prazo,depMensal=meses>0?depTotal/meses:0
  const kmMes=v.kmMes||0,kmAno=kmMes*12,kmDia=kmMes>0?kmMes/30:0
  const emplacM=(v.emplacamento||0)/12
  const seguroM=(v.seguro||0),ipvaM=(v.ipva||0)/12,estM=(v.est||0),finM=(v.fin||0)
  const custoFixoM=seguroM+ipvaM+estM+finM+emplacM
  const combM=(v.comb||0),pedM=(v.emp_pedagio||0),lavM=(v.emp_lavagem||0),multM=(v.emp_multas||0)/12
  const custoVarM=combM+pedM+lavM+multM
  const pneuKmVida=v.emp_pneusKmVida||0
  const pneuMesesCalc=(pneuKmVida>0&&kmMes>0)?pneuKmVida/kmMes:0
  const pneuMesesTotal=Math.max(pneuMesesCalc,v.emp_pneusVidaUtil||1)
  const pneuM=(v.emp_pneusValor||0)/pneuMesesTotal
  const manutM=(v.emp_manutencaoAnual||0)/12
  const franqM=(v.emp_franquiaValor||0)/Math.max(1,v.emp_franquiaPeriodo||1)
  const reposM=pneuM+manutM+franqM
  const custoTotalM=depMensal+custoFixoM+custoVarM+reposM
  return{custoMensal:custoTotalM,custoAnual:custoTotalM*12,custoKm:kmMes>0?custoTotalM/kmMes:0,depTotal,depMensal,kmMes,kmAno,kmDia,custoFixoM,custoVarM,reposM,seguroM,ipvaM,estM,finM,combM,pedM,lavM,multM,pneuM,manutM,franqM,emplacM,pneuMesesTotal,pneuMesesCalc}
}
function renderVeiculosEmpresarial(app,ed,isM){
  const defaultD={nome:'',anoModelo:'',tipo:state.veiculoType,sub:state.veiculoSub,custoPercebido:0,valorAquisicao:0,valorVenda:0,prazoTroca:0,prazoTrocaUnidade:'meses',kmMes:0,seguro:0,ipva:0,est:0,fin:0,emplacamento:0,comb:0,emp_pedagio:0,emp_lavagem:0,emp_multas:0,emp_pneusValor:0,emp_pneusVidaUtil:1,emp_pneusKmVida:0,emp_manutencaoAnual:0,emp_franquiaValor:0,emp_franquiaPeriodo:1,kmPorLitro:0}
  const d=ed||defaultD
  const f=(id)=>esc(d[id]!==undefined&&d[id]!==null?String(d[id]):'')
  const c=calcVeiculoEmpresarial(d)
  const oldVal=d.valorAquisicao||d.valor||''

  app.innerHTML+='<div class="grid-2">'+
    '<div class="card '+(state.editingId?'editing':'')+' emp-form">'+
    '<h2>'+(state.editingId?'\u270f\ufe0f Editar':'\u2795 Novo Ve\u00edculo')+'</h2>'+

    // IDENTIFICA\u00c7\u00c3O
    '<div class="section-title">\u{1f3f7}\ufe0f Identifica\u00e7\u00e3o</div>'+
    '<div class="form-group"><label>Nome e Marca do Ve\u00edculo</label><input id="vf_n" value="'+f('nome')+'" placeholder="Ex: Renault Kwid"></div>'+
    '<div class="form-row"><div class="form-group"><label>Ano / Modelo</label><input id="vf_emp_ano" value="'+f('anoModelo')+'" placeholder="Ex: 25/25"></div>'+
    '<div class="form-group"><label>Tipo</label><div class="sub-tabs" style="margin-bottom:0"><button class="sub-tab '+(!isM?'active':'')+'" onclick="setVT(\'carro\')">\u{1f697} Carro</button><button class="sub-tab '+(isM?'active':'')+'" onclick="setVT(\'moto\')">\u{1f3cd}\ufe0f Moto</button></div></div></div>'+

    // BLOCO 1 - AQUISI\u00c7\u00c3O E DESVALORIZA\u00c7\u00c3O
    '<div class="block-card block-aquisicao"><div class="block-header">\u{1f697} Aquisi\u00e7\u00e3o e Desvaloriza\u00e7\u00e3o</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Valor de Aquisi\u00e7\u00e3o (R$)</label><input id="vf_emp_aq" type="number" step=".01" min="0" value="'+f('valorAquisicao')+'" placeholder="Ex: 72000"></div>'+
    '<div class="form-group"><label>Valor Previsto de Venda (R$)</label><input id="vf_emp_vd" type="number" step=".01" min="0" value="'+f('valorVenda')+'" placeholder="Ex: 42684"></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Prazo de Troca</label><input id="vf_emp_pz" type="number" step="1" min="0" value="'+f('prazoTroca')+'" placeholder="Ex: 60"></div>'+
    '<div class="form-group"><label>Unidade</label><select id="vf_emp_pzu"><option value="meses"'+(d.prazoTrocaUnidade==='meses'?' selected':'')+'>Meses</option><option value="anos"'+(d.prazoTrocaUnidade==='anos'?' selected':'')+'>Anos</option></select></div>'+
    '</div>'+
    '<div class="block-results"><div class="block-result"><span class="br-label">\u{1f4c9} Deprecia\u00e7\u00e3o Total</span><span class="br-value" id="vf_emp_depTot">'+(c.depTotal>0?fmt(c.depTotal):'---')+'</span></div>'+
    '<div class="block-result"><span class="br-label">\u{1f4c9} Deprecia\u00e7\u00e3o Mensal</span><span class="br-value" id="vf_emp_depMen">'+(c.depMensal>0?fmt(c.depMensal):'---')+'</span></div></div></div>'+

    // BLOCO 2 - UTILIZA\u00c7\u00c3O OPERACIONAL
    '<div class="block-card block-utilizacao"><div class="block-header">\u{1f6e3}\ufe0f Utiliza\u00e7\u00e3o Operacional</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>KM Rodados por M\u00eas</label><input id="vf_emp_kmM" type="number" step="1" min="0" value="'+f('kmMes')+'" oninput="setEmpKM(\'mes\',this.value)" placeholder="Ex: 3000"></div>'+
    '<div class="form-group"><label>KM Rodados por Ano</label><input id="vf_emp_kmA" type="number" step="1" min="0" value="'+(d.kmMes?d.kmMes*12:'')+'" oninput="setEmpKM(\'ano\',this.value)" placeholder="Calculado automaticamente"></div>'+
    '</div>'+
    '<div class="block-results"><div class="block-result"><span class="br-label">\u{1f4cd} KM/Dia estimado</span><span class="br-value" id="vf_emp_kmD">'+(c.kmDia>0?c.kmDia.toFixed(1):'---')+'</span></div></div></div>'+

    // BLOCO 3 - CUSTOS FIXOS
    '<div class="block-card block-fixos"><div class="block-header">\u{1f4b0} Custos Fixos</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Seguro Mensal (R$)</label><input id="vf_sg" type="number" step=".01" min="0" value="'+f('seguro')+'" placeholder="Ex: 250"></div>'+
    '<div class="form-group"><label>IPVA Anual (R$)</label><input id="vf_ip" type="number" step=".01" min="0" value="'+f('ipva')+'" placeholder="Ex: 2400">'+
    '<div class="conv-hint" id="vf_ip_hint">'+(d.ipva?'\u2192 '+fmt((d.ipva||0)/12)+'/m\u00eas':'')+'</div></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Estacionamento Mensal (R$)</label><input id="vf_es" type="number" step=".01" min="0" value="'+f('est')+'" placeholder="Ex: 300"></div>'+
    '<div class="form-group"><label>Financiamento/Juros Mensal (R$)</label><input id="vf_fn" type="number" step=".01" min="0" value="'+f('fin')+'" placeholder="Ex: 1200"></div>'+
    '</div>'+
    '<div class="form-row"><div class="form-group"><label>Emplacamento Anual (R$)</label><input id="vf_emp_emplac" type="number" step=".01" min="0" value="'+f('emplacamento')+'" placeholder="Ex: 3500">'+
    '<div class="conv-hint" id="vf_emplac_hint">'+(d.emplacamento?'\u2192 '+fmt((d.emplacamento||0)/12)+'/m\u00eas':'')+'</div></div>'+
    '<div class="form-group"></div></div></div>'+

    // BLOCO 4 - CUSTOS VARI\u00c1VEIS
    '<div class="block-card block-variaveis"><div class="block-header">\u26fd Custos Vari\u00e1veis</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Combust\u00edvel Mensal (R$)</label><input id="vf_cb" type="number" step=".01" min="0" value="'+f('comb')+'" placeholder="Ex: 1800"></div>'+
    '<div class="form-group"><label>Ped\u00e1gio Mensal (R$)</label><input id="vf_emp_ped" type="number" step=".01" min="0" value="'+f('emp_pedagio')+'" placeholder="Ex: 400"></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Lavagem Mensal (R$)</label><input id="vf_emp_lav" type="number" step=".01" min="0" value="'+f('emp_lavagem')+'" placeholder="Ex: 150"></div>'+
    '<div class="form-group"><label>Multas Anuais (R$)</label><input id="vf_emp_mult" type="number" step=".01" min="0" value="'+f('emp_multas')+'" placeholder="Ex: 600">'+
    '<div class="conv-hint" id="vf_emp_mult_hint">'+(d.emp_multas?'\u2192 '+fmt((d.emp_multas||0)/12)+'/m\u00eas':'')+'</div></div>'+
    '</div></div>'+

    // BLOCO 5 - CUSTOS DE REPOSI\u00c7\u00c3O
    '<div class="block-card block-reposicao"><div class="block-header">\u{1f527} Custos de Reposi\u00e7\u00e3o</div>'+
    '<div class="block-sub"><span class="block-sub-icon">\u{1f7e2}</span> Pneus</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Valor do Jogo (R$)</label><input id="vf_emp_pnv" type="number" step=".01" min="0" value="'+f('emp_pneusValor')+'" placeholder="Ex: 2400"></div>'+
    '<div class="form-group"><label>Vida \u00datil (meses)</label><input id="vf_emp_pnvida" type="number" step="1" min="1" value="'+f('emp_pneusVidaUtil')+'" placeholder="Ex: 24"></div>'+
    '</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Vida \u00datil (KM)</label><input id="vf_emp_pnvkm" type="number" step="1" min="0" value="'+f('emp_pneusKmVida')+'" placeholder="Ex: 35000">'+
    '<div class="help-text" style="font-size:.65rem">Se preenchido, calcula meses automaticamente: KM \u00faltil \u00f7 KM/m\u00eas</div></div>'+
    '<div class="form-group"></div>'+
    '</div>'+
    '<div class="block-sub"><span class="block-sub-icon">\u{1f7e0}</span> Manuten\u00e7\u00e3o</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Manuten\u00e7\u00e3o Anual (R$)</label><input id="vf_emp_manut" type="number" step=".01" min="0" value="'+f('emp_manutencaoAnual')+'" placeholder="Ex: 3600">'+
    '<div class="conv-hint" id="vf_emp_manut_hint">'+(d.emp_manutencaoAnual?'\u2192 '+fmt((d.emp_manutencaoAnual||0)/12)+'/m\u00eas':'')+'</div></div>'+
    '<div class="form-group"></div>'+
    '</div>'+
    '<div class="block-sub"><span class="block-sub-icon">\u{1f7e1}</span> Franquia</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>Valor da Franquia (R$)</label><input id="vf_emp_franqv" type="number" step=".01" min="0" value="'+f('emp_franquiaValor')+'" placeholder="Ex: 5000"></div>'+
    '<div class="form-group"><label>Per\u00edodo de Rateio (meses)</label><input id="vf_emp_franqp" type="number" step="1" min="1" value="'+f('emp_franquiaPeriodo')+'" placeholder="Ex: 12"></div>'+
    '</div></div>'+

    // CUSTO PERCEBIDO
    '<div class="block-card" style="border-color:var(--warning)"><div class="block-header" style="color:var(--warning);border-bottom-color:var(--warning)">\u{1f4ad} Custo "Percebido" Mensal</div>'+
    '<div class="form-group"><label>Quanto voc\u00ea acha que gasta por m\u00eas? (R$)</label><input id="vf_emp_cp" type="number" step=".01" min="0" value="'+f('custoPercebido')+'" placeholder="Ex: 2500"></div>'+
    '<div class="help-text">Compare com o custo real calculado pelo sistema. A diferen\u00e7a mostra se voc\u00ea subestima ou superestima seus gastos.</div></div>'+

    // ANOTA\u00c7\u00d5ES
    '<div class="block-card block-utilizacao"><div class="block-header">\u{1f4dd} Anota\u00e7\u00f5es</div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label>KM por Litro (km/L)</label><input id="vf_emp_kml" type="number" step=".1" min="0" value="'+f('kmPorLitro')+'" placeholder="Ex: 16"></div>'+
    '<div class="form-group"><label>Litros/m\u00eas</label><div class="auto-result" id="vf_emp_litros">'+(d.kmPorLitro&&d.kmMes?(d.kmMes/d.kmPorLitro).toFixed(1)+' L':'---')+'</div></div>'+
    '</div>'+
    '<div class="help-text">Com KM/m\u00eas e km/L, calcula automaticamente o consumo mensal em litros.</div></div>'+

    // A\u00c7\u00d5ES
    '<div style="display:flex;gap:6px;margin-top:16px">'+
    '<button class="btn btn-primary" onclick="saveVeiculo()">\u{1f4be} Salvar</button>'+
    (state.editingId?'<button class="btn btn-outline" onclick="cancelEdit()">Cancelar</button>':'')+
    '<button class="btn btn-outline" onclick="clearVeicForm()">Limpar</button></div>'+

    '<div id="vf_validation" style="margin-top:8px"></div>'+

    '</div>'+

    // DASHBOARD GERENCIAL
    '<div class="card emp-dashboard"><h2>\u{1f4ca} Resumo Gerencial</h2>'+
    '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">'+
    '<button class="btn btn-outline btn-sm active" id="vf_viewBtn" onclick="toggleVeicView()">\u{1f4ca} Cards</button>'+
    '<button class="btn btn-outline btn-sm" id="vf_planBtn" onclick="toggleVeicView()">\u{1f4d1} Planilha</button>'+
    '</div>'+
    '<div id="vf_dashContent"><div class="metric-grid">'+
    '<div class="metric-card" id="vf_met_va"><div class="metric-icon">\u{1f697}</div><div class="metric-label">Valor do Ve\u00edculo</div><div class="metric-value">'+(d.valorAquisicao>0?fmt(d.valorAquisicao):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_dm"><div class="metric-icon">\u{1f4c9}</div><div class="metric-label">Deprecia\u00e7\u00e3o Mensal</div><div class="metric-value">'+(c.depMensal>0?fmt(c.depMensal):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_cf"><div class="metric-icon">\u{1f4b0}</div><div class="metric-label">Custo Fixo Mensal</div><div class="metric-value">'+(c.custoFixoM>0?fmt(c.custoFixoM):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_cv"><div class="metric-icon">\u26fd</div><div class="metric-label">Custo Vari\u00e1vel Mensal</div><div class="metric-value">'+(c.custoVarM>0?fmt(c.custoVarM):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_rp"><div class="metric-icon">\u{1f527}</div><div class="metric-label">Reposi\u00e7\u00e3o Mensal</div><div class="metric-value">'+(c.reposM>0?fmt(c.reposM):'---')+'</div></div>'+
    '<div class="metric-card metric-highlight" id="vf_met_ct"><div class="metric-icon">\u{1f4ca}</div><div class="metric-label">Custo Total Mensal</div><div class="metric-value">'+(c.custoMensal>0?fmt(c.custoMensal):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_ck"><div class="metric-icon">\u{1f4cd}</div><div class="metric-label">Custo por KM</div><div class="metric-value">'+(c.custoKm>0?fmt(c.custoKm):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_ca"><div class="metric-icon">\u{1f4c5}</div><div class="metric-label">Custo Anual</div><div class="metric-value">'+(c.custoAnual>0?fmt(c.custoAnual):'---')+'</div></div>'+
    '</div></div>'+

    // LISTA
    '<h2 style="margin-top:20px">\u{1f4cb} Ve\u00edculos Cadastrados</h2>'+
    (state.veiculos.length===0?'<div class="empty"><p>Nenhum ve\u00edculo cadastrado</p></div>':
    '<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Custo/m\u00eas</th><th>Custo/km</th><th></th></tr></thead><tbody>'+
    state.veiculos.map(v=>{const cv=v.mode==='empresarial'?calcVeiculoEmpresarial(v):calcVeiculo(v);const fipeTag=v.fipeData?' <span class="fipe-tag">FIPE</span>':'';const modeTag=v.mode==='empresarial'?' <span class="mode-tag mode-emp">\u{1f3e2}</span>':' <span class="mode-tag mode-sim">\u{1f4cb}</span>';return'<tr><td><strong>'+esc(v.nome||'-')+'</strong>'+fipeTag+modeTag+'</td><td><span class="module-tag">'+(v.tipo==='moto'?'\u{1f3cd}\ufe0f':'\u{1f697}')+' '+v.sub+'</span></td><td>'+fmt(cv.custoMensal)+'</td><td>'+fmt(cv.custoKm)+'</td><td style="white-space:nowrap"><button class="btn btn-outline btn-sm" onclick="editVeiculo(\''+v.id+'\')">\u270f\ufe0f</button><button class="btn btn-outline btn-sm" onclick="exportVeiculoReport(\''+v.id+'\')">\u{1f4c4}</button><button class="btn btn-danger btn-sm" onclick="deleteVeiculo(\''+v.id+'\')">\u{1f5d1}\ufe0f</button></td></tr>'}).join('')+
    '</tbody></table></div>')+'</div></div>'
  bindVeiculoCalcEmp()
}
let _veicView='cards'
function toggleVeicView(){
  _veicView=_veicView==='cards'?'planilha':'cards'
  const d=getVeiculoFormDataEmpresarial()
  const c=calcVeiculoEmpresarial(d)
  const btn=document.getElementById('vf_viewBtn'),pbtn=document.getElementById('vf_planBtn'),content=document.getElementById('vf_dashContent')
  if(!btn||!pbtn||!content)return
  btn.classList.toggle('active',_veicView==='cards')
  pbtn.classList.toggle('active',_veicView==='planilha')
  content.innerHTML=_veicView==='planilha'?buildPlanilhaView(d,c):buildMetricView(d,c)
}
function buildMetricView(d,c){
  const sv=(id,val)=>{const e=document.getElementById(id);if(e){const v=e.querySelector('.metric-value');if(v)v.textContent=val>0?fmt(val):'---'}}
  sv('vf_met_va',d.valorAquisicao);sv('vf_met_dm',c.depMensal);sv('vf_met_cf',c.custoFixoM);sv('vf_met_cv',c.custoVarM);sv('vf_met_rp',c.reposM);sv('vf_met_ct',c.custoMensal);sv('vf_met_ck',c.custoKm);sv('vf_met_ca',c.custoAnual)
  return '<div class="metric-grid">'+
    '<div class="metric-card" id="vf_met_va"><div class="metric-icon">\u{1f697}</div><div class="metric-label">Valor do Ve\u00edculo</div><div class="metric-value">'+(d.valorAquisicao>0?fmt(d.valorAquisicao):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_dm"><div class="metric-icon">\u{1f4c9}</div><div class="metric-label">Deprecia\u00e7\u00e3o Mensal</div><div class="metric-value">'+(c.depMensal>0?fmt(c.depMensal):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_cf"><div class="metric-icon">\u{1f4b0}</div><div class="metric-label">Custo Fixo Mensal</div><div class="metric-value">'+(c.custoFixoM>0?fmt(c.custoFixoM):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_cv"><div class="metric-icon">\u26fd</div><div class="metric-label">Custo Vari\u00e1vel Mensal</div><div class="metric-value">'+(c.custoVarM>0?fmt(c.custoVarM):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_rp"><div class="metric-icon">\u{1f527}</div><div class="metric-label">Reposi\u00e7\u00e3o Mensal</div><div class="metric-value">'+(c.reposM>0?fmt(c.reposM):'---')+'</div></div>'+
    '<div class="metric-card metric-highlight" id="vf_met_ct"><div class="metric-icon">\u{1f4ca}</div><div class="metric-label">Custo Total Mensal</div><div class="metric-value">'+(c.custoMensal>0?fmt(c.custoMensal):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_ck"><div class="metric-icon">\u{1f4cd}</div><div class="metric-label">Custo por KM</div><div class="metric-value">'+(c.custoKm>0?fmt(c.custoKm):'---')+'</div></div>'+
    '<div class="metric-card" id="vf_met_ca"><div class="metric-icon">\u{1f4c5}</div><div class="metric-label">Custo Anual</div><div class="metric-value">'+(c.custoAnual>0?fmt(c.custoAnual):'---')+'</div></div>'+
    '</div>'
}
function buildPlanilhaView(d,c){
  const pneuCalcStr=d.emp_pneusVidaUtil?'R$ '+fmt(d.emp_pneusValor||0)+' / '+(d.emp_pneusVidaUtil||1)+' meses = '+fmt(c.pneuM):'---'
  const pneuKmCalcStr=d.emp_pneusKmVida&&d.kmMes?'('+(d.emp_pneusKmVida).toLocaleString('pt-BR')+' km \u00f7 '+d.kmMes+' km/m\u00eas = '+Math.round(c.pneuMesesCalc||0)+' meses)':''
  return '<div class="planilha-view">'+
    '<div class="planilha-header">\u{1f4ca} Planilha IDEBRASIL &mdash; C\u00e1lculo do Custo Mensal</div>'+
    '<div class="planilha-row planilha-subheader"><span>DESCRI\u00c7\u00c3O</span><span>VALOR MENSAL (R$)</span></div>'+
    '<div class="planilha-row"><span>Combust\u00edvel (mensal)</span><span>'+(d.comb>0?fmt(d.comb):'---')+'</span></div>'+
    '<div class="planilha-row"><span>Estacionamento (mensal)</span><span>'+(d.est>0?fmt(d.est):'---')+'</span></div>'+
    '<div class="planilha-row"><span>Juros (mensal)</span><span>'+(d.fin>0?fmt(d.fin):'---')+'</span></div>'+
    '<div class="planilha-row"><span>Ped\u00e1gio (mensal)</span><span>'+(d.emp_pedagio>0?fmt(d.emp_pedagio):'---')+'</span></div>'+
    '<div class="planilha-row"><span>Lavagem (mensal)</span><span>'+(d.emp_lavagem>0?fmt(d.emp_lavagem):'---')+'</span></div>'+
    '<div class="planilha-row planilha-calc"><span>Pneus '+(pneuKmCalcStr?'<br><small>'+pneuKmCalcStr+'</small>':'')+'</span><span>'+pneuCalcStr+'</span></div>'+
    '<div class="planilha-row planilha-calc"><span>Manuten\u00e7\u00e3o anual<br><small>R$ '+fmt(d.emp_manutencaoAnual||0)+' / 12 meses</small></span><span>'+(d.emp_manutencaoAnual>0?fmt(c.manutM):'---')+'</span></div>'+
    '<div class="planilha-row planilha-calc"><span>Seguro (total anual)<br><small>R$ '+fmt(d.seguro*12||0)+' / 12 meses</small></span><span>'+(d.seguro>0?fmt(c.seguroM):'---')+'</span></div>'+
    '<div class="planilha-row planilha-calc"><span>Franquia<br><small>R$ '+fmt(d.emp_franquiaValor||0)+' / '+(d.emp_franquiaPeriodo||1)+' meses</small></span><span>'+(d.emp_franquiaValor>0?fmt(c.franqM):'---')+'</span></div>'+
    '<div class="planilha-row"><span>Multas (mensal)</span><span>'+(d.emp_multas>0?fmt(c.multM):'---')+'</span></div>'+
    '<div class="planilha-row planilha-calc"><span>Emplacamento completo<br><small>R$ '+fmt(d.emplacamento||0)+' / 12 meses</small></span><span>'+(d.emplacamento>0?fmt(c.emplacM):'---')+'</span></div>'+
    '<div class="planilha-row planilha-calc"><span>Deprecia\u00e7\u00e3o Total<br><small>R$ '+fmt(d.valorAquisicao-d.valorVenda||0)+' / '+Math.round((d.prazoTrocaUnidade==='anos'?d.prazoTroca*12:d.prazoTroca)||0)+' meses</small></span><span>'+(c.depMensal>0?fmt(c.depMensal):'---')+'</span></div>'+
    '<div class="planilha-divider"></div>'+
    '<div class="planilha-row planilha-total"><span>TOTAL GASTO MENSAL</span><span>'+(c.custoMensal>0?fmt(c.custoMensal):'---')+'</span></div>'+
    '<div class="planilha-divider"></div>'+
    '<div class="planilha-rateio"><strong>RATEIO POR KM RODADO</strong></div>'+
    '<div class="planilha-row"><span>Gasto mensal</span><span>'+(c.custoMensal>0?fmt(c.custoMensal):'---')+'</span></div>'+
    '<div class="planilha-row"><span>KM rodado</span><span>'+(d.kmMes>0?d.kmMes.toLocaleString('pt-BR')+' km':'---')+'</span></div>'+
    '<div class="planilha-row planilha-total"><span>Custo por km rodado</span><span>'+(c.custoKm>0?fmt(c.custoKm)+'/km':'---')+'</span></div>'+
    (d.custoPercebido?'<div class="planilha-divider"></div><div class="planilha-row"><span>Custo "Percebido" (sua estimativa)</span><span>'+fmt(d.custoPercebido)+'</span></div>'+
    '<div class="planilha-row"><span>Diferen\u00e7a (real - percebido)</span><span style="color:'+(c.custoMensal-d.custoPercebido>=0?'var(--danger)':'var(--success)')+'">'+(c.custoMensal-d.custoPercebido>=0?'+':'')+fmt(c.custoMensal-d.custoPercebido)+'</span></div>':'')+
    (d.kmPorLitro&&d.kmMes?'<div class="planilha-divider"></div><div class="planilha-rateio"><strong>ANOTA\u00c7\u00d5ES</strong></div>'+
    '<div class="planilha-row"><span>KM/m\u00eas</span><span>'+d.kmMes.toLocaleString('pt-BR')+' km</span></div>'+
    '<div class="planilha-row"><span>km/L</span><span>'+d.kmPorLitro.toFixed(1)+' km/L</span></div>'+
    '<div class="planilha-row"><span>Litros/m\u00eas</span><span>'+(d.kmMes/d.kmPorLitro).toFixed(1)+' L</span></div>':'')+
    '</div>'
}
function exportVeiculoReport(id){
  const v=state.veiculos.find(x=>x.id===id)
  if(!v)return
  const c=v.mode==='empresarial'?calcVeiculoEmpresarial(v):calcVeiculo(v)
  const w=window.open('','_blank')
  const isE=v.mode==='empresarial'
  let html='<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relat\u00f3rio - '+esc(v.nome)+'</title><style>'
  html+='*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:20px;color:#1a1a2e;background:#fff}h1{font-size:1.2rem;margin-bottom:4px}h2{font-size:.95rem;margin:16px 0 8px;padding-bottom:4px;border-bottom:2px solid #4361ee;color:#4361ee}.sub{color:#555;font-size:.8rem;margin-bottom:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.item{display:flex;justify-content:space-between;padding:6px 8px;background:#f5f7fa;border-radius:4px;font-size:.82rem}.item .l{color:#555}.item .v{font-weight:700}.item.total{background:rgba(67,97,238,.06);border:1px solid rgba(67,97,238,.2)}.item.total .v{color:#4361ee;font-size:.95rem}@media print{body{padding:10px}}button{padding:8px 16px;border:none;border-radius:5px;background:#4361ee;color:#fff;cursor:pointer;font-size:.82rem;margin-bottom:16px}button:hover{opacity:.9}</style></head><body>'
  html+='<button onclick="window.print()">\u{1f5a8}\ufe0f Imprimir / PDF</button>'
  html+='<h1>'+esc(v.nome)+'</h1><div class="sub">Relat\u00f3rio de Custos '+(isE?'Empresarial':'Simples')+' &mdash; '+new Date().toLocaleDateString('pt-BR')+'</div>'
  if(isE){
    html+='<h2>\u{1f697} Aquisi\u00e7\u00e3o e Desvaloriza\u00e7\u00e3o</h2><div class="grid">'
    html+='<div class="item"><span class="l">Valor de Aquisi\u00e7\u00e3o</span><span class="v">'+fmt(v.valorAquisicao||0)+'</span></div>'
    html+='<div class="item"><span class="l">Valor Previsto de Venda</span><span class="v">'+fmt(v.valorVenda||0)+'</span></div>'
    html+='<div class="item"><span class="l">Prazo de Troca</span><span class="v">'+(v.prazoTroca||0)+' '+(v.prazoTrocaUnidade||'meses')+'</span></div>'
    html+='<div class="item"><span class="l">Deprecia\u00e7\u00e3o Total</span><span class="v">'+fmt(c.depTotal)+'</span></div>'
    html+='<div class="item"><span class="l">Deprecia\u00e7\u00e3o Mensal</span><span class="v">'+fmt(c.depMensal)+'</span></div></div>'
    html+='<h2>\u{1f6e3}\ufe0f Utiliza\u00e7\u00e3o Operacional</h2><div class="grid">'
    html+='<div class="item"><span class="l">KM por M\u00eas</span><span class="v">'+(c.kmMes||0).toLocaleString('pt-BR')+'</span></div>'
    html+='<div class="item"><span class="l">KM por Ano</span><span class="v">'+(c.kmAno||0).toLocaleString('pt-BR')+'</span></div>'
    html+='<div class="item"><span class="l">KM/Dia</span><span class="v">'+(c.kmDia>0?c.kmDia.toFixed(1):'---')+'</span></div></div>'
    html+='<h2>\u{1f4b0} Custos Fixos (mensais)</h2><div class="grid">'
    html+='<div class="item"><span class="l">Seguro</span><span class="v">'+fmt(v.seguro||0)+'</span></div>'
    html+='<div class="item"><span class="l">IPVA</span><span class="v">'+fmt((v.ipva||0)/12)+'</span></div>'
    html+='<div class="item"><span class="l">Estacionamento</span><span class="v">'+fmt(v.est||0)+'</span></div>'
    html+='<div class="item"><span class="l">Financiamento</span><span class="v">'+fmt(v.fin||0)+'</span></div>'
    html+='<div class="item"><span class="l">Emplacamento</span><span class="v">'+fmt((v.emplacamento||0)/12)+'</span></div>'
    html+='<div class="item total"><span class="l">Total Custos Fixos</span><span class="v">'+fmt(c.custoFixoM)+'</span></div></div>'
    html+='<h2>\u26fd Custos Vari\u00e1veis (mensais)</h2><div class="grid">'
    html+='<div class="item"><span class="l">Combust\u00edvel</span><span class="v">'+fmt(v.comb||0)+'</span></div>'
    html+='<div class="item"><span class="l">Ped\u00e1gio</span><span class="v">'+fmt(v.emp_pedagio||0)+'</span></div>'
    html+='<div class="item"><span class="l">Lavagem</span><span class="v">'+fmt(v.emp_lavagem||0)+'</span></div>'
    html+='<div class="item"><span class="l">Multas</span><span class="v">'+fmt((v.emp_multas||0)/12)+'</span></div>'
    html+='<div class="item total"><span class="l">Total Custos Vari\u00e1veis</span><span class="v">'+fmt(c.custoVarM)+'</span></div></div>'
    html+='<h2>\u{1f527} Custos de Reposi\u00e7\u00e3o (mensais)</h2><div class="grid">'
    html+='<div class="item"><span class="l">Pneus</span><span class="v">'+fmt(c.pneuM)+'</span></div>'
    html+='<div class="item"><span class="l">Manuten\u00e7\u00e3o</span><span class="v">'+fmt(c.manutM)+'</span></div>'
    html+='<div class="item"><span class="l">Franquia</span><span class="v">'+fmt(c.franqM)+'</span></div>'
    html+='<div class="item total"><span class="l">Total Reposi\u00e7\u00e3o</span><span class="v">'+fmt(c.reposM)+'</span></div></div>'
  }else{
    html+='<h2>\u{1f4b0} Custos</h2><div class="grid">'
    html+='<div class="item"><span class="l">Valor do Ve\u00edculo</span><span class="v">'+fmt(v.valor||0)+'</span></div>'
    html+='<div class="item"><span class="l">Deprecia\u00e7\u00e3o Anual ('+c.depPct+'%)</span><span class="v">'+fmt(c.deprAnual)+'</span></div>'
    html+='<div class="item"><span class="l">Deprecia\u00e7\u00e3o Mensal</span><span class="v">'+fmt(c.deprMensal)+'</span></div>'
    html+='<div class="item"><span class="l">IPVA</span><span class="v">'+fmt((v.ipva||0)/12)+'</span></div>'
    html+='<div class="item"><span class="l">Seguro</span><span class="v">'+fmt(v.seguro||0)+'</span></div>'
    html+='<div class="item"><span class="l">Manuten\u00e7\u00e3o</span><span class="v">'+fmt(v.manut||0)+'</span></div>'
    html+='<div class="item"><span class="l">Combust\u00edvel</span><span class="v">'+fmt(v.comb||0)+'</span></div>'
    html+='<div class="item"><span class="l">Estacionamento</span><span class="v">'+fmt(v.est||0)+'</span></div>'
    html+='<div class="item"><span class="l">Financiamento</span><span class="v">'+fmt(v.fin||0)+'</span></div></div>'
  }
  html+='<h2>\u{1f4ca} Resumo Final</h2><div class="grid">'
  html+='<div class="item total"><span class="l">\u{1f4b0} Custo Total Mensal</span><span class="v">'+fmt(c.custoMensal)+'</span></div>'
  html+='<div class="item"><span class="l">\u{1f4c5} Custo Anual</span><span class="v">'+fmt(c.custoAnual)+'</span></div>'
  html+='<div class="item"><span class="l">\u{1f4cd} Custo por KM</span><span class="v">'+(c.custoKm>0?fmt(c.custoKm):'---')+'</span></div></div>'
  if(isE&&v.custoPercebido){
    html+='<h2>\u{1f4ad} Compara\u00e7\u00e3o com Custo Percebido</h2><div class="grid">'
    html+='<div class="item"><span class="l">Custo Percebido (sua estimativa)</span><span class="v">'+fmt(v.custoPercebido)+'</span></div>'
    html+='<div class="item"><span class="l">Diferen\u00e7a (real - percebido)</span><span class="v" style="color:'+(c.custoMensal-v.custoPercebido>=0?'#e63946':'#2ec4b6')+'">'+(c.custoMensal-v.custoPercebido>=0?'+':'')+fmt(c.custoMensal-v.custoPercebido)+'</span></div></div>'
  }
  html+='<div style="margin-top:20px;font-size:.7rem;color:#aaa;text-align:center">Relat\u00f3rio gerado pelo Sistema de Custos &mdash; '+new Date().toLocaleString('pt-BR')+'</div>'
  html+='</body></html>'
  w.document.write(html);w.document.close()
}
function setEmpKM(tipo,val){
  const v=parseFloat(val)||0
  if(tipo==='mes'){const a=document.getElementById('vf_emp_kmA');if(a)a.value=v>0?v*12:''}
  else{const m=document.getElementById('vf_emp_kmM');if(m)m.value=v>0?v/12:''}
  updateEmpResumo()
}
function updateEmpResumo(){
  const d=getVeiculoFormDataEmpresarial()
  const c=calcVeiculoEmpresarial(d)
  const el=(id)=>document.getElementById(id)
  const setT=(id,val)=>{const e=el(id);if(e)e.textContent=val>0?fmt(val):'---'}
  setT('vf_emp_depTot',c.depTotal);setT('vf_emp_depMen',c.depMensal)
  const kd=el('vf_emp_kmD');if(kd)kd.textContent=c.kmDia>0?c.kmDia.toFixed(1):'---'
  const setMV=(id,val)=>{const e=el('vf_met_'+id);if(e){const v=e.querySelector('.metric-value');if(v)v.textContent=val>0?fmt(val):'---'}}
  setMV('va',d.valorAquisicao);setMV('dm',c.depMensal);setMV('cf',c.custoFixoM);setMV('cv',c.custoVarM);setMV('rp',c.reposM);setMV('ct',c.custoMensal);setMV('ck',c.custoKm);setMV('ca',c.custoAnual)
  const iph=el('vf_ip_hint');if(iph)iph.textContent=d.ipva>0?'\u2192 '+fmt(d.ipva/12)+'/m\u00eas':''
  const mh=el('vf_emp_mult_hint');if(mh)mh.textContent=d.emp_multas>0?'\u2192 '+fmt(d.emp_multas/12)+'/m\u00eas':''
  const mnh=el('vf_emp_manut_hint');if(mnh)mnh.textContent=d.emp_manutencaoAnual>0?'\u2192 '+fmt(d.emp_manutencaoAnual/12)+'/m\u00eas':''
  const eh=el('vf_emplac_hint');if(eh)eh.textContent=d.emplacamento>0?'\u2192 '+fmt(d.emplacamento/12)+'/m\u00eas':''
  const litros=el('vf_emp_litros');if(litros)litros.textContent=d.kmPorLitro&&d.kmMes?(d.kmMes/d.kmPorLitro).toFixed(1)+' L':'---'
  if(_veicView==='planilha'){const content=el('vf_dashContent');if(content)content.innerHTML=buildPlanilhaView(d,c)}
  const v=el('vf_validation');if(v)v.innerHTML=''
}
function bindVeiculoCalcEmp(){
  document.querySelectorAll('.emp-form input,.emp-form select').forEach(inp=>{
    inp.addEventListener('input',updateEmpResumo)
    inp.addEventListener('change',updateEmpResumo)
  })
}
function getVeiculoFormDataEmpresarial(){
  const n=document.getElementById('vf_n')?.value?.trim()||''
  return{
    nome:n,anoModelo:document.getElementById('vf_emp_ano')?.value||'',
    tipo:state.veiculoType,sub:state.veiculoSub,
    custoPercebido:parseFloat(document.getElementById('vf_emp_cp')?.value)||0,
    valorAquisicao:parseFloat(document.getElementById('vf_emp_aq')?.value)||0,
    valorVenda:parseFloat(document.getElementById('vf_emp_vd')?.value)||0,
    prazoTroca:parseFloat(document.getElementById('vf_emp_pz')?.value)||0,
    prazoTrocaUnidade:document.getElementById('vf_emp_pzu')?.value||'meses',
    kmMes:parseFloat(document.getElementById('vf_emp_kmM')?.value)||0,
    seguro:parseFloat(document.getElementById('vf_sg')?.value)||0,
    ipva:parseFloat(document.getElementById('vf_ip')?.value)||0,
    est:parseFloat(document.getElementById('vf_es')?.value)||0,
    fin:parseFloat(document.getElementById('vf_fn')?.value)||0,
    emplacamento:parseFloat(document.getElementById('vf_emp_emplac')?.value)||0,
    comb:parseFloat(document.getElementById('vf_cb')?.value)||0,
    emp_pedagio:parseFloat(document.getElementById('vf_emp_ped')?.value)||0,
    emp_lavagem:parseFloat(document.getElementById('vf_emp_lav')?.value)||0,
    emp_multas:parseFloat(document.getElementById('vf_emp_mult')?.value)||0,
    emp_pneusValor:parseFloat(document.getElementById('vf_emp_pnv')?.value)||0,
    emp_pneusVidaUtil:parseFloat(document.getElementById('vf_emp_pnvida')?.value)||1,
    emp_pneusKmVida:parseFloat(document.getElementById('vf_emp_pnvkm')?.value)||0,
    emp_manutencaoAnual:parseFloat(document.getElementById('vf_emp_manut')?.value)||0,
    emp_franquiaValor:parseFloat(document.getElementById('vf_emp_franqv')?.value)||0,
    emp_franquiaPeriodo:parseFloat(document.getElementById('vf_emp_franqp')?.value)||1,
    kmPorLitro:parseFloat(document.getElementById('vf_emp_kml')?.value)||0
  }
}
function getVeiculoFormData(){
  const n=document.getElementById('vf_n')?.value?.trim()||''
  return{
    nome:n,
    tipo:state.veiculoType,
    sub:state.veiculoSub,
    valor:parseFloat(document.getElementById('vf_vl')?.value)||0,
    ipva:parseFloat(document.getElementById('vf_ip')?.value)||0,
    seguro:parseFloat(document.getElementById('vf_sg')?.value)||0,
    manut:parseFloat(document.getElementById('vf_mn')?.value)||0,
    comb:parseFloat(document.getElementById('vf_cb')?.value)||0,
    est:parseFloat(document.getElementById('vf_es')?.value)||0,
    fin:parseFloat(document.getElementById('vf_fn')?.value)||0,
    kmMes:parseFloat(document.getElementById('vf_km')?.value)||0
  }
}
function buildVeiculoSummary(d){
  const c=calcVeiculo(d)
  return '<h3>\u{1f4ca} Resumo do Ve\u00edculo</h3>'+
    '<div class="summary-item"><span class="sl">Valor do Ve\u00edculo</span><span class="sv">'+(d.valor>0?fmt(d.valor):'---')+'</span></div>'+
    '<div class="summary-item"><span class="sl">Deprecia\u00e7\u00e3o Anual</span><span class="sv">'+c.depPct+'% ('+fmt(c.deprAnual)+')</span></div>'+
    '<div class="summary-item"><span class="sl">Deprecia\u00e7\u00e3o Mensal</span><span class="sv">'+fmt(c.deprMensal)+'</span></div>'+
    '<div class="summary-item total"><span class="sl">\u{1f4b0} Custo Total Mensal</span><span class="sv">'+fmt(c.custoMensal)+'</span></div>'+
    '<div class="summary-item"><span class="sl">Custo Total Anual</span><span class="sv">'+fmt(c.custoAnual)+'</span></div>'+
    '<div class="summary-item '+(c.custoKm>0?'positive':'negative')+'"><span class="sl">Custo por KM</span><span class="sv">'+(c.custoKm>0?fmt(c.custoKm):'---')+'</span></div>'
}
function bindVeiculoCalc(){
  document.querySelectorAll('#app input').forEach(inp=>{
    inp.addEventListener('input',()=>{
      const s=document.getElementById('vf_summary')
      if(s)s.innerHTML=buildVeiculoSummary(getVeiculoFormData())
      const v=document.getElementById('vf_validation')
      if(v)v.innerHTML=''
    })
  })
}
function validateVeiculoData(d){
  const errs=[]
  if(!d.nome)errs.push('Digite o nome do ve\u00edculo.')
  if(d.mode==='empresarial'){
    if(!d.valorAquisicao||d.valorAquisicao<=0)errs.push('O valor de aquisi\u00e7\u00e3o deve ser maior que zero.')
  }else{
    if(d.valor<=0)errs.push('O valor do ve\u00edculo deve ser maior que zero.')
    if(d.kmMes<0)errs.push('KM/m\u00eas n\u00e3o pode ser negativo.')
  }
  return errs
}
function validateVeiculoDataEmpresarial(d){
  const errs=[]
  if(!d.nome)errs.push('Digite o nome do ve\u00edculo.')
  if(!d.valorAquisicao||d.valorAquisicao<=0)errs.push('O valor de aquisi\u00e7\u00e3o deve ser maior que zero.')
  return errs
}
function setVT(t){state.veiculoType=t;state.veiculoSub=t==='moto'?'particular':'passeio';_fipeMarcas=null;_fipeModelos=null;_fipeAnos=null;render()}
function setVS(s){state.veiculoSub=s;render()}
function saveVeiculo(){
  const isEmp=document.getElementById('vf_emp_aq')!==null
  const d=isEmp?getVeiculoFormDataEmpresarial():getVeiculoFormData()
  d.mode=isEmp?'empresarial':'simples'
  const errs=isEmp?validateVeiculoDataEmpresarial(d):validateVeiculoData(d)
  const vdiv=document.getElementById('vf_validation')
  if(errs.length>0&&vdiv){
    vdiv.innerHTML='<div style="background:rgba(230,57,70,.08);border-radius:5px;padding:10px;font-size:.78rem;color:var(--danger)">'+
      '\u26a0\ufe0f '+errs.join('<br>\u26a0\ufe0f ')+'</div>'
    vdiv.scrollIntoView({behavior:'smooth',block:'nearest'})
    return
  }
  if(!isEmp){
    d.fipeMarca=document.getElementById('vf_fipeMarca')?.value||''
    d.fipeModelo=document.getElementById('vf_fipeModelo')?.value||''
    d.fipeAno=document.getElementById('vf_fipeAno')?.value||''
    if(_fipeLastResult){d.fipeValor=_fipeLastResult.valor;d.fipeData=_fipeLastResult.data;d.fipeCodigo=_fipeLastResult.codigo}
  }
  if(state.editingId){
    const i=state.veiculos.findIndex(x=>x.id===state.editingId)
    if(i>=0&&!isEmp&&!d.fipeData){const old=state.veiculos[i];d.fipeValor=old.fipeValor;d.fipeData=old.fipeData;d.fipeCodigo=old.fipeCodigo;state.veiculos[i]={...old,...d}}
    else if(i>=0)state.veiculos[i]={...state.veiculos[i],...d}
    state.editingId=null
  }else{state.veiculos.push({id:uid(),...d})}
  sv(SK.veiculos,state.veiculos);render()
}
function editVeiculo(id){const v=state.veiculos.find(x=>x.id===id);if(v){if(v.tipo!==state.veiculoType){_fipeMarcas=null;_fipeModelos=null;_fipeAnos=null}state.veiculoType=v.tipo;state.veiculoSub=v.sub;state.veiculoMode=v.mode||'simples'}state.editingId=id;render()}
function deleteVeiculo(id){if(!confirm('Excluir?'))return;state.veiculos=state.veiculos.filter(x=>x.id!==id);if(state.editingId===id)state.editingId=null;sv(SK.veiculos,state.veiculos);render()}
function clearVeicForm(){
  document.getElementById('vf_n').value=''
  document.querySelectorAll('#app input[type=number]').forEach(i=>i.value='')
  document.querySelectorAll('#app select').forEach(s=>{if(!s.id.startsWith('vf_fipe'))s.selectedIndex=0})
  const s=document.getElementById('vf_summary')
  if(s)s.innerHTML=''
  const v=document.getElementById('vf_validation')
  if(v)v.innerHTML=''
  _fipeLastResult=null
  const st=document.getElementById('vf_fipeStatus')
  if(st)st.innerHTML=''
  document.querySelectorAll('.conv-hint').forEach(h=>h.textContent='')
}

// ====== FIPE API ======
function fipeBaseUrl(){return state.veiculoType==='moto'?'https://parallelum.com.br/fipe/api/v1/motos':'https://parallelum.com.br/fipe/api/v1/carros'}
async function fipeFetch(url){
  try{const r=await fetch(url,{mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}
  catch(e){throw new Error('Falha ao consultar FIPE. Verifique sua conex\u00e3o.')}
}
async function fetchMarcas(){
  if(_fipeLoading)return
  _fipeLoading=true
  const status=document.getElementById('vf_fipeStatus')
  if(status)status.innerHTML='<span class="fipe-status wait">Consultando marcas...</span>'
  try{
    const data=await fipeFetch(fipeBaseUrl()+'/marcas')
    _fipeMarcas=data
    const sel=document.getElementById('vf_fipeMarca')
    if(sel){sel.innerHTML='<option value="">Selecione a marca</option>'+data.map(m=>'<option value="'+m.codigo+'">'+esc(m.nome)+'</option>').join('');sel.disabled=false}
    restoreFipeEditValues()
    if(status)status.innerHTML='<span class="fipe-status ok">Marcas carregadas. Selecione acima.</span>'
    _fipeModelos=null;_fipeAnos=null
    const mo=document.getElementById('vf_fipeModelo');if(mo){mo.innerHTML='<option value="">Selecione a marca primeiro</option>';mo.disabled=true}
    const an=document.getElementById('vf_fipeAno');if(an){an.innerHTML='<option value="">Selecione o modelo primeiro</option>';an.disabled=true}
    document.getElementById('vf_fipeBtn').disabled=true
    _fipeLoading=false
  }catch(e){
    if(status)status.innerHTML='<span class="fipe-status err">\u26a0\ufe0f '+e.message+'</span>'
    document.getElementById('vf_fipeBtn').disabled=true
    _fipeLoading=false
  }
}
async function onFipeMarcaChange(){
  const sel=document.getElementById('vf_fipeMarca');if(!sel||!sel.value){return}
  const marcaId=sel.value
  const status=document.getElementById('vf_fipeStatus')
  if(status)status.innerHTML='<span class="fipe-status wait">Consultando modelos...</span>'
  try{
    const data=await fipeFetch(fipeBaseUrl()+'/marcas/'+marcaId+'/modelos')
    _fipeModelos=data.modelos||[]
    const mo=document.getElementById('vf_fipeModelo')
    if(mo){mo.innerHTML='<option value="">Selecione o modelo</option>'+(_fipeModelos.map(m=>'<option value="'+m.codigo+'">'+esc(m.nome)+'</option>').join(''));mo.disabled=false}
    const ed=state.veiculos.find(x=>x.id===state.editingId)
    if(ed&&ed.fipeModelo&&mo){mo.value=ed.fipeModelo;if(ed.fipeAno)mo.dispatchEvent(new Event('change'))}
    if(status)status.innerHTML='<span class="fipe-status ok">Modelos carregados. Selecione acima.</span>'
    _fipeAnos=null
    const an=document.getElementById('vf_fipeAno');if(an){an.innerHTML='<option value="">Selecione o modelo primeiro</option>';an.disabled=true}
    document.getElementById('vf_fipeBtn').disabled=true
  }catch(e){
    if(status)status.innerHTML='<span class="fipe-status err">\u26a0\ufe0f '+e.message+'</span>'
    document.getElementById('vf_fipeBtn').disabled=true
  }
}
async function onFipeModeloChange(){
  const modelo=document.getElementById('vf_fipeModelo');if(!modelo||!modelo.value)return
  const marca=document.getElementById('vf_fipeMarca').value,modeloId=modelo.value
  const status=document.getElementById('vf_fipeStatus')
  if(status)status.innerHTML='<span class="fipe-status wait">Consultando anos...</span>'
  try{
    const data=await fipeFetch(fipeBaseUrl()+'/marcas/'+marca+'/modelos/'+modeloId+'/anos')
    _fipeAnos=data
    const an=document.getElementById('vf_fipeAno')
    if(an){an.innerHTML='<option value="">Selecione o ano</option>'+data.map(a=>'<option value="'+a.codigo+'">'+esc(a.nome)+'</option>').join('');an.disabled=false}
    const ed=state.veiculos.find(x=>x.id===state.editingId)
    if(ed&&ed.fipeAno&&an)an.value=ed.fipeAno
    if(status)status.innerHTML='<span class="fipe-status ok">Anos carregados. Selecione e clique em Consultar.</span>'
    document.getElementById('vf_fipeBtn').disabled=true
  }catch(e){
    if(status)status.innerHTML='<span class="fipe-status err">\u26a0\ufe0f '+e.message+'</span>'
    document.getElementById('vf_fipeBtn').disabled=true
  }
}
async function onFipeAnoChange(){
  const ano=document.getElementById('vf_fipeAno')
  document.getElementById('vf_fipeBtn').disabled=!ano||!ano.value
}
async function consultarFipe(){
  const marca=document.getElementById('vf_fipeMarca')?.value
  const modelo=document.getElementById('vf_fipeModelo')?.value
  const ano=document.getElementById('vf_fipeAno')?.value
  if(!marca||!modelo||!ano){alert('Selecione marca, modelo e ano primeiro.');return}
  const btn=document.getElementById('vf_fipeBtn')
  btn.disabled=true;btn.classList.add('loading')
  const status=document.getElementById('vf_fipeStatus')
  if(status)status.innerHTML='<span class="fipe-status wait">Consultando valor FIPE...</span>'
  try{
    const data=await fipeFetch(fipeBaseUrl()+'/marcas/'+marca+'/modelos/'+modelo+'/anos/'+ano)
    const valorStr=data.Valor.replace('R$ ','').replace(/\./g,'').replace(',','.')
    const valorNum=parseFloat(valorStr)
    const vl=document.getElementById('vf_vl')
    if(vl&&!isNaN(valorNum)){vl.value=valorNum.toFixed(2)}
    _fipeLastResult={valor:valorNum,data:new Date().toISOString(),codigo:data.CodigoFipe||''}
    if(status)status.innerHTML='<span class="fipe-status ok">\u2705 Valor FIPE: <strong>'+data.Valor+'</strong> ('+data.MesReferencia+')</span>'
    const summary=document.getElementById('vf_summary')
    if(summary)summary.innerHTML=buildVeiculoSummary(getVeiculoFormData())
    _fipeLoading=false;btn.classList.remove('loading');btn.disabled=false
  }catch(e){
    if(status)status.innerHTML='<span class="fipe-status err">\u26a0\ufe0f '+e.message+'</span>'
    _fipeLoading=false;btn.classList.remove('loading');btn.disabled=false
  }
}
function populateFipeSelectsFromCache(){
  const sel=document.getElementById('vf_fipeMarca')
  if(!sel||!_fipeMarcas)return
  sel.innerHTML='<option value="">Selecione a marca</option>'+_fipeMarcas.map(m=>'<option value="'+m.codigo+'">'+esc(m.nome)+'</option>').join('')
  sel.disabled=false
}
function restoreFipeEditValues(){
  const ed=state.veiculos.find(x=>x.id===state.editingId)
  if(!ed||!ed.fipeMarca)return
  const s=document.getElementById('vf_fipeMarca')
  if(!s||s.options.length<=1)return
  s.value=ed.fipeMarca
  if(ed.fipeModelo)s.dispatchEvent(new Event('change'))
}

// ====== EVENTOS ======
function renderEventos(app){
  const ed=state.eventos.find(x=>x.id===state.editingId),cs=ed?.custos||{}
  app.innerHTML='<h2 style="margin-bottom:12px">\u{1f3aa} Eventos</h2><div class="grid-2">'+
    '<div class="card '+(state.editingId?'editing':'')+'">'+
    '<h2>'+(state.editingId?'\u270f\ufe0f Editar':'\u2795 Novo Evento')+'</h2>'+
    '<div class="form-group"><label>Nome</label><input id="ef_n" value="'+esc(ed?.nome||'')+'" placeholder="Ex: Show de Natal"></div>'+
    '<div class="form-row"><div class="form-group"><label>Dias</label><input id="ef_d" type="number" min="1" step="1" value="'+(ed?.dias||1)+'"></div><div class="form-group"><label>Data</label><input id="ef_dt" type="date" value="'+(ed?.data||'')+'"></div></div>'+
    '<h3>\u{1f4b0} Custos</h3>'+
    '<div class="form-row">'+EVT_CAT.slice(0,4).map(c=>'<div class="form-group"><label>'+c+'</label><input class="evt-c" data-key="'+c+'" type="number" step=".01" min="0" value="'+(cs[c]||'')+'"></div>').join('')+'</div>'+
    '<div class="form-row">'+EVT_CAT.slice(4,8).map(c=>'<div class="form-group"><label>'+c+'</label><input class="evt-c" data-key="'+c+'" type="number" step=".01" min="0" value="'+(cs[c]||'')+'"></div>').join('')+'</div>'+
    '<div class="form-row">'+EVT_CAT.slice(8,12).map(c=>'<div class="form-group"><label>'+c+'</label><input class="evt-c" data-key="'+c+'" type="number" step=".01" min="0" value="'+(cs[c]||'')+'"></div>').join('')+'</div>'+
    '<div class="form-row">'+EVT_CAT.slice(12,16).map(c=>'<div class="form-group"><label>'+c+'</label><input class="evt-c" data-key="'+c+'" type="number" step=".01" min="0" value="'+(cs[c]||'')+'"></div>').join('')+'</div>'+
    '<h3 style="margin-top:10px">\u{1f39f}\ufe0f Receitas</h3>'+
    '<div class="form-row"><div class="form-group"><label>Faturamento (R$)</label><input id="ef_ft" type="number" step=".01" min="0" value="'+(ed?.faturamento||'')+'"></div><div class="form-group"><label>Qtd. vendas</label><input id="ef_qtd" type="number" step="1" min="0" value="'+(ed?.qtdVendas||'')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Ticket m\u00e9dio (R$)</label><input id="ef_tk" type="number" step=".01" min="0" value="'+(ed?.ticketMedio||'')+'"></div><div></div></div>'+
    '<div style="display:flex;gap:6px;margin-top:12px">'+
    '<button class="btn btn-primary" onclick="saveEvento()">\u{1f4be} Salvar</button>'+
    (state.editingId?'<button class="btn btn-outline" onclick="cancelEdit()">Cancelar</button>':'')+
    '<button class="btn btn-outline" onclick="clearEvt()">Limpar</button></div>'+
    (ed?calcEventoPreview(ed):'')+'</div>'+
    '<div class="card"><h2>\u{1f4cb} Eventos</h2>'+
    (state.eventos.length===0?'<div class="empty"><p>Nenhum evento</p></div>':
    '<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Data</th><th>Receita</th><th>Lucro</th><th>ROI</th><th></th></tr></thead><tbody>'+
    state.eventos.map(ev=>{const c=calcEvento(ev);return'<tr><td><strong>'+esc(ev.nome||'-')+'</strong></td><td style="font-size:.78rem">'+(ev.data||'-')+'</td><td>'+fmt(c.receita)+'</td><td><span class="badge '+(c.lucroBruto>=0?'badge-success':'badge-danger')+'">'+fmt(c.lucroBruto)+'</span></td><td><span class="badge '+(c.roi>=0?'badge-success':'badge-danger')+'">'+pct(c.roi)+'</span></td><td style="white-space:nowrap"><button class="btn btn-outline btn-sm" onclick="editEvento(\''+ev.id+'\')">\u270f\ufe0f</button><button class="btn btn-danger btn-sm" onclick="deleteEvento(\''+ev.id+'\')">\u{1f5d1}\ufe0f</button></td></tr>'}).join('')+
    '</tbody></table></div>')+
    (state.eventos.length>1?renderEvtChart():'')+'</div></div>'
}
function renderEvtChart(){
  const labels=state.eventos.map(e=>e.nome||'-'),lucros=state.eventos.map(e=>calcEvento(e).lucroBruto),rec=state.eventos.map(e=>calcEvento(e).receita)
  setTimeout(()=>{drawChart('evtChart2',labels,[{label:'Receita',data:rec,color:'rgba(67,97,238,.7)',colors:rec.map(()=>'rgba(67,97,238,.7)')},{label:'Lucro',data:lucros,color:'rgba(46,196,182,.7)',colors:lucros.map(v=>v>=0?'rgba(46,196,182,.7)':'rgba(230,57,70,.7)')}])},50)
  return'<div class="card" style="margin-top:10px"><h2>\u{1f4ca} Comparativo</h2><div class="chart-wrap"><canvas id="evtChart2"></canvas></div></div>'
}
function calcEventoPreview(ev){const c=calcEvento(ev);return'<div style="margin-top:12px;padding-top:10px;border-top:2px solid var(--primary)"><div class="result-row total"><span class="label">\u{1f4b0} Custo total</span><span class="value">'+fmt(c.custoTotal)+'</span></div><div class="result-row"><span class="label">Receita</span><span class="value">'+fmt(c.receita)+'</span></div><div class="result-row '+(c.lucroBruto>=0?'positive':'negative')+'"><span class="label">Lucro bruto</span><span class="value">'+fmt(c.lucroBruto)+'</span></div><div class="result-row '+(c.roi>=0?'positive':'negative')+'"><span class="label">ROI</span><span class="value">'+pct(c.roi)+'</span></div><div class="result-row"><span class="label">Margem</span><span class="value">'+pct(c.margem)+'</span></div><div class="result-row"><span class="label">Lucro/dia</span><span class="value">'+fmt(c.lucroDia)+'</span></div><div class="result-row"><span class="label">Equil\u00edbrio</span><span class="value">'+c.pontoEquilibrio.toFixed(1)+' dias</span></div></div>'}
function clearEvt(){document.getElementById('ef_n').value='';document.querySelectorAll('#app input[type=number],#app input[type=date]').forEach(i=>i.value='');document.querySelectorAll('.evt-c').forEach(i=>i.value='');document.getElementById('ef_d').value=1}
function getEvtCustos(){const c={};document.querySelectorAll('.evt-c').forEach(i=>{const v=parseFloat(i.value);if(v>0)c[i.dataset.key]=v});return c}
function saveEvento(){
  const n=document.getElementById('ef_n').value.trim();if(!n){alert('Digite o nome');return}
  const d={nome:n,dias:parseInt(document.getElementById('ef_d').value)||1,data:document.getElementById('ef_dt').value||new Date().toISOString().slice(0,10),custos:getEvtCustos(),faturamento:parseFloat(document.getElementById('ef_ft').value)||0,qtdVendas:parseInt(document.getElementById('ef_qtd').value)||0,ticketMedio:parseFloat(document.getElementById('ef_tk').value)||0}
  if(state.editingId){const i=state.eventos.findIndex(x=>x.id===state.editingId);if(i>=0)state.eventos[i]={...state.eventos[i],...d};state.editingId=null}else state.eventos.push({id:uid(),...d})
  sv(SK.eventos,state.eventos);render()
}
function editEvento(id){state.editingId=id;render()}
function deleteEvento(id){if(!confirm('Excluir?'))return;state.eventos=state.eventos.filter(x=>x.id!==id);if(state.editingId===id)state.editingId=null;sv(SK.eventos,state.eventos);render()}

// ====== PWA ======
let deferredPrompt=null
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBanner').style.display='block'})
function installApp(){const b=document.getElementById('installBanner');if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(()=>{deferredPrompt=null})}b.style.display='none'}
window.addEventListener('appinstalled',()=>{document.getElementById('installBanner').style.display='none';deferredPrompt=null})
if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js?v=2').catch(()=>{})})}

// ====== INIT ======
document.addEventListener('DOMContentLoaded',render)
