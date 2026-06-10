// Ensure this server is running on port 3001
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'auth_db'
};

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const conn = await mysql.createConnection(dbConfig);
        const hash = await bcrypt.hash(password, 10);
        await conn.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);
        await conn.end();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.code === 'ER_DUP_ENTRY' ? 'Email taken.' : 'Server Error.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
        await conn.end();
        if (!rows.length) return res.json({ success: false, message: 'User not found.' });
        const match = await bcrypt.compare(password, rows[0].password);
        if (!match) return res.json({ success: false, message: 'Wrong password.' });
        res.json({ success: true, user: { id: rows[0].id, name: rows[0].name } });
    } catch (err) { res.json({ success: false }); }
});

app.get('/api/skills/:userId', async (req, res) => {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT skill_name, percentage, status FROM user_skills WHERE user_id = ?', [req.params.userId]);
    await conn.end();
    res.json(rows);
});

app.post('/api/skills/update', async (req, res) => {
    const { user_id, skill_name, percentage, status } = req.body;
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
        `INSERT INTO user_skills (user_id, skill_name, percentage, status) VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE percentage = ?, status = ?`,
        [user_id, skill_name, percentage, status, percentage, status]
    );
    await conn.end();
    res.json({ success: true });
});

app.listen(3001, () => {
    console.log('✅ Server running at http://localhost:3001');
});