// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title MultiMerchantPoints
/// @notice ERC-1155 loyalty contract where each merchant owns a dedicated token id.
contract MultiMerchantPoints is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _merchantCounter;

    mapping(uint256 => string) public merchantUriFragments;

    event MerchantRegistered(uint256 indexed merchantId, string name, string uriFragment);

    constructor(string memory baseUri, address admin) ERC1155(baseUri) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function registerMerchant(string calldata uriFragment, string calldata name) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        _merchantCounter += 1;
        merchantUriFragments[_merchantCounter] = uriFragment;
        emit MerchantRegistered(_merchantCounter, name, uriFragment);
        return _merchantCounter;
    }

    function mintPoints(address account, uint256 merchantId, uint256 amount, bytes calldata data) external onlyRole(MINTER_ROLE) {
        _mint(account, merchantId, amount, data);
    }

    function burnPoints(address account, uint256 merchantId, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(account, merchantId, amount);
    }

    function setURI(string memory newUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newUri);
    }
}
