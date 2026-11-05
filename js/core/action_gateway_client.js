import net from "node:net";
import path from "node:path";

function explicit(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

export function requestActionGateway({ socketPath, request, timeoutMs = 15000 }) {
  explicit(socketPath, "socketPath");
  if (!path.isAbsolute(socketPath)) throw new TypeError("socketPath must be absolute");
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new TypeError("request must be an object");
  positiveInteger(timeoutMs, "timeoutMs");

  return new Promise((resolve, reject) => {
    let settled = false;
    let buffer = "";
    const socket = net.createConnection(socketPath);
    socket.setEncoding("utf8");

    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err);
      else resolve(value);
    };

    const timer = setTimeout(() => finish(new Error("action gateway request timed out")), timeoutMs);

    socket.on("connect", () => {
      socket.write(JSON.stringify(request) + "\n");
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.length > 1024 * 1024) return finish(new Error("action gateway response exceeded limit"));
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      let response;
      try { response = JSON.parse(buffer.slice(0, newline)); }
      catch { return finish(new Error("action gateway returned invalid JSON")); }
      if (!response || typeof response !== "object" || Array.isArray(response)) {
        return finish(new Error("action gateway returned invalid response"));
      }
      if (response.ok !== true) {
        const err = new Error(String(response.error || "action gateway rejected request"));
        err.name = "ActionGatewayError";
        err.response = response;
        return finish(err);
      }
      finish(null, response);
    });
    socket.on("error", (err) => finish(err));
    socket.on("end", () => {
      if (!settled) finish(new Error("action gateway closed without a response"));
    });
  });
}
