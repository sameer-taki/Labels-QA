'use strict';
/* Vercel serverless entry point.

   All requests are rewritten to this function by vercel.json. It simply delegates to the shared
   request handler exported by ../server.js — the very same handler the long-running on-prem
   server uses behind http.createServer, so there is one code path for both deployments. */
module.exports = require('../server.js');
