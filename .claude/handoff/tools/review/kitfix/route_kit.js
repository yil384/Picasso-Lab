// run pfx_test_sized.js with people/fx/kit.js served from KIT_FILE (an experiment, the working tree untouched)
const h = require('../../harness');
const open0 = h.open;
h.open = async (opts) => {
  const r = await open0(opts);
  await r.page.route('**/people/fx/kit.js', rt => rt.fulfill({ path: process.env.KIT_FILE, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript' } }));
  return r;
};
require('./pfx_test_sized.js');
