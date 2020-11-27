import { useCallback } from "react";

import { ChainId, Currency, ETHER, Fetcher, Pair, Token, WETH } from "@sushiswap/sdk";
import { ethers } from "ethers";


// TODO UPDATE WITH ALL THE NECESSARY PAIRS
export const tDAI = new Token(ChainId.BSCTESTNET, '0xec5dcb5dbf4b114c9d0f65bccab49ec54f6a0867', 18, 'DAI', 'Dai Stablecoin')
export const tBUSD = new Token(ChainId.BSCTESTNET, '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee', 18, 'BUSD', 'Binance USD')
export const tUSDT = new Token(ChainId.BSCTESTNET, '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd', 18, 'USDT', 'Tether USD')
export const tUSDC = new Token(ChainId.BSCTESTNET, '0x64544969ed7ebf5f083679233325356ebe738930', 18, 'USDC', 'USD Coin')

export const DAI = new Token(ChainId.MAINNET, '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 18, 'DAI', 'Dai Stablecoin')
export const BUSD = new Token(ChainId.MAINNET, '0xe9e7cea3dedca5984780bafc599bd69add087d56', 18, 'BUSD', 'Binance USD')
export const USDT = new Token(ChainId.MAINNET, '0x55d398326f99059ff775485246999027b3197955', 18, 'USDT', 'Tether USD')
export const USDC = new Token(ChainId.MAINNET, '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 18, 'USDC', 'USD Coin')
export const QUSD = new Token(ChainId.MAINNET, '0xb8c540d00dd0bf76ea12e4b4b95efc90804f924e', 18, 'QUSD', 'Qian Stablecoin')

// TODO check if we need WETH chainID mainnet here if bnb is not really traded often here, also the tTokens for testnet
const BASES_TO_CHECK_TRADES_AGAINST = [WETH[ChainId.MAINNET], BUSD, DAI, USDC, USDT];
// const CUSTOM_BASES = {
//     [AMPL.address]: [DAI, WETH[ChainId.MAINNET]]
// };

function wrappedCurrency(currency: Currency | undefined): Token | undefined {
    return currency === ETHER ? WETH[ChainId.MAINNET] : currency instanceof Token ? currency : undefined;
}

// Source: https://github.com/Uniswap/uniswap-interface/blob/master/src/hooks/Trades.ts
const useAllCommonPairs = () => {
    const loadAllCommonPairs = useCallback(
        // tslint:disable-next-line:max-func-body-length
        async (currencyA?: Currency, currencyB?: Currency, provider?: ethers.providers.BaseProvider) => {
            const bases: Token[] = BASES_TO_CHECK_TRADES_AGAINST;
            const [tokenA, tokenB] = [wrappedCurrency(currencyA), wrappedCurrency(currencyB)];
            const basePairs: [Token, Token][] = bases
                .flatMap((base): [Token, Token][] => bases.map(otherBase => [base, otherBase]))
                .filter(([t0, t1]) => t0.address !== t1.address);

            const allPairCombinations =
                tokenA && tokenB
                    ? [
                          // the direct pair
                          [tokenA, tokenB],
                          // token A against all bases
                          ...bases.map((base): [Token, Token] => [tokenA, base]),
                          // token B against all bases
                          ...bases.map((base): [Token, Token] => [tokenB, base]),
                          // each base against all bases
                          ...basePairs
                      ]
                          .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
                          .filter(([t0, t1]) => t0.address !== t1.address)
                          .filter(([a, b]) => {
                              const customBases = CUSTOM_BASES;
                              if (!customBases) return true;

                              const customBasesA: Token[] | undefined = customBases[a.address];
                              const customBasesB: Token[] | undefined = customBases[b.address];

                              if (!customBasesA && !customBasesB) return true;

                              if (customBasesA && !customBasesA.find(base => tokenB.equals(base))) return false;
                              return !(customBasesB && !customBasesB.find(base => tokenA.equals(base)));
                          })
                    : [];

            const pairs = await Promise.all(
                allPairCombinations.map(async pair => {
                    try {
                        return await Fetcher.fetchPairData(pair[0], pair[1], provider);
                    } catch (e) {
                        return null;
                    }
                })
            );
            return pairs.filter(pair => pair !== null) as Pair[];
        },
        []
    );

    return { loadAllCommonPairs };
};

export default useAllCommonPairs;
