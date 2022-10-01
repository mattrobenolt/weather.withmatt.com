import { Client } from "@planetscale/database";

export const config = {
  runtime: "experimental-edge",
};

const db = new Client({
  url: process.env.DATABASE_URL,
});

const uploadAuthKey = process.env.UPLOAD_AUTH_KEY;

function atoi(a) {
  return parseInt(a, 10);
}

function parseDatetime(dt) {
  const regexp = /^(\d{4})\/(\d{2})\/(\d{2})T(\d{2}):(\d{2}):(\d{2})z$/;
  const [_, year, month, day, hour, min, sec] = dt.match(regexp);

  return new Date(
    Date.UTC(
      atoi(year),
      atoi(month) - 1,
      atoi(day),
      atoi(hour),
      atoi(min),
      atoi(sec)
    )
  );
}

function sensorFromBody(body) {
  return {
    mac: body.SensorId,
    sensorId: body.Id,
    place: body.place,
    lat: body.lat,
    lon: body.lon,
  };
}

function dataFromBody(sensorId, body) {
  return {
    sensor_id: sensorId,
    data_datetime: parseDatetime(body.DateTime),
    temp_f: body.current_temp_f,
    humidity: body.current_humidity,
    dewpoint_f: body.current_dewpoint_f,
    pressure: body.pressure,
    pm2_5_aqi: body["pm2.5_aqi"],
    pm2_5_cf_1: body.pm2_5_cf_1,
    pm2_5_atm: body.pm2_5_atm,
  };
}

async function ensureSensor(conn, data) {
  try {
    await conn.execute(
      "UPDATE `sensor` SET `sensorId`=?, `place`=?, `lat`=?, `lon`=? WHERE `mac`=?",
      [data.sensorId, data.place, data.lat, data.lon, data.mac]
    );
  } catch (e) {
    try {
      await conn.execute(
        "INSERT INTO `sensor` (`mac`, `sensorId`, `place`, `lat`, `lon`) VALUES (?, ?, ?, ?, ?)",
        [data.mac, data.sensorId, data.place, data.lat, data.lon]
      );
    } catch (e) {}
  }
  const result = await conn.execute(
    "SELECT `id` FROM `sensor` WHERE `mac`=? LIMIT 1",
    [data.mac]
  );
  return result.rows[0].id;
}

export default async function handler(req: Request) {
  const url = req.url;
  const method = req.method;
  const headers = [...req.headers.entries()];
  var body;
  try {
    body = await req.json();
  } catch (e) {
    body = null;
  }

  const authed = req.headers.get("key") == uploadAuthKey;

  const conn = db.connection();

  await conn.execute(
    "INSERT INTO `httplog` (`url`, `method`, `headers`, `body`, `authed`, `timestamp`) VALUES (?, ?, ?, ?, ?, NOW())",
    [url, method, JSON.stringify(headers), JSON.stringify(body), authed]
  );

  if (!authed) {
    return new Response("nope", {
      status: 403,
    });
  }

  if (req.method != "POST" || body === null) {
    return new Response("bad request", {
      status: 405,
    });
  }

  const sensorId = await ensureSensor(conn, sensorFromBody(body));
  const data = dataFromBody(sensorId, body);

  try {
    await conn.execute(
      "INSERT INTO `sensorlog` (`sensor_id`, `data_datetime`, `temp_f`, `humidity`, `dewpoint_f`, `pressure`, `pm2_5_aqi`, `pm2_5_cf_1`, `pm2_5_atm`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [
        data.sensor_id,
        data.data_datetime.toISOString().replace(/Z$/, ""),
        data.temp_f,
        data.humidity,
        data.dewpoint_f,
        data.pressure,
        data.pm2_5_aqi,
        data.pm2_5_cf_1,
        data.pm2_5_atm,
      ]
    );
  } catch (e) {
    console.log(e);
  }

  return new Response("ok");
}
