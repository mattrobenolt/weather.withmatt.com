export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  UPLOAD_AUTH_KEY?: string;
}

function atoi(a: string | null): number {
  return Number.parseInt(String(a ?? ""), 10);
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json;charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

// Payload shape sent by the PurpleAir sensor
type UploadBody = {
  SensorId: string;
  Id: number;
  place: string;
  lat?: number;
  lon?: number;
  DateTime: string;
  current_temp_f: number;
  current_humidity: number;
  current_dewpoint_f?: number;
  pressure: number;
  "pm2.5_aqi": number;
  pm2_5_cf_1: number;
  pm2_5_atm: number;
};

function parseDatetime(dt: string): Date {
  // Expecting e.g., 2022/10/01T05:23:27z (lowercase z)
  const regexp = /^(\d{4})\/(\d{2})\/(\d{2})T(\d{2}):(\d{2}):(\d{2})z$/;
  const m = dt.match(regexp);
  if (!m) return new Date(dt); // fallback to Date parsing
  const [, year, month, day, hour, min, sec] = m;
  return new Date(Date.UTC(+year, +month - 1, +day, +hour, +min, +sec));
}

function parseDewpoint(dp: unknown): number {
  return typeof dp === "number" && Number.isFinite(dp) ? dp : 0;
}

async function handleSeries(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;
  const sensorId = atoi(params.get("id"));
  const limit = atoi(params.get("limit")) || 10;

  if (Number.isNaN(sensorId)) {
    return jsonResponse({}, { status: 400 });
  }

  const stmt = env.DB.prepare(
    "SELECT strftime('%s', data_datetime) AS unix_data_datetime, temp_f, humidity, dewpoint_f, pressure, pm2_5_aqi, pm2_5_cf_1, pm2_5_atm FROM sensorlog WHERE sensor_id = ? ORDER BY data_datetime DESC LIMIT ?",
  ).bind(sensorId, limit);

  const { results } = await stmt.all();
  if (!results || results.length === 0) {
    return jsonResponse({}, { status: 404 });
  }

  const resp = {
    id: sensorId,
    limit,
    series: results,
  };

  return jsonResponse(resp, {
    headers: {
      "access-control-allow-origin": "*",
    },
  });
}

async function ensureSensor(
  env: Env,
  data: {
    mac: string;
    sensorId: number;
    place: string;
    lat?: number;
    lon?: number;
  },
): Promise<number> {
  await env.DB.prepare(
    "INSERT INTO sensor (mac, sensorId, place, lat, lon) VALUES (?, ?, ?, ?, ?) ON CONFLICT(mac) DO UPDATE SET sensorId=excluded.sensorId, place=excluded.place, lat=excluded.lat, lon=excluded.lon",
  )
    .bind(
      data.mac,
      data.sensorId,
      data.place,
      data.lat ?? null,
      data.lon ?? null,
    )
    .run();

  const row = await env.DB.prepare(
    "SELECT id FROM sensor WHERE mac = ? LIMIT 1",
  )
    .bind(data.mac)
    .first<{ id: number }>();

  if (!row) throw new Error("Failed to upsert/fetch sensor");
  return row.id;
}

function sensorFromBody(body: UploadBody) {
  return {
    mac: body.SensorId,
    sensorId: body.Id,
    place: body.place,
    lat: body.lat,
    lon: body.lon,
  } as {
    mac: string;
    sensorId: number;
    place: string;
    lat?: number;
    lon?: number;
  };
}

function dataFromBody(sensorId: number, body: UploadBody) {
  const when = parseDatetime(body.DateTime);
  return {
    sensor_id: sensorId,
    data_datetime: when.toISOString(),
    temp_f: body.current_temp_f,
    humidity: body.current_humidity,
    dewpoint_f: parseDewpoint(body.current_dewpoint_f),
    pressure: body.pressure,
    pm2_5_aqi: body["pm2.5_aqi"],
    pm2_5_cf_1: body.pm2_5_cf_1,
    pm2_5_atm: body.pm2_5_atm,
  } as {
    sensor_id: number;
    data_datetime: string;
    temp_f: number;
    humidity: number;
    dewpoint_f: number;
    pressure: number;
    pm2_5_aqi: number;
    pm2_5_cf_1: number;
    pm2_5_atm: number;
  };
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const url = request.url;
  const method = request.method;
  const headersArr = [...request.headers.entries()];

  let body: UploadBody | null = null;
  try {
    body = (await request.json()) as UploadBody;
  } catch (_e) {
    body = null;
  }

  const authed = request.headers.get("key") === env.UPLOAD_AUTH_KEY;

  // Log request
  await env.DB.prepare(
    "INSERT INTO httplog (url, method, headers, body, authed, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      url,
      method,
      JSON.stringify(headersArr),
      JSON.stringify(body),
      authed ? 1 : 0,
      new Date().toISOString(),
    )
    .run();

  if (!authed) {
    return new Response("nope", { status: 403 });
  }

  if (method !== "POST" || body === null) {
    return new Response("bad request", { status: 405 });
  }

  const sensorId = await ensureSensor(env, sensorFromBody(body));
  const data = dataFromBody(sensorId, body);

  try {
    await env.DB.prepare(
      "INSERT INTO sensorlog (sensor_id, data_datetime, temp_f, humidity, dewpoint_f, pressure, pm2_5_aqi, pm2_5_cf_1, pm2_5_atm, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        data.sensor_id,
        data.data_datetime,
        data.temp_f,
        data.humidity,
        data.dewpoint_f,
        data.pressure,
        data.pm2_5_aqi,
        data.pm2_5_cf_1,
        data.pm2_5_atm,
        new Date().toISOString(),
      )
      .run();
  } catch (e) {
    // Keep behavior similar to original (log but continue)
    console.log(e);
  }

  return new Response("ok");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/api/series") {
      return handleSeries(request, env);
    }
    if (pathname === "/api/upload") {
      return handleUpload(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
