require('dotenv').config();
const express = require('express');
const TonWeb = require('tonweb');
const nacl = require('tweetnacl');

const app = express();
app.use(express.json());

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {apiKey: process.env.TON_API_KEY}));

// Existing wallet setup
const keyPair = {
  publicKey: TonWeb.utils.hexToBytes(process.env.WALLET_PUBLIC_KEY),
  secretKey: TonWeb.utils.hexToBytes(process.env.WALLET_PRIVATE_KEY)
};
const wallet = tonweb.wallet.create({publicKey: keyPair.publicKey});

// New wallet creation endpoint
app.get('/wallet', async (req, res) => {
  try {
    // Generate a new key pair using nacl
    const newKeyPair = nacl.sign.keyPair();
    
    // Create a new wallet instance
    const newWallet = tonweb.wallet.create({publicKey: newKeyPair.publicKey});
    
    // Get the wallet address
    const address = await newWallet.getAddress();
    const nonBounceableAddress = address.toString(true, true, false);

    res.json({
      address: nonBounceableAddress,
      publicKey: TonWeb.utils.bytesToHex(newKeyPair.publicKey),
      privateKey: TonWeb.utils.bytesToHex(newKeyPair.secretKey)
    });
  } catch (error) {
    console.error('Wallet creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Existing withdraw function
async function withdraw(to, amount, message = 'BOT') {
  const seqno = await wallet.methods.seqno().call();
  
  const transfer = await wallet.methods.transfer({
    secretKey: keyPair.secretKey,
    toAddress: to,
    amount: TonWeb.utils.toNano(amount),
    seqno: seqno,
    payload: message,
    sendMode: 3,
  }).send();
  
  return transfer;
}

// Existing withdrawal endpoint
app.get('/ton/send/coin', async (req, res) => {
  try {
    const { receiver, amount, message } = req.query;
    
    if (!receiver || !amount) {
      return res.status(400).json({ success: false, error: 'Missing receiver or amount' });
    }

    const result = await withdraw(receiver, amount, message || 'BOT');
    
    res.json({ success: true, transaction: result });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
