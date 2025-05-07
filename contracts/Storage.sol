// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Storage {
    uint256 private _value;

    event ValueSet(uint256 indexed newValue);

    error InvalidValue();

    function set(uint256 newValue) external {
        if (newValue == 0) revert InvalidValue();
        _value = newValue;
        emit ValueSet(newValue);
    }

    function get() external view returns (uint256) {
        return _value;
    }

}
