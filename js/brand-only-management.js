/* Brand-only annual targets and monthly sales. Requires brand_only_targets and brand_only_sales tables. */
const $ = id => document.getElementById(id);
const money = n => '৳' + new Intl.NumberFormat('en-BD',{maximumFractionDigits:2}).format(Number(n)||0);
const pct = n => `${(Number(n)||0).toFixed(1)}%`;
let brands = [], brandMap = new Map(), targets = [], sales = [];
function message(text,type='success'){const el=$('message');el.textContent=text;el.className=`message ${type}`;el.scrollIntoView({behavior:'smooth',block:'nearest'});}
function clearMessage(){ $('message').className='message'; $('message').textContent=''; }
function currentYear(){return new Date().getFullYear();}
function currentMonth(){return new Date().toISOString().slice(0,7);}
async function init(){
 try{
  const {data:{session},error}=await supabaseClient.auth.getSession(); if(error)throw error;
  if(!session){location.replace('login.html');return;}
  $('targetYear').value=currentYear();$('reportYear').value=currentYear();$('salesMonth').value=currentMonth();
  await loadBrands(); await refreshAll();
 }catch(e){console.error(e);message(e.message||'Could not initialize brand-only management.','error');}
}
async function loadBrands(){const {data,error}=await supabaseClient.from('brands').select('id, brand_name, active').order('brand_name');if(error)throw error;brands=(data||[]).filter(b=>b.active!==false);brandMap=new Map(brands.map(b=>[String(b.id),b.brand_name]));for(const id of ['targetBrand','salesBrand']){const sel=$(id);sel.innerHTML='<option value="">Select brand</option>'+brands.map(b=>`<option value="${esc(b.id)}">${esc(b.brand_name)}</option>`).join('');}}
async function refreshAll(){clearMessage();const year=Number($('reportYear').value)||currentYear();const from=`${year}-01-01`,to=`${year+1}-01-01`;
 const [t,s]=await Promise.all([
  supabaseClient.from('brand_only_targets').select('id,brand_id,target_year,annual_target').eq('target_year',year),
  supabaseClient.from('brand_only_sales').select('id,brand_id,sale_month,sales_amount,remarks').gte('sale_month',from).lt('sale_month',to).order('sale_month',{ascending:false})
 ]);if(t.error)throw t.error;if(s.error)throw s.error;targets=t.data||[];sales=s.data||[];renderReport(year);renderMonthly();}
function renderReport(year){const targetByBrand=new Map(targets.map(x=>[String(x.brand_id),Number(x.annual_target)||0]));const salesByBrand=new Map();for(const s of sales)salesByBrand.set(String(s.brand_id),(salesByBrand.get(String(s.brand_id))||0)+(Number(s.sales_amount)||0));let totalT=0,totalS=0;
 const rows=brands.map(b=>{const t=targetByBrand.get(String(b.id))||0,s=salesByBrand.get(String(b.id))||0,ach=t>0?s/t*100:0,gap=t-s;totalT+=t;totalS+=s;return `<tr><td><b>${esc(b.brand_name)}</b></td><td class="num">${money(t)}</td><td class="num">${money(s)}</td><td class="num">${pct(ach)}</td><td class="num" style="color:${gap>0?'#b91c1c':'#15803d'}">${money(gap)}</td><td><div class="progress"><span style="width:${Math.min(100,Math.max(0,ach))}%"></span></div></td></tr>`;}).join('');
 $('annualReportBody').innerHTML=rows||'<tr><td colspan="6" class="empty">No active brands found.</td></tr>';
 $('kpiTarget').textContent=money(totalT);$('kpiSales').textContent=money(totalS);$('kpiAchievement').textContent=pct(totalT>0?totalS/totalT*100:0);$('kpiGap').textContent=money(totalT-totalS);
}
function renderMonthly(){const rows=sales.map(s=>`<tr><td>${esc(s.sale_month)}</td><td>${esc(brandMap.get(String(s.brand_id))||'Unknown brand')}</td><td class="num">${money(s.sales_amount)}</td><td>${esc(s.remarks||'—')}</td><td><button class="small-btn" data-edit="${esc(s.id)}">Edit</button> <button class="small-btn" data-delete="${esc(s.id)}">Delete</button></td></tr>`).join('');$('monthlyReportBody').innerHTML=rows||'<tr><td colspan="5" class="empty">No monthly sales records for this year.</td></tr>';}
async function saveTarget(){clearMessage();const year=Number($('targetYear').value),brand=$('targetBrand').value,amount=Number($('annualTarget').value);if(!year||year<2020||year>2100||!brand||$('annualTarget').value===''||!Number.isFinite(amount)||amount<0){message('Please enter a valid year, brand and non-negative target.','error');return;}const {error}=await supabaseClient.from('brand_only_targets').upsert({brand_id:brand,target_year:year,annual_target:amount,updated_at:new Date().toISOString()},{onConflict:'brand_id,target_year'});if(error)throw error;$('reportYear').value=year;await refreshAll();message('Annual brand target saved successfully.');}
async function saveSales(){clearMessage();const month=$('salesMonth').value,brand=$('salesBrand').value,raw=$('salesAmount').value,amount=Number(raw),remarks=$('salesRemarks').value.trim();if(!/^\d{4}-\d{2}$/.test(month)||!brand||raw===''||!Number.isFinite(amount)||amount<0){message('Please enter a valid month, brand and non-negative sales amount.','error');return;}const {error}=await supabaseClient.from('brand_only_sales').upsert({brand_id:brand,sale_month:`${month}-01`,sales_amount:amount,remarks,updated_at:new Date().toISOString()},{onConflict:'brand_id,sale_month'});if(error)throw error;$('reportYear').value=Number(month.slice(0,4));await refreshAll();message('Monthly brand sales saved successfully.');}
async function editSale(id){const sale=sales.find(s=>String(s.id)===String(id));if(!sale)return;$('salesMonth').value=String(sale.sale_month).slice(0,7);$('salesBrand').value=sale.brand_id;$('salesAmount').value=sale.sales_amount;$('salesRemarks').value=sale.remarks||'';window.scrollTo({top:0,behavior:'smooth'});message('Record loaded into the monthly entry form. Save to update the existing brand/month record.');}
async function deleteSale(id){if(!confirm('Delete this monthly brand sales record?'))return;const {error}=await supabaseClient.from('brand_only_sales').delete().eq('id',id);if(error)throw error;await refreshAll();message('Monthly sales record deleted.');}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function run(fn){try{await fn();}catch(e){console.error(e);message(e.message||'Operation failed. Check database setup and permissions.','error');}}
document.addEventListener('DOMContentLoaded',()=>{init();$('saveTargetBtn').addEventListener('click',()=>run(saveTarget));$('saveSalesBtn').addEventListener('click',()=>run(saveSales));$('refreshBtn').addEventListener('click',()=>run(refreshAll));$('reportYear').addEventListener('change',()=>run(refreshAll));$('monthlyReportBody').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b){run(()=>editSale(b.dataset.edit));return;}const d=e.target.closest('[data-delete]');if(d)run(()=>deleteSale(d.dataset.delete));});});
