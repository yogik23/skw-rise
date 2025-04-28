const { ethers } = require('ethers');
const chalk = require('chalk');

const {
  approve,
  delay,
  supplyWETH,
  borrowUSDT,
  wdETHAmount,
  inari_ROUTER,
  inari_abi,
  WETH_ADDRESS,
  USDT_ADDRESS
 } = require('./config');

async function supply(wallet, supplyWETH) {
  try {
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

module.exports = {
  supply,
  borrow,
  repay,
  Collateral,
  withdrawETH
};
