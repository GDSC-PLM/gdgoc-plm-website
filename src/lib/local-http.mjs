export function loopbackHttp(value) {
  return typeof value === "string" && /^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(value)
    && Number(value.slice("http://127.0.0.1:".length)) <= 65535;
}
