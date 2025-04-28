const { ethers } = require('ethers');
const fs = require("fs");
const path = require("path");
const chalk = require('chalk');

const {
  WETH_ADDRESS,
  USDT_ADDRESS,
  inari_ROUTER,
  erc20_abi,
  inari_abi,
  checkBalance,
  delay,
  wdETHAmount,
  borrowUSDT,
  supplyWETH,
} = require('./skw/config');

const RPC = "https://testnet.riselabs.xyz";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

async function approve(wallet, fromTokenAddress, SPENDER, amountIn) {
  const token = new ethers.Contract(fromTokenAddress, erc20_abi, wallet);
  const allowance = await token.allowance(wallet.address, SPENDER );
  if (allowance < amountIn) {
    console.log(chalk.hex('#20B2AA')(`🔓 Approving `));
    const tx = await token.approve(SPENDER, ethers.MaxUint256);
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Approved `));
  }
}

async function supply(wallet, supplyWETH) {
  try {
    const WETHBALANCE = await checkBalance(wallet, WETH_ADDRESS);
    const balanceFormatted = parseFloat(WETHBALANCE).toFixed(4);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo WETH: ${balanceFormatted}`));

    const amount = ethers.parseUnits(supplyWETH, 18);
    const supplyca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Supply ${supplyWETH} WETH`));
    await approve(wallet, WETH_ADDRESS, inari_ROUTER, supplyWETH);

    const tx = await supplyca.supply(
      WETH_ADDRESS,
      amount,
      wallet.address,
      0,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Supply sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat supply:"), err.reason || err.message);
  }
}

async function borrow(wallet, borrowUSDT) {
  try {
    const USDTBALANCE = await checkBalance(wallet, USDT_ADDRESS);
    const balanceFormatted = parseFloat(USDTBALANCE).toFixed(4);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo USDT: ${balanceFormatted}`));

    const amount = ethers.parseUnits(borrowUSDT, 8);
    const borrowca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Borrow ${borrowUSDT} USDT`));

    const tx = await borrowca.borrow(
      USDT_ADDRESS,
      amount,
      2,
      0,
      wallet.address,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Borrow sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat Borrow:"), err.reason || err.message);
  }
}

async function repay(wallet) {
  try {
    const amount = ethers.MaxUint256;
    const repayca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);
    console.log(chalk.hex('#20B2AA')(`🔁 Repay MAX `));
    await approve(wallet, USDT_ADDRESS, inari_ROUTER, amount);

    const tx = await repayca.repay(
      USDT_ADDRESS,
      amount,
      2,
      wallet.address,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Repay sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat Repay:"), err.reason || err.message);
  }
}

async function Collateral(wallet) {
  try {
    const collateralca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);
    console.log(chalk.hex('#20B2AA')(`🔁 Remove Collateral `));

    const tx = await collateralca.setUserUseReserveAsCollateral(
      WETH_ADDRESS,
      false,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Remove Collateral sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat Repay:"), err.reason || err.message);
  }
}

async function withdrawETH(wallet, wdETHAmount) {
  try {
    const amount = ethers.parseUnits(wdETHAmount, 18);
    const withdrawca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Withdraw ${wdETHAmount} ETH`));

    await Collateral(wallet);
    await approve(wallet, WETH_ADDRESS, inari_ROUTER, amount);

    const tx = await withdrawca.withdraw(
      WETH_ADDRESS,
      amount,
      wallet.address,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Withdraw sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat Withdraw:"), err.reason || err.message);
  }
}

async function lendingmain() {
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);

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

module.exports = { lendingmain };

if (require.main === module) {
  lendingmain();
}
