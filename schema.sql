CREATE TABLE `httplog` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `url` text NOT NULL,
  `method` text NOT NULL,
  `headers` text NOT NULL,
  `body` text NOT NULL,
  `authed` boolean NOT NULL,
  `timestamp` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `timestamp` (`timestamp` DESC)
);

CREATE TABLE `sensor` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mac` varchar(20) NOT NULL,
  `sensorId` int unsigned NOT NULL,
  `place` varchar(10) NOT NULL,
  `lat` float(10),
  `lon` float(10),
  PRIMARY KEY (`id`),
  UNIQUE (`mac`)
);

CREATE TABLE `sensorlog` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sensor_id` int unsigned NOT NULL,
  `data_datetime` timestamp NOT NULL,
  `temp_f` int NOT NULL,
  `humidity` int NOT NULL,
  `dewpoint_f` int NOT NULL,
  `pressure` int NOT NULL,
  `pm2_5_aqi` int NOT NULL,
  `pm2_5_cf_1` float(2) NOT NULL,
  `pm2_5_atm` float(2) NOT NULL,
  `timestamp` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE `sensor_datetime` (`sensor_id`, `data_datetime` DESC),
  INDEX (`sensor_id`),
  INDEX (`data_datetime` DESC),
  INDEX (`timestamp` DESC)
);
