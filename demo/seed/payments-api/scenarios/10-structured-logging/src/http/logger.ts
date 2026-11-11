// Structured JSON logger, one line per event on stdout.
// Level comes from PAYMENTS_LOG_LEVEL: debug, info, warn or error. Default info.
type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
let threshold = ORDER.info;

export function setLogLevel(level: string): void {
  threshold = ORDER[level as Level] ?? ORDER.info;
}

function serialise(fields: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = v instanceof Error ? { message: v.message, stack: v.stack } : v;
  }
  return out;
}

function write(level: Level, msg: string, fields: Fields = {}): void {
  if (ORDER[level] < threshold) return;
  const line = { time: new Date().toISOString(), level, service: 'payments-api', msg, ...serialise(fields) };
  process.stdout.write(`${JSON.stringify(line)}\n`);
}

export const log = {
  debug: (msg: string, fields?: Fields) => write('debug', msg, fields),
  info: (msg: string, fields?: Fields) => write('info', msg, fields),
  warn: (msg: string, fields?: Fields) => write('warn', msg, fields),
  error: (msg: string, fields?: Fields) => write('error', msg, fields),
};
