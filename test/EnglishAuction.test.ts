import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect, assert } from 'chai';
import { Contract, ContractFactory, constants, BigNumber } from 'ethers';
import { ethers } from 'hardhat';
interface SendNftToContractScenario {
  _nftContract?: Contract;
  _minter?: SignerWithAddress;
}
interface CreateAuctionScenario {
  _nftContract?: Contract;
  _minter?: SignerWithAddress;
  _startPrice?: BigNumber;
  _endDate?: Number;
}

describe('EnglishAuction', () => {
  let contract: Contract;
  let nftContract: Contract;
  let nftContract2: Contract;
  let owner: SignerWithAddress;
  let addresses: SignerWithAddress[];
  let factory: ContractFactory;
  let nftFactory: ContractFactory;
  const MINT_PRICE = ethers.utils.parseEther('0.001');

  // hooks
  before(async () => {
    [owner, ...addresses] = await ethers.getSigners();
    nftFactory = await ethers.getContractFactory('Foo721');
    factory = await ethers.getContractFactory('EnglishAuction');
  });

  beforeEach(async () => {
    const now = Math.floor(+new Date() / 1000);
    nftContract = await nftFactory.deploy(now - 100);
    nftContract2 = await nftFactory.deploy(now - 100);
    contract = await factory.deploy();
  });

  async function sendNftToContractScenario({
    _nftContract = nftContract,
    _minter = owner,
  }: SendNftToContractScenario = {}) {
    await _nftContract.mint(_minter.address, 1, { value: MINT_PRICE });
    return await _nftContract
      .connect(_minter)
      .safeTransfer(_minter.address, contract.address, 1);
  }
  async function createAuctionScenario({
    _nftContract = nftContract,
    _minter = owner,
    _endDate = Math.floor(+new Date() / 1000) + 500,
    _startPrice = ethers.utils.parseEther('0.001'),
  }: CreateAuctionScenario = {}) {
    return await contract
      .connect(_minter)
      .createAuction(_nftContract.address, 1, _startPrice, _endDate);
  }

  it('should mint nft to contract ', async () => {
    await expect(nftContract.mint(contract.address, 1, { value: MINT_PRICE }))
      .to.emit(nftContract, 'Transfer')
      .withArgs(constants.AddressZero, contract.address, 1);
  });

  it('should transfer nft to contract ', async () => {
    await expect(sendNftToContractScenario({ _nftContract: nftContract2 }))
      .to.emit(nftContract2, 'Transfer')
      .withArgs(owner.address, contract.address, 1);
  });

  //create Auction tests
  it('should create Auction', async () => {
    await sendNftToContractScenario();
    await expect(createAuctionScenario())
      .to.emit(contract, 'AuctionCreated')
      .withArgs(owner.address, nftContract.address, 1);
  });
  it('should not create Auction if does not send nft to contract', async () => {
    await sendNftToContractScenario({ _minter: addresses[5] });
    await expect(createAuctionScenario()).to.be.revertedWith('NotOwner');
  });
  it('should bid successfully', async () => {
    const contractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await expect(
      contract.connect(sender).bid(contractAddress, 1, { value: price })
    )
      .to.emit(contract, 'Bided')
      .withArgs(contractAddress, 1, sender.address, price);
  });

  it('should bid successfully and update the highestBidder and highestBid', async () => {
    const contractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await contract.connect(sender).bid(contractAddress, 1, { value: price });

    //eslint-disable-next-line
    const [seller, highestBidder, highestBid, endTime] =
      await contract.auctions(contractAddress, 1);

    // console.log(seller, highestBidder, highestBid, endTime);

    assert.equal(highestBidder.toString(), sender.address.toString());
    assert.equal(highestBid.toString(), price.toString());
  });

  it('should bid successfully if total bid is more than biggest bid', async () => {
    const contractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();

    await contract
      .connect(sender)
      .bid(nftContract.address, 1, { value: price });

    await contract
      .connect(addresses[1])
      .bid(contractAddress, 1, { value: price.mul(2) });

    // sender = price * 2 + 1
    // addresses[1] = price * 2
    // sender > addresses[1]
    await expect(
      contract
        .connect(sender)
        .bid(nftContract.address, 1, { value: price.add(1) })
    )
      .to.emit(contract, 'Bided')
      .withArgs(contractAddress, 1, sender.address, price.add(1));
  });

  it('should not bid if price is lower than start price', async () => {
    const contractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await expect(
      contract.connect(sender).bid(contractAddress, 1, { value: price.sub(1) })
    ).to.be.revertedWith('YourBidMustBeGreatest');
  });

  it('should not bid if price is not greatest', async () => {
    const contractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();

    await contract
      .connect(addresses[1])
      .bid(contractAddress, 1, { value: price.add(1) });

    await expect(
      contract.connect(sender).bid(contractAddress, 1, { value: price })
    ).to.be.revertedWith('YourBidMustBeGreatest');
  });

  it('should not bid auction is ended', async () => {
    const contractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');
    const now = Math.floor(+new Date() / 1000);

    await sendNftToContractScenario();
    await createAuctionScenario({ _endDate: now - 5 });
    await expect(
      contract.connect(sender).bid(contractAddress, 1, { value: price.sub(1) })
    ).to.be.revertedWith('AuctionEnded');
  });

  // claim tests
  it('should claim if winner (Transfer)', async () => {
    const nftContractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await contract.connect(sender).bid(nftContractAddress, 1, { value: price });

    await ethers.provider.send('evm_increaseTime', [1000]);

    await expect(contract.connect(sender).claim(nftContractAddress, 1))
      .to.emit(nftContract, 'Transfer')
      .withArgs(contract.address, sender.address, 1);

    await ethers.provider.send('evm_increaseTime', [-1000]);
  });

  it('should claim if winner (WinnerClaimed)', async () => {
    const nftContractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await contract.connect(sender).bid(nftContractAddress, 1, { value: price });

    await ethers.provider.send('evm_increaseTime', [1000]);

    await expect(contract.connect(sender).claim(nftContractAddress, 1))
      .to.emit(contract, 'WinnerClaimed')
      .withArgs(nftContractAddress, 1, sender.address, price);

    await ethers.provider.send('evm_increaseTime', [-1000]);
  });

  it('should claim if seller', async () => {
    const nftContractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await contract.connect(sender).bid(nftContractAddress, 1, { value: price });

    await ethers.provider.send('evm_increaseTime', [1000]);

    await expect(contract.claim(nftContractAddress, 1))
      .to.emit(contract, 'SellerClaimed')
      .withArgs(nftContractAddress, 1, owner.address, price);

    await ethers.provider.send('evm_increaseTime', [-1000]);
  });

  it('should claim if looser', async () => {
    const nftContractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await contract.connect(sender).bid(nftContractAddress, 1, { value: price });
    await contract
      .connect(addresses[5])
      .bid(nftContractAddress, 1, { value: price.mul(2) });

    await ethers.provider.send('evm_increaseTime', [1000]);

    await expect(contract.connect(sender).claim(nftContractAddress, 1))
      .to.emit(contract, 'LooserClaimed')
      .withArgs(nftContractAddress, 1, sender.address, price);

    await ethers.provider.send('evm_increaseTime', [-1000]);
  });

  it('should not claim if AuctionNotEnded', async () => {
    const nftContractAddress = nftContract.address;
    const sender = addresses[0];
    const price = ethers.utils.parseEther('0.001');

    await sendNftToContractScenario();
    await createAuctionScenario();
    await contract.connect(sender).bid(nftContractAddress, 1, { value: price });
    await contract
      .connect(addresses[5])
      .bid(nftContractAddress, 1, { value: price.mul(2) });

    await expect(
      contract.connect(sender).claim(nftContractAddress, 1)
    ).to.revertedWith('AuctionNotEnded');
  });
});
