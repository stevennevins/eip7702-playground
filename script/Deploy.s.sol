// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "../lib/forge-std/src/Script.sol";
import { Storage } from "../contracts/Storage.sol";

contract DeployStorage is Script {
    function run() external returns (Storage storage_) {
        vm.startBroadcast();
        storage_ = new Storage();
        vm.stopBroadcast();
    }
}
