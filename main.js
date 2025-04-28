const { main: swapMain } = require('./gaspump');
const { main: lendingMain } = require('./inari');
const { displayskw } = require('./skw/displayskw');

async function run() {
  console.clear();
  displayskw();
  await swapMain();

  await lendingMain();

  console.log("✅ Semua proses selesai.");
}

run();
