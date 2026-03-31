/**
 * End-to-end test script for the IP Geolocation API.
 * Run with: node test.js
 */
const http = require('http');

const PORT = 3001;
process.env.PORT = String(PORT);

require('./server.js');

setTimeout(() => {
  console.log('\n--- Testing Health Endpoint ---');
  http.get(`http://localhost:${PORT}/health`, (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', d);

      console.log('\n--- Testing Project Creation ---');
      const postData = JSON.stringify({ name: 'Test Project' });
      const opts = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/projects',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req2 = http.request(opts, (res2) => {
        let d2 = '';
        res2.on('data', (c) => (d2 += c));
        res2.on('end', () => {
          console.log('Status:', res2.statusCode);
          console.log('Response:', d2);

          const proj = JSON.parse(d2);
          const apiKey = proj.data.apiKey;

          console.log('\n--- Testing Location (no API key) ---');
          http.get(`http://localhost:${PORT}/api/location`, (res3) => {
            let d3 = '';
            res3.on('data', (c) => (d3 += c));
            res3.on('end', () => {
              console.log('Status:', res3.statusCode, '(expected 401)');

              console.log('\n--- Testing Location (with API key, ip=8.8.8.8) ---');
              const opts2 = {
                hostname: 'localhost',
                port: PORT,
                path: '/api/location?ip=8.8.8.8',
                headers: { 'x-api-key': apiKey },
              };
              http.get(opts2, (res4) => {
                let d4 = '';
                res4.on('data', (c) => (d4 += c));
                res4.on('end', () => {
                  console.log('Status:', res4.statusCode);
                  const loc = JSON.parse(d4);
                  console.log('Success:', loc.success);
                  if (loc.data) {
                    console.log('IP:', loc.data.ip);
                    console.log('City:', loc.data.city);
                    console.log('Country:', loc.data.country);
                  }
                  console.log('\n--- All tests completed ---');
                  process.exit(0);
                });
              });
            });
          });
        });
      });
      req2.write(postData);
      req2.end();
    });
  });
}, 2000);
