// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// console.log() @TODO: remove that
import "hardhat/console.sol";

contract EnglishAuction is IERC721Receiver {
    // may add open closed cancelled
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

    event Bided(uint256 indexed tokenId, address indexed bidder, uint256 bid);
    event WinnerClaimed(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 bid
    );
    event LooserClaimed(
        uint256 indexed tokenId,
        address indexed looser,
        uint256 bid
    );
    event SellerClaimed(uint256 indexed tokenId, address indexed seller);

    IERC721 public immutable nft;

    // tokenId => Auction
    mapping(uint256 => Auction) public auctions;
    // tokenId => bidder => bid
    mapping(uint256 => mapping(address => uint256)) public bids;
    // tokenId => owner
    mapping(uint256 => address) public ownerships;

    constructor(address nftAddress) {
        nft = IERC721(nftAddress);
    }

    function createAuction(uint256 endTime, uint256 tokenId)
        external
        returns (uint256)
    {
        if (ownerships[tokenId] != msg.sender) revert NotOwner();

        delete ownerships[tokenId];

        auctions[tokenId] = Auction(msg.sender, address(0), 0, endTime);
        return tokenId;
    }

    // your total bid must be greater than biggest bid
    function bid(uint256 tokenId) external payable {
        Auction storage auction = auctions[tokenId];
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp > auction.endTime) revert AuctionEnded();

        uint256 currentBid = bids[tokenId][msg.sender];
        uint256 totalBid = msg.value + currentBid;

        if (totalBid < auction.highestBid)
            revert YourBidMustBeGreatest(msg.value);

        bids[tokenId][msg.sender] += msg.value;
        auction.highestBid = totalBid;
        auction.highestBidder = msg.sender;
        emit Bided(tokenId, msg.sender, msg.value);
    }

    function claim(uint256 tokenId) external {
        Auction storage auction = auctions[tokenId];
        uint256 withdrawAmount;
        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();

        // if you are the highest bidder you win the nft
        if (msg.sender == auction.highestBidder) {
            nft.safeTransferFrom(address(this), msg.sender, tokenId);
            auction.highestBidder = address(0);
            emit WinnerClaimed(tokenId, msg.sender, bids[tokenId][msg.sender]);
            return;

            // if you are the seller you take your money
        } else if (msg.sender == auction.seller) {
            withdrawAmount = auction.highestBid;
            auction.seller = address(0);
            auction.highestBid = 0;
            emit LooserClaimed(tokenId, msg.sender, bids[tokenId][msg.sender]);
            (tokenId, msg.sender, bids[tokenId][msg.sender]);

            // if you are looser then you take your money back
        } else {
            withdrawAmount = bids[tokenId][msg.sender];
            bids[tokenId][msg.sender] = 0;
        }
        // solhint-disable-next-line avoid-low-level-calls
        (bool isSuccess, ) = payable(msg.sender).call{ value: withdrawAmount }(
            ""
        );

        if (!isSuccess) revert TransferTxError();
    }

    /**
     * @notice this function is triggered when _safeMint or _safeTransferFrom is triggered.
     * @dev i keep both operator and owner so there can be written contract that
     * takes approve from owner and sell it here ,but rewards goes to owner
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
        console.log("---------");
        console.log(operator);
        console.log(from);
        console.log(tokenId);
        console.log("---------");
        // if transfer is minting make operator as owner
        if (from == address(0)) {
            from = operator;
        }
        ownerships[tokenId] = from;
        return bytes4(this.onERC721Received.selector);
    }
}
