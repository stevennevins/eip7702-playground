import { describe, it, expect } from 'vitest'
import { createPublicClient, http, Hex, createWalletClient, parseEther, parseAbi } from 'viem'
import { anvil } from 'viem/chains'
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts'

const ALICE_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const BOB_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
const MULTICALL3_ABI = parseAbi([
    "struct Call3Value { address target; bool allowFailure; uint256 value; bytes callData; }",
    "struct Result { bool success; bytes returnData; }",
    "function aggregate3Value(Call3Value[] calldata calls) external payable returns (Result[] memory returnData)"
]);
const aliceAccount: PrivateKeyAccount = privateKeyToAccount(ALICE_PK as Hex)
const bobAccount: PrivateKeyAccount = privateKeyToAccount(BOB_PK as Hex)
const bobAddress = bobAccount.address


describe('EIP-7702 Tests', () => {
    const currentChain = anvil

    const aliceWalletClient = createWalletClient({
        account: aliceAccount,
        chain: currentChain,
        transport: http()
    })

    const publicClient = createPublicClient({
        chain: currentChain,
        transport: http()
    })

    describe('batch call with authorization', () => {
        it('should perform a batch call to send funds to Alice using authorization', async () => {
            const authorization = await aliceWalletClient.signAuthorization({
                contractAddress: MULTICALL3, // Using Multicall3 address
                executor: 'self',
            });

            const aliceBalanceBefore = await publicClient.getBalance({ address: aliceAccount.address });
            const bobBalanceBefore = await publicClient.getBalance({ address: bobAddress });

            // Delegate and call batch atomically
            const hash = await aliceWalletClient.writeContract({
                abi: MULTICALL3_ABI,
                address: MULTICALL3, // Target is the multicall contract
                functionName: "aggregate3Value",
                value: parseEther("3"),
                args: [
                    [
                        {
                            target: bobAddress,
                            allowFailure: false,
                            value: parseEther("1"),
                            callData: "0x",
                        },
                        {
                            target: bobAddress,
                            allowFailure: false,
                            value: parseEther("2"),
                            callData: "0x",
                        },
                    ],
                ],
                authorizationList: [authorization],
            });

            await publicClient.waitForTransactionReceipt({ hash });

            const aliceBalanceAfter = await publicClient.getBalance({ address: aliceAccount.address });
            const bobBalanceAfter = await publicClient.getBalance({ address: bobAddress });

            expect(hash).toBeDefined();
            expect(aliceBalanceAfter).toBeLessThan(aliceBalanceBefore); /// Alice should have lost 3 ETH plus gas costs
            expect(bobBalanceAfter - bobBalanceBefore).toEqual(parseEther("3"));
        });

        it("should allow Bob to execute a transaction on Alice's behalf", async () => {
            // Create a wallet client for Bob
            const bobWalletClient = createWalletClient({
                account: bobAccount,
                chain: currentChain,
                transport: http()
            });

            // Alice signs an authorization with Bob as the executor
            const authorization = await aliceWalletClient.signAuthorization({
                contractAddress: MULTICALL3,
                // executor: bobAddress,
            });

            const aliceBalanceBefore = await publicClient.getBalance({ address: aliceAccount.address });
            const bobBalanceBefore = await publicClient.getBalance({ address: bobAddress });

            // Bob executes the transaction on behalf of Alice
            const hash = await bobWalletClient.writeContract({
                abi: MULTICALL3_ABI,
                address: MULTICALL3,
                value: parseEther("3"),
                functionName: "aggregate3Value",
                args: [
                    [
                        {
                            target: bobAddress,
                            allowFailure: false,
                            value: parseEther("1"),
                            callData: "0x",
                        },
                        {
                            target: bobAddress,
                            allowFailure: false,
                            value: parseEther("2"),
                            callData: "0x",
                        },
                    ],
                ],
                authorizationList: [authorization],
            });

            await publicClient.waitForTransactionReceipt({ hash });

            const aliceBalanceAfter = await publicClient.getBalance({ address: aliceAccount.address });
            const bobBalanceAfter = await publicClient.getBalance({ address: bobAddress });

            expect(hash).toBeDefined();
            // Alice's balance should remain the same since Bob is paying for the transaction and the eth transfers
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore);
            // Bob's balance should decrease due to paying for the transaction and gas
            expect(bobBalanceAfter).toBeLessThan(bobBalanceBefore); // beecause of gas
        });
    });
});
