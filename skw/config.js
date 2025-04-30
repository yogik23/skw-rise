const { ethers } = require('ethers');
const chalk = require('chalk');

const supplyWETH = "0.00001";
const borrowUSDT = "0.0001";
const wdETHAmount = "0.000001";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const USDC_ADDRESS = "0x8A93d247134d91e0de6f96547cB0204e5BE8e5D8";
const USDT_ADDRESS = "0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849";
const PEPE_ADDRESS = "0x6F6f570F45833E249e27022648a26F4076F48f78";
const MOG_ADDRESS = "0x99dBE4AEa58E518C50a1c04aE9b48C9F6354612f";
const RISE_ADDRESS = "0xd6e1afe5cA8D00A2EFC01B89997abE2De47fdfAf";
const WBTC_ADDRESS = "0xF32D39ff9f6Aa7a7A64d7a4F00a54826Ef791a55";
const DLP_ADDRESS = "0x8eB78173A8A4b53BC694490b9991145Fdc461099";
const inari_ROUTER = "0x81edb206Fd1FB9dC517B61793AaA0325c8d11A23";
const swap_ROUTER = "0x143bE32C854E4Ddce45aD48dAe3343821556D0c3";
const lp_ROUTER = "0x0976e26eE276DC0703d046DB46d0ca8A1EeC3bAe";
const rm_ROUTER = "0x8eB78173A8A4b53BC694490b9991145Fdc461099";

const tokenNames = {
  [WETH_ADDRESS]: "WETH",
  [USDC_ADDRESS]: "USDC",
  [USDT_ADDRESS]: "USDT",
  [PEPE_ADDRESS]: "PEPE",
  [MOG_ADDRESS]: "MOG",
  [RISE_ADDRESS]: "RISE",
  [WBTC_ADDRESS]: "WBTC",
};

const tokenDecimals = {
  [WETH_ADDRESS]: 18,
  [USDC_ADDRESS]: 6,
  [USDT_ADDRESS]: 8,
  [PEPE_ADDRESS]: 18,
  [MOG_ADDRESS]: 18,
  [RISE_ADDRESS]: 18,
  [WBTC_ADDRESS]: 18,
};

const swapPairs = [
  { from: MOG_ADDRESS, to: WETH_ADDRESS, amount: "400" },
  { from: PEPE_ADDRESS, to: WETH_ADDRESS, amount: "400000" },
  { from: RISE_ADDRESS, to: WETH_ADDRESS, amount: "40" },
  { from: USDC_ADDRESS, to: WETH_ADDRESS, amount: "1" },
  { from: USDT_ADDRESS, to: WETH_ADDRESS, amount: "1" },
  { from: WBTC_ADDRESS, to: WETH_ADDRESS, amount: "0.00001" },
  { from: WETH_ADDRESS, to: USDC_ADDRESS, amount: "0.0001" },
  { from: WETH_ADDRESS, to: USDT_ADDRESS, amount: "0.0001" },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const erc20_abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
];

const Liquidity_abi = [
  "function addDSPLiquidity(address dspAddress, uint256 baseInAmount, uint256 quoteInAmount, uint256 baseMinAmount, uint256 quoteMinAmount, uint8 flag, uint256 deadLine)",
  "function sellShares(uint256 shareAmount, address to, uint256 baseMinAmount, uint256 quoteMinAmount, bytes data, uint256 deadline)"
];

const inari_abi = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external returns (bool)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external returns (bool)",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (bool)",
  "function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external returns (bool)",
  "function withdraw(address asset, uint256 amount, address to) external returns (bool)"
];

async function approve(wallet, fromTokenAddress, amountIn, SPENDER) {
  const fromSymbol = tokenNames[fromTokenAddress] || fromTokenAddress;
  const token = new ethers.Contract(fromTokenAddress, erc20_abi, wallet);
  const allowance = await token.allowance(wallet.address, SPENDER );
  if (allowance < amountIn) {
    console.log(chalk.hex('#20B2AA')(`🔓 Approving ${fromSymbol}...`));
    const tx = await token.approve(SPENDER, ethers.MaxUint256);
    await tx.wait();
    console.log(chalk.hex('#66CDAA')(`✅ Approved ${fromSymbol}`));
  }
}

async function checkBalance(wallet, tokenAddress) {
  try {
    const Contract = new ethers.Contract(tokenAddress, erc20_abi, wallet);
    const balance = await Contract.balanceOf(wallet.address);
    const decimals = tokenDecimals[tokenAddress] || 18;
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch (error) {
    console.error(`Failed to check balance for token ${tokenAddress}:`, error);
    return 0;
  }
}

const NFT_CONTRACTS = [
  "0xe3dC8AdC2F9e0933f9dd948570F2f56e8ecaAAd3",
  "0xFb1eAF9A8C2C3C538e0E4054cBf244cBF08B12C2",
  "0x0db782233f618298d57a4f3b2a476f01a90e5217",
  "0xa06e92d43c287cd3afa27951205b6cb00b880788",
  "0xa262c179d51a3476683080e58bdc5f34d23daa07",
];

function getRandomNFT() {
  const index = Math.floor(Math.random() * NFT_CONTRACTS.length);
  return NFT_CONTRACTS[index];
}

module.exports = {
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  PEPE_ADDRESS,
  MOG_ADDRESS,
  RISE_ADDRESS,
  WBTC_ADDRESS,
  DLP_ADDRESS,
  tokenNames,
  tokenDecimals,
  swapPairs,
  delay,
  supplyWETH,
  borrowUSDT,
  wdETHAmount,
  inari_ROUTER,
  swap_ROUTER,
  lp_ROUTER,
  rm_ROUTER,
  inari_abi,
  erc20_abi,
  Liquidity_abi,
  approve,
  checkBalance,
  getRandomNFT,
  NFT_CONTRACTS,
};
