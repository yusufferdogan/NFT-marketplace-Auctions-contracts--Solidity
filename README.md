<div align="center">
  <h1 align="center">Solidity Auctions</h1>
  <p align="center">
<!--     <a href="https://github.com/sindresorhus/awesome">
      <img alt="awesome list badge" src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg">
    </a>
    <a href="#buildstatus">
      <img alt="build status badge" src="https://github.com/bkrem/awesome-solidity/workflows/URLs/badge.svg">
    </a>
    <a href="https://github.com/bkrem/awesome-solidity/graphs/contributors">
      <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/bkrem/awesome-solidity">
    </a> -->
    <a href="http://makeapullrequest.com">
      <img alt="pull requests welcome badge" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat">
    </a>
<!--     <a href="https://gitcoin.co/grants/3371/awesome-solidity">
      <img alt="support via gitcoin badge" src="https://img.shields.io/badge/Support%20via-GitCoin-purple">
    </a> -->
  </p>
  
  <p align="center">An implementations of Auctions based on NFT's</p>
<!--   <p align="center">Please check the <a href="CONTRIBUTING.md">contribution guidelines</a> for information on formatting and writing pull requests.</p>
   -->
</div>

# TODO

- [x] English Auction
- [x] Dutch Auction
- [ ] NFT swap
- [ ] SEALED_BID AUCTION

# Testing Report 

## English Auction %100 coverage

![image](https://user-images.githubusercontent.com/45846424/177055559-86d4313e-a232-4b0c-ae7a-874e01481f59.png)
![image](https://user-images.githubusercontent.com/45846424/177055569-9a410eb4-ae9e-4b22-94f1-250944c1de2a.png)

## Dutch Auction %100 coverage

![image](https://user-images.githubusercontent.com/45846424/177413153-7067d34a-97ce-48e7-ab2f-c3160f158668.png)

# Coverage Report

| Statements                                                                               | Functions                                                                              | Lines                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Statements](https://img.shields.io/badge/statements-100%25-brightgreen.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-100%25-brightgreen.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-100%25-brightgreen.svg?style=flat) |

# Prerequisites

- Docker

```shell
PATH+=":./bin"    # use your sh files (which are located in bin/) directly from the root of the project
```

```shell
./build.sh      # install solc and other tools in the docker image
yarn install    # install deps
```

Don't forget to copy the .env.example file to a file named .env, and then edit it to fill in the details.

# Running all the tests

```shell
yarn run test
yarn run test:trace       # shows logs + calls
yarn run test:fresh       # force compile and then run tests
yarn run test:coverage    # run tests with coverage reports
```

# Formatters & Linters

You can use the below packages,

- Solhint
- ESLint
- Prettier
- CSpell
- ShellCheck

```shell
yarn run format
yarn run lint
```

# Analyzers

You can use the below tools,

- Slither
- Mythril

```shell
yarn run analyze:static path/to/contract
yarn run analyze:security path/to/contract
yarn run analyze:all path/to/contract
```

# Deploy Contract & Verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details.

- Enter your Etherscan API key
- Ropsten node URL (eg from Alchemy)
- The private key of the account which will send the deployment transaction.

With a valid .env file in place, first deploy your contract:

```shell
yarn run deploy ropsten <CONTRACT_FILE_NAME>    # related to scripts/deploy/<CONTRACT_FILE_NAME>.ts
yarn run deploy:all ropsten                     # related to scripts/deploy.ts
```

Also, you can add contract(s) manually to your tenderly projects from the output.
`https://dashboard.tenderly.co/contract/<NETWORK_NAME>/<CONTRACT_ADDRESS>`

And then verify it:

```shell
yarn run verify ropsten <DEPLOYED_CONTRACT_ADDRESS> "<CONSTRUCTOR_ARGUMENT(S)>"    # hardhat.config.ts to see all networks
```

# Miscellaneous

```shell
yarn run generate:docs    # generate docs. it checks to /contracts folder
```

```shell
yarn run generate:flatten path/to/contract    # generate the flatten file
yarn run generate:abi path/to/contract        # generate the ABI file
yarn run generate:bin path/to/contract        # generate the binary in a hex
```

# TODO

- Increase diversity in the Workshop Contract
- Add npm scripts to linters
- Add Workshop Contract tests
- Add TSLint as a TypeScript linter
- add TypeChain to Contract variables in the TypeScript files
