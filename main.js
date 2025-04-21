const axios = require('axios');
const { ethers } = require('ethers');
const fs = require("fs");
const path = require("path");
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
  delay
} = require('./skw/config');

const RPC = "https://testnet.riselabs.xyz";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

async function getRouteData(wallet, amountIn, fromTokenAddress, toTokenAddress, retries = 3) {
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + 60 * 1;
  const amount = ethers.parseUnits(amountIn.toString(), 18).toString();
  const url = `https://api.dodoex.io/route-service/v2/widget/getdodoroute?chainId=11155931&deadLine=${deadline}&apikey=a37546505892e1a952&slippage=5&source=dodoV2AndMixWasm&toTokenAddress=${toTokenAddress}&fromTokenAddress=${fromTokenAddress}&userAddr=${wallet.address}&estimateGas=true&fromAmount=${amount}`;

  console.log(chalk.hex('#7B68EE')(`🔍 Mendapatkan Kuota Swap`));
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(url);
      if (res.data?.data?.resAmount && res.data?.data?.data) {
        return {
          resAmount: res.data.data.resAmount,
          txData: res.data.data.data,
          targetContract: res.data.data.to,
          minReturnAmount: res.data.data.minReturnAmount
        };
      } else {

      }
    } catch (err) {
      console.error("Error fetching route:", err.message);
    }

    if (i < retries) {
      console.log(chalk.hex('#FF8C00')(`🔁 Mencoba Ulang ${i + 1}...`));
      await delay(3000);
    }
  }
  return null;
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

async function main() {
  console.clear();

  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.cyan(`🔑 Wallet: ${wallet.address}\n`));

    for (const pair of swapPairs) {
      await swap(wallet, pair.amount, pair.from, pair.to);
      await delay(5000);
    }
  }
}

main();
