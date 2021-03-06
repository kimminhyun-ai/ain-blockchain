const path = require('path');
const fs = require("fs")
const Transaction = require('../tx-pool/transaction');
const { Block } = require('../blockchain/block');

function setDbForTesting(node, accountIndex = 0, skipTestingConfig = false) {
  node.setAccountForTesting(accountIndex);

  node.init(true);

  if (!skipTestingConfig) {
    const ownersFile = path.resolve(__dirname, './data/owners_for_testing.json');
    if (!fs.existsSync(ownersFile)) {
      throw Error('Missing owners file: ' + ownersFile);
    }
    const owners = JSON.parse(fs.readFileSync(ownersFile));
    node.db.setOwnersForTesting("test", owners);
    const rulesFile = path.resolve(__dirname, './data/rules_for_testing.json');
    if (!fs.existsSync(rulesFile)) {
      throw Error('Missing rules file: ' + rulesFile);
    }
    const rules = JSON.parse(fs.readFileSync(rulesFile));
    node.db.setRulesForTesting("test", rules);
  }
}

function getTransaction(node, txData) {
  txData.nonce = node.nonce;
  node.nonce++;
  return Transaction.newTransaction(node.account.private_key, txData);
}

function addBlock(node, txs, votes, validators) {
  const lastBlock = node.bc.lastBlock();
  node.addNewBlock(Block.createBlock(lastBlock.hash, votes, txs, lastBlock.number + 1,
    lastBlock.epoch + 1, node.account.address, validators));
}

module.exports = {
  setDbForTesting,
  getTransaction,
  addBlock
};