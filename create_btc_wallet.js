const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');
const tinysecp = require('tiny-secp256k1');
const fs = require('fs');

const ECPair = ECPairFactory(tinysecp);
const network = bitcoin.networks.bitcoin; // Mainnet

function createWallet() {
    const keyPair = ECPair.makeRandom({ network });
    const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
    const wif = keyPair.toWIF();

    const wallet = {
        address: address,
        privateKey: wif, // Wallet Import Format
        created_at: new Date().toISOString()
    };

    console.log('Generated Wallet:', wallet);
    fs.writeFileSync('bitcoin-wallet.json', JSON.stringify(wallet, null, 2));
    console.log('Wallet saved to bitcoin-wallet.json');
}

createWallet();
