import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory, BigNumber } from 'ethers';
import { ethers } from 'hardhat';

interface CreateAuctionScenario {
  _nftContract?: Contract;
  _minter?: SignerWithAddress;
  _startPrice?: BigNumber;
  _discountRate?: BigNumber;
  _duration?: BigNumber;
}

describe('DutchAuction', () => {
  let contract: Contract;
  let nftContract: Contract;
  let owner: SignerWithAddress;
  let addresses: SignerWithAddress[];
  let factory: ContractFactory;
  let nftFactory: ContractFactory;
  const MINT_PRICE = ethers.utils.parseEther('0.001');

  // hooks
  before(async () => {
    [owner, ...addresses] = await ethers.getSigners();
    nftFactory = await ethers.getContractFactory('Foo721');
    factory = await ethers.getContractFactory('DutchAuction');
  });

  beforeEach(async () => {
    const now = Math.floor(+new Date() / 1000);
    nftContract = await nftFactory.deploy(now - 100);
    contract = await factory.deploy();
  });

  async function createAuctionScenario({
    _nftContract = nftContract,
    _minter = owner,
    _startPrice = BigNumber.from('1000'),
    _duration = BigNumber.from('1000'),
    _discountRate = BigNumber.from('1'),
  }: CreateAuctionScenario = {}) {
    await _nftContract.mint(_minter.address, 1, { value: MINT_PRICE });
    await _nftContract.approve(contract.address, 1);

    return await contract
      .connect(_minter)
      .createAuction(
        _nftContract.address,
        1,
        _startPrice,
        _discountRate,
        _duration
      );
  }

  it('should buy nft (Sold Event)', async () => {
    await createAuctionScenario();
    const price = await contract.getPrice(nftContract.address, 1);

    await expect(
      contract.connect(addresses[5]).buy(nftContract.address, 1, {
        value: price,
      })
    )
      .to.emit(contract, 'Sold')
      .withArgs(nftContract.address, 1, addresses[5].address, price);
  });

  it('should buy nft (Transfer Event)', async () => {
    await createAuctionScenario();
    const price = await contract.getPrice(nftContract.address, 1);

    await expect(
      contract.connect(addresses[5]).buy(nftContract.address, 1, {
        value: price,
      })
    )
      .to.emit(nftContract, 'Transfer')
      .withArgs(owner.address, addresses[5].address, 1);
  });

  it('should not buy nft if auction is ended', async () => {
    await createAuctionScenario();
    const price = await contract.getPrice(nftContract.address, 1);

    await ethers.provider.send('evm_increaseTime', [10000]);

    await expect(
      contract.connect(addresses[5]).buy(nftContract.address, 1, {
        value: price,
      })
    ).to.be.revertedWith('AuctionEnded');

    await ethers.provider.send('evm_increaseTime', [-10000]);
  });

  it('should not buy nft if Insufficient Funds', async () => {
    await createAuctionScenario();

    await expect(
      contract.connect(addresses[5]).buy(nftContract.address, 1)
    ).to.be.revertedWith('InsufficientFunds');
  });

  it('should not create Auction if not approved', async () => {
    const startPrice = BigNumber.from('1000');
    const duration = BigNumber.from('1000');
    const discountRate = BigNumber.from('1');
    await nftContract.mint(owner.address, 1, { value: MINT_PRICE });

    await expect(
      contract.createAuction(
        nftContract.address,
        1,
        startPrice,
        discountRate,
        duration
      )
    ).to.be.revertedWith('NotApproved');
  });

  it('should not create Auction if not owner', async () => {
    const startPrice = BigNumber.from('1000');
    const duration = BigNumber.from('1000');
    const discountRate = BigNumber.from('1');
    await nftContract.mint(owner.address, 1, { value: MINT_PRICE });
    await nftContract.approve(contract.address, 1);

    await expect(
      contract
        .connect(addresses[5])
        .createAuction(
          nftContract.address,
          1,
          startPrice,
          discountRate,
          duration
        )
    ).to.be.revertedWith('NotOwner');
  });

  it('should not buy nft if owner is not owner of nft anymore', async () => {
    await createAuctionScenario();
    await nftContract.transferFrom(owner.address, addresses[7].address, 1);
    const price = await contract.getPrice(nftContract.address, 1);

    await expect(
      contract
        .connect(addresses[5])
        .buy(nftContract.address, 1, { value: price })
    ).to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
  });
});
