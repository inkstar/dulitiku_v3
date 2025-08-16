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
app.use(bodyParser.json());

// 生产环境静态托管前端构建产物（若存在）
const path = require('path');
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
  const { title, description, questionIds } = req.body;
  const id = uuidv4();

  db.run(
    'INSERT INTO papers (id, title, description) VALUES (?, ?, ?)',
    [id, title, description],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
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
