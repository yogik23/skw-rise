const { ethers } = require('ethers');
const fs = require("fs");
const path = require("path");
const chalk = require('chalk');
const { displayskw } = require('./skw/displayskw');

const {
  warpamount,
  unwarpamount,
  supplyWETH,
  borrowUSDT,
  wdETHAmount,
  swapPairs,
  approve,
  dodo_ROUTER,
  delay
} = require('./skw/config');

const {
  supply,
  borrow,
  repay,
  Collateral,
  withdrawETH
} = require('./skw/inari');

const {
  deposit,
  withdraw,
  swap,
} = require('./skw/gaspump');

const RPC = "https://testnet.riselabs.xyz";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);


async function main() {
  console.clear();
  displayskw();
  
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.cyan(`🔑 Wallet: ${wallet.address}\n`));

    await deposit(wallet, warpamount);
    await delay(3000);

    for (const pair of swapPairs) {
      await approve(wallet, pair.from, pair.amount, dodo_ROUTER);
      await swap(wallet, pair.amount, pair.from, pair.to);
      await delay(3000);
  }

    await withdraw(wallet, unwarpamount);
    await delay(3000);

    await supply(wallet, supplyWETH);
    await delay(3000);

    await borrow(wallet, borrowUSDT);
    await delay(3000);

    await repay(wallet);
    await delay(3000);
    
    await withdrawETH(wallet, wdETHAmount);
    await delay(3000);
  }
}

main();
