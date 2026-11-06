const fs = require("node:fs");
const crypto = require("node:crypto");

const LABELS = {
  permanent: "PERMANENTE",
  "1h": "1 HORA",
  "3h": "3 HORAS",
  "5h": "5 HORAS",
  "7h": "7 HORAS",
  "1d": "1 DÍA",
  "2d": "2 DÍAS",
  "5d": "5 DÍAS",
  "7d": "7 DÍAS",
  "20d": "20 DÍAS",
  "25d": "25 DÍAS",
  "30d": "30 DÍAS",
  admin: "ADMIN"
};

const DURATIONS = {
  "1h": 3600, "3h": 10800, "5h": 18000, "7h": 25200,
  "1d": 86400, "2d": 172800, "5d": 432000, "7d": 604800,
  "20d": 1728000, "25d": 2160000, "30d": 2592000
};

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function parseDeviceRequest(input) {
  let value = String(input || "").trim();
  if (value.startsWith("ALX1-REQ-")) value = value.slice("ALX1-REQ-".length);

  let raw;
  try {
    raw = Buffer.from(value, "base64url");
  } catch {
    throw new Error("El ID de dispositivo no tiene un formato válido.");
  }
  if (raw.length !== 32) {
    throw new Error("ID de dispositivo inválido: deben ser 32 bytes (formato ALX1-REQ-...).");
  }
  return base64url(raw);
}

function generateLicense({ deviceRequest, type, clientName, privateKeyPath }) {
  if (!LABELS[type]) throw new Error("Tipo de licencia no válido.");
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(`No encuentro la clave privada PEM en: ${privateKeyPath}`);
  }

  const device = parseDeviceRequest(deviceRequest);
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  const id = crypto.randomBytes(8).toString("hex").toUpperCase();
  const issued = Math.floor(Date.now() / 1000);
  const expires = (type === "permanent" || type === "admin")
    ? 0
    : issued + DURATIONS[type];

  // Formato idéntico al generador del Index.html: no modificar el orden.
  const canonical = ["ALX1", id, device, LABELS[type], String(issued), String(expires)].join("|");
  const signature = crypto.sign(null, Buffer.from(canonical, "utf8"), privateKey);
  const token = `ALX1.${base64url(Buffer.from(canonical, "utf8"))}.${base64url(signature)}`;
  const link = `alexito://activate?license=${encodeURIComponent(token)}`;

  return {
    id, token, link, device, type, label: LABELS[type],
    issued, expires,
    client: String(clientName || "").trim(),
    days: expires ? Math.round((expires - issued) / 86400) : 0
  };
}

module.exports = { generateLicense, LABELS };
