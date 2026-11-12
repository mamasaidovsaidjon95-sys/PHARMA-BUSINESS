require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { z } = require('zod');
const path = require('path');
const crypto = require('crypto');

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Set DATABASE_URL and a JWT_SECRET of at least 32 characters.'); process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined });
const app = express();
app.use(helmet({ contentSecurityPolicy: false })); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || false })); app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req,res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/app', (req,res) => res.sendFile(path.join(__dirname, '../public/app.html')));
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const sign = u => jwt.sign({ sub:u.id, companyId:u.company_id, role:u.role }, process.env.JWT_SECRET, { expiresIn:'12h', issuer:'pharma-business' });
const auth = asyncRoute(async (req,res,next) => {
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token) return res.status(401).json({error:'Kirish talab qilinadi'});
 try { const p=jwt.verify(token,process.env.JWT_SECRET,{issuer:'pharma-business'}); const q=await pool.query('SELECT id,company_id,full_name,email,role,active FROM users WHERE id=$1',[p.sub]);
  if(!q.rowCount || !q.rows[0].active) return res.status(401).json({error:'Hisob faol emas'});
  if(String(p.companyId||'')!==String(q.rows[0].company_id||'')) return res.status(401).json({error:'Hisob tokeni mos emas'});
  if(q.rows[0].company_id && !['/api/company/subscription'].includes(req.path)) {
   const c=await pool.query('SELECT status,trial_ends_at,subscription_ends_at FROM companies WHERE id=$1',[q.rows[0].company_id]);
   if(!c.rowCount || c.rows[0].status==='suspended') return res.status(402).json({error:'Firma obunasi vaqtincha to‘xtatilgan'});
   const end=c.rows[0].subscription_ends_at||c.rows[0].trial_ends_at;
   if(c.rows[0].status==='expired' || (end && new Date(end)<new Date())) return res.status(402).json({error:'Sinov yoki obuna muddati tugagan. Administrator bilan bog‘laning.'});
  }
  req.user=q.rows[0]; next();
 } catch(e){ return res.status(401).json({error:'Token yaroqsiz yoki muddati tugagan'}); }
});
const allow = (...roles) => (req,res,next) => roles.includes(req.user.role) ? next() : res.status(403).json({error:'Ruxsat yo‘q'});
const tenant = req => req.user.company_id;
// Audit only successful authenticated write requests. Logging failures never break the business request.
app.use('/api', (req,res,next)=>{
 const original=res.json.bind(res);
 res.json=(body)=>{const out=original(body);if(req.user && ['POST','PATCH','PUT','DELETE'].includes(req.method) && res.statusCode<400){
  const resource=(req.path.split('/')[2]||'api').slice(0,80), rid=req.params?.id||body?.id||body?.order?.id||null;
  pool.query('INSERT INTO audit_logs(company_id,user_id,action,resource,resource_id,http_status,ip_address) VALUES($1,$2,$3,$4,$5,$6,$7)',[req.user.company_id,req.user.id,req.method,resource,rid,res.statusCode,req.ip]).catch(e=>console.error('Audit log error:',e.message));
 }return out;};next();
});


// v8 B2B directory and inter-company trade enquiries. Only explicitly visible firms appear.
app.get('/api/trade/companies',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query("SELECT id,name FROM companies WHERE b2b_visible=true AND active=true AND id<>$1 ORDER BY name LIMIT 300",[tenant(req)]);res.json(q.rows);
}));
app.patch('/api/company/trade-visibility',auth,allow('company_admin'),asyncRoute(async(req,res)=>{
 const parsed=z.object({visible:z.boolean()}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Ko‘rinish holati noto‘g‘ri'});
 const q=await pool.query('UPDATE companies SET b2b_visible=$1 WHERE id=$2 RETURNING b2b_visible',[parsed.data.visible,tenant(req)]);res.json(q.rows[0]);
}));
app.get('/api/trade/requests',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT t.*,s.name sender_company_name,r.name receiver_company_name,u.full_name sender_name
 FROM trade_requests t JOIN companies s ON s.id=t.sender_company_id JOIN companies r ON r.id=t.receiver_company_id
 LEFT JOIN users u ON u.id=t.sender_user_id
 WHERE t.sender_company_id=$1 OR t.receiver_company_id=$1 ORDER BY t.created_at DESC LIMIT 500`,[tenant(req)]);res.json(q.rows);
}));
app.post('/api/trade/requests',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const parsed=z.object({receiverCompanyId:z.string().uuid(),subject:z.string().trim().min(3).max(160),message:z.string().trim().min(3).max(3000)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Mavzu va xabarni to‘liq kiriting'});
 if(parsed.data.receiverCompanyId===tenant(req))return res.status(400).json({error:'O‘z firmangizga so‘rov yubora olmaysiz'});
 const q=await pool.query('SELECT id FROM companies WHERE id=$1 AND b2b_visible=true AND active=true',[parsed.data.receiverCompanyId]);
 if(!q.rowCount)return res.status(404).json({error:'Qabul qiluvchi firma topilmadi yoki katalogda ko‘rinmaydi'});
 const t=await pool.query('INSERT INTO trade_requests(sender_company_id,receiver_company_id,sender_user_id,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING *',[tenant(req),parsed.data.receiverCompanyId,req.user.id,parsed.data.subject,parsed.data.message]);res.status(201).json(t.rows[0]);
}));
app.patch('/api/trade/requests/:id',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({status:z.enum(['accepted','rejected','completed']),responseNote:z.string().trim().max(2000).optional()}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'So‘rov holati noto‘g‘ri'});
 const q=await pool.query("UPDATE trade_requests SET status=$1,response_note=$2,responded_by=$3,responded_at=now() WHERE id=$4 AND receiver_company_id=$5 AND status='new' RETURNING *",[parsed.data.status,parsed.data.responseNote||null,req.user.id,req.params.id,tenant(req)]);
 if(!q.rowCount)return res.status(404).json({error:'Yangi kiruvchi so‘rov topilmadi'});res.json(q.rows[0]);
}));


// v25: supplier directory, purchase orders, batch-aware receiving and supplier debt ledger.
app.get('/api/suppliers',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT s.*,
 COALESCE((SELECT SUM(total) FROM purchase_orders po WHERE po.supplier_id=s.id AND po.company_id=s.company_id AND po.status='received'),0)::numeric(18,2) purchased,
 COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id=s.id AND sp.company_id=s.company_id),0)::numeric(18,2) paid
 FROM suppliers s WHERE s.company_id=$1 ORDER BY s.name`,[tenant(req)]);
 res.json(q.rows.map(r=>({...r,balance:(Number(r.purchased)-Number(r.paid)).toFixed(2)})));
}));
app.post('/api/suppliers',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const p=z.object({name:z.string().trim().min(2).max(200),contactName:z.string().trim().max(160).optional(),phone:z.string().trim().max(40).optional(),address:z.string().trim().max(500).optional(),note:z.string().trim().max(1000).optional()}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Yetkazib beruvchi ma’lumotlarini tekshiring'});const d=p.data;
 const q=await pool.query('INSERT INTO suppliers(company_id,name,contact_name,phone,address,note) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[tenant(req),d.name,d.contactName||null,d.phone||null,d.address||null,d.note||null]);res.status(201).json(q.rows[0]);
}));
app.patch('/api/suppliers/:id',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const p=z.object({name:z.string().trim().min(2).max(200),contactName:z.string().trim().max(160).optional(),phone:z.string().trim().max(40).optional(),address:z.string().trim().max(500).optional(),note:z.string().trim().max(1000).optional(),active:z.boolean().optional()}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Yetkazib beruvchi ma’lumotlari noto‘g‘ri'});const d=p.data;
 const q=await pool.query('UPDATE suppliers SET name=$1,contact_name=$2,phone=$3,address=$4,note=$5,active=COALESCE($6,active),updated_at=now() WHERE id=$7 AND company_id=$8 RETURNING *',[d.name,d.contactName||null,d.phone||null,d.address||null,d.note||null,d.active??null,req.params.id,tenant(req)]);
 if(!q.rowCount)return res.status(404).json({error:'Yetkazib beruvchi topilmadi'});res.json(q.rows[0]);
}));
app.get('/api/purchases',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT po.*,s.name supplier_name,u.full_name created_by_name,COALESCE(sp.paid,0)::numeric(18,2) paid,(po.total-COALESCE(sp.paid,0))::numeric(18,2) balance FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN users u ON u.id=po.created_by LEFT JOIN (SELECT purchase_order_id,SUM(amount) paid FROM supplier_payments WHERE company_id=$1 GROUP BY purchase_order_id) sp ON sp.purchase_order_id=po.id WHERE po.company_id=$1 ORDER BY po.created_at DESC LIMIT 500`,[tenant(req)]);res.json(q.rows);
}));
app.post('/api/purchases',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const p=z.object({supplierId:z.string().uuid(),note:z.string().trim().max(1000).optional(),items:z.array(z.object({productId:z.string().uuid(),quantity:z.coerce.number().positive().max(100000000),unitCost:z.coerce.number().min(0),batchNumber:z.string().trim().min(1).max(100),expiryDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),manufactureDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()})).min(1).max(500)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Xarid hujjati yoki mahsulotlar noto‘g‘ri'});const d=p.data,cx=await pool.connect();
 try{await cx.query('BEGIN');const sup=await cx.query('SELECT id FROM suppliers WHERE id=$1 AND company_id=$2 AND active=true FOR SHARE',[d.supplierId,tenant(req)]);if(!sup.rowCount)throw Object.assign(new Error('Yetkazib beruvchi topilmadi yoki faol emas'),{status:404});let total=0;const checked=[];
 for(const it of d.items){const pr=await cx.query('SELECT id FROM products WHERE id=$1 AND company_id=$2',[it.productId,tenant(req)]);if(!pr.rowCount)throw Object.assign(new Error('Mahsulotlardan biri topilmadi'),{status:404});if(it.expiryDate<new Date().toISOString().slice(0,10))throw Object.assign(new Error('Muddati o‘tgan partiyani xarid hujjatiga kiritib bo‘lmaydi'),{status:400});total+=it.quantity*it.unitCost;checked.push(it);}
 const po=await cx.query('INSERT INTO purchase_orders(company_id,supplier_id,status,total,note,created_by) VALUES($1,$2,\'draft\',$3,$4,$5) RETURNING *',[tenant(req),d.supplierId,total,d.note||null,req.user.id]);
 for(const it of checked)await cx.query('INSERT INTO purchase_order_items(purchase_order_id,product_id,quantity,unit_cost,batch_number,manufacture_date,expiry_date) VALUES($1,$2,$3,$4,$5,$6,$7)',[po.rows[0].id,it.productId,it.quantity,it.unitCost,it.batchNumber,it.manufactureDate||null,it.expiryDate]);
 await cx.query('COMMIT');res.status(201).json(po.rows[0]);}catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
// v27: Excel-compatible CSV purchase import and purchase price history.
app.post('/api/purchases/import',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const p=z.object({supplierId:z.string().uuid(),note:z.string().trim().max(1000).optional(),items:z.array(z.object({barcode:z.string().trim().min(1).max(64),quantity:z.coerce.number().positive().max(100000000),unitCost:z.coerce.number().min(0),batchNumber:z.string().trim().min(1).max(100),expiryDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),manufactureDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()})).min(1).max(500)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'Import ustunlari noto‘g‘ri yoki 500 qatordan oshgan'});
 const d=p.data,cx=await pool.connect();try{await cx.query('BEGIN');const sup=await cx.query('SELECT id FROM suppliers WHERE id=$1 AND company_id=$2 AND active=true FOR SHARE',[d.supplierId,tenant(req)]);if(!sup.rowCount)throw Object.assign(new Error('Yetkazib beruvchi topilmadi yoki faol emas'),{status:404});let total=0;const checked=[];
 for(const it of d.items){const pr=await cx.query('SELECT id FROM products WHERE company_id=$1 AND barcode=$2',[tenant(req),it.barcode]);if(!pr.rowCount)throw Object.assign(new Error('Shtrix-kod topilmadi: '+it.barcode),{status:404});if(it.expiryDate<new Date().toISOString().slice(0,10))throw Object.assign(new Error('Muddati o‘tgan partiya: '+it.barcode),{status:400});total+=it.quantity*it.unitCost;checked.push({...it,productId:pr.rows[0].id});}
 const po=await cx.query("INSERT INTO purchase_orders(company_id,supplier_id,status,total,note,created_by) VALUES($1,$2,'draft',$3,$4,$5) RETURNING *",[tenant(req),d.supplierId,total,d.note||'Excel/CSV import',req.user.id]);
 for(const it of checked)await cx.query('INSERT INTO purchase_order_items(purchase_order_id,product_id,quantity,unit_cost,batch_number,manufacture_date,expiry_date) VALUES($1,$2,$3,$4,$5,$6,$7)',[po.rows[0].id,it.productId,it.quantity,it.unitCost,it.batchNumber,it.manufactureDate||null,it.expiryDate]);
 await cx.query('COMMIT');res.status(201).json({purchase:po.rows[0],imported:checked.length});}catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.get('/api/products/:id/purchase-price-history',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const product=await pool.query('SELECT id,name FROM products WHERE id=$1 AND company_id=$2',[req.params.id,tenant(req)]);if(!product.rowCount)return res.status(404).json({error:'Mahsulot topilmadi'});
 const q=await pool.query(`SELECT h.*,s.name supplier_name,po.created_at purchase_date FROM purchase_price_history h JOIN suppliers s ON s.id=h.supplier_id JOIN purchase_orders po ON po.id=h.purchase_order_id WHERE h.company_id=$1 AND h.product_id=$2 ORDER BY h.recorded_at DESC LIMIT 500`,[tenant(req),req.params.id]);res.json({product:product.rows[0],history:q.rows});
}));

app.get('/api/purchases/:id',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{const q=await pool.query(`SELECT po.*,s.name supplier_name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=$1 AND po.company_id=$2`,[req.params.id,tenant(req)]);if(!q.rowCount)return res.status(404).json({error:'Xarid hujjati topilmadi'});const items=await pool.query('SELECT i.*,p.name product_name,p.unit FROM purchase_order_items i JOIN products p ON p.id=i.product_id WHERE i.purchase_order_id=$1 ORDER BY p.name',[req.params.id]);res.json({...q.rows[0],items:items.rows});}));
app.post('/api/purchases/:id/receive',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const cx=await pool.connect();try{await cx.query('BEGIN');const po=await cx.query("SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 FOR UPDATE",[req.params.id,tenant(req)]);if(!po.rowCount)throw Object.assign(new Error('Xarid hujjati topilmadi'),{status:404});if(po.rows[0].status!=='draft')throw Object.assign(new Error('Faqat qoralama xaridni qabul qilish mumkin'),{status:409});const items=await cx.query('SELECT * FROM purchase_order_items WHERE purchase_order_id=$1',[req.params.id]);if(!items.rowCount)throw Object.assign(new Error('Xarid tarkibi bo‘sh'),{status:409});
 for(const it of items.rows){const b=await cx.query(`INSERT INTO inventory_batches(company_id,product_id,batch_number,manufacture_date,expiry_date,received_quantity,unit_cost,supplier_name,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,(SELECT name FROM suppliers WHERE id=$8),$9,$10) ON CONFLICT(company_id,product_id,batch_number) DO UPDATE SET received_quantity=inventory_batches.received_quantity+EXCLUDED.received_quantity RETURNING id`,[tenant(req),it.product_id,it.batch_number,it.manufacture_date,it.expiry_date,it.quantity,it.unit_cost,po.rows[0].supplier_id,'Xarid hujjati '+po.rows[0].id,req.user.id]);await cx.query("INSERT INTO stock_movements(company_id,product_id,batch_id,movement_type,quantity,unit_cost,reference,created_by) VALUES($1,$2,$3,'in',$4,$5,$6,$7)",[tenant(req),it.product_id,b.rows[0].id,it.quantity,it.unit_cost,'Xarid '+po.rows[0].id,req.user.id]);await cx.query('INSERT INTO purchase_price_history(company_id,product_id,supplier_id,purchase_order_id,purchase_order_item_id,unit_cost,quantity,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[tenant(req),it.product_id,po.rows[0].supplier_id,po.rows[0].id,it.id,it.unit_cost,it.quantity,req.user.id]);await cx.query('UPDATE products SET purchase_price=$1 WHERE id=$2 AND company_id=$3',[it.unit_cost,it.product_id,tenant(req)]);}
 const done=await cx.query("UPDATE purchase_orders SET status='received',received_at=now(),received_by=$1 WHERE id=$2 RETURNING *",[req.user.id,req.params.id]);await cx.query('COMMIT');res.json(done.rows[0]);}catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));

// v26: purchase returns, stock deduction and supplier statement.
app.get('/api/suppliers/:id/statement',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const sup=await pool.query('SELECT id,name FROM suppliers WHERE id=$1 AND company_id=$2',[req.params.id,tenant(req)]);if(!sup.rowCount)return res.status(404).json({error:'Yetkazib beruvchi topilmadi'});
 const q=await pool.query(`SELECT 'purchase'::text kind,po.id reference_id,po.created_at happened_at,po.total amount,'Xarid' description FROM purchase_orders po WHERE po.company_id=$1 AND po.supplier_id=$2 AND po.status='received' UNION ALL SELECT 'return',pr.id,pr.created_at,-(pr.quantity*pr.unit_cost),'Xarid qaytarish' FROM purchase_returns pr WHERE pr.company_id=$1 AND pr.supplier_id=$2 UNION ALL SELECT 'payment',sp.id,sp.created_at,-sp.amount,'To‘lov ('||sp.method||')' FROM supplier_payments sp WHERE sp.company_id=$1 AND sp.supplier_id=$2 ORDER BY happened_at DESC LIMIT 1000`,[tenant(req),req.params.id]);
 let balance=0;for(const r of [...q.rows].reverse())balance+=Number(r.amount);res.json({supplier:sup.rows[0],rows:q.rows,balance:balance.toFixed(2)});
}));
app.post('/api/purchases/:id/returns',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({itemId:z.string().uuid(),quantity:z.coerce.number().positive(),reason:z.string().trim().min(2).max(500)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Qaytarish ma’lumotlari noto‘g‘ri'});const d=parsed.data,cx=await pool.connect();
 try{await cx.query('BEGIN');const po=await cx.query("SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status='received' FOR UPDATE",[req.params.id,tenant(req)]);if(!po.rowCount)throw Object.assign(new Error('Qabul qilingan xarid topilmadi'),{status:404});
 const it=await cx.query('SELECT * FROM purchase_order_items WHERE id=$1 AND purchase_order_id=$2 FOR UPDATE',[d.itemId,req.params.id]);if(!it.rowCount)throw Object.assign(new Error('Xarid mahsuloti topilmadi'),{status:404});
 const already=await cx.query('SELECT COALESCE(SUM(quantity),0) qty FROM purchase_returns WHERE purchase_order_item_id=$1',[d.itemId]);if(d.quantity>Number(it.rows[0].quantity)-Number(already.rows[0].qty)+0.000001)throw Object.assign(new Error('Qaytarish miqdori xarid qoldig‘idan ko‘p'),{status:409});
 const b=await cx.query('SELECT id FROM inventory_batches WHERE company_id=$1 AND product_id=$2 AND batch_number=$3 FOR UPDATE',[tenant(req),it.rows[0].product_id,it.rows[0].batch_number]);if(!b.rowCount)throw Object.assign(new Error('Ombor partiyasi topilmadi'),{status:409});
 const stock=await cx.query("SELECT COALESCE(SUM(CASE WHEN movement_type='in' THEN quantity WHEN movement_type='out' THEN -quantity ELSE quantity END),0) qty FROM stock_movements WHERE company_id=$1 AND product_id=$2 AND batch_id=$3",[tenant(req),it.rows[0].product_id,b.rows[0].id]);if(Number(stock.rows[0].qty)+0.000001<d.quantity)throw Object.assign(new Error('Partiyada qaytarish uchun yetarli ombor qoldig‘i yo‘q'),{status:409});
 const ret=await cx.query('INSERT INTO purchase_returns(company_id,supplier_id,purchase_order_id,purchase_order_item_id,batch_id,quantity,unit_cost,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[tenant(req),po.rows[0].supplier_id,req.params.id,d.itemId,b.rows[0].id,d.quantity,it.rows[0].unit_cost,d.reason,req.user.id]);
 await cx.query("INSERT INTO stock_movements(company_id,product_id,batch_id,movement_type,quantity,unit_cost,reference,created_by) VALUES($1,$2,$3,'out',$4,$5,$6,$7)",[tenant(req),it.rows[0].product_id,b.rows[0].id,d.quantity,it.rows[0].unit_cost,'Yetkazib beruvchiga qaytarish '+ret.rows[0].id,req.user.id]);await cx.query('COMMIT');res.status(201).json(ret.rows[0]);
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.get('/api/purchases/:id/returns',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{const q=await pool.query(`SELECT pr.*,p.name product_name,poi.batch_number FROM purchase_returns pr JOIN purchase_order_items poi ON poi.id=pr.purchase_order_item_id JOIN products p ON p.id=poi.product_id WHERE pr.purchase_order_id=$1 AND pr.company_id=$2 ORDER BY pr.created_at DESC`,[req.params.id,tenant(req)]);res.json(q.rows);}));

app.post('/api/suppliers/:id/payments',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const p=z.object({amount:z.coerce.number().positive(),method:z.enum(['cash','transfer','card']),purchaseOrderId:z.string().uuid().optional(),reference:z.string().trim().max(160).optional(),note:z.string().trim().max(500).optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'To‘lov ma’lumotlari noto‘g‘ri'});const d=p.data,cx=await pool.connect();try{await cx.query('BEGIN');const s=await cx.query('SELECT id FROM suppliers WHERE id=$1 AND company_id=$2 FOR SHARE',[req.params.id,tenant(req)]);if(!s.rowCount)throw Object.assign(new Error('Yetkazib beruvchi topilmadi'),{status:404});if(d.purchaseOrderId){const po=await cx.query("SELECT id,total FROM purchase_orders WHERE id=$1 AND supplier_id=$2 AND company_id=$3 AND status='received' FOR UPDATE",[d.purchaseOrderId,req.params.id,tenant(req)]);if(!po.rowCount)throw Object.assign(new Error('Qabul qilingan xarid hujjati topilmadi'),{status:404});const paid=await cx.query('SELECT COALESCE(SUM(amount),0) amount FROM supplier_payments WHERE purchase_order_id=$1',[d.purchaseOrderId]);if(d.amount>Number(po.rows[0].total)-Number(paid.rows[0].amount)+0.001)throw Object.assign(new Error('To‘lov xarid qoldiq qarzidan ko‘p'),{status:409});}const r=await cx.query('INSERT INTO supplier_payments(company_id,supplier_id,purchase_order_id,amount,method,reference,note,paid_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[tenant(req),req.params.id,d.purchaseOrderId||null,d.amount,d.method,d.reference||null,d.note||null,req.user.id]);await cx.query('COMMIT');res.status(201).json(r.rows[0]);}catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.get('/api/suppliers/:id/statement',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{const s=await pool.query('SELECT id,name FROM suppliers WHERE id=$1 AND company_id=$2',[req.params.id,tenant(req)]);if(!s.rowCount)return res.status(404).json({error:'Yetkazib beruvchi topilmadi'});const q=await pool.query(`SELECT (SELECT COALESCE(SUM(total),0) FROM purchase_orders WHERE supplier_id=$1 AND company_id=$2 AND status='received') purchased,(SELECT COALESCE(SUM(amount),0) FROM supplier_payments WHERE supplier_id=$1 AND company_id=$2) paid`,[req.params.id,tenant(req)]);res.json({supplier:s.rows[0],purchased:q.rows[0].purchased,paid:q.rows[0].paid,balance:(Number(q.rows[0].purchased)-Number(q.rows[0].paid)).toFixed(2)});}));

app.get('/health',(req,res)=>res.json({ok:true,service:'Pharma Business API'}));
const loginAttempts = new Map();
app.post('/api/auth/login',(req,res,next)=>{
 const key=req.ip, now=Date.now(), entry=loginAttempts.get(key)||{count:0,until:now+60000};
 if(now>entry.until){entry.count=0;entry.until=now+60000;}
 if(entry.count>=12)return res.status(429).json({error:'Juda ko‘p urinish. Bir daqiqadan keyin qayta urinib ko‘ring.'});
 entry.count++;loginAttempts.set(key,entry);next();
},asyncRoute(async(req,res)=>{
 const s=z.object({email:z.string().email(),password:z.string().min(1)}).safeParse(req.body); if(!s.success) return res.status(400).json({error:'Email va parolni tekshiring'});
 const q=await pool.query('SELECT * FROM users WHERE lower(email)=lower($1)',[s.data.email]); const u=q.rows[0];
 if(!u || !u.active || !(await bcrypt.compare(s.data.password,u.password_hash))) return res.status(401).json({error:'Email yoki parol noto‘g‘ri'});
 res.json({token:sign(u),user:{id:u.id,companyId:u.company_id,name:u.full_name,email:u.email,role:u.role}});
}));
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));
// Self-service company onboarding: creates a company and its first administrator atomically.
app.post('/api/auth/register-company',asyncRoute(async(req,res)=>{
 const parsed=z.object({companyName:z.string().trim().min(2).max(120),adminName:z.string().trim().min(2).max(120),email:z.string().email().max(254),password:z.string().min(10).max(128)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Firma nomi, administrator ismi, email va kamida 10 belgili parol kiriting'});
 const d=parsed.data, cx=await pool.connect();
 try{
  await cx.query('BEGIN');
  const c=await cx.query("INSERT INTO companies(name,license_key,plan,status,trial_ends_at) VALUES($1,$2,'trial','trial',now()+interval '14 days') RETURNING id,name,license_key,plan,status,trial_ends_at",[d.companyName,'PB-'+crypto.randomBytes(12).toString('hex').toUpperCase()]);
  const hash=await bcrypt.hash(d.password,12);
  const u=await cx.query("INSERT INTO users(company_id,full_name,email,password_hash,role) VALUES($1,$2,lower($3),$4,'company_admin') RETURNING id,company_id,full_name,email,role",[c.rows[0].id,d.adminName,d.email,hash]);
  await cx.query('COMMIT');
  res.status(201).json({message:'Firma ro‘yxatdan o‘tdi. 14 kunlik sinov muddati boshlandi.',company:c.rows[0],user:{id:u.rows[0].id,name:u.rows[0].full_name,email:u.rows[0].email,role:u.rows[0].role},token:sign(u.rows[0])});
 }catch(e){await cx.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({error:'Bu email avval ro‘yxatdan o‘tgan'});throw e;}finally{cx.release();}
}));
app.get('/api/company/subscription',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const q=await pool.query('SELECT id,name,license_key,plan,status,trial_ends_at,subscription_ends_at,created_at,b2b_visible FROM companies WHERE id=$1',[tenant(req)]);
 if(!q.rowCount)return res.status(404).json({error:'Firma topilmadi'});
 const c=q.rows[0];const end=c.subscription_ends_at||c.trial_ends_at;
 res.json({...c,daysRemaining:end?Math.max(0,Math.ceil((new Date(end)-Date.now())/86400000)):null});
}));
// v16 platform overview. Protected by server-side bootstrap secret; never expose this secret in the public app.
app.get('/api/platform/overview',asyncRoute(async(req,res)=>{
 if(!process.env.BOOTSTRAP_SECRET || req.headers['x-bootstrap-secret']!==process.env.BOOTSTRAP_SECRET)return res.status(403).json({error:'Platform operator ruxsati kerak'});
 const [companies,users,products,orders,revenue,plans,recent]=await Promise.all([
  pool.query('SELECT count(*)::int total,count(*) FILTER(WHERE status=\'active\')::int active,count(*) FILTER(WHERE status=\'trial\')::int trial,count(*) FILTER(WHERE status IN (\'suspended\',\'expired\'))::int restricted FROM companies'),
  pool.query('SELECT count(*)::int total,count(*) FILTER(WHERE active)::int active FROM users'),
  pool.query('SELECT count(*)::int total FROM products'),
  pool.query("SELECT count(*)::int total FROM orders WHERE status<> 'cancelled'"),
  pool.query("SELECT COALESCE(sum(total),0)::numeric(18,2) total FROM orders WHERE status<>'cancelled' AND created_at>=date_trunc('month',now())"),
  pool.query('SELECT plan,status,count(*)::int count FROM companies GROUP BY plan,status ORDER BY plan,status'),
  pool.query('SELECT id,name,plan,status,created_at FROM companies ORDER BY created_at DESC LIMIT 10')
 ]);
 res.json({companies:companies.rows[0],users:users.rows[0],products:products.rows[0].total,orders:orders.rows[0].total,monthSales:revenue.rows[0].total,plans:plans.rows,recentCompanies:recent.rows});
}));
// v19 platform finance analytics: manual subscription receipts and subscription status.
app.get('/api/platform/finance',asyncRoute(async(req,res)=>{
 if(!process.env.BOOTSTRAP_SECRET || req.headers['x-bootstrap-secret']!==process.env.BOOTSTRAP_SECRET)return res.status(403).json({error:'Platform operator ruxsati kerak'});
 const [totals,monthly,companies]=await Promise.all([
  pool.query(`SELECT COALESCE(SUM(amount),0)::numeric(18,2) lifetime,
   COALESCE(SUM(amount) FILTER(WHERE paid_at>=date_trunc('month',now())),0)::numeric(18,2) month,
   COALESCE(SUM(amount) FILTER(WHERE paid_at>=date_trunc('year',now())),0)::numeric(18,2) year,
   COUNT(*)::int payments_count FROM platform_subscription_payments`),
  pool.query(`SELECT to_char(m.month,'YYYY-MM') month,COALESCE(SUM(p.amount),0)::numeric(18,2) amount
   FROM generate_series(date_trunc('month',now())-interval '11 months',date_trunc('month',now()),interval '1 month') m(month)
   LEFT JOIN platform_subscription_payments p ON p.paid_at>=m.month AND p.paid_at<m.month+interval '1 month'
   GROUP BY m.month ORDER BY m.month`),
  pool.query(`SELECT c.id,c.name,c.plan,c.status,COALESCE(c.subscription_ends_at,c.trial_ends_at) ends_at,
   CASE WHEN COALESCE(c.subscription_ends_at,c.trial_ends_at) IS NULL THEN NULL ELSE GREATEST(0,CEIL(EXTRACT(EPOCH FROM (COALESCE(c.subscription_ends_at,c.trial_ends_at)-now()))/86400))::int END days_remaining,
   COALESCE(SUM(p.amount),0)::numeric(18,2) total_paid,
   COALESCE(SUM(p.amount) FILTER(WHERE p.paid_at>=date_trunc('month',now())),0)::numeric(18,2) month_paid
   FROM companies c LEFT JOIN platform_subscription_payments p ON p.company_id=c.id
   GROUP BY c.id ORDER BY ends_at NULLS FIRST,c.name`)
 ]);
 res.json({totals:totals.rows[0],monthly:monthly.rows,companies:companies.rows});
}));
// Platform operator endpoint; secret must stay on the server and must never be embedded in the browser.
app.get('/api/platform/companies',asyncRoute(async(req,res)=>{
 if(!process.env.BOOTSTRAP_SECRET || req.headers['x-bootstrap-secret']!==process.env.BOOTSTRAP_SECRET)return res.status(403).json({error:'Platform operator ruxsati kerak'});
 const q=await pool.query('SELECT c.id,c.name,c.plan,c.status,c.trial_ends_at,c.subscription_ends_at,c.created_at,count(u.id)::int users FROM companies c LEFT JOIN users u ON u.company_id=c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500');res.json(q.rows);
}));
app.patch('/api/platform/companies/:id/subscription',asyncRoute(async(req,res)=>{
 if(!process.env.BOOTSTRAP_SECRET || req.headers['x-bootstrap-secret']!==process.env.BOOTSTRAP_SECRET)return res.status(403).json({error:'Platform operator ruxsati kerak'});
 const parsed=z.object({plan:z.enum(['trial','basic','standard','pro']),status:z.enum(['trial','active','suspended','expired']),days:z.coerce.number().int().min(0).max(3650)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Tarif, holat yoki muddat noto‘g‘ri'});
 const d=parsed.data,q=await pool.query("UPDATE companies SET plan=$1,status=$2,subscription_ends_at=CASE WHEN $2='active' THEN now()+($3::text||' days')::interval ELSE subscription_ends_at END WHERE id=$4 RETURNING id,name,plan,status,subscription_ends_at",[d.plan,d.status,d.days,req.params.id]);
 if(!q.rowCount)return res.status(404).json({error:'Firma topilmadi'});res.json(q.rows[0]);
}));
// v18 subscription payment ledger. Entries are manual records, not gateway confirmations.
app.get('/api/platform/payments',asyncRoute(async(req,res)=>{
 if(!process.env.BOOTSTRAP_SECRET || req.headers['x-bootstrap-secret']!==process.env.BOOTSTRAP_SECRET)return res.status(403).json({error:'Platform operator ruxsati kerak'});
 const q=await pool.query(`SELECT p.id,p.company_id,c.name company_name,p.amount,p.currency,p.method,p.reference,p.note,p.paid_at,p.created_at FROM platform_subscription_payments p JOIN companies c ON c.id=p.company_id ORDER BY p.paid_at DESC LIMIT 1000`);res.json(q.rows);
}));
app.post('/api/platform/payments',asyncRoute(async(req,res)=>{
 if(!process.env.BOOTSTRAP_SECRET || req.headers['x-bootstrap-secret']!==process.env.BOOTSTRAP_SECRET)return res.status(403).json({error:'Platform operator ruxsati kerak'});
 const parsed=z.object({companyId:z.string().uuid(),amount:z.coerce.number().positive().max(100000000000),method:z.enum(['cash','bank_transfer','card']),reference:z.string().trim().max(160).optional(),note:z.string().trim().max(1000).optional(),extendDays:z.coerce.number().int().min(0).max(3650).default(0),plan:z.enum(['basic','standard','pro']).optional()}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'To‘lov ma’lumotlarini tekshiring'});
 const d=parsed.data,cx=await pool.connect();
 try{await cx.query('BEGIN');const exists=await cx.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE',[d.companyId]);if(!exists.rowCount){await cx.query('ROLLBACK');return res.status(404).json({error:'Firma topilmadi'});}
 const payment=await cx.query(`INSERT INTO platform_subscription_payments(company_id,amount,method,reference,note) VALUES($1,$2,$3,$4,$5) RETURNING *`,[d.companyId,d.amount,d.method,d.reference||null,d.note||null]);
 let company=null;if(d.extendDays>0||d.plan){const fields=[],values=[];let i=1;if(d.plan){fields.push(`plan=$${i++}`);values.push(d.plan);}if(d.extendDays>0){fields.push(`subscription_ends_at=GREATEST(COALESCE(subscription_ends_at,trial_ends_at,now()),now())+($${i++}::text||' days')::interval`);values.push(d.extendDays);}fields.push("status='active'");values.push(d.companyId);const updated=await cx.query(`UPDATE companies SET ${fields.join(',')} WHERE id=$${i} RETURNING id,name,plan,status,subscription_ends_at`,values);company=updated.rows[0];}
 await cx.query('COMMIT');res.status(201).json({payment:payment.rows[0],company});
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
// Super-admin creates tenant and its first administrator. Protect this endpoint with a one-time bootstrap secret.
app.post('/api/platform/companies',asyncRoute(async(req,res)=>{
 if(!process.env.BOOTSTRAP_SECRET || req.headers['x-bootstrap-secret']!==process.env.BOOTSTRAP_SECRET) return res.status(403).json({error:'Platform bootstrap ruxsati kerak'});
 const s=z.object({companyName:z.string().min(2),adminName:z.string().min(2),email:z.string().email(),password:z.string().min(10)}).safeParse(req.body); if(!s.success) return res.status(400).json({error:'Kiritilgan ma’lumotlar noto‘g‘ri'});
 const c=await pool.query('INSERT INTO companies(name) VALUES($1) RETURNING id,name',[s.data.companyName]);
 try { const hash=await bcrypt.hash(s.data.password,12); const u=await pool.query("INSERT INTO users(company_id,full_name,email,password_hash,role) VALUES($1,$2,$3,$4,'company_admin') RETURNING id,email,role",[c.rows[0].id,s.data.adminName,s.data.email,hash]); res.status(201).json({company:c.rows[0],admin:u.rows[0]}); }
 catch(e){ await pool.query('DELETE FROM companies WHERE id=$1',[c.rows[0].id]); throw e; }
}));
// Company user administration. Only company administrators can manage staff accounts.
app.get('/api/users',auth,allow('company_admin'),asyncRoute(async(req,res)=>{
 const q=await pool.query('SELECT id,full_name,email,role,active,pharmacy_id,created_at FROM users WHERE company_id=$1 ORDER BY created_at DESC',[tenant(req)]);res.json(q.rows);
}));
app.post('/api/users',auth,allow('company_admin'),asyncRoute(async(req,res)=>{
 const parsed=z.object({fullName:z.string().trim().min(2).max(120),email:z.string().email().max(254),password:z.string().min(10).max(128),role:z.enum(['manager','sales','pharmacy']),pharmacyId:z.string().uuid().optional().nullable()}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Xodim ma’lumotlari noto‘g‘ri. Parol kamida 10 belgidan iborat bo‘lsin.'});
 const d=parsed.data;if(d.role==='pharmacy'&&!d.pharmacyId)return res.status(400).json({error:'Dorixona foydalanuvchisi uchun dorixonani tanlang'});
 if(d.pharmacyId){const ph=await pool.query('SELECT id FROM pharmacies WHERE id=$1 AND company_id=$2',[d.pharmacyId,tenant(req)]);if(!ph.rowCount)return res.status(404).json({error:'Dorixona topilmadi'});}
 const hash=await bcrypt.hash(d.password,12);
 try{const q=await pool.query('INSERT INTO users(company_id,full_name,email,password_hash,role,pharmacy_id) VALUES($1,$2,lower($3),$4,$5,$6) RETURNING id,full_name,email,role,active,pharmacy_id,created_at',[tenant(req),d.fullName,d.email,hash,d.role,d.pharmacyId||null]);res.status(201).json(q.rows[0]);}
 catch(e){if(e.code==='23505')return res.status(409).json({error:'Bu email allaqachon ishlatilmoqda'});throw e;}
}));
app.patch('/api/users/:id/active',auth,allow('company_admin'),asyncRoute(async(req,res)=>{
 const parsed=z.object({active:z.boolean()}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Faollik qiymati noto‘g‘ri'});
 if(req.params.id===req.user.id&&!parsed.data.active)return res.status(409).json({error:'O‘z hisobingizni o‘chira olmaysiz'});
 const q=await pool.query('UPDATE users SET active=$1 WHERE id=$2 AND company_id=$3 AND role<>$4 RETURNING id,full_name,email,role,active',[parsed.data.active,req.params.id,tenant(req),'company_admin']);
 if(!q.rowCount)return res.status(404).json({error:'Xodim topilmadi yoki administrator hisobini bu yerdan o‘zgartirib bo‘lmaydi'});res.json(q.rows[0]);
}));
app.get('/api/audit-logs',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const limit=Math.min(200,Math.max(1,Number(req.query.limit)||100));const q=await pool.query('SELECT a.id,a.action,a.resource,a.resource_id,a.http_status,a.ip_address,a.created_at,u.full_name,u.email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.company_id=$1 ORDER BY a.created_at DESC LIMIT $2',[tenant(req),limit]);res.json(q.rows);
}));
app.get('/api/products',auth,asyncRoute(async(req,res)=>{const q=await pool.query('SELECT p.*,COALESCE(s.qty,0) stock FROM products p LEFT JOIN (SELECT product_id,SUM(CASE WHEN movement_type=\'in\' THEN quantity WHEN movement_type=\'out\' THEN -quantity ELSE quantity END) qty FROM stock_movements WHERE company_id=$1 GROUP BY product_id) s ON s.product_id=p.id WHERE p.company_id=$1 ORDER BY p.name',[tenant(req)]);res.json(q.rows);}));
app.post('/api/products',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{const s=z.object({sku:z.string().optional(),barcode:z.string().trim().max(64).optional(),name:z.string().min(1),manufacturer:z.string().optional(),unit:z.string().default('dona'),purchasePrice:z.coerce.number().min(0),salePrice:z.coerce.number().min(0)}).safeParse(req.body);if(!s.success)return res.status(400).json({error:'Mahsulot ma’lumotlari noto‘g‘ri'});const d=s.data;try{const q=await pool.query('INSERT INTO products(company_id,sku,barcode,name,manufacturer,unit,purchase_price,sale_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[tenant(req),d.sku||null,d.barcode||null,d.name,d.manufacturer||null,d.unit,d.purchasePrice,d.salePrice]);res.status(201).json(q.rows[0]);}catch(e){if(e.code==='23505')return res.status(409).json({error:'Bu SKU yoki shtrix-kod avval kiritilgan'});throw e;}}));
// v15: bulk product import in bounded batches; the overall catalogue has no product-count cap.
app.post('/api/products/import',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({items:z.array(z.object({sku:z.string().max(100).optional(),barcode:z.string().max(64).optional(),name:z.string().trim().min(1).max(240),manufacturer:z.string().max(240).optional(),unit:z.string().max(40).default('dona'),purchasePrice:z.coerce.number().min(0),salePrice:z.coerce.number().min(0)})).min(1).max(500)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Bir import paketida 1 dan 500 tagacha to‘g‘ri mahsulot yuboring'});
 const cx=await pool.connect();let added=0,skipped=0;
 try{await cx.query('BEGIN');for(const d of parsed.data.items){try{await cx.query('INSERT INTO products(company_id,sku,barcode,name,manufacturer,unit,purchase_price,sale_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[tenant(req),d.sku||null,d.barcode||null,d.name,d.manufacturer||null,d.unit||'dona',d.purchasePrice,d.salePrice]);added++;}catch(e){if(e.code==='23505'){skipped++;continue;}throw e;}}await cx.query('COMMIT');res.status(201).json({added,skipped,batchSize:parsed.data.items.length,message:'Import paketi yakunlandi'});}catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.get('/api/products/barcode/:code',auth,asyncRoute(async(req,res)=>{const code=String(req.params.code||'').trim().slice(0,64);if(!code)return res.status(400).json({error:'Shtrix-kod kiritilmadi'});const q=await pool.query('SELECT id,sku,barcode,name,manufacturer,unit,sale_price FROM products WHERE company_id=$1 AND barcode=$2',[tenant(req),code]);if(!q.rowCount)return res.status(404).json({error:'Bu shtrix-kod bo‘yicha mahsulot topilmadi'});res.json(q.rows[0]);}));
app.get('/api/pharmacies',auth,asyncRoute(async(req,res)=>{const q=req.user.role==='pharmacy'?await pool.query('SELECT * FROM pharmacies WHERE company_id=$1 AND id=$2',[tenant(req),req.user.pharmacy_id]):await pool.query('SELECT * FROM pharmacies WHERE company_id=$1 ORDER BY name',[tenant(req)]);res.json(q.rows);}));
app.post('/api/pharmacies',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{const s=z.object({name:z.string().min(1),contactName:z.string().optional(),phone:z.string().optional(),address:z.string().optional()}).safeParse(req.body);if(!s.success)return res.status(400).json({error:'Dorixona ma’lumotlari noto‘g‘ri'});const d=s.data;const q=await pool.query('INSERT INTO pharmacies(company_id,name,contact_name,phone,address) VALUES($1,$2,$3,$4,$5) RETURNING *',[tenant(req),d.name,d.contactName||null,d.phone||null,d.address||null]);res.status(201).json(q.rows[0]);}));
app.post('/api/stock/movements',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{const s=z.object({productId:z.string().uuid(),type:z.enum(['in','out','adjustment']),quantity:z.coerce.number().positive(),unitCost:z.coerce.number().min(0).default(0),reference:z.string().optional()}).safeParse(req.body);if(!s.success)return res.status(400).json({error:'Ombor harakati noto‘g‘ri'});const d=s.data;const p=await pool.query('SELECT id FROM products WHERE id=$1 AND company_id=$2',[d.productId,tenant(req)]);if(!p.rowCount)return res.status(404).json({error:'Mahsulot topilmadi'});if(d.type==='out'){const st=await pool.query("SELECT COALESCE(SUM(CASE WHEN movement_type='in' THEN quantity WHEN movement_type='out' THEN -quantity ELSE quantity END),0) qty FROM stock_movements WHERE company_id=$1 AND product_id=$2",[tenant(req),d.productId]);if(Number(st.rows[0].qty)<d.quantity)return res.status(409).json({error:'Omborda yetarli qoldiq yo‘q'});}const q=await pool.query('INSERT INTO stock_movements(company_id,product_id,movement_type,quantity,unit_cost,reference,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[tenant(req),d.productId,d.type,d.quantity,d.unitCost,d.reference||null,req.user.id]);res.status(201).json(q.rows[0]);}));
// v20: daily sales targets and employee performance, tenant-scoped.
app.get('/api/sales/performance',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const date=(typeof req.query.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date))?req.query.date:new Date().toISOString().slice(0,10);
 const own=req.user.role==='sales';
 const params=[tenant(req),date];
 let userFilter=''; if(own){params.push(req.user.id);userFilter=' AND u.id=$3';}
 const q=await pool.query(`SELECT u.id user_id,u.full_name,
 COALESCE(t.target_amount,0)::numeric(14,2) target_amount,
 COALESCE(SUM(o.total) FILTER (WHERE o.status<>'cancelled'),0)::numeric(14,2) actual_amount,
 COUNT(o.id) FILTER (WHERE o.status<>'cancelled')::int order_count
 FROM users u LEFT JOIN sales_targets t ON t.company_id=u.company_id AND t.user_id=u.id AND t.target_date=$2::date
 LEFT JOIN orders o ON o.company_id=u.company_id AND o.created_by=u.id AND o.created_at >= $2::date AND o.created_at < ($2::date + interval '1 day')
 WHERE u.company_id=$1 AND u.role='sales' AND u.active=true ${userFilter}
 GROUP BY u.id,u.full_name,t.target_amount ORDER BY actual_amount DESC,u.full_name`,params);
 const rows=q.rows.map(x=>({...x,progressPercent:Number(x.target_amount)>0?Math.round(Number(x.actual_amount)/Number(x.target_amount)*100):0}));
 res.json({date,employees:rows,totals:{target:rows.reduce((a,x)=>a+Number(x.target_amount),0),actual:rows.reduce((a,x)=>a+Number(x.actual_amount),0),orders:rows.reduce((a,x)=>a+x.order_count,0)}});
}));
app.post('/api/sales/targets',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({userId:z.string().uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),targetAmount:z.coerce.number().positive().max(999999999999)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Xodim, sana va musbat maqsad summasini tekshiring'});
 const d=parsed.data;const u=await pool.query("SELECT id FROM users WHERE id=$1 AND company_id=$2 AND role='sales' AND active=true",[d.userId,tenant(req)]);
 if(!u.rowCount)return res.status(404).json({error:'Faol savdo vakili topilmadi'});
 const q=await pool.query(`INSERT INTO sales_targets(company_id,user_id,target_date,target_amount,created_by) VALUES($1,$2,$3::date,$4,$5)
 ON CONFLICT(company_id,user_id,target_date) DO UPDATE SET target_amount=EXCLUDED.target_amount,created_by=EXCLUDED.created_by,updated_at=now() RETURNING *`,[tenant(req),d.userId,d.date,d.targetAmount,req.user.id]);res.status(201).json(q.rows[0]);
}));

// v21: monthly sales plans, estimated commission and target-based bonus.
app.get('/api/sales/monthly-performance',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const month=(typeof req.query.month==='string' && /^\d{4}-\d{2}$/.test(req.query.month))?req.query.month:new Date().toISOString().slice(0,7);
 const own=req.user.role==='sales'; const params=[tenant(req),month+'-01']; let filter=''; if(own){params.push(req.user.id);filter=' AND u.id=$3';}
 const q=await pool.query(`SELECT u.id user_id,u.full_name,COALESCE(p.target_amount,0)::numeric(14,2) target_amount,
 COALESCE(p.commission_percent,0)::numeric(5,2) commission_percent,COALESCE(p.bonus_amount,0)::numeric(14,2) bonus_amount,
 COALESCE(p.bonus_threshold_percent,100)::numeric(5,2) bonus_threshold_percent,
 COALESCE(SUM(o.total) FILTER (WHERE o.status<>'cancelled'),0)::numeric(14,2) actual_amount,
 COUNT(o.id) FILTER (WHERE o.status<>'cancelled')::int order_count
 FROM users u LEFT JOIN sales_monthly_plans p ON p.company_id=u.company_id AND p.user_id=u.id AND p.month_start=$2::date
 LEFT JOIN orders o ON o.company_id=u.company_id AND o.created_by=u.id AND o.created_at >= $2::date AND o.created_at < ($2::date + interval '1 month')
 WHERE u.company_id=$1 AND u.role='sales' AND u.active=true ${filter}
 GROUP BY u.id,u.full_name,p.target_amount,p.commission_percent,p.bonus_amount,p.bonus_threshold_percent
 ORDER BY actual_amount DESC,u.full_name`,params);
 const employees=q.rows.map(x=>{const target=Number(x.target_amount),actual=Number(x.actual_amount),progress=target?actual/target*100:0;const commission=actual*(Number(x.commission_percent)/100);const bonus=target&&progress>=Number(x.bonus_threshold_percent)?Number(x.bonus_amount):0;return {...x,progressPercent:Math.round(progress),estimatedCommission:Math.round(commission*100)/100,earnedBonus:bonus,estimatedPayout:Math.round((commission+bonus)*100)/100};});
 res.json({month,employees,totals:{target:employees.reduce((a,x)=>a+Number(x.target_amount),0),actual:employees.reduce((a,x)=>a+Number(x.actual_amount),0),commission:employees.reduce((a,x)=>a+x.estimatedCommission,0),bonus:employees.reduce((a,x)=>a+x.earnedBonus,0),orders:employees.reduce((a,x)=>a+x.order_count,0)}});
}));
app.post('/api/sales/monthly-plans',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({userId:z.string().uuid(),month:z.string().regex(/^\d{4}-\d{2}$/),targetAmount:z.coerce.number().positive().max(999999999999),commissionPercent:z.coerce.number().min(0).max(100).default(0),bonusAmount:z.coerce.number().min(0).max(999999999999).default(0),bonusThresholdPercent:z.coerce.number().min(0).max(1000).default(100)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Oylik reja va rag‘batlantirish qiymatlarini tekshiring'});
 const d=parsed.data;const u=await pool.query("SELECT id FROM users WHERE id=$1 AND company_id=$2 AND role='sales' AND active=true",[d.userId,tenant(req)]);if(!u.rowCount)return res.status(404).json({error:'Faol savdo vakili topilmadi'});
 const q=await pool.query(`INSERT INTO sales_monthly_plans(company_id,user_id,month_start,target_amount,commission_percent,bonus_amount,bonus_threshold_percent,created_by) VALUES($1,$2,$3::date,$4,$5,$6,$7,$8)
 ON CONFLICT(company_id,user_id,month_start) DO UPDATE SET target_amount=EXCLUDED.target_amount,commission_percent=EXCLUDED.commission_percent,bonus_amount=EXCLUDED.bonus_amount,bonus_threshold_percent=EXCLUDED.bonus_threshold_percent,created_by=EXCLUDED.created_by,updated_at=now() RETURNING *`,[tenant(req),d.userId,d.month+'-01',d.targetAmount,d.commissionPercent,d.bonusAmount,d.bonusThresholdPercent,req.user.id]);res.status(201).json(q.rows[0]);
}));

app.get('/api/orders',auth,asyncRoute(async(req,res)=>{const q=req.user.role==='pharmacy'?await pool.query('SELECT o.*,p.name pharmacy_name,COALESCE((SELECT SUM(amount) FROM payments pay WHERE pay.order_id=o.id),0) paid FROM orders o JOIN pharmacies p ON p.id=o.pharmacy_id WHERE o.company_id=$1 AND o.pharmacy_id=$2 ORDER BY o.created_at DESC LIMIT 500',[tenant(req),req.user.pharmacy_id]):await pool.query('SELECT o.*,p.name pharmacy_name,COALESCE((SELECT SUM(amount) FROM payments pay WHERE pay.order_id=o.id),0) paid FROM orders o JOIN pharmacies p ON p.id=o.pharmacy_id WHERE o.company_id=$1 ORDER BY o.created_at DESC LIMIT 500',[tenant(req)]);res.json(q.rows);}));
app.post('/api/orders',auth,allow('company_admin','manager','sales','pharmacy'),asyncRoute(async(req,res)=>{
 const s=z.object({pharmacyId:z.string().uuid(),paymentType:z.enum(['cash','credit','transfer']),note:z.string().max(2000).optional(),idempotencyKey:z.string().uuid().optional(),items:z.array(z.object({productId:z.string().uuid(),quantity:z.coerce.number().positive(),unitPrice:z.coerce.number().min(0)})).min(1)}).safeParse(req.body);
 if(!s.success)return res.status(400).json({error:'Buyurtma ma’lumotlari noto‘g‘ri'});
 const d=s.data;
 if(req.user.role==='pharmacy' && String(d.pharmacyId)!==String(req.user.pharmacy_id))return res.status(403).json({error:'Faqat biriktirilgan dorixona nomidan buyurtma berishingiz mumkin'});
 const cx=await pool.connect();
 try{
  await cx.query('BEGIN');
  if(d.idempotencyKey){const prior=await cx.query('SELECT * FROM orders WHERE company_id=$1 AND idempotency_key=$2',[tenant(req),d.idempotencyKey]);if(prior.rowCount){await cx.query('COMMIT');return res.status(200).json({...prior.rows[0],duplicate:true});}}
  const ph=await cx.query('SELECT id FROM pharmacies WHERE id=$1 AND company_id=$2',[d.pharmacyId,tenant(req)]);if(!ph.rowCount)throw Object.assign(new Error('Dorixona topilmadi'),{status:404});
  let total=0;for(const i of d.items){const p=await cx.query('SELECT id FROM products WHERE id=$1 AND company_id=$2',[i.productId,tenant(req)]);if(!p.rowCount)throw Object.assign(new Error('Mahsulot topilmadi'),{status:404});total+=i.quantity*i.unitPrice;}
  const o=await cx.query('INSERT INTO orders(company_id,pharmacy_id,payment_type,total,note,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(company_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING *',[tenant(req),d.pharmacyId,d.paymentType,total,d.note||null,req.user.id,d.idempotencyKey||null]);
  if(!o.rowCount){const prior=await cx.query('SELECT * FROM orders WHERE company_id=$1 AND idempotency_key=$2',[tenant(req),d.idempotencyKey]);await cx.query('COMMIT');return res.status(200).json({...prior.rows[0],duplicate:true});}
  for(const i of d.items)await cx.query('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',[o.rows[0].id,i.productId,i.quantity,i.unitPrice]);
  if(d.paymentType!=='credit'&&total>0)await cx.query('INSERT INTO payments(company_id,pharmacy_id,order_id,amount,method,note,received_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[tenant(req),d.pharmacyId,o.rows[0].id,total,d.paymentType==='cash'?'cash':'transfer','Buyurtma yaratilganda qabul qilindi',req.user.id]);
  await cx.query('COMMIT');res.status(201).json(o.rows[0]);
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.get('/api/payments',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{const q=await pool.query('SELECT pay.*,ph.name pharmacy_name FROM payments pay JOIN pharmacies ph ON ph.id=pay.pharmacy_id WHERE pay.company_id=$1 ORDER BY pay.created_at DESC LIMIT 500',[tenant(req)]);res.json(q.rows)}));
app.post('/api/payments',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{const s=z.object({pharmacyId:z.string().uuid(),orderId:z.string().uuid().optional(),amount:z.coerce.number().positive(),method:z.enum(['cash','transfer']),note:z.string().optional()}).safeParse(req.body);if(!s.success)return res.status(400).json({error:'To‘lov ma’lumotlari noto‘g‘ri'});const d=s.data;if(req.user.role==='pharmacy' && String(d.pharmacyId)!==String(req.user.pharmacy_id))return res.status(403).json({error:'Faqat biriktirilgan dorixona nomidan buyurtma berishingiz mumkin'});const cx=await pool.connect();try{await cx.query('BEGIN');const ph=await cx.query('SELECT id FROM pharmacies WHERE id=$1 AND company_id=$2',[d.pharmacyId,tenant(req)]);if(!ph.rowCount)throw Object.assign(new Error('Dorixona topilmadi'),{status:404});if(d.orderId){const o=await cx.query("SELECT id,total FROM orders WHERE id=$1 AND company_id=$2 AND pharmacy_id=$3 AND status<>'cancelled' FOR UPDATE",[d.orderId,tenant(req),d.pharmacyId]);if(!o.rowCount)throw Object.assign(new Error('Buyurtma topilmadi'),{status:404});const paid=await cx.query('SELECT COALESCE(SUM(amount),0) amount FROM payments WHERE order_id=$1',[d.orderId]);const due=Number(o.rows[0].total)-Number(paid.rows[0].amount);if(d.amount>due+0.001)throw Object.assign(new Error('To‘lov qoldiq qarzdan ko‘p bo‘lishi mumkin emas'),{status:409});}const q=await cx.query('INSERT INTO payments(company_id,pharmacy_id,order_id,amount,method,note,received_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[tenant(req),d.pharmacyId,d.orderId||null,d.amount,d.method,d.note||null,req.user.id]);await cx.query('COMMIT');res.status(201).json(q.rows[0]);}catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}}));
app.get('/api/reports/summary',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{const id=tenant(req);const [products,pharmacies,orders,debt,stock]=await Promise.all([pool.query('SELECT count(*)::int n FROM products WHERE company_id=$1',[id]),pool.query('SELECT count(*)::int n FROM pharmacies WHERE company_id=$1',[id]),pool.query("SELECT count(*)::int n,COALESCE(sum(total),0) total FROM orders WHERE company_id=$1 AND status<>'cancelled' AND created_at>=date_trunc('month',now())",[id]),pool.query("SELECT COALESCE(sum(o.total),0)-COALESCE(sum(x.paid),0) debt FROM orders o LEFT JOIN (SELECT order_id,sum(amount) paid FROM payments WHERE company_id=$1 GROUP BY order_id) x ON x.order_id=o.id WHERE o.company_id=$1 AND o.payment_type='credit' AND o.status<>'cancelled'",[id]),pool.query("SELECT COALESCE(sum(CASE WHEN movement_type='in' THEN quantity WHEN movement_type='out' THEN -quantity ELSE quantity END),0) quantity FROM stock_movements WHERE company_id=$1",[id])]);res.json({products:+products.rows[0].n,pharmacies:+pharmacies.rows[0].n,monthOrders:+orders.rows[0].n,monthSales:orders.rows[0].total,debt:debt.rows[0].debt,netStock:stock.rows[0].quantity});}));

// v22 inventory lots: quantities are derived from movements linked to each batch.
app.get('/api/inventory/batches',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT b.*,p.name product_name,p.sku,p.unit,
 COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity WHEN sm.movement_type='out' THEN -sm.quantity ELSE sm.quantity END),b.received_quantity) remaining_quantity,
 (b.expiry_date-current_date) days_to_expiry
 FROM inventory_batches b JOIN products p ON p.id=b.product_id
 LEFT JOIN stock_movements sm ON sm.batch_id=b.id
 WHERE b.company_id=$1 GROUP BY b.id,p.name,p.sku,p.unit ORDER BY b.expiry_date,b.batch_number`,[tenant(req)]);
 res.json(q.rows.map(r=>({...r,expiry_status:new Date(r.expiry_date+'T00:00:00')<new Date(new Date().toDateString())?'expired':Number(r.days_to_expiry)<=30?'near':'ok'})));
}));
app.get('/api/inventory/expiry-alerts',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const days=Math.min(365,Math.max(1,Number(req.query.days)||90));
 const q=await pool.query(`SELECT b.id,b.batch_number,b.expiry_date,p.name product_name,p.sku,
 COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity WHEN sm.movement_type='out' THEN -sm.quantity ELSE 0 END),b.received_quantity) remaining_quantity,
 (b.expiry_date-current_date) days_to_expiry
 FROM inventory_batches b JOIN products p ON p.id=b.product_id LEFT JOIN stock_movements sm ON sm.batch_id=b.id
 WHERE b.company_id=$1 AND b.expiry_date<=current_date+$2::int
 GROUP BY b.id,p.name,p.sku HAVING COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity WHEN sm.movement_type='out' THEN -sm.quantity ELSE 0 END),b.received_quantity)>0
 ORDER BY b.expiry_date`,[tenant(req),days]);res.json(q.rows);
}));
app.post('/api/inventory/batches',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({productId:z.string().uuid(),batchNumber:z.string().trim().min(1).max(100),manufactureDate:z.string().optional().or(z.literal('')),expiryDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),quantity:z.coerce.number().positive(),unitCost:z.coerce.number().min(0).default(0),supplierName:z.string().max(200).optional(),note:z.string().max(1000).optional()}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Partiya, yaroqlilik sanasi va miqdorni tekshiring'});
 const d=parsed.data;if(d.expiryDate<new Date().toISOString().slice(0,10))return res.status(400).json({error:'Yaroqlilik muddati o‘tgan partiyani kirim qilib bo‘lmaydi'});
 if(d.manufactureDate&&d.manufactureDate>d.expiryDate)return res.status(400).json({error:'Ishlab chiqarilgan sana yaroqlilik sanasidan keyin bo‘lishi mumkin emas'});
 const cx=await pool.connect();try{await cx.query('BEGIN');const p=await cx.query('SELECT id FROM products WHERE id=$1 AND company_id=$2',[d.productId,tenant(req)]);if(!p.rowCount)throw Object.assign(new Error('Mahsulot topilmadi'),{status:404});
 const b=await cx.query(`INSERT INTO inventory_batches(company_id,product_id,batch_number,manufacture_date,expiry_date,received_quantity,unit_cost,supplier_name,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[tenant(req),d.productId,d.batchNumber,d.manufactureDate||null,d.expiryDate,d.quantity,d.unitCost,d.supplierName||null,d.note||null,req.user.id]);
 await cx.query(`INSERT INTO stock_movements(company_id,product_id,movement_type,quantity,unit_cost,reference,created_by,batch_id) VALUES($1,$2,'in',$3,$4,$5,$6,$7)`,[tenant(req),d.productId,d.quantity,d.unitCost,`BATCH:${d.batchNumber}`,req.user.id,b.rows[0].id]);await cx.query('COMMIT');res.status(201).json(b.rows[0]);
 }catch(e){await cx.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({error:'Bu mahsulot uchun partiya raqami avval kiritilgan'});throw e;}finally{cx.release();}
}));

// Inventory balance endpoint: per-product quantities for the signed-in company.
app.get('/api/stock',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT p.id product_id,p.sku,p.name,p.unit,
 COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity WHEN sm.movement_type='out' THEN -sm.quantity ELSE sm.quantity END),0) quantity
 FROM products p LEFT JOIN stock_movements sm ON sm.product_id=p.id AND sm.company_id=p.company_id
 WHERE p.company_id=$1 GROUP BY p.id ORDER BY p.name`,[tenant(req)]);
 res.json(q.rows);
}));
// Order detail endpoint, always scoped to the user's company.
app.get('/api/orders/:id',auth,asyncRoute(async(req,res)=>{
 const q=req.user.role==='pharmacy'?await pool.query(`SELECT o.*,p.name pharmacy_name FROM orders o JOIN pharmacies p ON p.id=o.pharmacy_id WHERE o.id=$1 AND o.company_id=$2 AND o.pharmacy_id=$3`,[req.params.id,tenant(req),req.user.pharmacy_id]):await pool.query(`SELECT o.*,p.name pharmacy_name FROM orders o JOIN pharmacies p ON p.id=o.pharmacy_id WHERE o.id=$1 AND o.company_id=$2`,[req.params.id,tenant(req)]);
 if(!q.rowCount)return res.status(404).json({error:'Buyurtma topilmadi'});
 const items=await pool.query(`SELECT oi.*,p.name product_name,p.sku FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=$1 ORDER BY p.name`,[req.params.id]);
 const payments=await pool.query('SELECT id,amount,method,note,created_at FROM payments WHERE order_id=$1 AND company_id=$2 ORDER BY created_at',[req.params.id,tenant(req)]);
 res.json({order:q.rows[0],items:items.rows,payments:payments.rows});
}));
// Status transitions are serialized with a row lock. Stock is deducted exactly once when shipped.
app.patch('/api/orders/:id/status',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({status:z.enum(['confirmed','shipped','completed','cancelled'])}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Buyurtma holati noto‘g‘ri'});
 const cx=await pool.connect();
 try{
  await cx.query('BEGIN');
  const oq=await cx.query('SELECT * FROM orders WHERE id=$1 AND company_id=$2 FOR UPDATE',[req.params.id,tenant(req)]);
  if(!oq.rowCount)throw Object.assign(new Error('Buyurtma topilmadi'),{status:404});
  const order=oq.rows[0], next=parsed.data.status;
  const allowed={new:['confirmed','cancelled'],confirmed:['shipped','cancelled'],shipped:['completed'],completed:[],cancelled:[]};
  if(!allowed[order.status].includes(next))throw Object.assign(new Error(`Holatni ${order.status} dan ${next} ga o‘zgartirib bo‘lmaydi`),{status:409});
  if(next==='shipped'){
   const items=await cx.query('SELECT product_id,SUM(quantity)::numeric quantity FROM order_items WHERE order_id=$1 GROUP BY product_id',[order.id]);
   for(const item of items.rows){
    const pq=await cx.query('SELECT id FROM products WHERE id=$1 AND company_id=$2 FOR UPDATE',[item.product_id,tenant(req)]);
    if(!pq.rowCount)throw Object.assign(new Error('Buyurtmadagi mahsulot topilmadi'),{status:409});
    const batches=await cx.query(`SELECT b.id,b.batch_number,b.expiry_date,b.unit_cost,
      COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity WHEN sm.movement_type='out' THEN -sm.quantity ELSE 0 END),b.received_quantity) remaining
      FROM inventory_batches b LEFT JOIN stock_movements sm ON sm.batch_id=b.id
      WHERE b.company_id=$1 AND b.product_id=$2 GROUP BY b.id
      HAVING COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity WHEN sm.movement_type='out' THEN -sm.quantity ELSE 0 END),b.received_quantity)>0
      ORDER BY b.expiry_date,b.created_at,b.batch_number FOR UPDATE OF b`,[tenant(req),item.product_id]);
    if(batches.rowCount){
      let left=Number(item.quantity);
      const eligible=batches.rows.filter(b=>String(b.expiry_date).slice(0,10)>=new Date().toISOString().slice(0,10));
      const available=eligible.reduce((a,b)=>a+Number(b.remaining),0);
      if(available+0.000001<left)throw Object.assign(new Error('Yaroqlilik muddati o‘tmagan partiyalarda yetarli qoldiq yo‘q'),{status:409});
      for(const b of eligible){if(left<=0.000001)break;const take=Math.min(left,Number(b.remaining));
       const mv=await cx.query("INSERT INTO stock_movements(company_id,product_id,movement_type,quantity,unit_cost,reference,created_by,batch_id) VALUES($1,$2,'out',$3,$4,$5,$6,$7) RETURNING id",[tenant(req),item.product_id,take,b.unit_cost,`ORDER:${order.id}:FEFO:${b.batch_number}`,req.user.id,b.id]);
       await cx.query('INSERT INTO order_batch_allocations(order_id,product_id,batch_id,quantity,movement_id) VALUES($1,$2,$3,$4,$5)',[order.id,item.product_id,b.id,take,mv.rows[0].id]);left-=take;
      }
    }else{
      const sq=await cx.query("SELECT COALESCE(SUM(CASE WHEN movement_type='in' THEN quantity WHEN movement_type='out' THEN -quantity ELSE quantity END),0) qty FROM stock_movements WHERE company_id=$1 AND product_id=$2 AND batch_id IS NULL",[tenant(req),item.product_id]);
      if(Number(sq.rows[0].qty)<Number(item.quantity))throw Object.assign(new Error('Omborda yetarli qoldiq yo‘q'),{status:409});
      await cx.query("INSERT INTO stock_movements(company_id,product_id,movement_type,quantity,unit_cost,reference,created_by) VALUES($1,$2,'out',$3,0,$4,$5)",[tenant(req),item.product_id,item.quantity,`ORDER:${order.id}`,req.user.id]);
    }
   }
  }
  const updated=await cx.query("UPDATE orders SET status=$1, shipped_at=CASE WHEN $1='shipped' THEN now() ELSE shipped_at END, delivered_at=CASE WHEN $1='completed' THEN now() ELSE delivered_at END WHERE id=$2 RETURNING *",[next,order.id]);
  await cx.query('COMMIT');res.json(updated.rows[0]);
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
// v23: return goods against original FEFO allocations; expired lots are never re-stocked for sale.
app.post('/api/orders/:id/returns',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({productId:z.string().uuid(),quantity:z.coerce.number().positive(),reason:z.string().trim().min(2).max(500)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Mahsulot, qaytarish miqdori va sababini kiriting'});
 const d=parsed.data,cx=await pool.connect();
 try{await cx.query('BEGIN');
  const oq=await cx.query("SELECT id,status FROM orders WHERE id=$1 AND company_id=$2 FOR UPDATE",[req.params.id,tenant(req)]);
  if(!oq.rowCount)throw Object.assign(new Error('Buyurtma topilmadi'),{status:404});
  if(!['shipped','completed'].includes(oq.rows[0].status))throw Object.assign(new Error('Faqat jo‘natilgan yoki yakunlangan buyurtmadan qaytarish mumkin'),{status:409});
  const allocations=await cx.query(`SELECT a.id,a.batch_id,a.quantity,a.movement_id,b.batch_number,b.expiry_date,
   a.quantity-COALESCE((SELECT SUM(r.quantity) FROM order_batch_returns r WHERE r.allocation_id=a.id),0) remaining
   FROM order_batch_allocations a JOIN inventory_batches b ON b.id=a.batch_id
   WHERE a.order_id=$1 AND a.product_id=$2 ORDER BY b.expiry_date DESC FOR UPDATE OF a`,[req.params.id,d.productId]);
  if(!allocations.rowCount)throw Object.assign(new Error('Bu mahsulot uchun partiya taqsimoti topilmadi; eski partiyasiz zaxiraga qaytarish qo‘llanmaydi'),{status:409});
  const canReturn=allocations.rows.reduce((n,a)=>n+Number(a.remaining),0);
  if(d.quantity>canReturn+0.000001)throw Object.assign(new Error('Qaytarish miqdori jo‘natilgan qoldiqdan ko‘p'),{status:409});
  let left=d.quantity;const result=[];
  for(const a of allocations.rows){if(left<=0.000001)break;const take=Math.min(left,Number(a.remaining));if(take<=0)continue;
   await cx.query('INSERT INTO order_batch_returns(company_id,order_id,product_id,allocation_id,quantity,reason,received_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[tenant(req),req.params.id,d.productId,a.id,take,d.reason,req.user.id]);
   await cx.query("INSERT INTO stock_movements(company_id,product_id,movement_type,quantity,unit_cost,reference,created_by,batch_id) VALUES($1,$2,'in',$3,0,$4,$5,$6)",[tenant(req),d.productId,take,`RETURN:${req.params.id}:${a.batch_number}`,req.user.id,a.batch_id]);
   result.push({batchNumber:a.batch_number,quantity:take,expiryDate:a.expiry_date});left-=take;
  }
  await cx.query('COMMIT');res.status(201).json({returned:d.quantity,allocations:result,message:'Qaytarish omborga qabul qilindi; muddati o‘tgan partiya FEFO sotuviga kiritilmaydi'});
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.get('/api/orders/:id/returns',auth,allow('company_admin','manager','sales','pharmacy'),asyncRoute(async(req,res)=>{
 const o=await pool.query('SELECT id,pharmacy_id FROM orders WHERE id=$1 AND company_id=$2',[req.params.id,tenant(req)]);
 if(!o.rowCount)return res.status(404).json({error:'Buyurtma topilmadi'});
 if(req.user.role==='pharmacy'&&String(o.rows[0].pharmacy_id)!==String(req.user.pharmacy_id))return res.status(403).json({error:'Ruxsat yo‘q'});
 const q=await pool.query('SELECT r.*,b.batch_number,b.expiry_date,u.full_name received_by_name FROM order_batch_returns r JOIN order_batch_allocations a ON a.id=r.allocation_id JOIN inventory_batches b ON b.id=a.batch_id LEFT JOIN users u ON u.id=r.received_by WHERE r.order_id=$1 AND r.company_id=$2 ORDER BY r.created_at DESC',[req.params.id,tenant(req)]);res.json(q.rows);
}));

// v24: quarantine, write-off/release, and cash/transfer refund ledger.
app.get('/api/inventory/quarantine',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT q.*,p.name product_name,b.batch_number,b.expiry_date,u.full_name created_by_name
 FROM inventory_quarantine q JOIN products p ON p.id=q.product_id JOIN inventory_batches b ON b.id=q.batch_id
 LEFT JOIN users u ON u.id=q.created_by WHERE q.company_id=$1 ORDER BY q.created_at DESC LIMIT 1000`,[tenant(req)]);res.json(q.rows);
}));
app.post('/api/inventory/quarantine',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({batchId:z.string().uuid(),quantity:z.coerce.number().positive(),reason:z.string().trim().min(2).max(500)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Partiya, miqdor va karantin sababini kiriting'});
 const d=parsed.data,cx=await pool.connect();
 try{await cx.query('BEGIN');const b=await cx.query('SELECT id,product_id,expiry_date,batch_number FROM inventory_batches WHERE id=$1 AND company_id=$2 FOR UPDATE',[d.batchId,tenant(req)]);
 if(!b.rowCount)throw Object.assign(new Error('Partiya topilmadi'),{status:404});const stock=await cx.query("SELECT COALESCE(SUM(CASE WHEN movement_type='in' THEN quantity WHEN movement_type='out' THEN -quantity ELSE quantity END),0) qty FROM stock_movements WHERE company_id=$1 AND product_id=$2 AND batch_id=$3",[tenant(req),b.rows[0].product_id,d.batchId]);if(Number(stock.rows[0].qty)+0.000001<d.quantity)throw Object.assign(new Error('Partiyada karantinga ajratish uchun yetarli qoldiq yo‘q'),{status:409});
 const q=await cx.query(`INSERT INTO inventory_quarantine(company_id,product_id,batch_id,quantity,reason,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[tenant(req),b.rows[0].product_id,d.batchId,d.quantity,d.reason,req.user.id]);
 await cx.query("INSERT INTO stock_movements(company_id,product_id,movement_type,quantity,unit_cost,reference,created_by,batch_id) VALUES($1,$2,'out',$3,0,$4,$5,$6)",[tenant(req),b.rows[0].product_id,d.quantity,`QUARANTINE:${q.rows[0].id}`,req.user.id,d.batchId]);await cx.query('COMMIT');res.status(201).json(q.rows[0]);
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.post('/api/inventory/quarantine/:id/resolve',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({action:z.enum(['writeoff','release']),note:z.string().trim().max(500).optional()}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Hisobdan chiqarish yoki qaytarish amalini tanlang'});
 const cx=await pool.connect();try{await cx.query('BEGIN');const q=await cx.query(`SELECT q.*,b.expiry_date,b.batch_number FROM inventory_quarantine q JOIN inventory_batches b ON b.id=q.batch_id WHERE q.id=$1 AND q.company_id=$2 FOR UPDATE OF q`,[req.params.id,tenant(req)]);
 if(!q.rowCount)throw Object.assign(new Error('Karantin yozuvi topilmadi'),{status:404});if(q.rows[0].status!=='quarantined')throw Object.assign(new Error('Bu karantin yozuvi oldin hal qilingan'),{status:409});
 if(parsed.data.action==='release'){if(String(q.rows[0].expiry_date).slice(0,10)<new Date().toISOString().slice(0,10))throw Object.assign(new Error('Muddati o‘tgan mahsulotni sotiladigan omborga qaytarib bo‘lmaydi'),{status:409});await cx.query("INSERT INTO stock_movements(company_id,product_id,movement_type,quantity,unit_cost,reference,created_by,batch_id) VALUES($1,$2,'in',$3,0,$4,$5,$6)",[tenant(req),q.rows[0].product_id,q.rows[0].quantity,`QUARANTINE_RELEASE:${q.rows[0].id}`,req.user.id,q.rows[0].batch_id]);}
 const status=parsed.data.action==='writeoff'?'written_off':'released';const updated=await cx.query('UPDATE inventory_quarantine SET status=$1,resolved_by=$2,resolved_at=now(),resolution_note=$3 WHERE id=$4 RETURNING *',[status,req.user.id,parsed.data.note||null,req.params.id]);await cx.query('COMMIT');res.json(updated.rows[0]);
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.post('/api/orders/:id/refunds',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{
 const parsed=z.object({amount:z.coerce.number().positive(),method:z.enum(['cash','transfer']),reason:z.string().trim().min(2).max(500),reference:z.string().trim().max(160).optional()}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Qaytariladigan summa, usul va sababni kiriting'});
 const d=parsed.data,cx=await pool.connect();try{await cx.query('BEGIN');const o=await cx.query("SELECT id,pharmacy_id,total,status FROM orders WHERE id=$1 AND company_id=$2 FOR UPDATE",[req.params.id,tenant(req)]);if(!o.rowCount)throw Object.assign(new Error('Buyurtma topilmadi'),{status:404});if(o.rows[0].status==='cancelled')throw Object.assign(new Error('Bekor qilingan buyurtma uchun pul qaytarish mumkin emas'),{status:409});
 const sums=await cx.query('SELECT COALESCE((SELECT SUM(amount) FROM payments WHERE order_id=$1),0) paid,COALESCE((SELECT SUM(amount) FROM order_refunds WHERE order_id=$1),0) refunded',[req.params.id]);const refundable=Number(sums.rows[0].paid)-Number(sums.rows[0].refunded);if(d.amount>refundable+0.001)throw Object.assign(new Error(`Qaytarish summasi to‘langan qoldiqdan oshdi. Maksimum: ${Math.max(0,refundable).toFixed(2)} so‘m`),{status:409});
 const r=await cx.query('INSERT INTO order_refunds(company_id,order_id,pharmacy_id,amount,method,reason,reference,refunded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[tenant(req),req.params.id,o.rows[0].pharmacy_id,d.amount,d.method,d.reason,d.reference||null,req.user.id]);await cx.query('COMMIT');res.status(201).json({...r.rows[0],remainingRefundable:Math.round((refundable-d.amount)*100)/100});
 }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}));
app.get('/api/orders/:id/refunds',auth,allow('company_admin','manager','sales','pharmacy'),asyncRoute(async(req,res)=>{const o=await pool.query('SELECT id,pharmacy_id FROM orders WHERE id=$1 AND company_id=$2',[req.params.id,tenant(req)]);if(!o.rowCount)return res.status(404).json({error:'Buyurtma topilmadi'});if(req.user.role==='pharmacy'&&String(o.rows[0].pharmacy_id)!==String(req.user.pharmacy_id))return res.status(403).json({error:'Ruxsat yo‘q'});const q=await pool.query('SELECT r.*,u.full_name refunded_by_name FROM order_refunds r LEFT JOIN users u ON u.id=r.refunded_by WHERE r.order_id=$1 AND r.company_id=$2 ORDER BY r.created_at DESC',[req.params.id,tenant(req)]);res.json(q.rows);}));
app.get('/api/finance/refunds-summary',auth,allow('company_admin','manager'),asyncRoute(async(req,res)=>{const q=await pool.query(`SELECT COALESCE(SUM(amount),0) total_refunded,COUNT(*) refund_count,COALESCE(SUM(amount) FILTER(WHERE created_at>=date_trunc('month',now())),0) this_month FROM order_refunds WHERE company_id=$1`,[tenant(req)]);res.json(q.rows[0]);}));

// Delivery tracking: only the owning company and assigned pharmacy can view an order.
app.get('/api/deliveries',auth,asyncRoute(async(req,res)=>{
 const q=req.user.role==='pharmacy'
  ? await pool.query(`SELECT o.id,o.status,o.courier_name,o.tracking_code,o.delivery_note,o.shipped_at,o.delivered_at,o.created_at,p.name pharmacy_name FROM orders o JOIN pharmacies p ON p.id=o.pharmacy_id WHERE o.company_id=$1 AND o.pharmacy_id=$2 AND o.status IN ('shipped','completed') ORDER BY COALESCE(o.shipped_at,o.created_at) DESC LIMIT 300`,[tenant(req),req.user.pharmacy_id])
  : await pool.query(`SELECT o.id,o.status,o.courier_name,o.tracking_code,o.delivery_note,o.shipped_at,o.delivered_at,o.created_at,p.name pharmacy_name FROM orders o JOIN pharmacies p ON p.id=o.pharmacy_id WHERE o.company_id=$1 AND o.status IN ('shipped','completed') ORDER BY COALESCE(o.shipped_at,o.created_at) DESC LIMIT 300`,[tenant(req)]);
 res.json(q.rows);
}));
app.patch('/api/orders/:id/delivery',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const parsed=z.object({courierName:z.string().trim().max(160).optional(),trackingCode:z.string().trim().max(80).optional(),deliveryNote:z.string().trim().max(1000).optional()}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Yetkazib berish ma’lumotlari noto‘g‘ri'});
 const d=parsed.data;const q=await pool.query("UPDATE orders SET courier_name=$1,tracking_code=$2,delivery_note=$3 WHERE id=$4 AND company_id=$5 AND status IN ('shipped','completed') RETURNING id,status,courier_name,tracking_code,delivery_note,shipped_at,delivered_at",[d.courierName||null,d.trackingCode||null,d.deliveryNote||null,req.params.id,tenant(req)]);
 if(!q.rowCount)return res.status(404).json({error:'Jo‘natilgan buyurtma topilmadi'});res.json(q.rows[0]);
}));

// v11: consent-based, foreground GPS check-ins. No background location collection.
app.get('/api/visits',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const q=await pool.query(`SELECT v.id,v.latitude,v.longitude,v.accuracy_m,v.note,v.visited_at,p.name pharmacy_name,u.full_name staff_name
 FROM sales_visits v JOIN pharmacies p ON p.id=v.pharmacy_id JOIN users u ON u.id=v.user_id
 WHERE v.company_id=$1 AND ($2::text<>'sales' OR v.user_id=$3) ORDER BY v.visited_at DESC LIMIT 500`,[tenant(req),req.user.role,req.user.id]);res.json(q.rows);
}));
app.post('/api/visits',auth,allow('company_admin','manager','sales'),asyncRoute(async(req,res)=>{
 const parsed=z.object({pharmacyId:z.string().uuid(),latitude:z.coerce.number().min(-90).max(90),longitude:z.coerce.number().min(-180).max(180),accuracyM:z.coerce.number().min(0).max(100000).optional(),note:z.string().trim().max(1000).optional()}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Dorixona va GPS koordinatalarini tekshiring'});
 const d=parsed.data, ph=await pool.query('SELECT id FROM pharmacies WHERE id=$1 AND company_id=$2',[d.pharmacyId,tenant(req)]);
 if(!ph.rowCount)return res.status(404).json({error:'Dorixona topilmadi'});
 const q=await pool.query('INSERT INTO sales_visits(company_id,pharmacy_id,user_id,latitude,longitude,accuracy_m,note) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[tenant(req),d.pharmacyId,req.user.id,d.latitude,d.longitude,d.accuracyM??null,d.note||null]);res.status(201).json(q.rows[0]);
}));

// Company-scoped customer balance ledger.
app.get('/api/pharmacies/:id/balance',auth,asyncRoute(async(req,res)=>{
 const p=await pool.query('SELECT id,name FROM pharmacies WHERE id=$1 AND company_id=$2',[req.params.id,tenant(req)]);
 if(!p.rowCount)return res.status(404).json({error:'Dorixona topilmadi'});
 const q=await pool.query(`SELECT COALESCE((SELECT SUM(total) FROM orders WHERE company_id=$1 AND pharmacy_id=$2 AND status<>'cancelled'),0) sales,
 COALESCE((SELECT SUM(amount) FROM payments WHERE company_id=$1 AND pharmacy_id=$2),0) paid`,[tenant(req),req.params.id]);
 res.json({pharmacy:p.rows[0],sales:q.rows[0].sales,paid:q.rows[0].paid,balance:(Number(q.rows[0].sales)-Number(q.rows[0].paid)).toFixed(2)});
}));

app.use((err,req,res,next)=>{console.error(err);res.status(err.status||500).json({error:err.status?err.message:'Server xatoligi'});});
const port=Number(process.env.PORT||8080);app.listen(port,()=>console.log(`Pharma Business API listening on ${port}`));
