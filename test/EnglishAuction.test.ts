import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory, constants } from 'ethers';
import { ethers } from 'hardhat';

describe('EnglishAuction', () => {
  let contract: Contract;
  let nftContract: Contract;
  let owner: SignerWithAddress;
  let addresses: SignerWithAddress[];
  let factory: ContractFactory;
  let nftFactory: ContractFactory;

  // hooks
  before(async () => {
    [owner, ...addresses] = await ethers.getSigners();
    nftFactory = await ethers.getContractFactory('FooNFT');
    factory = await ethers.getContractFactory('EnglishAuction');
    console.log(addresses[0].address == owner.address);
  });

  beforeEach(async () => {
    nftContract = await nftFactory.deploy();
    contract = await factory.deploy(nftContract.address);
  });

  it('should mint nft to contract ', async () => {
    await expect(nftContract.mint(contract.address, 1))
      .to.emit(nftContract, 'Transfer')
      .withArgs(constants.AddressZero, contract.address, 1);
  });

  it('should transfer nft to contract ', async () => {
    await nftContract.mint(owner.address, 1);

    await expect(nftContract.transfer(owner.address, contract.address, 1))
      .to.emit(nftContract, 'Transfer')
      .withArgs(owner.address, contract.address, 1);
  });
});
