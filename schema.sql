-- D1 Schema for weather.withmatt.com

CREATE TABLE httplog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  method TEXT NOT NULL,
  headers TEXT NOT NULL, -- Consider storing as JSON string
  body TEXT NOT NULL,    -- Consider storing as JSON string
  authed INTEGER NOT NULL, -- 0 for false, 1 for true
  timestamp TEXT NOT NULL -- Store as ISO8601 string e.g., YYYY-MM-DDTHH:MM:SSZ
);

CREATE INDEX idx_httplog_timestamp ON httplog (timestamp DESC);

CREATE TABLE sensor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mac TEXT NOT NULL UNIQUE,
  sensorId INTEGER NOT NULL,
  place TEXT NOT NULL,
  lat REAL,
  lon REAL
);

CREATE TABLE sensorlog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_id INTEGER NOT NULL,
  data_datetime TEXT NOT NULL,    -- Store as ISO8601 string
  temp_f INTEGER NOT NULL,
  humidity INTEGER NOT NULL,
  dewpoint_f INTEGER NOT NULL,
  pressure REAL NOT NULL,         -- Changed to REAL
  pm2_5_aqi INTEGER NOT NULL,
  pm2_5_cf_1 REAL NOT NULL,
  pm2_5_atm REAL NOT NULL,
  timestamp TEXT NOT NULL,        -- Store as ISO8601 string (for the log entry itself)
  FOREIGN KEY (sensor_id) REFERENCES sensor(id)
);

CREATE UNIQUE INDEX idx_sensorlog_sensor_datetime ON sensorlog (sensor_id, data_datetime DESC);
CREATE INDEX idx_sensorlog_sensor_id ON sensorlog (sensor_id);
CREATE INDEX idx_sensorlog_data_datetime ON sensorlog (data_datetime DESC);
CREATE INDEX idx_sensorlog_timestamp ON sensorlog (timestamp DESC);

-- Seed data for the sensor table
INSERT INTO sensor (id, mac, sensorId, place, lat, lon) VALUES (1, 'a8:48:fa:cb:be:82', 35471, 'inside', 39.4421, -119.726);
INSERT INTO sensor (id, mac, sensorId, place, lat, lon) VALUES (2, '44:17:93:1:e8:e6', 711, 'outside', 39.4422, -119.726);