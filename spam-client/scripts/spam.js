const fs = require('fs')
let ethers
let jsonRpcUrl = 'http://localhost:8545'
let provider

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(true)
        }, ms)
    })
}

function getRandomWallet() {
    return ethers.Wallet.createRandom()
}

const getRandomNumber = (maxNumber) => {
    return Math.floor(Math.random() * maxNumber);
}

async function spam(injectedEthers, tps = 5, duration = 30, start = 0, end = 0) {
    ethers = injectedEthers
    provider = new ethers.providers.JsonRpcProvider(jsonRpcUrl)
    let txCount = tps * duration
    const waitTime = (1 / tps) * 1000
    let lastTime = Date.now()
    let currentTime
    let sleepTime
    let elapsed
    let keys
    try {
        keys = JSON.parse(fs.readFileSync('privateAddresses.json', 'utf8'))
        console.log(
            `Loaded ${keys.length} account${keys.length > 1 ? 's' : ''
            } from accounts.json`
        )
    } catch (error) {
        console.log(`Couldn't load accounts from file: ${error.message}`)
        return
    }
    console.log(start, end)
    const filteredAccounts = keys.slice(start, end)
    const signedTxs = []
    const { chainId } = await provider.getNetwork()
    let amountInEther = '1'
    const amountInWei = ethers.utils.parseEther(amountInEther)
    for (let i = 0; i < txCount; i++) {
        try {
            let senderWallet = new ethers.Wallet(filteredAccounts[i].privateKey)
            // let balance = await provider.getBalance(senderWallet.address)
            // console.log(balance)
            let nonce = await provider.getTransactionCount(senderWallet.address)
            // let receiverAddress = keys[getRandomNumber(keys.length)].publicKey
            let receiverAddress = getRandomWallet().address
            let tx = {
                nonce: nonce,
                chainId: chainId,
                to: receiverAddress,
                value: amountInWei,
                gasLimit: 10000000,
                gasPrice: await provider.getGasPrice()
            }
            let signedTx = await senderWallet.signTransaction(tx)
            // provider.sendTransaction(signedTx)
            signedTxs.push(signedTx)
        } catch (e) {
            console.log(i, e)
        }
    }
    let lastBlockBeforeSpamming = await provider.getBlockNumber()
    let spamStartTime = Math.floor(Date.now() / 1000)
    console.log('lastBlockBeforeSpamming', lastBlockBeforeSpamming)
    for (let i = 0; i < signedTxs.length; i++) {
        // console.log('Injected tx:', i + 1)
        try {
            // let result = await provider.sendTransaction(signedTxs[i])
            // console.log('result', result)
            provider.sendTransaction(signedTxs[i])
        } catch (e) {
            console.log(e)
        }
        // if (i > 0 && i % tps === 0) {
        // console.log(i)
        currentTime = Date.now()
        elapsed = currentTime - lastTime
        sleepTime = waitTime - elapsed
        if (sleepTime < 0) sleepTime = 0
        if (sleepTime > 0) await sleep(sleepTime)
        lastTime = Date.now()
        // }
    }
    let spamEndTime = Math.floor(Date.now() / 1000)
    var timeDiff = spamEndTime - spamStartTime; //in ms

    var seconds = Math.round(timeDiff);
    let lastBlockAfterSpamming = await provider.getBlockNumber()
    console.log('lastBlockAfterSpamming', lastBlockAfterSpamming)
    console.log('totalSpammingTime', seconds)
}

async function checkTps(injectedEthers, startBlock, totalTXs, fileToSave) {
    ethers = injectedEthers
    provider = new ethers.providers.JsonRpcProvider(jsonRpcUrl)
    let startTime
    let endTime
    let endBlock
    let totalTransactions = 0
    let i = 0
    for (i = startBlock; totalTransactions < totalTXs; i++) {
        let block = await provider.getBlock(i)
        if (!block) break
        let { timestamp, transactions } = block
        block.transactionsSize = transactions.length
        if (i === startBlock) {
            startTime = timestamp
        }
        if (transactions.length > 0) {
            endBlock = block.number
            endTime = timestamp
            totalTransactions += parseInt(transactions.length)
        }
        fs.appendFile(fileToSave, JSON.stringify(block, null, 2), function (err) {
            if (err) throw err;
        });
    }
    let averageTime = endTime - startTime;
    let avgTPS = totalTransactions / averageTime;
    console.log('startBlock', startBlock, 'endBlock', endBlock)
    console.log(`total time`, averageTime)
    console.log(`total txs:`, totalTransactions)
    console.log(`avg tps`, avgTPS)
}

module.exports = { spam, checkTps }
