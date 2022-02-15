## Polygon TPS Test for Coin Transfer

##### Hardware: dedicated server at `nocix.net`

- Processor 2x E5-2660 @ 2.2GHz / 3GHz Turbo 16 Cores / 32 thread
- Ram 96 GB DDR3
- Disk 960 GB SSD
- Bandwidth 1Gbit Port: 200TB Transfer
- Operating System Ubuntu 18.04 (Bionic)

##### Network setup

- A network of 5 Polygon validators and 1 sentry node was run. The network is consist of one Ethereum node(ganache), 6 Heimdall nodes, and 6 Bor nodes
- All nodes used the same IP, but different ports
- 5 bor nodes block producers.

##### Test setup for native coin transfer

- 30000 accounts were loaded in the genesis block with 1000 ETH each
- 30000 native coin txs were submitted to the network as fast as possible
  - Each tx moved 1 ETH between two different randomly chosen accounts
  - The number of accounts was chosen to be equal to the number of total txs so that there would be a low chance of a tx getting rejected due to another transaction from the same account still pending.

##### Test result

- Tests are taken starting from 500 tps to 2000 tps for 10 seconds. Time between the start of the test and the last block to process txs from the test was measured.
- Spam rate \* duration \* clients = Total Txs / Total Rate = Avg TPS
  ```
  200 * 10 *  5 = 10000 / 1000 = 416 , 312 , 357 , 384 , 416
  100 * 10 * 10 = 10000 / 1000 = 588 , 526 , 526 ,
  200 * 10 * 10 = 20000 / 2000 = 714 , 302 , 476 , 605
  100 * 10 * 20 = 20000 / 2000 = 476 , 768
  ```
- Estimated average tps is **500 TPS**

##### Instructions to recreate this test

1.  Install required tools and dependencies.
    1. sudo apt-get install build-essential
    2. [https://docs.polygon.technology/docs/integrate/full-node-binaries/#install-go-1](https://docs.polygon.technology/docs/integrate/full-node-binaries/#install-go-1)
    3. Install docker
    4. [https://github.com/maticnetwork/matic-cli](https://github.com/maticnetwork/matic-cli)
    5. Make sure you have installed these:
       1. Git
       2. Node/npm v10.17.0 (or higher)
       3. Go 1.13+
       4. Rabbitmq (Latest stable version)
       5. Solc v0.5.11 (https://solidity.readthedocs.io/en/v0.5.3/installing-solidity.html#binary-packages)
       6. Ganache CLI (https://www.npmjs.com/package/ganache-cli)
2.  Create a local network of 5 validator nodes.

    1. Look into [https://github.com/maticnetwork/matic-cli](https://github.com/maticnetwork/matic-cli) to setup multi-node
    2. mkdir localnet && cd localnet 8. matic-cli setup devnet
    3. Make sure you have selected the latest released branch of Bor, Heimdall and Contracts
    4. Configure the network settings first as in steps no.3 (Scripts rep ...) to 5 (Configure the genesis ...).
    5. Commands to follow after the setup:

       1. Start ganache
          - `bash docker-ganache-start.sh`
       2. Start heimdall services
          - `bash docker-heimdall-start-all.sh`
       3. Setup bor
          - `bash docker-bor-setup.sh`
       4. Start bor
          - `bash docker-bor-start-all.sh`
       5. Stop services
          - `bash docker-clean.sh`

    6. You can attach to the bor node or ganachi node with the following command.
       1. `bor attach [http://localhost:9545](http://localhost:9545) for _ganachi_ node`
       2. `bor attach [http://localhost:8545](http://localhost:8545) for _bor_ node`
    7. Some commands useful for getting information from the running node.
       - admin.nodeInfo
       - net.peerCount
       - eth.accounts
       - eth.getBlock(1)
       - eth.blockNumber
       - eth.getBalance(eth.accounts[0])
       - eth.sendTransaction({from:eth.accounts[0], to:0x50F6D9E5771361Ec8b95D6cfb8aC186342B70120, value:1000})

3.  Scripts repo used for running transactions to the network.

    1.  [https://gitlab.com/shardeum/smart-contract-platform-comparison/polygon](https://gitlab.com/shardeum/smart-contract-platform-comparison/polygon)
    2.  cd spam-client && npm install
    3.  generate_accounts.js is for creating multiple accounts.
    4.  spam.js is for running transactions to the network and checking the average tps of each spam.

4.  Generate multiple accounts. Add these addresses in the genesis file to reserve some balance.

    1.  `npx hardhat generate --accounts [number]`
    2.  Copy the public addresses from the publicAddresses.json and add them in the genesis file to get some funds as step no.5.
    3.  The spam-client will use their private keys from privateAddresses.json.

5.  Configure the Genesis block settings of each Bor. These files are under _localnet/devnet/node\*/bor/genesis.json._ Copy the created publicAddresses and paste it under _alloc_ field.

    ```
    {
       "alloc": {
           ...pre-configured addresses
           ...add the created addresses here
           "0x3d3E0A9DdCC3348Fc81daDED2e72eC0CaC870ABD": {
               "balance": "100000000000000000000"
           },
           "0x9C89804E5BE2ae21D37692526A67ea9a9f9cCD0D": {
               "balance": "200000000000000000000"
           }
       }
    }
    ```

6.  Start the local network as described in step no.2(5).
7.  Spam the transactions. After each spam, follow step no.8 to check the average tps

    - npx hardhat spam --tps [number] --duration [number] --start [accounts_start_index] --end [accounts_end_index]

            If 2000 accounts are created,

            e.g 100 transactions per second for 5 seconds to use 1000 accounts from 0
            npx hardnat spam --tps 100 --duration 5 --start 0 --end 1000

            E.g 100 transactions per second for 5 seconds to use 1000 accounts from 1000
            npx hardnat spam --tps 100 --duration 5 --start 1000 --end 2000

    - After the spam, take _lastBlockBeforeSpamming_ and _totalTxs_ submitted to check average TPS of the spam.

8.  Check the average tps of each spam.

    1.  Get the _lastBlockBeforeSpamming_ from the spam terminal.
    2.  Get the total submitted Txs
        - e.g. if spamming with --tps 100 --duration 5 will be 500 txs.
    3.  npx hardhat check_tps --startblock [block_number] --txs [total_txs] --output [name.json]
        - e.g. npx hardhat check_tps --startblock 238 -- txs 500 – output s238t500.json

9.  In order to send higher txs, we use spam-client-orchestrator to spam from many terminals.
    1. cd spam-client-orchestrator && npm install
    2. Add the value (number of accounts you created as in step no.4(1) ) in _total_accounts_ variable in orchestrator.js. This will divide how many accounts to use for each client.
    3. Check out the README for usage.
