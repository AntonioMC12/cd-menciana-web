// Standalone Worker client, transpiled by build-worker.mjs. No browser persistence.
interface StockVariant { id: string; options: Record<string,string>; sku: string; quantity: number; lowThreshold: number|null; configured: boolean; active: boolean; version: number; updatedAt: string; status: string }
interface StockProduct { id: string; name: string; category: string; image: {src:string;alt:string}|null; active: boolean; quantity: number; status: string; variants: StockVariant[]; updatedAt: string }
interface StockMovement { id:string;variant_id:string;kind:string;previous_quantity:number;next_quantity:number;difference:number;reason:string;note:string;actor:string;created_at:string;options_json:string }
interface StockSnapshot { items: StockProduct[]; summary: {products:number;units:number;empty:number;low:number} }
const stockRoot = document.querySelector<HTMLElement>('[data-stock]')!;
const stockCsrf = stockRoot.dataset.csrf!;
const stockBase = '/tienda/stock';
const stockEl = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const stockEscape = (value:unknown) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const stockDate = (value:string) => new Date(value.replace(' ','T')+'Z').toLocaleString('es-ES');
const optionLabel = (variant:StockVariant) => Object.entries(variant.options).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'Sin variantes';
const statusBadge = (status:string) => `<span class="badge" data-status="${stockEscape(status)}">${stockEscape(status)}</span>`;
let stockItems:StockProduct[] = [], stockSelected:StockProduct|undefined, stockHistory:StockMovement[] = [];
let stockLoading=false, stockDirty=false, stockSaving=false, stockTrigger:HTMLElement|undefined;
let stockHistoryPage=0;
let stockEditing:StockVariant|undefined, stockAction='variant', stockOperationId='', stockOperationPayload:Record<string,unknown>|undefined;
const stockDialog=stockEl<HTMLDialogElement>('edit-dialog');
function stockFeedback(message:string,error=false) { const el=stockEl('feedback');el.textContent=message;el.hidden=!message;el.classList.toggle('error',error); }
async function stockCall<T>(path:string,body?:Record<string,unknown>):Promise<T> {
  const response=await fetch(stockBase+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-cdm-csrf':stockCsrf}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin'});
  if(response.status===401) { stockFeedback('La sesión ha caducado. Guarda una copia de tus notas y vuelve a entrar.',true);throw new Error('Sesión caducada. Recarga para iniciar sesión.'); }
  const value=await response.json();if(!response.ok)throw new Error(value.error||'No se pudo completar la operación.');return value as T;
}
async function stockLoad() {
  if(stockLoading)return;stockLoading=true;stockRoot.setAttribute('aria-busy','true');stockEl<HTMLButtonElement>('refresh').disabled=true;
  try {
    const data=await stockCall<StockSnapshot>('/api/inventory'); stockItems=data.items;
    stockEl('stock-summary').innerHTML=[['Productos activos',data.summary.products],['Unidades disponibles',data.summary.units],['Variantes agotadas',data.summary.empty],['Variantes con stock bajo',data.summary.low]].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
    const category=stockEl<HTMLSelectElement>('stock-category'),selectedCategory=category.value;
    category.innerHTML='<option value="">Todas las categorías</option>'+[...new Set(stockItems.map(p=>p.category))].map(c=>`<option>${stockEscape(c)}</option>`).join('');category.value=selectedCategory;
    stockRenderList();
    if(stockSelected) { stockSelected=stockItems.find(p=>p.id===stockSelected!.id);await stockRenderDetail(); }
  } catch(e) { stockFeedback(e instanceof Error?e.message:'No se pudo cargar el inventario.',true); }
  finally{stockLoading=false;stockRoot.removeAttribute('aria-busy');stockEl<HTMLButtonElement>('refresh').disabled=false;}
}
function stockImage(product:StockProduct) {
  if(!product.image)return '<span class="no-image">Sin imagen</span>';
  const url=new URL(product.image.src,stockRoot.dataset.webOrigin);
  return `<img class="product-image" src="${stockEscape(url.href)}" alt="${stockEscape(product.image.alt)}" loading="lazy" width="76" height="76">`;
}
function stockRenderList() {
  const q=stockEl<HTMLInputElement>('stock-search').value.trim().toLocaleLowerCase('es'),category=stockEl<HTMLSelectElement>('stock-category').value,status=stockEl<HTMLSelectElement>('stock-status').value;
  const items=stockItems.filter(p=>(!category||p.category===category)&&(!status||p.status===status)&&(!q||p.name.toLocaleLowerCase('es').includes(q)||p.variants.some(v=>v.sku.toLocaleLowerCase('es').includes(q))));
  stockEl('result-count').textContent=`${items.length} productos`;
  stockEl('stock-list').innerHTML=items.length?`<table class="responsive-table"><thead><tr><th>Producto</th><th>Variantes activas</th><th>Stock total</th><th>Estado</th><th>Actualizado</th><th>Acción</th></tr></thead><tbody>${items.map(p=>`<tr><td data-label="Producto"><div class="product-cell">${stockImage(p)}<div><strong>${stockEscape(p.name)}</strong><small>${stockEscape(p.category)}</small></div></div></td><td data-label="Variantes">${p.variants.filter(v=>v.active).length}</td><td data-label="Stock total">${p.quantity}</td><td data-label="Estado">${statusBadge(p.status)}</td><td data-label="Actualizado">${stockDate(p.updatedAt)}</td><td><button type="button" data-product="${p.id}" class="secondary">Gestionar<span class="sr-only"> ${stockEscape(p.name)}</span></button></td></tr>`).join('')}</tbody></table>`:'<div class="empty"><h3>No hay productos que mostrar.</h3><p>Revisa los filtros. Los nuevos productos del catálogo aparecen automáticamente con stock cero.</p></div>';
}
async function stockRenderDetail() {
  if(!stockSelected)return;
  const p=stockSelected;
  stockEl('detail-heading').innerHTML=`<div class="detail-brand">${stockImage(p)}<div><p class="eyebrow">${stockEscape(p.category)}</p><h2 id="detail-title" tabindex="-1">${stockEscape(p.name)}</h2><p><strong>${p.quantity} ${p.quantity===1?'unidad':'unidades'}</strong> · ${statusBadge(p.status)}</p></div></div>`;
  stockEl<HTMLButtonElement>('add-variant').disabled=!p.active;
  stockEl('variant-list').innerHTML=p.variants.length?`<table class="responsive-table"><thead><tr><th>Variante / SKU</th><th>Unidades</th><th>Umbral bajo</th><th>Estado / fecha</th><th>Operaciones</th></tr></thead><tbody>${p.variants.map(v=>`<tr><td data-label="Variante"><strong>${stockEscape(optionLabel(v))}</strong><small>${stockEscape(v.sku||'Sin referencia')}</small></td><td data-label="Unidades">${v.quantity}</td><td data-label="Umbral bajo">${v.lowThreshold??'Sin umbral'}</td><td data-label="Estado">${statusBadge(v.status)}<small>${stockDate(v.updatedAt)}</small></td><td><div class="row-actions">${v.active&&p.active?`<button type="button" data-operation="entry" data-variant="${v.id}">Añadir unidades</button><button type="button" class="secondary" data-operation="exit" data-variant="${v.id}">Registrar salida</button><button type="button" class="secondary" data-operation="adjust" data-variant="${v.id}">Ajustar stock</button>`:''}${p.active?`<button type="button" class="secondary" data-operation="variant" data-variant="${v.id}">Editar${v.active?' / archivar':' / activar'}</button>`:''}</div></td></tr>`).join('')}</tbody></table>`:'<p class="empty">Pendiente de configurar. Añade una variante para empezar.</p>';
  stockHistoryPage=0;stockEl('history-more').hidden=true;
  stockEl('history-list').textContent='Cargando movimientos…';
  try{const data=await stockCall<{items:StockMovement[]}>(`/api/products/${p.id}/history`);stockHistory=data.items;stockEl('history-more').hidden=data.items.length<100;stockRenderHistory();}catch(e){stockEl('history-list').textContent=e instanceof Error?e.message:'No se pudo cargar el historial.';}
}
function stockRenderHistory(){
  const type=stockEl<HTMLSelectElement>('history-filter').value,items=stockHistory.filter(m=>!type||m.kind===type),labels:Record<string,string>={entry:'Entrada',exit:'Salida',adjust:'Recuento'};
  stockEl('history-list').innerHTML=items.length?`<table class="responsive-table"><thead><tr><th>Fecha / responsable</th><th>Variante</th><th>Movimiento</th><th>Antes → después</th><th>Motivo / nota</th></tr></thead><tbody>${items.map(m=>`<tr><td data-label="Fecha">${stockDate(m.created_at)}<small>${stockEscape(m.actor)}</small></td><td data-label="Variante">${stockEscape(Object.entries(JSON.parse(m.options_json) as Record<string,string>).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'Sin variantes')}</td><td data-label="Movimiento">${labels[m.kind]} (${m.difference>0?'+':''}${m.difference})</td><td data-label="Antes → después">${m.previous_quantity} → ${m.next_quantity}</td><td data-label="Motivo">${stockEscape(m.reason)}${m.note?`<small>${stockEscape(m.note)}</small>`:''}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">No hay movimientos registrados para este filtro.</p>';
}
function stockOpen(action:string,variant?:StockVariant,trigger?:HTMLElement){
  stockAction=action;stockEditing=variant;stockTrigger=trigger;stockDirty=false;stockOperationId=crypto.randomUUID();stockOperationPayload=undefined;
  stockEl('dirty-note').hidden=true;stockEl('form-error').hidden=true;stockEl('reload-form').hidden=true;
  const titles:Record<string,string>={entry:'Añadir unidades',exit:'Registrar salida',adjust:'Ajustar stock',variant:variant?'Editar variante':'Añadir variante'};
  stockEl('edit-title').textContent=titles[action];
  if(action==='variant'){
    const options=variant?Object.entries(variant.options).map(([k,v])=>`${k}: ${v}`).join('\n'):'';
    stockEl('form-fields').innerHTML=`<p>Una opción por línea: <strong>talla: M</strong>, <strong>color: negro</strong>. Deja las opciones vacías solo para artículos sin variantes.</p><label>Opciones<textarea name="options" rows="3" maxlength="600" placeholder="talla: M&#10;color: azul">${stockEscape(options)}</textarea></label><label>Referencia / SKU (opcional)<input name="sku" maxlength="60" value="${stockEscape(variant?.sku||'')}"></label><label>Umbral de stock bajo (opcional)<input name="lowThreshold" type="number" min="0" max="1000000" step="1" value="${variant?.lowThreshold??''}"></label>${variant?`<label>Estado<select name="active"><option value="true" ${variant.active?'selected':''}>Activo</option><option value="false" ${!variant.active?'selected':''}>Archivado</option></select></label><p class="muted">Archivar conserva las existencias y el historial. Las unidades archivadas no cuentan en el total activo.</p>`:'<p class="muted">La nueva variante empezará con cero unidades y pendiente de configurar.</p>'}`;
  }else{
    stockEl('form-fields').innerHTML=`<p>${stockEscape(optionLabel(variant!))} · stock actual: <strong>${variant!.quantity}</strong></p><label>${action==='adjust'?'Cantidad tras el recuento':'Unidades'}<input name="amount" type="number" min="${action==='adjust'?0:1}" max="1000000" step="1" required ${action==='adjust'?`value="${variant!.quantity}"`:''}></label><label>Motivo<input name="reason" maxlength="180" required placeholder="${action==='entry'?'Reposición':action==='exit'?'Venta en el pabellón':'Recuento de existencias'}"></label><label>Nota (opcional)<textarea name="note" rows="3" maxlength="1000"></textarea></label>`;
  }
  stockDialog.showModal();stockDialog.querySelector<HTMLInputElement>('input:not([type=hidden]),textarea,select')?.focus();
}
function stockClose(){if(stockSaving)return;if(stockDirty&&!window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?'))return;stockDialog.close();}
stockEl('close-dialog').addEventListener('click',stockClose);
stockDialog.addEventListener('cancel',e=>{e.preventDefault();stockClose();});stockDialog.addEventListener('close',()=>stockTrigger?.focus());
stockEl('edit-form').addEventListener('input',()=>{stockDirty=true;stockOperationPayload=undefined;stockOperationId=crypto.randomUUID();stockEl('dirty-note').hidden=false;});
stockEl('edit-form').addEventListener('submit',async event=>{
  event.preventDefault();if(stockSaving||!stockSelected)return;
  const form=new FormData(event.target as HTMLFormElement);
  stockSaving=true;stockEl<HTMLButtonElement>('save').disabled=true;stockEl<HTMLButtonElement>('close-dialog').disabled=true;stockEl('form-error').hidden=true;
  try{
    if(stockAction==='variant'){
      const options:Record<string,string>={};for(const line of String(form.get('options')||'').split('\n').filter(v=>v.trim())){const colon=line.indexOf(':');if(colon<1)throw new Error('Escribe cada opción como nombre: valor.');const key=line.slice(0,colon).trim().toLowerCase();if(Object.hasOwn(options,key))throw new Error('Hay opciones repetidas.');options[key]=line.slice(colon+1).trim();}
      const threshold=form.get('lowThreshold');
      await stockCall(`/api/products/${stockSelected.id}/variants`,{options,sku:String(form.get('sku')||''),lowThreshold:threshold===''?null:Number(threshold),...(stockEditing?{id:stockEditing.id,version:stockEditing.version,active:form.get('active')==='true'}:{})});
    }else{
      stockOperationPayload ||= {kind:stockAction,amount:Number(form.get('amount')),reason:String(form.get('reason')),note:String(form.get('note')||''),version:stockEditing!.version,operationId:stockOperationId};
      await stockCall(`/api/variants/${stockEditing!.id}/movements`,stockOperationPayload);
    }
    stockDirty=false;stockDialog.close();stockFeedback('Guardado confirmado por el servidor.');await stockLoad();
  }catch(e){stockEl('form-error').textContent=e instanceof Error?e.message:'No se pudo guardar. Puedes volver a intentarlo.';stockEl('form-error').hidden=false;stockEl('reload-form').hidden=false;}
  finally{stockSaving=false;stockEl<HTMLButtonElement>('save').disabled=false;stockEl<HTMLButtonElement>('close-dialog').disabled=false;}
});
stockEl('stock-list').addEventListener('click',async e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-product]');if(!button)return;stockSelected=stockItems.find(p=>p.id===button.dataset.product);stockEl('catalogue-panel').hidden=true;stockEl('product-detail').hidden=false;await stockRenderDetail();stockEl('detail-title').focus();});
stockEl('variant-list').addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-operation]');if(!button)return;stockOpen(button.dataset.operation!,stockSelected!.variants.find(v=>v.id===button.dataset.variant),button);});
stockEl('add-variant').addEventListener('click',e=>stockOpen('variant',undefined,e.target as HTMLElement));
stockEl('back').addEventListener('click',()=>{stockSelected=undefined;stockEl('product-detail').hidden=true;stockEl('catalogue-panel').hidden=false;stockEl('stock-search').focus();});
stockEl('filters').addEventListener('submit',e=>e.preventDefault());stockEl('filters').addEventListener('input',stockRenderList);stockEl('history-filter').addEventListener('change',stockRenderHistory);
stockEl('refresh').addEventListener('click',stockLoad);stockEl('refresh-detail').addEventListener('click',stockLoad);
stockEl('logout').addEventListener('click',async()=>{try{await stockCall('/logout',{});location.assign(stockBase+'/');}catch(e){stockFeedback(e instanceof Error?e.message:'No se pudo cerrar la sesión.',true);}});
window.addEventListener('beforeunload',e=>{if(stockDirty){e.preventDefault();}});
void stockLoad();

stockEl('reload-form').addEventListener('click',async()=>{const id=stockEditing?.id,action=stockAction;stockClose();if(stockDialog.open)return;await stockLoad();const variant=stockSelected?.variants.find(v=>v.id===id);if(action==='variant'||variant?.active)stockOpen(action,variant,stockTrigger);});
stockEl('history-more').addEventListener('click',async()=>{const button=stockEl<HTMLButtonElement>('history-more');if(!stockSelected||button.disabled)return;button.disabled=true;try{const data=await stockCall<{items:StockMovement[]}>(`/api/products/${stockSelected.id}/history?page=${stockHistoryPage+1}`);stockHistoryPage++;stockHistory.push(...data.items);button.hidden=data.items.length<100;stockRenderHistory();}catch(e){stockFeedback(e instanceof Error?e.message:'No se pudieron cargar los movimientos.',true);}finally{button.disabled=false;}});
