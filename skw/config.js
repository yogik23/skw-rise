const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const USDC_ADDRESS = "0x8A93d247134d91e0de6f96547cB0204e5BE8e5D8";
const USDT_ADDRESS = "0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849";
const PEPE_ADDRESS = "0x6F6f570F45833E249e27022648a26F4076F48f78";
const MOG_ADDRESS = "0x99dBE4AEa58E518C50a1c04aE9b48C9F6354612f";
const RISE_ADDRESS = "0xd6e1afe5cA8D00A2EFC01B89997abE2De47fdfAf";
const WBTC_ADDRESS = "0xF32D39ff9f6Aa7a7A64d7a4F00a54826Ef791a55";

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
  { from: WETH_ADDRESS, to: USDC_ADDRESS, amount: "0.00001" },
  { from: WETH_ADDRESS, to: USDT_ADDRESS, amount: "0.00001" },
  { from: WETH_ADDRESS, to: WBTC_ADDRESS, amount: "0.00001" },
  { from: WETH_ADDRESS, to: RISE_ADDRESS, amount: "0.00001" },
  { from: PEPE_ADDRESS, to: WETH_ADDRESS, amount: "300000" },
  { from: RISE_ADDRESS, to: WETH_ADDRESS, amount: "30" },
  { from: USDC_ADDRESS, to: WETH_ADDRESS, amount: "4" },
  { from: USDT_ADDRESS, to: WETH_ADDRESS, amount: "4" },
  { from: MOG_ADDRESS, to: WETH_ADDRESS, amount: "300" },
  { from: WBTC_ADDRESS, to: WETH_ADDRESS, amount: "0.000001" },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
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
};
