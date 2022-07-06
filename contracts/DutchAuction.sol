// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title English Auction contract for NFT's
 * @author @yusufferdogan
 * @notice All NFT contracts are accepted
 * @dev You must approve your nft to this contract
 */
contract DutchAuction {
    struct Auction {
        address seller;
        uint256 startPrice;
        uint256 startDate;
        uint256 discountRate;
        uint256 duration;
    }

    error NotApproved();
    error NotOwner();
    error InsufficientFunds();
    error AuctionEnded();
    error TransferTxError();
    error InvalidStartingPrice();

    event AuctionCreated(
        address indexed seller,
        address indexed contractAddress,
        uint256 indexed tokenId
    );

    event Sold(
        address indexed contractAddress,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 price
    );

    // contract Address => tokenId => Auction
    mapping(address => mapping(uint256 => Auction)) public auctions;

    uint256 public platformFees;

    uint256 public constant FEE_PERCANTAGE = 5;

    function createAuction(
        address contractAddress,
        uint256 tokenId,
        uint256 startPrice,
        uint256 discountRate,
        uint256 duration
    ) external returns (uint256) {
        if (IERC721(contractAddress).getApproved(tokenId) != address(this))
            revert NotApproved();

        if (IERC721(contractAddress).ownerOf(tokenId) != msg.sender)
            revert NotOwner();

        if (startPrice < discountRate * duration) revert InvalidStartingPrice();

        auctions[contractAddress][tokenId] = Auction(
            msg.sender,
            startPrice,
            // solhint-disable-next-line
            block.timestamp,
            discountRate,
            duration
        );
        emit AuctionCreated(msg.sender, contractAddress, tokenId);
        return tokenId;
    }

    function getPrice(address contractAddress, uint256 tokenId)
        public
        view
        returns (uint256)
    {
        Auction memory auction = auctions[contractAddress][tokenId];
        // solhint-disable-next-line not-rely-on-time
        uint256 timeElapsed = block.timestamp - auction.startDate;
        uint256 discount = auction.discountRate * timeElapsed;
        return auction.startPrice - discount;
    }

    // your total bid must be greater than biggest bid
    function buy(address contractAddress, uint256 tokenId) external payable {
        Auction memory auction = auctions[contractAddress][tokenId];
        //solhint-disable-next-line not-rely-on-time
        if (block.timestamp > auction.startDate + auction.duration)
            revert AuctionEnded();

        uint256 price = getPrice(contractAddress, tokenId);

        if (msg.value < price) revert InsufficientFunds();

        IERC721(contractAddress).transferFrom(
            auction.seller,
            msg.sender,
            tokenId
        );

        platformFees += (msg.value * FEE_PERCANTAGE) / 100;

        //solhint-disable-next-line avoid-low-level-calls
        (bool isSuccess, ) = payable(msg.sender).call{
            value: (msg.value * (100 - FEE_PERCANTAGE)) / 100
        }("");

        if (!isSuccess) revert TransferTxError();

        emit Sold(contractAddress, tokenId, msg.sender, msg.value);
    }
}
