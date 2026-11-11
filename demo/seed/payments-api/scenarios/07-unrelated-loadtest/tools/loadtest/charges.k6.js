// k6 load test for POST /v2/charges against the staging environment.
// Run: k6 run -e BASE_URL=https://payments.staging.acme.dev tools/loadtest/charges.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = JSON.parse(open('./profile.json'));

export default function () {
  const res = http.post(
    `${__ENV.BASE_URL}/v2/charges`,
    JSON.stringify({ amount: 1999, currency: 'EUR', source: 'src_loadtest' }),
    { headers: { 'content-type': 'application/json', 'idempotency-key': uuidv4() } },
  );
  check(res, { 'status is 201': (r) => r.status === 201 });
  sleep(0.5);
}
