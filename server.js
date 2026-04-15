const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files (HTML, CSS, JS) from the current directory
app.use(express.static(path.join(__dirname)));

// ─── BINANCE PROXY ─────────────────────────────────────────────────────────────
// This endpoint proxies any Binance Futures API request from the browser,
// bypassing CORS restrictions since the request is made server-side.
app.get('/api/binance/*', (req, res) => {
  // Build the Binance URL from the request path + query string
  // e.g. /api/binance/fapi/v1/ticker/24hr?symbol=BTCUSDT
  //   -> https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT
  const binancePath = req.params[0]; // everything after /api/binance/
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const binanceUrl = `https://fapi.binance.com/${binancePath}${queryString}`;

  console.log(`[PROXY] ${req.method} ${binanceUrl}`);

  https.get(binanceUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LiquidexProxy/1.0)',
      'Accept': 'application/json',
    }
  }, (proxyRes) => {
    let data = '';

    proxyRes.on('data', (chunk) => {
      data += chunk;
    });

    proxyRes.on('end', () => {
      // Forward Binance's status code
      res.status(proxyRes.statusCode);
      res.setHeader('Content-Type', 'application/json');
      // Allow the browser to read it
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(data);
    });
  }).on('error', (err) => {
    console.error(`[PROXY ERROR] ${err.message}`);
    res.status(502).json({ error: 'Failed to reach Binance API', detail: err.message });
  });
});

// ─── START ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   LIQUIDEX Server running                    ║');
  console.log(`  ║   http://localhost:${PORT}                      ║`);
  console.log(`  ║   Open: http://localhost:${PORT}/btc_eth_swing_predictor.html  ║`);
  console.log('  ║   Binance proxy: /api/binance/*              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});
