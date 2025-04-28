const { swapmain } = require('./gaspump');
const { lendingmain } = require('./inari');
const { displayskw } = require('./skw/displayskw');

(async () => {
  console.clear();
  displayskw();
  await swapmain();
  await lendingmain();
})();
