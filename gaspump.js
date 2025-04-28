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
  checkBalance,
  erc20_abi,
  tokenNames,
  tokenDecimals,
  swapPairs,
  delay,
} = require('./skw/config');

const RPC = "https://testnet.riselabs.xyz";
const provider = new ethers.JsonRpcProvider(RPC);

const privateKeys = fs.readFileSync(path.join(__dirname, "privatekey.txt"), "utf-8")
  .split("\n")
  .map(k => k.trim())
  .filter(k => k.length > 0);

async function getRouteData(wallet, amountIn, fromTokenAddress, toTokenAddress, retries = 5) {
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + 60 * 1;
  const amount = ethers.parseUnits(amountIn.toString(), 18).toString();
  const url = `https://api.dodoex.io/route-service/v2/widget/getdodoroute?chainId=11155931&deadLine=${deadline}&apikey=a37546505892e1a952&slippage=5&source=dodoV2AndMixWasm&toTokenAddress=${toTokenAddress}&fromTokenAddress=${fromTokenAddress}&userAddr=${wallet.address}&estimateGas=true&fromAmount=${amount}`;

  const toSymbol = tokenNames[toTokenAddress] || toTokenAddress;
  const fromSymbol = tokenNames[fromTokenAddress] || fromTokenAddress;

  console.log(chalk.hex('#7B68EE')(`🔍 Mendapatkan Kuota Swap  ${amountIn} ${fromSymbol} → ${toSymbol}`));
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
      await delay(4000);
    }
  }
  return null;
}

async function approve(wallet, fromTokenAddress, amountIn) {
  const fromSymbol = tokenNames[fromTokenAddress] || fromTokenAddress;
  const SPENDER  = "0x143bE32C854E4Ddce45aD48dAe3343821556D0c3";

  const token = new ethers.Contract(fromTokenAddress, erc20_abi, wallet);
  const allowance = await token.allowance(wallet.address, SPENDER );
  if (allowance < amountIn) {
    console.log(chalk.hex('#20B2AA')(`🔓 Approving ${fromSymbol}...`));
    const tx = await token.approve(SPENDER, ethers.MaxUint256);
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Approved ${fromSymbol}`));
  }
}

async function deposit(wallet) {
  try {
    const warpamount = "0.001";
    const amount = ethers.parseUnits(warpamount);
    const warp_abi = ["function deposit() external payable"];
    const contract = new ethers.Contract(WETH_ADDRESS, warp_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Warp ${warpamount} ETH → ${warpamount} WETH`));

    const tx = await contract.deposit({
      value: amount,
      gasLimit: 100_000,
    });

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    const receipt = await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Warp successful\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error during deposit:"), err.reason || err.message);
  }
}

async function withdraw(wallet) {
  try {
    const WETHBALANCE = await checkBalance(wallet, WETH_ADDRESS);
    const balanceFormatted = parseFloat(WETHBALANCE).toFixed(4);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo WETH: ${balanceFormatted}`));

    const unwarpamount = "0.00005";
    const amount = ethers.parseUnits(unwarpamount, 18); 
    const unwarp_abi = ["function OwnerTransferV7b711143(uint256) external"];
    const contract = new ethers.Contract(WETH_ADDRESS, unwarp_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Unwarp ${unwarpamount} WETH → ${unwarpamount} ETH`));

    await approve(wallet, WETH_ADDRESS, amount);

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
  const toSymbol = tokenNames[toTokenAddress] || toTokenAddress;
  const fromSymbol = tokenNames[fromTokenAddress] || fromTokenAddress;

  const CEK_BALANCE = await checkBalance(wallet, fromTokenAddress);
  const BALANCE = parseFloat(CEK_BALANCE).toFixed(4);
  console.log(chalk.hex('#20B2AA')(`💰 Saldo ${fromSymbol}: ${BALANCE}`));

  const routeData = await getRouteData(wallet, amountIn, fromTokenAddress, toTokenAddress);
  if (!routeData) {
    console.log(chalk.hex('#FF6347')(`❌ Failed to get route data\n`));
    return;
  }

  const toDecimals = tokenDecimals[toTokenAddress] || 18;
  const formattedAmount = (Number(routeData.resAmount) / 10 ** toDecimals).toFixed(4);

  console.log(chalk.hex('#20B2AA')(`🔁 Swap ${amountIn} ${fromSymbol} → ${formattedAmount} ${toSymbol}`));

  try {
    const tx = await wallet.sendTransaction({
      to: routeData.targetContract,
      data: routeData.txData,
      value: fromTokenAddress === ethers.ZeroAddress ? ethers.parseEther(amountIn) : ethers.parseEther("0"), // kalau native token, kirim value
      gasLimit: 300_000
    });

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Swap successful\n`));
  } catch (err) {
    console.error("❌ Swap failed:", err.reason || err.message);
  }
}

async function mintNFT(wallet) {
  try {
    const NFTca = "0xA1B0F32b81E2d085Aba3e69B19eC72466F0eFA83";
    const mintnft_abi = ["function mint(uint256 amount) public payable"];
    const mintnftca = new ethers.Contract(NFTca, mintnft_abi, wallet);
    const amountToMint = 1;
    const pricePerNFT = "0.000006";

    const totalPrice = ethers.parseEther(pricePerNFT) * BigInt(amountToMint);

    console.log(chalk.hex('#20B2AA')(`🔁 Mint NFT`));

    const tx = await mintnftca.mint(amountToMint, {
      value: totalPrice, // kirim ETH
      gasLimit: 500_000
    });

    console.log(chalk.hex('#FF8C00')(`⏳ Tx dikirim!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Mint NFT sukses!\n`));
  } catch (err) {
    console.error("❌ Mint NFT failed:", err.reason || err.message);
  }
}

async function swapmain() {
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(chalk.cyan(`🔑 Wallet: ${wallet.address}`));
    const balance = await provider.getBalance(wallet.address);
    const ethBalance = ethers.formatEther(balance);
    console.log(chalk.hex('#20B2AA')(`💰 Saldo ETH: ${ethBalance}`));

    console.log(chalk.hex('#66CDAA')(`🚀 SWAP di GASPUMP`));
    await deposit(wallet);
    await delay(3000);
    
    for (const pair of swapPairs) {
      console.log(chalk.hex('#66CDAA')(`🚀 SWAP di GASPUMP`));
      await approve(wallet, pair.from, pair.amount);
      await swap(wallet, pair.amount, pair.from, pair.to);
      await delay(3000);
    }
    
    console.log(chalk.hex('#66CDAA')(`🚀 SWAP di GASPUMP`));
    await withdraw(wallet);
    await delay(3000);

    console.log(chalk.hex('#66CDAA')(`🚀 MINT NFT DI OMNIHUB`));
    await mintNFT(wallet);
    await delay(3000);

  }
}

module.exports = { swapmain };

if (require.main === module) {
  swapmain();
}
