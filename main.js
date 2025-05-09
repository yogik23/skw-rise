const axios = require('axios');
const { ethers } = require('ethers');
const fs = require("fs");
const path = require("path");
const chalk = require('chalk');
require("dotenv").config();
const { displayskw } = require('./skw/displayskw');

const {
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  DLP_ADDRESS,
  lp_ROUTER,
  swap_ROUTER,
  rm_ROUTER,
  inari_ROUTER,
  inari_abi,
  checkBalance,
  Liquidity_abi,
  tokenNames,
  tokenDecimals,
  swapPairs,
  delay,
  approve,
  getRandomNFT,
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

  const fromDecimals = tokenDecimals[fromTokenAddress] || 18;
  const amount = ethers.parseUnits(amountIn.toString(), fromDecimals).toString();

  const url = `https://api.dodoex.io/route-service/v2/widget/getdodoroute?chainId=11155931&deadLine=${deadline}&apikey=a37546505892e1a952&slippage=5&source=dodoV2AndMixWasm&toTokenAddress=${toTokenAddress}&fromTokenAddress=${fromTokenAddress}&userAddr=${wallet.address}&estimateGas=false&fromAmount=${amount}`;

  const toSymbol = tokenNames[toTokenAddress] || toTokenAddress;
  const fromSymbol = tokenNames[fromTokenAddress] || fromTokenAddress;

  console.log(chalk.hex('#20B2AA')(`🔍 Mendapatkan Kuota Swap ${amountIn} ${fromSymbol} → ${toSymbol}`));

  for (let i = 0; i <= retries; i++) {
    try {
      await delay(3000);
      const res = await axios.get(url);
      if (res.data?.data?.resAmount && res.data?.data?.data) {
        return {
          resAmount: res.data.data.resAmount,
          spender: res.data.data.targetApproveAddr,
          txData: res.data.data.data,
          targetContract: res.data.data.to,
        };
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

async function deposit(wallet) {
  try {
    const warpamount = "0.00005";
    const amount = ethers.parseUnits(warpamount);
    const warp_abi = ["function deposit() external payable"];
    const contract = new ethers.Contract(WETH_ADDRESS, warp_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Warp ${warpamount} ETH → ${warpamount} WETH`));

    const tx = await contract.deposit({
      value: amount,
      gasLimit: 100_000,
    });

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    const receipt = await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Warp successful\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error during deposit:"), err.reason || err.message);
  }
}

async function withdraw(wallet) {
  try {
    const WETHBALANCE = await checkBalance(wallet, WETH_ADDRESS);
    const balanceFormatted = parseFloat(WETHBALANCE).toFixed(4);
    console.log(chalk.hex('#7B68EE')(`💰 Saldo WETH: ${balanceFormatted}`));

    const unwarpamount = "0.00005";
    const amount = ethers.parseUnits(unwarpamount, 18); 
    const unwarp_abi = ["function OwnerTransferV7b711143(uint256) external"];
    const contract = new ethers.Contract(WETH_ADDRESS, unwarp_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Unwarp ${unwarpamount} WETH → ${unwarpamount} ETH`));

    await approve(wallet, WETH_ADDRESS, amount, swap_ROUTER);

    const tx = await contract.OwnerTransferV7b711143(amount, {
      gasLimit: 100_000,
    });

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    const receipt = await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Unwarp successful\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error during withdraw:"), err.reason || err.message);
  }
}

async function swap(wallet, amountIn, fromTokenAddress, toTokenAddress) {
  const toSymbol = tokenNames[toTokenAddress] || toTokenAddress;
  const fromSymbol = tokenNames[fromTokenAddress] || fromTokenAddress;

  const CEK_BALANCE = await checkBalance(wallet, fromTokenAddress);
  const BALANCE = parseFloat(CEK_BALANCE).toFixed(8);
  console.log(chalk.hex('#7B68EE')(`💰 Saldo ${fromSymbol}: ${BALANCE}`));

  const routeData = await getRouteData(wallet, amountIn, fromTokenAddress, toTokenAddress);
  if (!routeData) {
    console.log(chalk.hex('#FF6347')(`❌ Failed to get route data\n`));
    return;
  }

  const { resAmount, spender, targetContract, txData } = routeData;

  await approve(wallet, fromTokenAddress, amountIn, spender);

  const toDecimals = tokenDecimals[toTokenAddress] || 18;
  const formattedAmount = Number(resAmount).toFixed(8);

  console.log(chalk.hex('#20B2AA')(`🔁 Swap ${amountIn} ${fromSymbol} → ${formattedAmount} ${toSymbol}`));

  try {
    const tx = await wallet.sendTransaction({
      to: targetContract,
      data: txData,
      value: 0,
      gasLimit: 300_000
    });

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Swap successful\n`));
  } catch (err) {
    console.error("❌ Swap failed:", err.reason || err.message);
  }
}

async function addLiquidity(wallet) {
  try {
    const CEK_BALANCEUSDT = await checkBalance(wallet, USDT_ADDRESS);
    const BALANCEUSDT = parseFloat(CEK_BALANCEUSDT).toFixed(4);
    const CEK_BALANCEUSDC = await checkBalance(wallet, USDC_ADDRESS);
    const BALANCEUSDC = parseFloat(CEK_BALANCEUSDC).toFixed(4);
    console.log(chalk.hex('#7B68EE')(`💰 Saldo USDT: ${BALANCEUSDT}`));
    console.log(chalk.hex('#7B68EE')(`💰 Saldo USDC: ${BALANCEUSDC}`));
    
    const dspAddress = "0x8eB78173A8A4b53BC694490b9991145Fdc461099";
    const baseInAmount = "1100000";
    const quoteInAmount = "110242746";
    const baseMinAmount = "1098900";
    const quoteMinAmount = "110132503";
    const flag = 0;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

    await approve(wallet, USDC_ADDRESS, quoteInAmount, lp_ROUTER);
    await approve(wallet, USDT_ADDRESS, baseInAmount, lp_ROUTER);


    console.log(chalk.hex('#20B2AA')(`🔁 Add Liquidity 1 USDC → 1 USDT`));
    const contract = new ethers.Contract(lp_ROUTER, Liquidity_abi, wallet);
    const tx = await contract.addDSPLiquidity(
      dspAddress,
      baseInAmount,
      quoteInAmount,
      baseMinAmount,
      quoteMinAmount,
      flag,
      deadline
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Add Liquidity successful\n`));
  } catch (error) {
    console.error(chalk.red(`❌ Error in addLiquidity: ${error.message || error}`));
  }
}

async function rmLiquidity(wallet) {
  try {
    const CEK_BALANCELP = await checkBalance(wallet, DLP_ADDRESS);
    const BALANCELP = parseFloat(CEK_BALANCELP).toFixed(4);
    console.log(chalk.hex('#7B68EE')(`💰 Saldo DLP: $${BALANCELP}`));
    
    const shareAmount = "1005418";
    const address_to = wallet.address;
    const baseMinAmount = "998899";
    const quoteMinAmount = "101039252";
    const data = "0x";
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

    console.log(chalk.hex('#20B2AA')(`🔁 REMOVE Liquidity 1 USDC → 1 USDT`));
    const contract = new ethers.Contract(rm_ROUTER, Liquidity_abi, wallet);
    const tx = await contract.sellShares(
      shareAmount,
      address_to,
      baseMinAmount,
      quoteMinAmount,
      data,
      deadline
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ REMOVE Liquidity successful\n`));
  } catch (error) {
    console.error(chalk.red(`❌ Error in addLiquidity: ${error.message || error}`));
  }
}

async function mintNFT(wallet) {
  try {
    const NFTca = getRandomNFT();
    const mintnft_abi = ["function mint(uint256 amount) public payable"];
    const mintnftca = new ethers.Contract(NFTca, mintnft_abi, wallet);
    const amountToMint = 1;
    const pricePerNFT = "0.000007";

    const totalPrice = ethers.parseEther(pricePerNFT) * BigInt(amountToMint);

    console.log(chalk.hex('#20B2AA')(`🔁 Mint NFT`));

    const tx = await mintnftca.mint(amountToMint, {
      value: totalPrice,
      gasLimit: 500_000
    });

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Mint NFT sukses!\n`));
  } catch (err) {
    console.error("❌ Mint NFT failed:", err.reason || err.message);
  }
}

async function supply(wallet) {
  try {
    const supplyWETH = "0.00001";
    const WETHBALANCE = await checkBalance(wallet, WETH_ADDRESS);
    const balanceFormatted = parseFloat(WETHBALANCE).toFixed(4);
    console.log(chalk.hex('#7B68EE')(`💰 Saldo WETH: ${balanceFormatted}`));

    const amount = ethers.parseUnits(supplyWETH, 18);
    const supplyca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);

    console.log(chalk.hex('#20B2AA')(`🔁 Supply ${supplyWETH} WETH`));
    await approve(wallet, WETH_ADDRESS, supplyWETH, inari_ROUTER);

    const tx = await supplyca.supply(
      WETH_ADDRESS,
      amount,
      wallet.address,
      0,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Supply sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat supply:"), err.reason || err.message);
  }
}

async function setCollateral(wallet, useAsCollateral = true) {
  try {
    const collateralca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);
    
    const action = useAsCollateral ? "Set" : "Remove";
    console.log(chalk.hex('#20B2AA')(`🔁 ${action} Collateral`));

    const tx = await collateralca.setUserUseReserveAsCollateral(
      WETH_ADDRESS,
      useAsCollateral,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ ${action} Collateral sukses!\n`));
  } catch (err) {
    console.log(chalk.red(`❌ Error saat ${useAsCollateral ? "Set" : "Remove"} Collateral:`), err.reason || err.message);
  }
}

async function borrow(wallet) {
  try {
    const borrowUSDT = "0.0001";
    const USDTBALANCE = await checkBalance(wallet, USDT_ADDRESS);
    const balanceFormatted = parseFloat(USDTBALANCE).toFixed(4);
    console.log(chalk.hex('#7B68EE')(`💰 Saldo USDT: ${balanceFormatted}`));

    const amount = ethers.parseUnits(borrowUSDT, 8);
    const borrowca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);

    await setCollateral(wallet, true);
    console.log(chalk.hex('#20B2AA')(`🔁 Borrow ${borrowUSDT} USDT`));

    const tx = await borrowca.borrow(
      USDT_ADDRESS,
      amount,
      2,
      0,
      wallet.address,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Borrow sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat Borrow:"), err.reason || err.message);
  }
}

async function repay(wallet) {
  try {
    const amount = ethers.MaxUint256;
    const repayca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);
    console.log(chalk.hex('#20B2AA')(`🔁 Repay MAX `));
    await approve(wallet, USDT_ADDRESS, amount, inari_ROUTER);

    const tx = await repayca.repay(
      USDT_ADDRESS,
      amount,
      2,
      wallet.address,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Repay sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat Repay:"), err.reason || err.message);
  }
}

async function withdrawETH(wallet) {
  try {
    const wdETHAmount = "0.000001";
    const amount = ethers.parseUnits(wdETHAmount, 18);
    const withdrawca = new ethers.Contract(inari_ROUTER, inari_abi, wallet);

    await approve(wallet, WETH_ADDRESS, amount, inari_ROUTER);
    await setCollateral(wallet, false);

    console.log(chalk.hex('#20B2AA')(`🔁 Withdraw ${wdETHAmount} ETH`));
    const tx = await withdrawca.withdraw(
      WETH_ADDRESS,
      amount,
      wallet.address,
      { gasLimit: 500_000 }
    );

    console.log(chalk.hex('#66CDAA')(`⏳ Tx dikirim ke blokchain!\n⛓️‍💥 https://explorer.testnet.riselabs.xyz/tx/${tx.hash}`));
    await tx.wait();
    console.log(chalk.hex('#32CD32')(`✅ Withdraw sukses!\n`));
  } catch (err) {
    console.log(chalk.red("❌ Error saat Withdraw:"), err.reason || err.message);
  }
}

function escapeMarkdownV2(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

async function sendTG(address, txCount) {
  const date = escapeMarkdownV2(new Date().toISOString().split('T')[0]);
  const message = `📅 *${date}*\n💦 *${address}*\n➡️ *Total TX: ${txCount}*`;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.CHAT_ID,
        text: message,
        parse_mode: "MarkdownV2",
      }
    );
    console.log(`✅ Message sent to Telegram successfully!`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error sending message to Telegram: ${error.response?.data?.description || error.message}`);
    return null;
  }
}

async function lending(wallet) {
  await supply(wallet);
  await delay(5000);

  await borrow(wallet);
  await delay(5000);

  await repay(wallet);
  await delay(5000);

  await withdrawETH(wallet);
  await delay(5000);
}


async function swapgaspump(wallet) {
  await deposit(wallet);
  await delay(5000);

  for (const pair of swapPairs) {
    await approve(wallet, pair.from, pair.amount, swap_ROUTER);
    await swap(wallet, pair.amount, pair.from, pair.to);
    await delay(5000);
  }

  //await addLiquidity(wallet);
  //await delay(5000);

  //await rmLiquidity(wallet);
  //await delay(5000);

  await withdraw(wallet);
  await delay(5000);
}

async function main() {
  console.clear();
  displayskw();
  const wallets = [];
  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    const ethBalance = ethers.formatEther(balance);
    console.log(chalk.hex('#800080')(`🌐 RISE SEPOLIA ${wallet.address}`));
    console.log(chalk.hex('#800080')(`💰 Saldo ETH: ${ethBalance}\n`));

    console.log(chalk.hex('#DC143C')(`🚀 INTERAKSI di GASPUMP`));
    await swapgaspump(wallet);

    console.log(chalk.hex('#DC143C')(`🚀 INTERAKSI di INARI`));
    await lending(wallet);

    console.log(chalk.hex('#DC143C')(`🚀 MINT NFT DI OMNIHUB`));
    await mintNFT(wallet);
    await delay(3000);

    const txCount = await provider.getTransactionCount(wallet.address);
    await sendTG(wallet.address, txCount);
    console.log(chalk.hex('#66CDAA')(`🟦  ${wallet.address} => Jumlah transaksi: ${txCount}\n`));
  }
}

main();
