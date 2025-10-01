const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());

// Kết nối SQL Server
const config = {
  user: "sa",
  password: "12345",
  server: "LAPTOP-MGMP18M6", // tên máy chủ SQL Server
  database: "ev_charging",
  options: {
    encrypt: true,              // bật encrypt
    trustServerCertificate: true // cho phép chứng chỉ self-signed
  }
};

app.get("/stations", async (req, res) => {
  try {
    let pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT s.id AS station_id, s.name, s.address, s.latitude, s.longitude, s.open_hours,
             c.id AS charger_id, c.name AS charger_name, c.power_kw, c.status AS charger_status,
             co.id AS connector_id, co.type AS connector_type, co.status AS connector_status, co.price_per_kwh
      FROM charging_stations s
      LEFT JOIN chargers c ON s.id = c.station_id
      LEFT JOIN connectors co ON c.id = co.charger_id
    `);

    // Gom dữ liệu thành JSON theo station → charger → connector
    const stations = {};
    result.recordset.forEach(r => {
      if (!stations[r.station_id]) {
        stations[r.station_id] = {
          id: r.station_id,
          name: r.name,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          open_hours: r.open_hours,
          chargers: []
        };
      }
      if (r.charger_id) {
        let charger = stations[r.station_id].chargers.find(ch => ch.id === r.charger_id);
        if (!charger) {
          charger = {
            id: r.charger_id,
            name: r.charger_name,
            power_kw: r.power_kw,
            status: r.charger_status,
            connectors: []
          };
          stations[r.station_id].chargers.push(charger);
        }
        if (r.connector_id) {
          charger.connectors.push({
            id: r.connector_id,
            type: r.connector_type,
            status: r.connector_status,
            price_per_kwh: r.price_per_kwh
          });
        }
      }
    });

    res.json(Object.values(stations));
  } catch (err) {
    console.error("❌ Lỗi database:", err);
    res.status(500).send("Database error");
  }
});

app.listen(3000, () =>
  console.log("✅ API chạy ở http://localhost:3000/stations")
);
