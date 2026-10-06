import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { D1Database, D1PreparedStatement, D1Result } from '@cloudflare/workers-types';
import { env } from './worker-env';
import { syncInventory, inventorySnapshot, recordMovement, saveVariant, findVariant, history, publicAvailability, normalizeOptions, integer } from '../worker/stock/inventory';
import { csrfToken } from '../src/lib/cms';
import { stockRoutes } from '../worker/stock/routes';
import type { ShopProduct } from '../src/data/shop';

// Real SQLite executes the migration, constraints and triggers. This is not a SQL-string mock.
let sqlite: DatabaseSync;
function database(): D1Database {
  const prepare = (query:string,params:unknown[]=[]):D1PreparedStatement => {
    const statement=()=>sqlite.prepare(query);
    const all=()=>statement().all(...params as (string|number|null)[]);
    const result=():D1Result=>({success:true,results:all(),meta:{changes:Number(sqlite.prepare('SELECT changes() AS count').get()!.count),duration:0,last_row_id:0,changed_db:true,size_after:0,rows_read:0,rows_written:0}});
    return {bind:(...values)=>prepare(query,values),first:async(column?:string)=>{const row=statement().get(...params as (string|number|null)[]);return row?(column?row[column]:row):null;},all:async()=>result(),run:async()=>result(),raw:async()=>all().map(row=>Object.values(row))} as D1PreparedStatement;
  };
  return {prepare,batch:async(statements:D1PreparedStatement[])=>{sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}} as D1Database;
}
const shirt:ShopProduct={id:'camiseta-test',name:'Camiseta',description:'Prueba',category:'Equipaciones',images:[]};
const request=()=>new Request('http://127.0.0.1:8787/tienda/stock');
const movement=(version:number,kind='entry',amount=5)=>({version,kind,amount,reason:'Prueba',note:'',operationId:crypto.randomUUID()});
beforeEach(()=>{for(const key of Object.keys(env))delete env[key];sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('migrations/0004_inventory.sql','utf8'));env.DB=database();env.ENVIRONMENT='local';sqlite.exec('CREATE TABLE request_limits(identity TEXT, minute INTEGER, hits INTEGER, PRIMARY KEY(identity,minute));');});
afterEach(()=>sqlite.close());
async function initial(){await syncInventory([shirt]);return (await inventorySnapshot()).items[0].variants[0];}

describe('inventory persistence and source catalogue',()=>{
  it('rolls back the quantity if writing its audit record fails',async()=>{const v=await initial();sqlite.exec("CREATE TRIGGER fail_test_audit BEFORE INSERT ON stock_movements BEGIN SELECT RAISE(ABORT,'test_audit_failure'); END;");await expect(recordMovement(v.id,movement(1),'admin')).rejects.toThrow('test_audit_failure');expect((await findVariant(v.id)).quantity).toBe(0);expect(await history(shirt.id)).toHaveLength(0);});
  it('paginates historical movements without losing older records',async()=>{const v=await initial();for(let version=1;version<=103;version++)await recordMovement(v.id,movement(version,'entry',1),'admin');expect(await history(shirt.id)).toHaveLength(100);expect(await history(shirt.id,1)).toHaveLength(3);await expect(history(shirt.id,-1)).rejects.toThrow();});
  it('creates zero pending stock automatically and never duplicates it',async()=>{await initial();await syncInventory([shirt]);const data=await inventorySnapshot();expect(data.items).toHaveLength(1);expect(data.items[0].variants).toHaveLength(1);expect(data.items[0].status).toBe('Pendiente de configurar');expect(data.items[0].quantity).toBe(0);});
  it('preserves quantities on source edits and archives removed products with their history',async()=>{const v=await initial();await recordMovement(v.id,movement(v.version),'admin');await syncInventory([{...shirt,name:'Nombre nuevo',images:[{src:'/images/x.webp',alt:'Nueva',width:100,height:100}]}]);expect((await inventorySnapshot()).items[0].quantity).toBe(5);await syncInventory([]);expect((await inventorySnapshot()).items[0].active).toBe(false);expect(await history(shirt.id)).toHaveLength(1);await expect(recordMovement(v.id,movement(2),'admin')).rejects.toThrow('archivado');});
  it('initializes combinations declared by the existing catalogue',async()=>{await syncInventory([{...shirt,sizes:['M','L'],variants:['negro','azul']}]);expect((await inventorySnapshot()).items[0].variants).toHaveLength(4);});
  it('registers entries, exits and recounts in atomic audit records',async()=>{const v=await initial();await recordMovement(v.id,movement(1),'admin');await recordMovement(v.id,movement(2,'exit',2),'admin');await recordMovement(v.id,movement(3,'adjust',8),'admin');const records=await history(shirt.id);expect(records.map(m=>[m.previous_quantity,m.next_quantity,m.difference])).toEqual([[3,8,5],[5,3,-2],[0,5,5]]);expect(records.every(m=>m.actor==='admin')).toBe(true);});
  it('rejects invalid counts and over-selling without adding history',async()=>{const v=await initial();for(const amount of [-1,1.5,'3',Infinity])await expect(recordMovement(v.id,{...movement(1),amount},'admin')).rejects.toThrow();await expect(recordMovement(v.id,movement(1,'exit',2),'admin')).rejects.toThrow('negativo');expect(await history(shirt.id)).toHaveLength(0);expect((await findVariant(v.id)).quantity).toBe(0);});
  it('keeps just one concurrent operation and reports stale recounts',async()=>{const v=await initial();const outcomes=await Promise.allSettled([recordMovement(v.id,movement(1),'a'),recordMovement(v.id,movement(1,'adjust',9),'b')]);expect(outcomes.filter(v=>v.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(v=>v.status==='rejected')).toHaveLength(1);expect(await history(shirt.id)).toHaveLength(1);});
  it('retries an operation idempotently and rejects key reuse with different data',async()=>{const v=await initial(),input=movement(1);await recordMovement(v.id,input,'admin');await recordMovement(v.id,input,'admin');expect((await findVariant(v.id)).quantity).toBe(5);expect(await history(shirt.id)).toHaveLength(1);await expect(recordMovement(v.id,{...input,amount:8},'admin')).rejects.toThrow('utilizada');});
  it('adds, edits and archives variants while computing only active totals',async()=>{await initial();const m=await saveVariant(shirt.id,{options:{talla:'M',color:'Negro'},sku:'CAM-M',lowThreshold:2});const l=await saveVariant(shirt.id,{options:{color:'Negro',talla:'L'},sku:'CAM-L'});await recordMovement(m.id,movement(1),'admin');await recordMovement(l.id,movement(1,'adjust',1),'admin');await expect(saveVariant(shirt.id,{options:{TALLA:' m ',COLOR:'negro'},sku:'otro'})).rejects.toThrow('UNIQUE');await saveVariant(shirt.id,{id:m.id,version:2,options:{talla:'M',color:'Negro'},sku:'CAM-M',active:false});expect((await inventorySnapshot()).items[0].quantity).toBe(1);expect(await history(shirt.id)).toHaveLength(2);expect(()=>sqlite.prepare('DELETE FROM stock_variants WHERE id=?').run(m.id)).toThrow();await syncInventory([shirt]);expect((await inventorySnapshot()).items[0].variants.filter(v=>v.active)).toHaveLength(1);});
  it('requires zero stock before switching a simple product to sizes',async()=>{const v=await initial();await recordMovement(v.id,movement(1),'admin');await expect(saveVariant(shirt.id,{options:{talla:'M'}})).rejects.toThrow('Recuenta');});
  it('keeps availability fresh but never exports private quantities or notes',async()=>{const v=await initial();expect((await publicAvailability()).items[0].status).toBe('Consultar disponibilidad');await recordMovement(v.id,movement(1,'adjust',0),'admin');expect((await publicAvailability()).items[0].status).toBe('Agotado');await recordMovement(v.id,movement(2),'admin');const value=await publicAvailability();expect(value.items[0].status).toBe('Disponible');for(const key of ['quantity','note','reason','actor','request_hash','sku'])expect(JSON.stringify(value)).not.toContain(`"${key}"`);});
  it('normalizes option ordering and validates integers on the server',()=>{expect(normalizeOptions({Color:' Azul ',Talla:'M'}).key).toBe(normalizeOptions({talla:'m',color:'azul'}).key);expect(()=>normalizeOptions({x:''})).toThrow();expect(()=>integer('2')).toThrow();});
});
describe('private access',()=>{
  it('redirects the public stock address to the CMS before loading private data',async()=>{const response=await stockRoutes(new Request('https://cdmenciana.es/tienda/stock/?page=1'));expect(response?.status).toBe(302);expect(response?.headers.get('location')).toBe('https://cms.cdmenciana.es/tienda/stock/?page=1');expect(response?.headers.get('cache-control')).toBe('no-store');expect(await response!.text()).toBe('');expect((await stockRoutes(new Request('https://cms.cdmenciana.es/tienda/stock/api/inventory')))?.status).toBe(401);});
  it('requires Access even without configuration and rejects incomplete or forged identity',async()=>{
    expect((await stockRoutes(request()))?.status).toBe(401);
    env.ACCESS_TEAM_DOMAIN='https://club.cloudflareaccess.com';expect((await stockRoutes(request()))?.status).toBe(503);
    env.ACCESS_AUD='test-audience';env.ADMIN_EMAIL='admin@example.com';
    expect((await stockRoutes(request()))?.status).toBe(401);
    expect((await stockRoutes(new Request(request().url,{headers:{'cf-access-jwt-assertion':'invalid'}})))?.status).toBe(401);
  });
  it('fails closed for all private endpoints and does not accept legacy stock cookies',async()=>{
    for(const [path,method] of [['/api/inventory','GET'],['/client.js','GET'],['/api/products/camiseta-test/history','GET'],['/api/products/camiseta-test/variants','POST'],['/api/variants/00000000-0000-0000-0000-000000000000/movements','POST'],['/logout','POST'],['/login','POST']]){const response=await stockRoutes(new Request(request().url+path,{method,headers:{cookie:'cdm-stock-app='+ 'a'.repeat(64)}}));expect(response?.status).toBe(401);expect(response?.headers.get('cache-control')).toContain('no-store');}
    const html=await (await stockRoutes(request()))!.text();expect(html).not.toContain('data-stock');expect(html).not.toContain('type="password"');
  });
  it('opens the panel and inventory directly for an explicitly authorized local identity',async()=>{
    env.LOCAL_ADMIN_BYPASS='1';const response=(await stockRoutes(request()))!;expect(response.status).toBe(200);const html=await response.text();expect(html).toContain('data-stock');expect(html).toContain('local-admin');expect(html).not.toContain('type="password"');expect(response.headers.get('set-cookie')).toBeNull();
    const inventory=(await stockRoutes(new Request(request().url+'/api/inventory')))!;expect(inventory.status).toBe(200);expect((await inventory.json() as {items:unknown[]}).items.length).toBeGreaterThan(0);
  });
  it('never permits the local bypass on a remote host or in production',async()=>{
    env.LOCAL_ADMIN_BYPASS='1';expect((await stockRoutes(new Request('https://cms.cdmenciana.es/tienda/stock/')))?.status).toBe(401);
    env.ENVIRONMENT='production';expect((await stockRoutes(new Request('https://127.0.0.1:8787/tienda/stock')))?.status).toBe(401);
  });
  it('records the verified identity without requiring an additional session cookie',async()=>{
    env.LOCAL_ADMIN_BYPASS='1';const variant=await initial();const response=await stockRoutes(new Request(request().url+'/api/variants/'+variant.id+'/movements',{method:'POST',headers:{origin:'http://127.0.0.1:8787','x-cdm-csrf':await csrfToken('local-admin'),'content-type':'application/json'},body:JSON.stringify(movement(1))}));
    expect(response?.status).toBe(201);expect((await history(shirt.id))[0].actor).toBe('local-admin');expect((await findVariant(variant.id)).quantity).toBe(5);
  });
  it('rejects missing CSRF, a wrong token, and a foreign origin without modifying stock',async()=>{
    env.LOCAL_ADMIN_BYPASS='1';const v=await initial(),csrf=await csrfToken('local-admin');
    for(const headers of [{origin:'http://127.0.0.1:8787'},{origin:'http://127.0.0.1:8787','x-cdm-csrf':'wrong'},{origin:'https://evil.test','x-cdm-csrf':csrf}]){const response=await stockRoutes(new Request(request().url+'/api/variants/'+v.id+'/movements',{method:'POST',headers:headers as Record<string,string>,body:JSON.stringify(movement(1))}));expect(response?.status).toBe(403);}
    expect(await history(shirt.id)).toHaveLength(0);expect((await findVariant(v.id)).quantity).toBe(0);
  });
  it('logs out through Cloudflare Access and throttles authenticated mutations',async()=>{
    env.LOCAL_ADMIN_BYPASS='1';const csrf=await csrfToken('local-admin');
    const logout=()=>stockRoutes(new Request(request().url+'/logout',{method:'POST',headers:{origin:'http://127.0.0.1:8787','x-cdm-csrf':csrf}}));
    const response=(await logout())!;expect(response.status).toBe(200);expect(await response.json()).toEqual({redirect:'/cdn-cgi/access/logout'});expect(response.headers.get('set-cookie')).toBeNull();
    for(let i=1;i<60;i++)expect((await logout())?.status).toBe(200);expect((await logout())?.status).toBe(429);
  });
});
