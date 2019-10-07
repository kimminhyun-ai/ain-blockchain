#! /usr/bin/node
/**
 * Copyright 2017, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// Require process, so we can mock environment variables
const process = require('process');
const moment = require('moment');
const PORT = process.env.PORT || 8080;

// Initiate logging
const LOG = process.env.LOG || false;
let LAST_NONCE = 0;
let CURRENT_NONCE = 0;
// Number of transactions per second that can be made through this blockchain
// before transactions begin automatically being added to a batch_list
// transaction.
const TX_PER_SECOND_AUTOBATCHING = 120;

if (LOG) {
  const fs = require('fs');
  const util = require('util');
  const logDir = __dirname + '/' + '.logs';
  if (!(fs.existsSync(logDir))) {
    fs.mkdirSync(logDir);
  }
  const logFile =
    fs.createWriteStream(logDir + '/' + PORT +'debug.log', {flags: 'w'});
  const logStdout = process.stdout;

  console.log = function(d) {
    logFile.write(moment(new Date()).format(moment.HTML5_FMT.DATETIME_LOCAL_MS) + '\t' + util.format(d) + '\n');
    logStdout.write(util.format(d) + '\n');
  };
}


// [START gae_flex_mysql_app]
const express = require('express');
const Database = require('../db');
const P2pServer = require('../server');

// Define peer2peer server here which will broadcast changes in the database
// and also track which servers are in the network

// Applictation dependencies
const Blockchain = require('../blockchain');
const TransactionPool = require('../db/transaction-pool');

const app = express();


const transactionBatch = [];

app.use(express.json()); // support json encoded bodies

const { OperationTypes } = require('../constants');
const bc = new Blockchain(String(PORT));
const tp = new TransactionPool();
const db = Database.getDatabase(bc, tp);
const p2pServer = new P2pServer(db, bc, tp);
const jayson = require('jayson');

const jsonRpcMethods = require('../json_rpc/methods')(bc, tp, p2pServer);
app.post('/json-rpc', jayson.server(jsonRpcMethods).middleware());

app.get('/', (req, res, next) => {
  try {
    res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send('Welcome to AIN Blockchain Database')
        .end();
  } catch (error) {
    console.log(error);
  }
});

app.get('/get_value', (req, res, next) => {
  let statusCode = 200;
  let result = null;
  try {
    result = db.getValue(req.query.ref);
  } catch (error) {
    statusCode = 400;
    console.log(error.stack);
  }
  res
      .status(statusCode)
      .set('Content-Type', 'application/json')
      .send({code: result ? 0 : -1, result})
      .end();
});

app.get('/get_rule', (req, res, next) => {
  let statusCode = 200;
  let result = null;
  try {
    result = db.getRule(req.query.ref);
  } catch (error) {
    statusCode = 400;
    console.log(error.stack);
  }
  res
      .status(statusCode)
      .set('Content-Type', 'application/json')
      .send({code: result ? 0 : -1, result})
      .end();
});

app.get('/get_owner', (req, res, next) => {
  let statusCode = 200;
  let result = null;
  try {
    result = db.getOwner(req.query.ref);
  } catch (error) {
    statusCode = 400;
    console.log(error.stack);
  }
  res
      .status(statusCode)
      .set('Content-Type', 'application/json')
      .send({code: result ? 0 : -1, result})
      .end();
});

app.post('/get', (req, res, next) => {
  let statusCode = 200;
  let result = null;
  try {
    result = db.get(req.body.op_list);
  } catch (error) {
    statusCode = 400;
    console.log(error.stack);
  }
  res
      .status(statusCode)
      .set('Content-Type', 'application/json')
      .send({code: result ? 0 : -1, result})
      .end();
});

app.post('/set_value', (req, res, next) => {
  const isNoncedTransaction = checkIfTransactionShouldBeNonced(req.body);
  const result = createTransaction({
    type: OperationTypes.SET_VALUE,
    ref: req.body.ref,
    value: req.body.value,
    address: req.body.address,
    nonce: req.body.nonce,
    skip_verif: req.body.skip_verif
  }, isNoncedTransaction);
  res
      .status(result !== null ? 201: 401)
      .set('Content-Type', 'application/json')
      .send({code: result !== null ? 0: 1, result})
      .end();
});

app.post('/inc_value', (req, res, next) => {
  const isNoncedTransaction = checkIfTransactionShouldBeNonced(req.body);
  const result = createTransaction({
    type: OperationTypes.INC_VALUE,
    ref: req.body.ref,
    value: req.body.value,
    address: req.body.address,
    nonce: req.body.nonce,
    skip_verif: req.body.skip_verif
  }, isNoncedTransaction);
  res
      .status(result !== null ? 201: 401)
      .set('Content-Type', 'application/json')
      .send({code: result !== null ? 0: 1, result})
      .end();
});

app.post('/dec_value', (req, res, next) => {
  const isNoncedTransaction = checkIfTransactionShouldBeNonced(req.body);
  const result = createTransaction({
    type: OperationTypes.DEC_VALUE,
    ref: req.body.ref,
    value: req.body.value,
    address: req.body.address,
    nonce: req.body.nonce,
    skip_verif: req.body.skip_verif
  }, isNoncedTransaction);
  res
      .status(result !== null ? 201: 401)
      .set('Content-Type', 'application/json')
      .send({code: result !== null ? 0: 1, result})
      .end();
});

app.post('/set_rule', (req, res, next) => {
  const isNoncedTransaction = checkIfTransactionShouldBeNonced(req.body);
  const result = createTransaction({
    type: OperationTypes.SET_RULE,
    ref: req.body.ref,
    value: req.body.value,
    address: req.body.address,
    nonce: req.body.nonce,
    skip_verif: req.body.skip_verif
  }, isNoncedTransaction);
  res
      .status(result !== null ? 201: 401)
      .set('Content-Type', 'application/json')
      .send({code: result !== null ? 0: 1, result})
      .end();
});

app.post('/set_owner', (req, res, next) => {
  const isNoncedTransaction = checkIfTransactionShouldBeNonced(req.body);
  const result = createTransaction({
    type: OperationTypes.SET_OWNER,
    ref: req.body.ref,
    value: req.body.value,
    address: req.body.address,
    nonce: req.body.nonce,
    skip_verif: req.body.skip_verif
  }, isNoncedTransaction);
  res
      .status(result !== null ? 201: 401)
      .set('Content-Type', 'application/json')
      .send({code: result !== null ? 0: 1, result})
      .end();
});

// TODO(seo): Replace skip_verif with real signature.
app.post('/set', (req, res, next) => {
  const isNoncedTransaction = checkIfTransactionShouldBeNonced(req.body);
  const result = createTransaction({
    type: OperationTypes.SET,
    op_list: req.body.op_list,
    value: req.body.value,
    address: req.body.address,
    nonce: req.body.nonce,
    skip_verif: req.body.skip_verif
  }, isNoncedTransaction);
  res
      .status(result !== null ? 201: 401)
      .set('Content-Type', 'application/json')
      .send({code: result !== null ? 0: 1, result})
      .end();
});

// TODO(seo): Make a batch request consist of transactions.
app.post('/batch', (req, res, next) => {
  const isNoncedTransaction = checkIfTransactionShouldBeNonced(req.body);
  const result = createTransaction({
    type: OperationTypes.BATCH,
    batch_list: req.body.batch_list,
  },
      isNoncedTransaction);
  res
      .status(result !== null ? 201: 401)
      .set('Content-Type', 'application/json')
      .send({code: result !== null ? 0: 1, result})
      .end();
});

app.get('/blocks', (req, res, next) => {
  const statusCode = 200;
  const result = bc.getChainSection(0, bc.length);
  res
      .status(statusCode)
      .set('Content-Type', 'application/json')
      .send({code: result ? 0 : -1, result})
      .end();
});

app.get('/transactions', (req, res, next) => {
  const statusCode = 200;
  const result = tp.transactions;
  res
      .status(statusCode)
      .set('Content-Type', 'application/json')
      .send({code: result ? 0 : -1, result})
      .end();
});

// We will want changes in ports and the database to be broadcast across
// all instances so lets pass this info into the p2p server
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END gae_flex_mysql_app]


// Lets start this p2p server up so we listen for changes in either DATABASE
// or NUMBER OF SERVERS
p2pServer.listen();

module.exports = app;

function createBatchTransaction(trans) {
  if (transactionBatch.length == 0) {
    setTimeout(() => {
      broadcastBatchTransaction();
    }, 100);
  }
  CURRENT_NONCE += 1;
  transactionBatch.push(trans);
}

function broadcastBatchTransaction() {
  if (transactionBatch.length > 0) {
    const batchList = JSON.parse(JSON.stringify(transactionBatch));
    transactionBatch.length = 0;
    const transaction = db.createTransaction({type: 'BATCH', batch_list: batchList});
    return p2pServer.executeAndBroadcastTransaction(transaction);
  }
}

function createSingularTransaction(operation, isNoncedTransaction) {
  CURRENT_NONCE += 1;
  const transaction = db.createTransaction(operation, isNoncedTransaction);
  return p2pServer.executeAndBroadcastTransaction(transaction);
}

let createTransaction;
createTransaction = createSingularTransaction;

function checkIfTransactionShouldBeNonced(data) {
  // Default to true if noncing information is not specified
  return data.is_nonced_transaction !== undefined ? data.is_nonced_transaction : true;
}

// Here we specity
setInterval(() => {
  if (CURRENT_NONCE - LAST_NONCE > TX_PER_SECOND_AUTOBATCHING) {
    createTransaction = createBatchTransaction;
  } else {
    broadcastBatchTransaction();
    createTransaction = createSingularTransaction;
  }
  LAST_NONCE = CURRENT_NONCE;
}, 1000);
