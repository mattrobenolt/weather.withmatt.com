import { Client } from "@planetscale/database";

export const config = {
  runtime: "experimental-edge",
};

const db = new Client({
  url: process.env.DATABASE_URL,
});

function atoi(a) {
  return parseInt(a, 10);
}

function jsonResponse(body, init?) {
  if (init == null) {
    init = {};
  }
  if (init.headers == null) {
    init.headers = {};
  }
  init.headers["content-type"] = "application/json;charset=utf-8";
  return new Response(JSON.stringify(body), init);
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const params = new URLSearchParams(url.search);

  const sensorId = atoi(params.get("id"));
  const limit = atoi(params.get("limit")) || 10;

  if (isNaN(sensorId)) {
    return jsonResponse(
      {},
      {
        status: 400,
      }
    );
  }

  const conn = db.connection();

  const result = await db.execute(
    "SELECT `data_datetime`, `temp_f`, `humidity`, `dewpoint_f`, `pressure`, `pm2_5_aqi`, `pm2_5_cf_1`, `pm2_5_atm` FROM `sensorlog` WHERE `sensor_id`=? ORDER BY `data_datetime` DESC LIMIT ?",
    [sensorId, limit]
  );

  if (result.rows.length == 0) {
    return jsonResponse({}, { status: 404 });
  }

  const resp = {
    id: sensorId,
    limit: limit,
    series: result.rows,
  };

  return jsonResponse(resp, {
    headers: {
      "access-control-allow-origin": "*",
    },
  });
}
