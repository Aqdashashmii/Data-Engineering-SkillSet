require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST || 'acela.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 25984,
    ssl: {
        rejectUnauthorized: false
    }
};

(async () => {
    try {
        const conn = await mysql.createConnection(dbConfig);
        console.log("✅ Railway MySQL Connected!");
        await conn.end();
    } catch (err) {
        console.error("❌ Database Connection Failed");
        console.error(err);
    }
})();

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const conn = await mysql.createConnection(dbConfig);

        const hash = await bcrypt.hash(password, 10);

        await conn.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email.toLowerCase(), hash]
        );

        await conn.end();

        res.json({
            success: true,
            message: 'Account created successfully'
        });

    } catch (err) {

        console.error(err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.json({
                success: false,
                message: 'Email already registered'
            });
        }

        res.json({
            success: false,
            message: 'Server error'
        });
    }
});

// Login
app.post('/api/login', async (req, res) => {

    const { email, password } = req.body;

    try {

        const conn = await mysql.createConnection(dbConfig);

        const [rows] = await conn.execute(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        await conn.end();

        if (!rows.length) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        const user = rows[0];

        const match = await bcrypt.compare(
            password,
            user.password
        );

        if (!match) {
            return res.json({
                success: false,
                message: 'Wrong password'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {

        console.error(err);

        res.json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get User Skills
app.get('/api/skills/:userId', async (req, res) => {

    try {

        const conn = await mysql.createConnection(dbConfig);

        const [rows] = await conn.execute(
            `SELECT skill_name,
                    percentage,
                    status
             FROM user_skills
             WHERE user_id = ?`,
            [req.params.userId]
        );

        await conn.end();

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false
        });
    }
});

// Save / Update Skill
app.post('/api/skills/update', async (req, res) => {

    const {
        user_id,
        skill_name,
        percentage,
        status
    } = req.body;

    try {

        const conn = await mysql.createConnection(dbConfig);

        await conn.execute(
            `
            INSERT INTO user_skills
            (
                user_id,
                skill_name,
                percentage,
                status
            )
            VALUES (?, ?, ?, ?)

            ON DUPLICATE KEY UPDATE
                percentage = VALUES(percentage),
                status = VALUES(status)
            `,
            [
                user_id,
                skill_name,
                percentage,
                status
            ]
        );

        await conn.end();

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false
        });
    }
});

// Health Check
app.get('/', (req, res) => {
    res.send('🚀 Skill Tracker Backend Running');
});

const PORT = process.env.PORT || 3001;

app.get('/db-test', async (req, res) => {
    try {
        const conn = await mysql.createConnection(dbConfig);

        const [rows] = await conn.execute('SELECT NOW() as current_time');

        await conn.end();

        res.json({
            success: true,
            database_connected: true,
            result: rows
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            database_connected: false,
            error: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `🚀 Server running on port ${PORT}`
    );
});