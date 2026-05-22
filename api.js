/**
 * 废墟计划 - 完整后端 API
 * Node.js + Express + MySQL2
 */
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'ruinxuji-huimiejihua-2026-secret-key';

// ============ MySQL 连接池 ============
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'angel_home_2024',
  database: process.env.DB_NAME || 'angel_home',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// ============ 工具函数 ============
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function nowBeijing() {
  const d = new Date();
  d.setHours(d.getHours() + 8);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function camelizeRow(row) {
  if (!row) return row;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// JWT 认证中间件
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token无效' });
  }
}

// 统一响应包装
function success(data, message) {
  return { success: true, data, message };
}
function error(message, code) {
  return { success: false, message, code };
}

// ============ 数据库初始化 ============
async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    // 用户表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(32) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(50) NOT NULL,
        roles JSON NOT NULL,
        phone VARCHAR(20),
        store_id VARCHAR(32),
        store_name VARCHAR(50),
        store_ids JSON,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 门店表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS stores (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(255),
        phone VARCHAR(20),
        rent DECIMAL(10,2) DEFAULT 0,
        commission_rate DECIMAL(5,2) DEFAULT 0,
        marketing_fee DECIMAL(10,2) DEFAULT 0,
        operating_cost DECIMAL(10,2) DEFAULT 0,
        manager VARCHAR(50),
        staff_user_id VARCHAR(32),
        status ENUM('active','inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 客服表（staff）
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS staff (
        id VARCHAR(32) PRIMARY KEY,
        user_id VARCHAR(32),
        name VARCHAR(50) NOT NULL,
        real_name VARCHAR(50),
        phone VARCHAR(20),
        id_card VARCHAR(20),
        gender ENUM('男','女'),
        age INT,
        home_address VARCHAR(255),
        resume TEXT,
        bank_card VARCHAR(30),
        emergency_contact VARCHAR(50),
        emergency_phone VARCHAR(20),
        entry_date DATE,
        store_id VARCHAR(32),
        store_ids JSON,
        status ENUM('active','inactive','busy') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 服务员表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS waiters (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        avatar VARCHAR(255),
        gender ENUM('男','女'),
        age INT,
        height VARCHAR(10),
        body_type VARCHAR(20),
        cup VARCHAR(10),
        personality VARCHAR(50),
        tags JSON,
        rating DECIMAL(3,2) DEFAULT 5.00,
        total_reviews INT DEFAULT 0,
        status ENUM('active','inactive','busy','rest') DEFAULT 'active',
        store_id VARCHAR(32),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 订单表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(32) PRIMARY KEY,
        order_no VARCHAR(30) UNIQUE,
        customer_name VARCHAR(50),
        phone VARCHAR(20),
        wechat VARCHAR(50),
        qq VARCHAR(20),
        address TEXT NOT NULL,
        location VARCHAR(100),
        preferences JSON,
        supplements JSON,
        notes TEXT,
        info_fee DECIMAL(10,2) DEFAULT 0,
        prepay_amount DECIMAL(10,2) DEFAULT 0,
        status ENUM('pending','assigned','departed','arrived','serving','completed','rated','rejected','cancelled') DEFAULT 'pending',
        store_id VARCHAR(32),
        store_name VARCHAR(50),
        waiter_id VARCHAR(32),
        waiter_name VARCHAR(50),
        staff_id VARCHAR(32),
        staff_name VARCHAR(50),
        submitter_id VARCHAR(32),
        submitted_by VARCHAR(50),
        dispatcher_id VARCHAR(32),
        dispatcher_name VARCHAR(50),
        review TEXT,
        completion_note TEXT,
        reference_photo VARCHAR(255),
        reject_reason VARCHAR(50),
        reject_note TEXT,
        customer_reject_reason VARCHAR(50),
        customer_reject_note TEXT,
        reject_at DATETIME,
        follow_up_action ENUM('reassign','fail'),
       customer_type ENUM('old','new'),
       history_count INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_store (store_id),
        INDEX idx_staff (staff_id),
        INDEX idx_waiter (waiter_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 订单补充消息表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS supplements (
        id VARCHAR(32) PRIMARY KEY,
        order_id VARCHAR(32) NOT NULL,
        content TEXT NOT NULL,
        sender_id VARCHAR(32),
        sender_name VARCHAR(50),
        sender_role VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 评价表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS waiter_reviews (
        id VARCHAR(32) PRIMARY KEY,
        order_id VARCHAR(32) NOT NULL,
        waiter_id VARCHAR(32) NOT NULL,
        waiter_name VARCHAR(50),
        reviewer_id VARCHAR(32),
        reviewer_role VARCHAR(20),
        rating INT DEFAULT 5,
        tags JSON,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 客服打卡表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS cs_daily_records (
        id VARCHAR(32) PRIMARY KEY,
        user_id VARCHAR(32) NOT NULL,
        record_date DATE NOT NULL,
        store_id VARCHAR(32),
        store_name VARCHAR(50),
        meituan_consults INT DEFAULT 0,
        phone_consults INT DEFAULT 0,
        wechat_adds INT DEFAULT 0,
        wechat_accounts JSON,
        qq_adds INT DEFAULT 0,
        qq_accounts JSON,
        dispatch_count INT DEFAULT 0,
        deal_count INT DEFAULT 0,
        old_customer_deals INT DEFAULT 0,
        new_customer_deals INT DEFAULT 0,
        customer_contacts JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_date (user_id, record_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 客户资产表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(50),
        phone VARCHAR(20),
        wechat VARCHAR(50),
        qq VARCHAR(20),
        source_store_id VARCHAR(32),
        source_store_name VARCHAR(50),
        source_cs_id VARCHAR(32),
        source_cs_name VARCHAR(50),
        tags JSON,
        notes TEXT,
        order_count INT DEFAULT 0,
        total_spend DECIMAL(10,2) DEFAULT 0,
        first_contact_date DATETIME,
        last_contact_date DATETIME,
        is_vip TINYINT DEFAULT 0,
        status ENUM('active','inactive','blacklist') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_wechat (wechat),
        INDEX idx_qq (qq)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 客户服务记录表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS customer_services (
        id VARCHAR(32) PRIMARY KEY,
        customer_id VARCHAR(32) NOT NULL,
        order_id VARCHAR(32),
        service_date DATETIME,
        store_id VARCHAR(32),
        store_name VARCHAR(50),
        cs_id VARCHAR(32),
        cs_name VARCHAR(50),
        waiter_id VARCHAR(32),
        waiter_name VARCHAR(50),
        rating INT DEFAULT 5,
        tags JSON,
        comment TEXT,
        info_fee DECIMAL(10,2) DEFAULT 0,
        customer_type ENUM('old','new') DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 兼容升级：给已有表添加新字段和索引
    try {
      await conn.execute('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_type ENUM("old","new")');
      await conn.execute('ALTER TABLE orders ADD COLUMN IF NOT EXISTS history_count INT DEFAULT 1');
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone)');
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_cust_wechat ON customers(wechat)');
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_cust_qq ON customers(qq)');
    } catch (e) { /* 字段/索引已存在会报错，忽略 */ }

    console.log('[DB] All tables initialized');
  } finally {
    conn.release();
  }
}

// ============ 路由 ============

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json(success({ status: 'ok', db: 'connected' }));
  } catch (err) {
    res.status(500).json(error('数据库连接失败: ' + err.message));
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json(error('请输入用户名和密码'));
    }
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND status = "active"',
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json(error('用户名或密码错误'));
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json(error('用户名或密码错误'));
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: JSON.parse(user.roles || '[]')[0] || '客服' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const userData = camelizeRow(user);
    userData.roles = JSON.parse(user.roles || '[]');
    userData.storeIds = user.store_ids ? JSON.parse(user.store_ids) : [];
    delete userData.password;
    res.json(success({ ...userData, token }));
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json(error('登录失败: ' + err.message));
  }
});

// ============ 用户管理 ============
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC');
    const users = rows.map(r => {
      const u = camelizeRow(r);
      u.roles = JSON.parse(r.roles || '[]');
      u.storeIds = r.store_ids ? JSON.parse(r.store_ids) : [];
      delete u.password;
      return u;
    });
    res.json(success(users));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.post('/api/users', authMiddleware, async (req, res) => {
  try {
    const { username, password, name, roles, phone, storeId, storeName, storeIds, status } = req.body;
    const id = generateId();
    const hashed = await bcrypt.hash(password || '123456', 10);
    await pool.execute(
      `INSERT INTO users (id, username, password, name, roles, phone, store_id, store_name, store_ids, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, username, hashed, name, JSON.stringify(roles || ['客服']), phone || null, storeId || null, storeName || null,
       JSON.stringify(storeIds || []), status || 'active']
    );
    res.json(success({ id, username, name, roles: roles || ['客服'] }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const { name, roles, phone, storeId, storeName, storeIds, status } = req.body;
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (roles !== undefined) { updates.push('roles = ?'); values.push(JSON.stringify(roles)); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (storeId !== undefined) { updates.push('store_id = ?'); values.push(storeId); }
    if (storeName !== undefined) { updates.push('store_name = ?'); values.push(storeName); }
    if (storeIds !== undefined) { updates.push('store_ids = ?'); values.push(JSON.stringify(storeIds)); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (updates.length === 0) return res.json(success(null));
    values.push(req.params.id);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json(success(null, '更新成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 客服管理 (staff) ============
app.get('/api/staff', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM staff ORDER BY created_at DESC');
    const staff = rows.map(r => {
      const s = camelizeRow(r);
      s.storeIds = r.store_ids ? JSON.parse(r.store_ids) : [];
      return s;
    });
    res.json(success(staff));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.post('/api/staff', authMiddleware, async (req, res) => {
  try {
    const id = generateId();
    const fields = Object.keys(req.body);
    const placeholders = fields.map(() => '?').join(',');
    const values = fields.map(f => {
      if (f === 'storeIds' || f === 'store_ids') return JSON.stringify(req.body[f] || []);
      return req.body[f] ?? null;
    });
    await pool.execute(`INSERT INTO staff (id, ${fields.join(',')}) VALUES (?, ${placeholders})`, [id, ...values]);
    res.json(success({ id }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.put('/api/staff/:id', authMiddleware, async (req, res) => {
  try {
    const fields = Object.keys(req.body);
    if (fields.length === 0) return res.json(success(null));
    const setClause = fields.map(f => `${f.replace(/[A-Z]/g, l => '_' + l.toLowerCase())} = ?`).join(', ');
    const values = fields.map(f => {
      if (f === 'storeIds' || f === 'store_ids') return JSON.stringify(req.body[f] || []);
      return req.body[f] ?? null;
    });
    values.push(req.params.id);
    await pool.execute(`UPDATE staff SET ${setClause} WHERE id = ?`, values);
    res.json(success(null, '更新成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.delete('/api/staff/:id', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM staff WHERE id = ?', [req.params.id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 服务员管理 ============
app.get('/api/waiters', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM waiters ORDER BY created_at DESC');
    const waiters = rows.map(r => {
      const w = camelizeRow(r);
      w.tags = r.tags ? JSON.parse(r.tags) : [];
      return w;
    });
    res.json(success(waiters));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.post('/api/waiters', authMiddleware, async (req, res) => {
  try {
    const id = generateId();
    const { name, phone, gender, age, height, bodyType, cup, personality, tags, status, storeId } = req.body;
    await pool.execute(
      'INSERT INTO waiters (id, name, phone, gender, age, height, body_type, cup, personality, tags, status, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, phone || null, gender || null, age || null, height || null, bodyType || null, cup || null, personality || null,
       JSON.stringify(tags || []), status || 'active', storeId || null]
    );
    res.json(success({ id, name }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.put('/api/waiters/:id', authMiddleware, async (req, res) => {
  try {
    const updates = [];
    const values = [];
    const fieldMap = {
      name: 'name', phone: 'phone', gender: 'gender', age: 'age',
      height: 'height', bodyType: 'body_type', cup: 'cup', personality: 'personality',
      tags: 'tags', rating: 'rating', totalReviews: 'total_reviews',
      status: 'status', storeId: 'store_id'
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        updates.push(`${dbKey} = ?`);
        values.push(key === 'tags' ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }
    if (updates.length === 0) return res.json(success(null));
    values.push(req.params.id);
    await pool.execute(`UPDATE waiters SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json(success(null, '更新成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.delete('/api/waiters/:id', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM waiters WHERE id = ?', [req.params.id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 门店管理 ============
app.get('/api/stores', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM stores ORDER BY created_at DESC');
    res.json(success(rows.map(camelizeRow)));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.post('/api/stores', authMiddleware, async (req, res) => {
  try {
    const id = generateId();
    const { name, address, phone, rent, commissionRate, marketingFee, operatingCost, manager, staffUserId, status } = req.body;
    await pool.execute(
      'INSERT INTO stores (id, name, address, phone, rent, commission_rate, marketing_fee, operating_cost, manager, staff_user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, address || null, phone || null, rent || 0, commissionRate || 0, marketingFee || 0, operatingCost || 0, manager || null, staffUserId || null, status || 'active']
    );
    res.json(success({ id, name }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.put('/api/stores/:id', authMiddleware, async (req, res) => {
  try {
    const updates = [];
    const values = [];
    const fieldMap = {
      name: 'name', address: 'address', phone: 'phone', rent: 'rent',
      commissionRate: 'commission_rate', marketingFee: 'marketing_fee',
      operatingCost: 'operating_cost', manager: 'manager',
      staffUserId: 'staff_user_id', status: 'status'
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        updates.push(`${dbKey} = ?`);
        values.push(req.body[key]);
      }
    }
    if (updates.length === 0) return res.json(success(null));
    values.push(req.params.id);
    await pool.execute(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json(success(null, '更新成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.delete('/api/stores/:id', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM stores WHERE id = ?', [req.params.id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 订单管理 ============
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { status, myOrders, dispatcherView, date } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (date) {
      sql += ' AND DATE(created_at) = ?';
      params.push(date);
    }
    // myOrders：客服只看自己的单
    if (myOrders === 'true') {
      const userId = req.headers['x-user-id'] || req.userId;
      sql += ' AND submitter_id = ?';
      params.push(userId);
    }
    // dispatcherView：派单侠看所有待派单和已派单
    if (dispatcherView === 'true') {
      sql += ' AND status IN ("pending", "assigned", "departed", "arrived", "serving")';
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(sql, params);
    const orders = rows.map(r => {
      const o = camelizeRow(r);
      o.supplements = r.supplements ? JSON.parse(r.supplements) : [];
      o.preferences = r.preferences ? JSON.parse(r.preferences) : [];
      o.customerType = r.customer_type;
      o.historyCount = r.history_count;
      return o;
    });
    res.json(success(orders));
  } catch (err) {
    console.error('[ORDERS GET ERROR]', err);
    res.status(500).json(error(err.message));
  }
});

app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json(error('订单不存在'));
    const o = camelizeRow(rows[0]);
    o.supplements = rows[0].supplements ? JSON.parse(rows[0].supplements) : [];
    o.preferences = rows[0].preferences ? JSON.parse(rows[0].preferences) : [];
    o.customerType = rows[0].customer_type;
    o.historyCount = rows[0].history_count;
    res.json(success(o));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const id = req.body.id || generateId();
    const {
      orderNo, customerName, phone, wechat, qq, address, location,
      preferences, notes, infoFee, prepayAmount, status,
      storeId, storeName, staffId, staffName, submitterId, submittedBy, referencePhoto
    } = req.body;
    const finalOrderNo = orderNo || req.body.id || null;

    // ========== 三要素客户匹配 ==========
    let customerId = null;
    let isOldCustomer = false;
    let matchedCustomer = null;

    // 标准化：空字符串视为 null
    const normalizedPhone = phone && String(phone).trim() ? String(phone).trim() : null;
    const normalizedWechat = wechat && String(wechat).trim() ? String(wechat).trim() : null;
    const normalizedQq = qq && String(qq).trim() ? String(qq).trim() : null;

    console.log('[CUSTOMER MATCH] phone=', normalizedPhone, 'wechat=', normalizedWechat, 'qq=', normalizedQq);

    if (normalizedPhone || normalizedWechat || normalizedQq) {
      const conditions = [];
      const params = [];
      if (normalizedPhone) { conditions.push('phone = ?'); params.push(normalizedPhone); }
      if (normalizedWechat) { conditions.push('wechat = ?'); params.push(normalizedWechat); }
      if (normalizedQq) { conditions.push('qq = ?'); params.push(normalizedQq); }

      const sql = `SELECT * FROM customers WHERE (${conditions.join(' OR ')}) AND status = 'active' LIMIT 1`;
      console.log('[CUSTOMER MATCH] SQL:', sql, 'params:', params);
      const [matched] = await pool.execute(sql, params);
      console.log('[CUSTOMER MATCH] matched:', matched.length, 'rows');

      if (matched.length > 0) {
        // 老客户 - 更新
        matchedCustomer = matched[0];
        customerId = matchedCustomer.id;
        isOldCustomer = true;
        await pool.execute(
          'UPDATE customers SET order_count = order_count + 1, last_contact_date = ? WHERE id = ?',
          [nowBeijing(), customerId]
        );
        console.log('[CUSTOMER MATCH] 老客户:', matchedCustomer.name, 'order_count+1');
      } else {
        // 新客户 - 创建客户资产
        customerId = generateId();
        await pool.execute(
          `INSERT INTO customers (id, name, phone, wechat, qq, source_store_id, source_store_name, source_cs_id, source_cs_name, order_count, total_spend, first_contact_date, last_contact_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, 'active')`,
          [customerId, customerName || null, normalizedPhone, normalizedWechat, normalizedQq,
           storeId || null, storeName || null, submitterId || req.userId, submittedBy || null,
           nowBeijing(), nowBeijing()]
        );
        console.log('[CUSTOMER MATCH] 新客户创建:', customerId);
      }
    } else {
      console.log('[CUSTOMER MATCH] 无三要素，跳过客户匹配');
    }

    // ========== 创建订单 ==========
    await pool.execute(
      `INSERT INTO orders (id, order_no, customer_name, phone, wechat, qq, address, location,
       preferences, notes, info_fee, prepay_amount, status, store_id, store_name,
       staff_id, staff_name, submitter_id, submitted_by, reference_photo, customer_type, history_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, finalOrderNo, customerName || null, phone || null, wechat || null, qq || null,
       address, location || null,
       preferences ? JSON.stringify(preferences) : null,
       notes || null, infoFee || 0, prepayAmount || 0, status || 'pending',
       storeId || null, storeName || null, staffId || null, staffName || null,
       submitterId || req.userId, submittedBy || null, referencePhoto || null,
       isOldCustomer ? 'old' : 'new', matchedCustomer ? (matchedCustomer.order_count + 1) : 1]
    );

    // ========== 记录客户服务 ==========
    if (customerId) {
      await pool.execute(
        `INSERT INTO customer_services (id, customer_id, order_id, service_date, store_id, store_name, cs_id, cs_name, info_fee, customer_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [generateId(), customerId, id, nowBeijing(), storeId || null, storeName || null,
         submitterId || req.userId, submittedBy || null, infoFee || 0, isOldCustomer ? 'old' : 'new']
      );
    }

    res.json(success({
      id,
      orderNo: finalOrderNo,
      customerId,
      isOldCustomer,
      customerName: matchedCustomer?.name || customerName || null,
      historyCount: matchedCustomer ? (matchedCustomer.order_count + 1) : 1
    }));
  } catch (err) {
    console.error('[ORDER CREATE ERROR]', err);
    res.status(500).json(error('创建订单失败: ' + err.message));
  }
});

app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const updates = [];
    const values = [];
    const fieldMap = {
      customerName: 'customer_name', phone: 'phone', wechat: 'wechat', qq: 'qq',
      address: 'address', location: 'location', preferences: 'preferences',
      supplements: 'supplements', notes: 'notes', infoFee: 'info_fee',
      prepayAmount: 'prepay_amount', status: 'status', storeId: 'store_id',
      storeName: 'store_name', waiterId: 'waiter_id', waiterName: 'waiter_name',
      staffId: 'staff_id', staffName: 'staff_name', dispatcherId: 'dispatcher_id',
      dispatcherName: 'dispatcher_name', review: 'review', completionNote: 'completion_note',
      referencePhoto: 'reference_photo', rejectReason: 'reject_reason',
      rejectNote: 'reject_note', customerRejectReason: 'customer_reject_reason',
      customerRejectNote: 'customer_reject_note', rejectAt: 'reject_at',
      followUpAction: 'follow_up_action', orderNo: 'order_no'
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        updates.push(`${dbKey} = ?`);
        if (key === 'preferences' || key === 'supplements') {
          values.push(JSON.stringify(req.body[key]));
        } else if (key === 'rejectAt' && req.body[key]) {
          const d = new Date(req.body[key]);
          d.setHours(d.getHours() + 8);
          values.push(d.toISOString().slice(0, 19).replace('T', ' '));
        } else {
          values.push(req.body[key]);
        }
      }
    }
    if (updates.length === 0) return res.json(success(null));
    values.push(req.params.id);
    await pool.execute(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json(success(null, '更新成功'));
  } catch (err) {
    console.error('[ORDER UPDATE ERROR]', err);
    res.status(500).json(error(err.message));
  }
});

app.delete('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 订单补充消息 ============
app.post('/api/orders/:id/supplement', authMiddleware, async (req, res) => {
  try {
    const { content, senderId, senderName, senderRole } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json(error('消息内容不能为空'));
    }
    const sid = generateId();
    await pool.execute(
      'INSERT INTO supplements (id, order_id, content, sender_id, sender_name, sender_role, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [sid, req.params.id, content.trim(), senderId || req.userId, senderName || null, senderRole || null]
    );
    res.json(success({ id: sid, content, createdAt: nowBeijing() }));
  } catch (err) {
    console.error('[SUPPLEMENT ERROR]', err);
    res.status(500).json(error(err.message));
  }
});

app.get('/api/orders/:id/supplements', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM supplements WHERE order_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(success(rows.map(camelizeRow)));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 评价管理 ============
app.post('/api/waiter-reviews', authMiddleware, async (req, res) => {
  try {
    const { orderId, waiterId, waiterName, reviewerId, reviewerRole, rating, tags, comment } = req.body;
    // 参数校验
    if (!orderId || !waiterId) {
      return res.status(400).json(error('缺少订单ID或服务员ID'));
    }
    const id = generateId();
    await pool.execute(
      'INSERT INTO waiter_reviews (id, order_id, waiter_id, waiter_name, reviewer_id, reviewer_role, rating, tags, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, orderId, waiterId, waiterName || null, reviewerId || req.userId, reviewerRole || null,
       rating !== undefined ? rating : 5, JSON.stringify(tags || []), comment || null]
    );
    // 更新服务员评分
    const [avgRows] = await pool.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM waiter_reviews WHERE waiter_id = ?',
      [waiterId]
    );
    if (avgRows.length > 0 && avgRows[0].avg_rating !== null) {
      const avgRating = parseFloat(avgRows[0].avg_rating) || 0;
      await pool.execute(
        'UPDATE waiters SET rating = ?, total_reviews = ? WHERE id = ?',
        [avgRating.toFixed(2), avgRows[0].total || 0, waiterId]
      );
    }
    // 更新订单状态为已评价
    await pool.execute(
      'UPDATE orders SET status = "rated" WHERE id = ?',
      [orderId]
    );
    res.json(success({ id }));
  } catch (err) {
    console.error('[REVIEW CREATE ERROR]', err);
    res.status(500).json(error('评价提交失败: ' + err.message));
  }
});

app.get('/api/waiter-reviews', authMiddleware, async (req, res) => {
  try {
    const { orderId, waiterId, reviewerRole } = req.query;
    let sql = 'SELECT * FROM waiter_reviews WHERE 1=1';
    const params = [];
    if (orderId) { sql += ' AND order_id = ?'; params.push(orderId); }
    if (waiterId) { sql += ' AND waiter_id = ?'; params.push(waiterId); }
    if (reviewerRole) { sql += ' AND reviewer_role = ?'; params.push(reviewerRole); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(success(rows.map(camelizeRow)));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 客服打卡 ============
app.get('/api/cs-daily-records', authMiddleware, async (req, res) => {
  try {
    const { userId, date, startDate, endDate } = req.query;
    let sql = 'SELECT * FROM cs_daily_records WHERE 1=1';
    const params = [];
    if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    if (date) { sql += ' AND record_date = ?'; params.push(date); }
    if (startDate) { sql += ' AND record_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND record_date <= ?'; params.push(endDate); }
    sql += ' ORDER BY record_date DESC, created_at DESC';
    const [rows] = await pool.execute(sql, params);
    const records = rows.map(r => {
      const rec = camelizeRow(r);
      rec.wechatAccounts = r.wechat_accounts ? JSON.parse(r.wechat_accounts) : [];
      rec.qqAccounts = r.qq_accounts ? JSON.parse(r.qq_accounts) : [];
      rec.customerContacts = r.customer_contacts ? JSON.parse(r.customer_contacts) : [];
      return rec;
    });
    res.json(success(records));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.get('/api/cs-daily-records/all', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = 'SELECT r.*, u.name as user_name FROM cs_daily_records r LEFT JOIN users u ON r.user_id = u.id WHERE 1=1';
    const params = [];
    if (startDate) { sql += ' AND r.record_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND r.record_date <= ?'; params.push(endDate); }
    sql += ' ORDER BY r.record_date DESC, r.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    const records = rows.map(r => {
      const rec = camelizeRow(r);
      rec.wechatAccounts = r.wechat_accounts ? JSON.parse(r.wechat_accounts) : [];
      rec.qqAccounts = r.qq_accounts ? JSON.parse(r.qq_accounts) : [];
      rec.customerContacts = r.customer_contacts ? JSON.parse(r.customer_contacts) : [];
      rec.userName = r.user_name;
      return rec;
    });
    res.json(success(records));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.post('/api/cs-daily-records', authMiddleware, async (req, res) => {
  try {
    const {
      id, userId, recordDate, storeId, storeName,
      meituanConsults, phoneConsults, wechatAdds, wechatAccounts,
      qqAdds, qqAccounts, dispatchCount, dealCount,
      oldCustomerDeals, newCustomerDeals, customerContacts
    } = req.body;
    const recordId = id || generateId();
    const values = [
      recordId,
      userId || req.userId,
      recordDate || new Date().toISOString().slice(0, 10),
      storeId || null,
      storeName || null,
      meituanConsults === undefined ? 0 : meituanConsults,
      phoneConsults === undefined ? 0 : phoneConsults,
      wechatAdds === undefined ? 0 : wechatAdds,
      JSON.stringify(wechatAccounts || []),
      qqAdds === undefined ? 0 : qqAdds,
      JSON.stringify(qqAccounts || []),
      dispatchCount === undefined ? 0 : dispatchCount,
      dealCount === undefined ? 0 : dealCount,
      oldCustomerDeals === undefined ? 0 : oldCustomerDeals,
      newCustomerDeals === undefined ? 0 : newCustomerDeals,
      JSON.stringify(customerContacts || [])
    ];
    await pool.execute(
      `INSERT INTO cs_daily_records (id, user_id, record_date, store_id, store_name,
       meituan_consults, phone_consults, wechat_adds, wechat_accounts,
       qq_adds, qq_accounts, dispatch_count, deal_count,
       old_customer_deals, new_customer_deals, customer_contacts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       store_id = VALUES(store_id), store_name = VALUES(store_name),
       meituan_consults = VALUES(meituan_consults), phone_consults = VALUES(phone_consults),
       wechat_adds = VALUES(wechat_adds), wechat_accounts = VALUES(wechat_accounts),
       qq_adds = VALUES(qq_adds), qq_accounts = VALUES(qq_accounts),
       dispatch_count = VALUES(dispatch_count), deal_count = VALUES(deal_count),
       old_customer_deals = VALUES(old_customer_deals), new_customer_deals = VALUES(new_customer_deals),
       customer_contacts = VALUES(customer_contacts), updated_at = NOW()`,
      values
    );
    res.json(success({ id: recordId }));
  } catch (err) {
    console.error('[DAILY RECORD ERROR]', err);
    res.status(500).json(error('保存失败: ' + err.message));
  }
});

app.delete('/api/cs-daily-records/:id', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM cs_daily_records WHERE id = ?', [req.params.id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 客户资产 ============
app.get('/api/customers/search', authMiddleware, async (req, res) => {
  try {
    const { name, phone, wechat, qq } = req.query;
    let conditions = [];
    let params = [];
    if (name) { conditions.push('name LIKE ?'); params.push(`%${name}%`); }
    if (phone) { conditions.push('phone = ?'); params.push(phone); }
    if (wechat) { conditions.push('wechat = ?'); params.push(wechat); }
    if (qq) { conditions.push('qq = ?'); params.push(qq); }
    if (conditions.length === 0) {
      return res.status(400).json(error('请提供搜索条件'));
    }
    const sql = 'SELECT * FROM customers WHERE ' + conditions.join(' OR ') + ' LIMIT 20';
    const [rows] = await pool.execute(sql, params);
    const customers = rows.map(r => {
      const c = camelizeRow(r);
      c.tags = r.tags ? JSON.parse(r.tags) : [];
      return c;
    });
    res.json(success(customers));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.get('/api/customers', authMiddleware, async (req, res) => {
  try {
    const { search, csId, storeId, type, page = 1, pageSize = 50 } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR wechat LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (csId) { sql += ' AND source_cs_id = ?'; params.push(csId); }
    if (storeId) { sql += ' AND source_store_id = ?'; params.push(storeId); }
    if (type === 'vip') { sql += ' AND is_vip = 1'; }
    if (type === 'blacklist') { sql += ' AND status = "blacklist"'; }
    sql += ' ORDER BY last_contact_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const [rows] = await pool.execute(sql, params);
    const [countRows] = await pool.execute('SELECT COUNT(*) as total FROM customers WHERE 1=1' + (search ? ' AND (name LIKE ? OR phone LIKE ? OR wechat LIKE ?)' : ''), search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);
    const customers = rows.map(r => {
      const c = camelizeRow(r);
      c.tags = r.tags ? JSON.parse(r.tags) : [];
      return c;
    });
    res.json(success({ list: customers, total: countRows[0].total }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.get('/api/customers/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json(error('客户不存在'));
    const [svcRows] = await pool.execute(
      'SELECT * FROM customer_services WHERE customer_id = ? ORDER BY service_date DESC',
      [req.params.id]
    );
    const customer = camelizeRow(rows[0]);
    customer.tags = rows[0].tags ? JSON.parse(rows[0].tags) : [];
    customer.services = svcRows.map(camelizeRow);
    res.json(success(customer));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

app.post('/api/customers', authMiddleware, async (req, res) => {
  try {
    const { id, name, phone, wechat, qq, sourceStoreId, sourceStoreName, sourceCsId, sourceCsName, tags, notes, status } = req.body;
    const customerId = id || generateId();
    const now = nowBeijing();
    await pool.execute(
      `INSERT INTO customers (id, name, phone, wechat, qq, source_store_id, source_store_name, source_cs_id, source_cs_name, tags, notes, status, first_contact_date, last_contact_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name), phone = VALUES(phone), wechat = VALUES(wechat), qq = VALUES(qq),
       source_store_id = VALUES(source_store_id), source_store_name = VALUES(source_store_name),
       source_cs_id = VALUES(source_cs_id), source_cs_name = VALUES(source_cs_name),
       tags = VALUES(tags), notes = VALUES(notes), status = VALUES(status),
       last_contact_date = VALUES(last_contact_date), updated_at = NOW()`,
      [customerId, name || null, phone || null, wechat || null, qq || null,
       sourceStoreId || null, sourceStoreName || null, sourceCsId || null, sourceCsName || null,
       JSON.stringify(tags || []), notes || null, status || 'active', now, now]
    );
    res.json(success({ id: customerId, isNew: !id }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// 客户服务记录
app.post('/api/customer-services', authMiddleware, async (req, res) => {
  try {
    const {
      customerId, orderId, serviceDate, storeId, storeName,
      csId, csName, waiterId, waiterName, rating, tags, comment, infoFee, customerType
    } = req.body;
    const id = generateId();
    await pool.execute(
      `INSERT INTO customer_services (id, customer_id, order_id, service_date, store_id, store_name, cs_id, cs_name, waiter_id, waiter_name, rating, tags, comment, info_fee, customer_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, customerId, orderId || null, serviceDate || nowBeijing(), storeId || null, storeName || null,
       csId || req.userId, csName || null, waiterId || null, waiterName || null,
       rating || 5, JSON.stringify(tags || []), comment || null, infoFee || 0, customerType || 'new']
    );
    // 更新客户统计
    await pool.execute(
      `UPDATE customers SET order_count = order_count + 1, total_spend = total_spend + ?,
       last_contact_date = ? WHERE id = ?`,
      [infoFee || 0, nowBeijing(), customerId]
    );
    res.json(success({ id }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// 从订单同步客户
app.post('/api/customers/sync-from-orders', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE status IN ("completed", "rated") AND phone IS NOT NULL ORDER BY created_at ASC'
    );
    let created = 0, updated = 0;
    for (const order of rows) {
      const phone = order.phone;
      if (!phone) continue;
      const [exist] = await pool.execute('SELECT * FROM customers WHERE phone = ?', [phone]);
      if (exist.length === 0) {
        const cid = generateId();
        await pool.execute(
          `INSERT INTO customers (id, name, phone, wechat, qq, source_store_id, source_store_name, source_cs_id, source_cs_name, order_count, total_spend, first_contact_date, last_contact_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          [cid, order.customer_name || null, phone, order.wechat || null, order.qq || null,
           order.store_id || null, order.store_name || null, order.submitter_id || null, order.submitted_by || null,
           order.info_fee || 0, order.created_at, order.created_at]
        );
        created++;
      } else {
        await pool.execute(
          'UPDATE customers SET order_count = order_count + 1, total_spend = total_spend + ?, last_contact_date = ? WHERE id = ?',
          [order.info_fee || 0, order.created_at, exist[0].id]
        );
        updated++;
      }
    }
    res.json(success({ created, updated, total: rows.length }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 客服画像 ============
app.get('/api/cs-portraits', authMiddleware, async (req, res) => {
  try {
    const { csId } = req.query;
    let sql = `
      SELECT cs_id as csId, cs_name as csName, 
             COUNT(*) as totalOrders, SUM(info_fee) as totalInfoFee,
             AVG(rating) as avgRating
      FROM customer_services WHERE 1=1
    `;
    const params = [];
    if (csId) { sql += ' AND cs_id = ?'; params.push(csId); }
    sql += ' GROUP BY cs_id ORDER BY totalOrders DESC';
    const [csRows] = await pool.execute(sql, params);
    let waiterSql = `
      SELECT waiter_id as waiterId, waiter_name as waiterName,
             COUNT(*) as totalOrders, SUM(info_fee) as totalInfoFee,
             AVG(rating) as avgRating
      FROM customer_services WHERE 1=1
    `;
    const waiterParams = [];
    if (csId) { waiterSql += ' AND cs_id = ?'; waiterParams.push(csId); }
    waiterSql += ' GROUP BY waiter_id ORDER BY totalOrders DESC';
    const [waiterRows] = await pool.execute(waiterSql, waiterParams);
    res.json(success({ csStats: csRows, waiterStats: waiterRows }));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// ============ 数据大盘 ============
app.get('/api/cockpit', authMiddleware, async (req, res) => {
  try {
    // KPI
    const [totalOrders] = await pool.execute('SELECT COUNT(*) as c FROM orders');
    const [completedOrders] = await pool.execute('SELECT COUNT(*) as c FROM orders WHERE status IN ("completed","rated")');
    const [revenue] = await pool.execute('SELECT SUM(info_fee) as s FROM orders WHERE status IN ("completed","rated")');
    const [infoFee] = await pool.execute('SELECT SUM(info_fee) as s FROM orders');
    const [activeStores] = await pool.execute('SELECT COUNT(*) as c FROM stores WHERE status = "active"');
    const [activeWaiters] = await pool.execute('SELECT COUNT(*) as c FROM waiters WHERE status = "active"');

    // 最近订单
    const [recentOrders] = await pool.execute(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT 20'
    );

    // 门店统计
    const [storeStats] = await pool.execute(`
      SELECT s.id, s.name, COUNT(o.id) as orderCount, SUM(o.info_fee) as revenue
      FROM stores s LEFT JOIN orders o ON s.id = o.store_id
      WHERE s.status = 'active' GROUP BY s.id ORDER BY orderCount DESC
    `);

    // 服务员统计
    const [waiterStats] = await pool.execute(`
      SELECT id, name, total_reviews as orderCount, rating
      FROM waiters WHERE status = 'active' ORDER BY total_reviews DESC LIMIT 20
    `);

    // 客服统计
    const [staffStats] = await pool.execute(`
      SELECT u.id, u.name, COUNT(o.id) as orderCount,
             SUM(CASE WHEN o.status IN ('completed','rated') THEN 1 ELSE 0 END) as completedCount
      FROM users u LEFT JOIN orders o ON u.id = o.submitter_id
      WHERE JSON_CONTAINS(u.roles, '"客服"') GROUP BY u.id ORDER BY orderCount DESC
    `);

    const kpi = {
      totalOrders: totalOrders[0].c || 0,
      completedOrders: completedOrders[0].c || 0,
      totalRevenue: revenue[0].s || 0,
      totalInfoFee: infoFee[0].s || 0,
      activeStores: activeStores[0].c || 0,
      activeWaiters: activeWaiters[0].c || 0,
    };

    res.json(success({
      kpi,
      recentOrders: recentOrders.map(camelizeRow),
      storeStats,
      waiterStats: waiterStats.map(w => ({ id: w.id, name: w.name, orderCount: w.orderCount || 0, revenue: 0, rating: w.rating })),
      staffStats,
      dynamicTags: [],
    }));
  } catch (err) {
    console.error('[COCKPIT ERROR]', err);
    res.status(500).json(error(err.message));
  }
});

// ============ 启动 ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`[API] Server running on port ${PORT}`);
  try {
    await initDatabase();
    console.log('[API] Database initialized');
  } catch (err) {
    console.error('[API] DB init error:', err);
  }
});

module.exports = app;