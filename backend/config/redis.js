const redis = require('redis');

let client = null;

const ensureClient = async () => {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL not set');
  const useTls = String(url).startsWith('rediss://');
  client = redis.createClient({ url, socket: useTls ? { tls: true } : {} });
  client.on('error', () => {});
  try { await client.connect(); } catch (e) { client = null; throw e; }
  return client;
};

const sendCommand = async (...args) => {
  const c = await ensureClient();
  return c.sendCommand(args);
};

module.exports = { sendCommand, ensureClient };
