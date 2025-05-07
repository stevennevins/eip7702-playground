import { describe, it, expect } from 'vitest'
import { createPublicClient, http, Hex } from 'viem'
import { foundry } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

describe('Test', () => {
    const client = createPublicClient({
        chain: foundry,
        transport: http()
    })

    const account = privateKeyToAccount(PRIVATE_KEY as Hex)
    describe('test', () => {
        it.skip('should fetch proof for storage slot', async () => {
        })
    })
})
