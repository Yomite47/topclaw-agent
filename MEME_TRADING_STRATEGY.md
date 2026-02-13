# Meme Coin Trading Strategy & Skills Survey

## 🛡️ Risk Management & Anti-Rug Skills
Based on recent survey of Solana meme coin trading practices, the following security checks are critical:

1.  **Mint Authority Disabled**:
    -   *Risk*: If enabled, the developer can mint infinite tokens and dump on holders.
    -   *Detection*: Check if `mintAuthority` is `null` on the SPL Token Mint account.
    -   *Implementation*: `connection.getParsedAccountInfo(mintAddress)`

2.  **Freeze Authority Disabled**:
    -   *Risk*: If enabled, the developer can freeze your wallet, preventing you from selling.
    -   *Detection*: Check if `freezeAuthority` is `null`.

3.  **Liquidity Lock/Burn**:
    -   *Risk*: If LP tokens are not burned or locked, the dev can pull all liquidity (Rug Pull).
    -   *Detection*: Check top holders of the LP token. The largest holder should be a known burn address or a locker contract.

4.  **Honeypot Check**:
    -   *Risk*: Token can be bought but not sold.
    -   *Detection*: Simulate a SELL transaction (Swap Token -> SOL) before buying. If simulation fails, do not buy.

## 🚀 Scouting & Sniping Indicators
1.  **Micro-Cap Sweet Spot**:
    -   Market Cap: $10k - $500k (High risk/reward).
    -   Liquidity: > $1,000 (Avoids extremely thin markets).
    -   Volume: High volume relative to Market Cap indicates interest.

2.  **Momentum**:
    -   Buying pressure (Green candles) in the last 5-15 minutes.
    -   Increasing holder count (if available via API).

## 🤖 Autonomous Implementation Plan
The `solana_trader.js` bot is being upgraded with these skills:
-   **Added**: `checkSecurity()` function to verify Mint/Freeze authority.
-   **Added**: Pre-buy Simulation (Check if sellable via Jupiter).
-   **Added**: strict filters for Liquidity and FDV.
