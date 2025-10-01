// server.js
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = 3000;

const config = {
  user: 'sa',
  password: '12345',
  server: 'LAPTOP-MGMP18M6', // Đúng tên máy
  database: 'SWP_Topic3',
  options: {
    encrypt: true,
    trustServerCertificate: true // Bạn đã tick trong SSMS
  }
};

app.use(cors());

app.get('/stations', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query('SELECT * FROM charging_stations');
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Lỗi khi truy vấn SQL:', err);
    res.status(500).json({ error: 'Lỗi khi truy vấn dữ liệu', details: err.message });
  } finally {
    sql.close();
  }
});

app.listen(port, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});
