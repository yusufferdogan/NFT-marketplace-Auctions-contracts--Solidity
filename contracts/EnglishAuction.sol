// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract EnglishAuction is IERC721Receiver {
    struct Auction {
        address seller;
        address highestBidder;
        uint256 highestBid;
        uint256 endTime;
    }

    error NotOwner();
    error YourBidMustBeGreatest(uint256 bid);
    error AuctionEnded();
    error AuctionNotEnded();
    error TransferTxError();

    event AuctionCreated(
        address indexed seller,
        address indexed contractAddress,
        uint256 indexed tokenId
    );

    event Bided(
        address indexed contractAddress,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 bid
    );

    event WinnerClaimed(
        address indexed contractAddress,
        uint256 indexed tokenId,
        address indexed winner,
        uint256 bid
    );

    event LooserClaimed(
        address indexed contractAddress,
        uint256 indexed tokenId,
        address indexed looser,
        uint256 bid
    );

    event SellerClaimed(
        address indexed contractAddress,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 totalMoney
    );

    // contract Address => tokenId => Auction
    mapping(address => mapping(uint256 => Auction)) public auctions;
    // contract Address => tokenId => bidder => bid
    mapping(address => mapping(uint256 => mapping(address => uint256)))
        public bids;
    // contract Address => tokenId => owner
    mapping(address => mapping(uint256 => address)) public ownerships;

    function createAuction(
        address contractAddress,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    ) external returns (uint256) {
        if (ownerships[contractAddress][tokenId] != msg.sender)
            revert NotOwner();

        delete ownerships[contractAddress][tokenId];

        auctions[contractAddress][tokenId] = Auction(
            msg.sender,
            // make highest bidder is seller so if no-one is bided he can claim
            msg.sender,
            startPrice,
            endTime
        );
        emit AuctionCreated(msg.sender, contractAddress, tokenId);
        return tokenId;
    }

    // your total bid must be greater than biggest bid
    function bid(address contractAddress, uint256 tokenId) external payable {
        Auction storage auction = auctions[contractAddress][tokenId];
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp > auction.endTime) revert AuctionEnded();

        uint256 currentBid = bids[contractAddress][tokenId][msg.sender];
        uint256 totalBid = msg.value + currentBid;

        // your total bid must be greatest
        if (totalBid < auction.highestBid)
            revert YourBidMustBeGreatest(msg.value);

        bids[contractAddress][tokenId][msg.sender] += msg.value;
        auction.highestBid = totalBid;
        auction.highestBidder = msg.sender;
        emit Bided(contractAddress, tokenId, msg.sender, msg.value);
    }

    function claim(address contractAddress, uint256 tokenId) external {
        Auction storage auction = auctions[contractAddress][tokenId];
        uint256 bidOfSender = bids[contractAddress][tokenId][msg.sender];

        uint256 withdrawAmount;
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();

        // if you are the highest bidder you win the nft
        if (msg.sender == auction.highestBidder) {
            IERC721(contractAddress).safeTransferFrom(
                address(this),
                msg.sender,
                tokenId
            );

            auction.highestBidder = address(0);

            emit WinnerClaimed(
                contractAddress,
                tokenId,
                msg.sender,
                bidOfSender
            );

            return;

            // if you are the seller you take your money
        } else if (msg.sender == auction.seller) {
            auction.highestBidder != address(0)
                ? withdrawAmount = auction.highestBid
                : withdrawAmount = 0;

            auction.seller = address(0);
            auction.highestBid = 0;

            emit SellerClaimed(
                contractAddress,
                tokenId,
                msg.sender,
                withdrawAmount
            );

            // if you are looser then you take your money back
        } else {
            withdrawAmount = bids[contractAddress][tokenId][msg.sender];
            bids[contractAddress][tokenId][msg.sender] = 0;

            emit LooserClaimed(
                contractAddress,
                tokenId,
                msg.sender,
                bidOfSender
            );
        }
        // solhint-disable-next-line avoid-low-level-calls
        (bool isSuccess, ) = payable(msg.sender).call{ value: withdrawAmount }(
            ""
        );

        if (!isSuccess) revert TransferTxError();
    }

    /**
     * @notice this function is triggered when _safeMint or _safeTransferFrom is triggered.
     * @param operator who is sended NFT to this contract
     * @param from owner of the NFT
     * @param tokenId ID of the NFT
     * @return selector of onERC721Received function
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // if transfer is minting make operator as owner
        if (from == address(0)) {
            from = operator;
        }
        ownerships[msg.sender][tokenId] = from;
        return bytes4(this.onERC721Received.selector);
    }
}
