const { ethers } = require('ethers');
const fs = require("fs");
const path = require("path");
const chalk = require('chalk');

const RPC = "https://testnet.riselabs.xyz";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const USDT_ADDRESS = "0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849";
const inari_ROUTER = "0x81edb206Fd1FB9dC517B61793AaA0325c8d11A23";
const Withdraw_ROUTER = "0x832E537e88d0E8E5bb4eFb735F521A9A0E085e0A";

const erc20_abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const inari_abi = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external returns (bool)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external returns (bool)",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (bool)",
  "function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external returns (bool)",
  "function previewRedeem(uint256 shares) view returns (uint256 assets)",
  "function balanceOf(address owner) view returns (uint256)",
  "function withdraw(address asset, uint256 amount, address to) external returns (bool)"
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    const amount = ethers.parseUnits(borrowUSDT, 8); // <- ini betul sekarang
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

async function main() {
  console.clear();
  
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.cyan(`🔑 Wallet: ${wallet.address}\n`));

    const supplyWETH = "0.0001";
    const borrowUSDT = "0.001";
    const wdETHAmount = "0.00001";

    await supply(wallet, supplyWETH);
    await delay(5000);

    await borrow(wallet, borrowUSDT);
    await delay(5000);

    await repay(wallet);
    await delay(5000);

    await withdrawETH(wallet, wdETH);
    await delay(5000);
  }
}

main();
