const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ====================== CẤU HÌNH DB ======================
const config = {
  user: "sa",             // đổi theo user SQL Server của bạn
  password: "12345",      // mật khẩu sa
  server: "LAPTOP-MGMP18M6", // tên server (hoặc IP, hoặc "hostname,1433")
  database: "ev_charging1",
  options: {
    encrypt: true,              // bắt buộc với Azure, với local thì true cũng ok
    trustServerCertificate: true,
    // instanceName: "SQLEXPRESS"  // nếu dùng named instance thì mở dòng này
  }
};

// ====================== API ==============================

// Lấy tất cả trạm sạc (có trụ + cổng)
app.get("/stations", async (req, res) => {
  try {
    let pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT s.id AS station_id, s.name, s.address, s.latitude, s.longitude, s.open_hours, s.notes,
             c.id AS charger_id, c.name AS charger_name, c.power_kw, c.status AS charger_status,
             co.id AS connector_id, co.type AS connector_type, co.status AS connector_status, co.price_per_kwh
      FROM charging_stations s
      LEFT JOIN chargers c ON s.id = c.station_id
      LEFT JOIN connectors co ON c.id = co.charger_id
      ORDER BY s.id, c.id, co.id
    `);

    const stations = {};
    result.recordset.forEach(r => {
      // Tạo station nếu chưa có
      if (!stations[r.station_id]) {
        stations[r.station_id] = {
          id: r.station_id,
          name: r.name,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          open_hours: r.open_hours,
          notes: r.notes,
          chargers: []
        };
      }

      // Nếu có charger
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

        // Nếu có connector
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

// Lấy chi tiết 1 trạm theo ID
app.get("/stations/:id", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const stationId = req.params.id;

    const result = await pool.request()
      .input("stationId", sql.Int, stationId)
      .query(`
        SELECT s.id AS station_id, s.name, s.address, s.latitude, s.longitude, s.open_hours, s.notes,
               c.id AS charger_id, c.name AS charger_name, c.power_kw, c.status AS charger_status,
               co.id AS connector_id, co.type AS connector_type, co.status AS connector_status, co.price_per_kwh
        FROM charging_stations s
        LEFT JOIN chargers c ON s.id = c.station_id
        LEFT JOIN connectors co ON c.id = co.charger_id
        WHERE s.id = @stationId
        ORDER BY s.id, c.id, co.id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Station not found" });
    }

    const station = {
      id: result.recordset[0].station_id,
      name: result.recordset[0].name,
      address: result.recordset[0].address,
      latitude: result.recordset[0].latitude,
      longitude: result.recordset[0].longitude,
      open_hours: result.recordset[0].open_hours,
      notes: result.recordset[0].notes,
      chargers: []
    };

    const chargerMap = {};
    result.recordset.forEach(r => {
      if (r.charger_id) {
        if (!chargerMap[r.charger_id]) {
          chargerMap[r.charger_id] = {
            id: r.charger_id,
            name: r.charger_name,
            power_kw: r.power_kw,
            status: r.charger_status,
            connectors: []
          };
          station.chargers.push(chargerMap[r.charger_id]);
        }

        if (r.connector_id) {
          chargerMap[r.charger_id].connectors.push({
            id: r.connector_id,
            type: r.connector_type,
            status: r.connector_status,
            price_per_kwh: r.price_per_kwh
          });
        }
      }
    });

    res.json(station);
  } catch (err) {
    console.error("❌ Lỗi database:", err);
    res.status(500).send("Database error");
  }
});

// ===========================================================

// Khởi động server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API chạy ở http://localhost:${PORT}/stations`);
});
