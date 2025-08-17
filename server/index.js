const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// 生成题目ID的函数
const generateQuestionId = (db) => {
  return new Promise((resolve, reject) => {
    // 使用东八区时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 3600000));
    
    const dateStr = beijingTime.getFullYear().toString() + 
                   (beijingTime.getMonth() + 1).toString().padStart(2, '0') + 
                   beijingTime.getDate().toString().padStart(2, '0');
    
    // 查询今天已有的题目数量（使用东八区时间）
    const startOfDay = beijingTime.getFullYear() + '-' + 
                      (beijingTime.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                      beijingTime.getDate().toString().padStart(2, '0') + ' 00:00:00';
    const endOfDay = beijingTime.getFullYear() + '-' + 
                    (beijingTime.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                    beijingTime.getDate().toString().padStart(2, '0') + ' 23:59:59';
    
    // 查询今天已有的题目数量（包括已有question_id的题目）
    db.get(
      'SELECT COUNT(*) as count FROM questions WHERE created_at BETWEEN ? AND ?',
      [startOfDay, endOfDay],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        const todayCount = (row.count || 0) + 1;
        const questionId = dateStr + todayCount.toString().padStart(4, '0');
        
        // 检查这个ID是否已经存在
        db.get('SELECT COUNT(*) as count FROM questions WHERE question_id = ?', [questionId], (err, existingRow) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (existingRow.count > 0) {
            // 如果ID已存在，查找下一个可用的ID
            let nextId = todayCount + 1;
            const findNextId = () => {
              const nextQuestionId = dateStr + nextId.toString().padStart(4, '0');
              db.get('SELECT COUNT(*) as count FROM questions WHERE question_id = ?', [nextQuestionId], (err, checkRow) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                if (checkRow.count === 0) {
                  resolve(nextQuestionId);
                } else {
                  nextId++;
                  findNextId();
                }
              });
            };
            findNextId();
          } else {
            resolve(questionId);
          }
        });
      }
    );
  });
};

const app = express();
const PORT = 3001;

app.use(cors());
// 提高请求体大小限制，支持较大的图片base64
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 生产环境静态托管前端构建产物（若存在）
const path = require('path');
// 日志系统：winston + 日志轮转（放在path初始化之后）
const fs = require('fs');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 访问日志中间件（不记录敏感字段）
app.use((req, res, next) => {
  const { method, originalUrl } = req;
  const safeBody = (() => {
    try {
      const clone = JSON.parse(JSON.stringify(req.body || {}));
      if (clone.apiKey) clone.apiKey = '[REDACTED]';
      if (clone.secretKey) clone.secretKey = '[REDACTED]';
      if (clone.appId) clone.appId = '[REDACTED]';
      if (clone.imageBase64) clone.imageBase64 = `[base64:${clone.imageBase64.length}]`;
      return clone;
    } catch (_e) {
      return {};
    }
  })();
  logger.info({ method, url: originalUrl, body: safeBody });
  next();
});
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// 数据库初始化
const db = new sqlite3.Database('./database.sqlite');

// 设置数据库时区为本地时间
db.run("PRAGMA timezone = 'Asia/Shanghai'");

// 创建表
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    question_id TEXT UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    answer TEXT,
    analysis TEXT,
    grade TEXT,
    knowledge_point TEXT,
    question_type TEXT,
    difficulty INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    custom_tags TEXT,
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
  )`);

  // 添加custom_tags字段（如果不存在）
  db.run("ALTER TABLE questions ADD COLUMN custom_tags TEXT", (err) => {
    if (err && err.message.includes('duplicate column name')) {
      console.log('custom_tags列已存在，跳过添加');
    } else if (err) {
      console.error('添加custom_tags列失败:', err);
    } else {
      console.log('成功添加custom_tags列');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'manual',
    teacher TEXT,
    serial_no INTEGER,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS paper_questions (
    id TEXT PRIMARY KEY,
    paper_id TEXT,
    question_id TEXT,
    order_num INTEGER,
    FOREIGN KEY (paper_id) REFERENCES papers (id),
    FOREIGN KEY (question_id) REFERENCES questions (id)
  )`);

  // 为papers表新增teacher字段（如果不存在）
  db.run("ALTER TABLE papers ADD COLUMN teacher TEXT", (err) => {
    if (err && err.message.includes('duplicate column name')) {
      // 已存在，忽略
    } else if (err) {
      console.error('添加papers.teacher列失败:', err);
    }
  });

  // 为papers表新增serial_no字段（如果不存在）
  db.run("ALTER TABLE papers ADD COLUMN serial_no INTEGER", (err) => {
    if (err && err.message.includes('duplicate column name')) {
      // 已存在，忽略
    } else if (err) {
      console.error('添加papers.serial_no列失败:', err);
    }
  });
});

// API路由
app.get('/api/questions', (req, res) => {
  db.all('SELECT * FROM questions ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 解析custom_tags JSON字符串为数组
    const processedRows = rows.map(row => ({
      ...row,
      custom_tags: row.custom_tags ? JSON.parse(row.custom_tags) : []
    }));
    
    res.json(processedRows);
  });
});

app.post('/api/questions', async (req, res) => {
  const { title, content, answer, analysis, grade, knowledge_point, question_type, difficulty, custom_tags } = req.body;
  const id = uuidv4();
  
  try {
    // 生成题目ID
    const questionId = await generateQuestionId(db);
    
    // 获取东八区时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 3600000));
    const beijingTimeStr = beijingTime.toISOString().slice(0, 19).replace('T', ' ');
    
    // 合并知识点和自定义标签
    let allCustomTags = custom_tags || [];
    if (knowledge_point) {
      allCustomTags = [...allCustomTags, knowledge_point];
    }
    
    // 将custom_tags数组转换为JSON字符串
    const customTagsJson = allCustomTags.length > 0 ? JSON.stringify(allCustomTags) : null;
    
    db.run(`
      INSERT INTO questions (id, question_id, title, content, answer, analysis, grade, question_type, difficulty, custom_tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, questionId, title, content, answer, analysis, grade, question_type, difficulty, customTagsJson, beijingTimeStr, beijingTimeStr], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, question_id: questionId, message: '题目创建成功' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, answer, analysis, grade, knowledge_point, question_type, difficulty, custom_tags } = req.body;
  
    // 获取东八区时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 3600000));
    const beijingTimeStr = beijingTime.toISOString().slice(0, 19).replace('T', ' ');
    
    // 合并知识点和自定义标签
    let allCustomTags = custom_tags || [];
    if (knowledge_point) {
      allCustomTags = [...allCustomTags, knowledge_point];
    }
    
    // 将custom_tags数组转换为JSON字符串
    const customTagsJson = allCustomTags.length > 0 ? JSON.stringify(allCustomTags) : null;
    
    db.run(`
      UPDATE questions 
      SET title = ?, content = ?, answer = ?, analysis = ?, grade = ?, question_type = ?, difficulty = ?, custom_tags = ?, updated_at = ?
      WHERE id = ?
    `, [title, content, answer, analysis, grade, question_type, difficulty, customTagsJson, beijingTimeStr, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: '题目不存在' });
      return;
    }
    res.json({ id, message: '题目更新成功' });
  });
});

app.delete('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  
  // 首先删除相关的试卷题目关联
  db.run('DELETE FROM paper_questions WHERE question_id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 然后删除题目本身
    db.run('DELETE FROM questions WHERE id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: '题目不存在' });
        return;
      }
      res.json({ message: '题目删除成功' });
    });
  });
});

app.post('/api/papers', (req, res) => {
  const { title, description, questionIds, teacher } = req.body;
  const id = uuidv4();

  // 计算当天此教师的序号（serial_no），以东八区日期为准
  const now = new Date();
  const beijing = new Date(now.getTime() + (8 * 3600000));
  const dayStr = `${beijing.getFullYear()}-${String(beijing.getMonth() + 1).padStart(2, '0')}-${String(beijing.getDate()).padStart(2, '0')}`;

  db.get(
    "SELECT COALESCE(MAX(serial_no), 0) AS max_no FROM papers WHERE DATE(created_at) = DATE(?) AND (teacher = ? OR (teacher IS NULL AND ? IS NULL))",
    [dayStr, teacher || null, teacher || null],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const serialNo = (row?.max_no || 0) + 1;
      const dateTitle = `${beijing.getFullYear()}${String(beijing.getMonth() + 1).padStart(2, '0')}${String(beijing.getDate()).padStart(2, '0')}`;
      const teacherName = teacher || '独立老师';
      const shouldAuto = !title || !String(title).trim();
      const finalTitle = shouldAuto ? `${teacherName}${dateTitle}数学试卷 #${serialNo}` : title;

      db.run(
        'INSERT INTO papers (id, title, description, teacher, serial_no) VALUES (?, ?, ?, ?, ?)',
        [id, finalTitle, description, teacher || null, serialNo],
        function (err1) {
          if (err1) {
            res.status(500).json({ error: err1.message });
            return;
          }

          const insertAssociations = () =>
            new Promise((resolve, reject) => {
              if (questionIds && questionIds.length > 0) {
                let remaining = questionIds.length;
                questionIds.forEach((questionId, index) => {
                  db.run(
                    'INSERT INTO paper_questions (id, paper_id, question_id, order_num) VALUES (?, ?, ?, ?)',
                    [uuidv4(), id, questionId, index + 1],
                    (err2) => {
                      if (err2) {
                        reject(err2);
                        return;
                      }
                      remaining -= 1;
                      if (remaining === 0) resolve(null);
                    }
                  );
                });
              } else {
                resolve(null);
              }
            });

          insertAssociations()
            .then(() => {
              db.get('SELECT * FROM papers WHERE id = ?', [id], (err3, paperRow) => {
                if (err3) {
                  res.status(500).json({ error: err3.message });
                  return;
                }
                // 计算题目数量
                db.get(
                  'SELECT COUNT(*) as question_count FROM paper_questions WHERE paper_id = ?',
                  [id],
                  (err4, countRow) => {
                    if (err4) {
                      res.status(500).json({ error: err4.message });
                      return;
                    }
                    res.json({ ...paperRow, question_count: countRow.question_count });
                  }
                );
              });
            })
            .catch((err2) => {
              res.status(500).json({ error: err2.message });
            });
        }
      );
    }
  );
});

// 获取单个试卷详情（含题目）
app.get('/api/papers/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM papers WHERE id = ?', [id], (err, paperRow) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!paperRow) {
      res.status(404).json({ error: '试卷不存在' });
      return;
    }
    db.all(
      `SELECT q.* , pq.order_num
       FROM paper_questions pq
       JOIN questions q ON q.id = pq.question_id
       WHERE pq.paper_id = ?
       ORDER BY pq.order_num ASC`,
      [id],
      (err2, questions) => {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }
        res.json({ ...paperRow, questions });
      }
    );
  });
});

app.get('/api/papers', (req, res) => {
  db.all(`
    SELECT p.*, COUNT(pq.question_id) as question_count
    FROM papers p
    LEFT JOIN paper_questions pq ON p.id = pq.paper_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 前端路由回退（生产环境）：将非 /api 请求交给前端单页应用
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  try {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  } catch (e) {
    next();
  }
});

// 管理API - 重启后端服务器
app.post('/api/admin/restart', (req, res) => {
  console.log('收到重启后端请求');
  res.json({ message: '后端重启请求已发送' });
  
  // 延迟重启，确保响应先发送
  setTimeout(() => {
    console.log('正在重启后端服务器...');
    process.exit(0); // 退出进程，让进程管理器重启
  }, 1000);
});

// 管理API - 检查服务器状态
app.get('/api/admin/status', (req, res) => {
  res.json({ 
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 管理API - 重启前端服务器
app.post('/api/admin/restart-frontend', (req, res) => {
  console.log('收到重启前端请求');
  res.json({ message: '前端重启请求已发送' });
  
  // 这里可以添加重启前端的逻辑
  // 由于浏览器安全限制，实际重启需要外部脚本
  console.log('前端重启需要手动执行: cd client && npm start');
});

// 管理API - 为现有题目生成题目ID
app.post('/api/admin/generate-question-ids', (req, res) => {
  console.log('开始为现有题目生成题目ID');
  
  db.all('SELECT id, created_at FROM questions WHERE question_id IS NULL ORDER BY created_at ASC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    let processedCount = 0;
    const totalCount = rows.length;
    
    if (totalCount === 0) {
      res.json({ message: '没有需要生成题目ID的题目' });
      return;
    }
    
    rows.forEach((row, index) => {
      // 将UTC时间转换为东八区时间
      const createdDate = new Date(row.created_at);
      const utc = createdDate.getTime() + (createdDate.getTimezoneOffset() * 60000);
      const beijingCreatedDate = new Date(utc + (8 * 3600000));
      
      const dateStr = beijingCreatedDate.getFullYear().toString() + 
                     (beijingCreatedDate.getMonth() + 1).toString().padStart(2, '0') + 
                     beijingCreatedDate.getDate().toString().padStart(2, '0');
      
      // 查询同一天中早于当前题目的数量（使用东八区时间）
      const startOfDay = beijingCreatedDate.getFullYear() + '-' + 
                        (beijingCreatedDate.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                        beijingCreatedDate.getDate().toString().padStart(2, '0') + ' 00:00:00';
      const endOfDay = beijingCreatedDate.getFullYear() + '-' + 
                      (beijingCreatedDate.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                      beijingCreatedDate.getDate().toString().padStart(2, '0') + ' 23:59:59';
      
      db.get(
        'SELECT COUNT(*) as count FROM questions WHERE created_at BETWEEN ? AND ? AND created_at <= ?',
        [startOfDay, endOfDay, row.created_at],
        (err, countRow) => {
          if (err) {
            console.error('查询题目数量错误:', err);
            return;
          }
          
          const dayCount = (countRow.count || 0) + 1;
          const questionId = dateStr + dayCount.toString().padStart(4, '0');
          
          db.run('UPDATE questions SET question_id = ? WHERE id = ?', [questionId, row.id], (err) => {
            if (err) {
              console.error('更新题目ID错误:', err);
            }
            
            processedCount++;
            if (processedCount === totalCount) {
              res.json({ 
                message: `成功为 ${totalCount} 个题目生成题目ID`,
                processed: totalCount 
              });
            }
          });
        }
      );
    });
  });
});

// OCR图片识别API（模拟）
app.post('/api/ocr/recognize', (req, res) => {
  console.log('收到OCR识别请求');
  
  // 这里应该实现实际的OCR逻辑
  // 目前返回模拟数据
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        content: '解方程：$2x^2 - 5x + 3 = 0$',
        answer: '$x = 1$ 或 $x = \\dfrac{3}{2}$',
        analysis: '使用求根公式：\\[ x = \\frac{5 \\pm \\sqrt{(-5)^2 - 4 \\times 2 \\times 3}}{2 \\times 2} = \\frac{5 \\pm 1}{4} \\] 所以得到两个解：$x = \\frac{6}{4} = \\dfrac{3}{2}$ 和 $x = \\frac{4}{4} = 1$。'
      }
    });
  }, 2000);
});

// 讯飞公式识别API代理
app.post('/api/ocr/xfyun', async (req, res) => {
  const { apiKey, secretKey, appId, imageBase64 } = req.body;
  
  // 清理首尾空格，防止签名失败
  const clean = (v) => (v == null ? '' : String(v).trim());
  const appIdClean = clean(appId);
  const apiKeyClean = clean(apiKey);
  const secretKeyClean = clean(secretKey);

  if (!appIdClean || !apiKeyClean || !secretKeyClean) {
    return res.json({ success: false, error: '讯飞API需要AppID、API Key和API Secret三个参数，请在API管理中正确配置' });
  }

  try {
    console.log('调用讯飞公式识别API...');
    
    const crypto = require('crypto');
    
    // 使用动态导入获取fetch
    let fetch;
    if (typeof globalThis.fetch !== 'undefined') {
      fetch = globalThis.fetch;
    } else {
      const nodeFetch = await import('node-fetch');
      fetch = nodeFetch.default;
    }
    
    // 讯飞公式识别API的正确端点
    const url = 'https://rest-api.xfyun.cn/v2/itr';
    const host = 'rest-api.xfyun.cn';
    const date = new Date().toUTCString();
    const requestLine = 'POST /v2/itr HTTP/1.1';
    
    // 规范化 base64：去掉 data:image/...;base64, 前缀
    const normalizedBase64 = (imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

    // 构建请求体（参考讯飞 ITR 文档）
    const requestBody = {
      common: {
        app_id: String(appIdClean)
      },
      business: {
        ent: 'teach-photo-print',
        aue: 'raw'
      },
      data: {
        image: normalizedBase64
      }
    };

    const bodyStr = JSON.stringify(requestBody);
    
    // 计算body的SHA256哈希 (base64)
    const digest = crypto.createHash('sha256').update(bodyStr, 'utf8').digest('base64');
    
    // 构建签名字符串 - 包含 host/date/request-line/digest
    const signatureOrigin = `host: ${host}\ndate: ${date}\n${requestLine}\ndigest: SHA-256=${digest}`;
    const signature = crypto.createHmac('sha256', secretKeyClean).update(signatureOrigin, 'utf8').digest('base64');
    
    // 构建Authorization header（api_key 形式）
    const authorization = `api_key="${apiKeyClean}", algorithm="hmac-sha256", headers="host date request-line digest", signature="${signature}"`;

    // 打印安全化的请求头，避免泄露签名/密钥
    const safeHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json,version=1.0',
      'Host': host,
      'Date': date,
      'Digest': `[len:${digest.length}]`,
      'Authorization': '[REDACTED]'
    };
    console.log('发送讯飞API请求...', { url, headers: safeHeaders });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json,version=1.0',
        'Host': host,
        'Date': date,
        'Digest': `SHA-256=${digest}`,
        'Authorization': authorization
      },
      body: bodyStr
    });
    
    // 兼容错误返回不是JSON的情况
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (_e) {
      throw new Error(text || '讯飞API返回非JSON内容');
    }
    console.log('讯飞API响应:', result);
    
    if (result.code !== 0) {
      let errorMsg = result.message || `讯飞API错误码: ${result.code}`;
      if (result.code === 10163) {
        errorMsg = 'AppID或APISecret错误，请检查配置';
      } else if (result.code === 10160) {
        errorMsg = '签名验证失败，请检查APISecret';
      }
      throw new Error(errorMsg);
    }

    // 解析讯飞返回的结果
    let recognizedText = '';
    let latexText = '';
    
    if (result.data && result.data.region) {
      result.data.region.forEach(region => {
        if (region.recog && region.recog.content) {
          recognizedText += region.recog.content + '\n';
        }
        // 如果有LaTeX格式
        if (region.recog && region.recog.latex) {
          latexText += region.recog.latex + '\n';
        }
      });
    }

    // 如果没有结果，可能是在data字段直接返回
    if (!recognizedText && result.data && result.data.text) {
      recognizedText = result.data.text;
    }

    res.json({
      success: true,
      text: recognizedText.trim() || '识别结果为空',
      latex: latexText.trim() || recognizedText.trim(),
      confidence: result.data ? 0.9 : 0.5
    });

  } catch (error) {
    console.error('讯飞API调用失败:', error);
    res.json({
      success: false,
      error: error.message || '讯飞API调用失败'
    });
  }
});

// 腾讯云数学公式识别API代理
app.post('/api/ocr/tencent', async (req, res) => {
  const { apiKey, secretKey, imageBase64 } = req.body;
  
  if (!apiKey || !secretKey) {
    return res.json({ success: false, error: '缺少API Key或Secret Key' });
  }

  try {
    console.log('调用腾讯云数学公式识别API...');
    
    // 腾讯云API需要复杂的签名，这里提供基础实现
    // 建议使用腾讯云SDK或参考官方文档完善签名算法
    
    res.json({
      success: false,
      error: '腾讯云API需要复杂的签名算法，建议使用SDK实现'
    });

  } catch (error) {
    console.error('腾讯云API调用失败:', error);
    res.json({
      success: false,
      error: error.message || '腾讯云API调用失败'
    });
  }
});

// 百度智能云公式识别API代理
app.post('/api/ocr/baidu', async (req, res) => {
  const { apiKey, secretKey, imageBase64 } = req.body;
  
  if (!apiKey || !secretKey) {
    return res.json({ success: false, error: '缺少API Key或Secret Key' });
  }

  try {
    console.log('调用百度智能云公式识别API...');
    
    // 使用动态导入获取fetch
    let fetch;
    if (typeof globalThis.fetch !== 'undefined') {
      fetch = globalThis.fetch;
    } else {
      const nodeFetch = await import('node-fetch');
      fetch = nodeFetch.default;
    }
    
    // 首先获取access_token
    const tokenResponse = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`, {
      method: 'POST'
    });
    
    const tokenResult = await tokenResponse.json();
    
    if (!tokenResult.access_token) {
      throw new Error('获取百度access_token失败');
    }

    // 调用公式识别API
    const ocrResponse = await fetch(`https://aip.baidubce.com/rest/2.0/ocr/v1/formula?access_token=${tokenResult.access_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `image=${encodeURIComponent(imageBase64)}`
    });

    const ocrResult = await ocrResponse.json();
    
    if (ocrResult.error_code) {
      throw new Error(ocrResult.error_msg || '百度API调用失败');
    }

    // 解析百度返回的结果
    let recognizedText = '';
    let latexText = '';
    
    if (ocrResult.words_result) {
      ocrResult.words_result.forEach(item => {
        if (item.words) {
          recognizedText += item.words + '\n';
        }
        if (item.location) {
          // 如果有LaTeX格式，提取它
          latexText += item.words + '\n';
        }
      });
    }

    res.json({
      success: true,
      text: recognizedText.trim(),
      latex: latexText.trim() || recognizedText.trim(),
      confidence: ocrResult.words_result_num > 0 ? 0.85 : 0.5
    });

  } catch (error) {
    console.error('百度API调用失败:', error);
    res.json({
      success: false,
      error: error.message || '百度API调用失败'
    });
  }
});

// 迁移知识点到自定义标签
app.post('/api/admin/migrate-knowledge-points', (req, res) => {
  console.log('开始迁移知识点到自定义标签');
  
  db.all('SELECT * FROM questions WHERE knowledge_point IS NOT NULL AND knowledge_point != ""', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    let processedCount = 0;
    const totalCount = rows.length;

    if (totalCount === 0) {
      res.json({ message: '没有需要迁移的知识点' });
      return;
    }

    const processNext = (index) => {
      if (index >= totalCount) {
        res.json({ message: `成功迁移了 ${processedCount} 道题目的知识点到自定义标签` });
        return;
      }

      const question = rows[index];
      
      // 解析现有的custom_tags
      let existingTags = [];
      if (question.custom_tags) {
        try {
          existingTags = JSON.parse(question.custom_tags);
        } catch (e) {
          existingTags = [];
        }
      }
      
      // 添加知识点到自定义标签（如果不存在）
      if (question.knowledge_point && !existingTags.includes(question.knowledge_point)) {
        existingTags.push(question.knowledge_point);
      }
      
      // 更新数据库
      const customTagsJson = existingTags.length > 0 ? JSON.stringify(existingTags) : null;
      
      db.run('UPDATE questions SET custom_tags = ?, knowledge_point = NULL WHERE id = ?', [customTagsJson, question.id], function(err) {
        if (err) {
          console.error('迁移知识点失败:', err);
        } else {
          processedCount++;
        }
        processNext(index + 1);
      });
    };

    processNext(0);
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
