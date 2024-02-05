#!/usr/bin/env node

const process= require('process');
process.removeAllListeners('warning');

const fs = require('fs');
const { Command } = require('commander');
const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');

const walletPath = 'wallet.json';
const connection = new Connection('https://api.devnet.solana.com');

const program = new Command();

program
  .command('new')
  .description('Create a new Solana wallet')
  .action(() => createWallet());

program
  .command('airdrop [amount]')
  .description('Request airdrop to the wallet')
  .action((amount) => airdrop(amount));

program
  .command('balance')
  .description('Check wallet balance')
  .action(() => getBalance());

program
  .command('transfer <otherPublicKey> <amount>')
  .description('Transfer SOL to another wallet')
  .action((otherPublicKey, amount) => transfer(otherPublicKey, amount));

program.parse(process.argv);

function createWallet() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  const walletData = {
    publicKey,
    secretKey: keypair.secretKey.toString(),
  };
  fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2));

  console.log(`Wallet created and saved to ${walletPath}`);
}

async function airdrop(amount = 1) {
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const publicKey = new PublicKey(walletData.publicKey);

  const airdropSignature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL * amount);
  await connection.confirmTransaction(airdropSignature);

  console.log(`${amount} SOL airdrop completed`);
}

async function getBalance() {
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const publicKey = new PublicKey(walletData.publicKey);

  const balance = await connection.getBalance(publicKey);

  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
}

async function transfer(otherPublicKey, amount) {
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const privateKey = Uint8Array.from(JSON.parse(walletData.secretKey));
  const sourceKeypair = Keypair.fromSecretKey(privateKey);
  const sourcePublicKey = sourceKeypair.publicKey;

  const destinationPublicKey = new PublicKey(otherPublicKey);
  const lamports = amount * LAMPORTS_PER_SOL;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sourcePublicKey,
      toPubkey: destinationPublicKey,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [sourceKeypair]);

  console.log(`Transfer completed. Signature: ${signature}`);
}

