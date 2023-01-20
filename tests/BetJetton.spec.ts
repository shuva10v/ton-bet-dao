import {BetJetton} from "./BetJetton";
import {BetDaoContracts, ContractsBundle} from "./contracts";
import {Address, beginCell, toNano} from "ton-core";
import * as util from "util";
import {expectTransactionsValid} from "./test-utils";
import "@ton-community/test-utils" // register matchers

describe('BET Jetton', () => {
    test('should return off-chain metadata', async () => {
        const bundle = await ContractsBundle.get()

        const metadata = await bundle.betJettonMaster.getJettonData();
        expect(metadata.mintable).toBe(-1)
        expect(metadata.totalSupply).toBe(0n)
        expect(metadata.content?.equals(beginCell().storeUint(1, 8)
            .storeBuffer(Buffer.from("https://ipfs-url")).endCell())).toBeTruthy()
        expect(metadata.owner?.equals(bundle.minter.address)).toBeTruthy()

        // 1 TON minus deploy fee
        expect(await bundle.betJettonMaster.getBalance()).toBe(999503000n)
    })
    
    test('should wrap TON to BET 1:1', async () => {
        const bundle = await ContractsBundle.get()
        const jettonMaster = bundle.betJettonMaster
        const startBalance = await jettonMaster.getBalance()
        expect(startBalance).toBe(999503000n)

        // user going to wrap TON to BET
        const user1 = await bundle.blkch.treasury("user1")
        const balanceBeforeWrap = await bundle.balance(user1.address)
        const wrapRequest = await jettonMaster.sendWrap(user1.getSender(), {amount: toNano('3.0')})
        expectTransactionsValid(wrapRequest)
        expect(wrapRequest.transactions).toHaveLength(4)

        const wallet = await bundle.betWallet(user1.address)
        // internal_transfer
        expect(wrapRequest.transactions).toHaveTransaction({
            from: jettonMaster.address,
            to: wallet.address
        })
        // transfer_notification
        expect(wrapRequest.transactions).toHaveTransaction({
            from: wallet.address,
            to: user1.address
        })
        
        let metadata = await jettonMaster.getJettonData();
        expect(metadata.totalSupply).toBe(toNano('3.0'))
        let lockedTons = await bundle.balance(jettonMaster.address) - startBalance
        expect(lockedTons).toBeGreaterThan(toNano("3.0"))
        // it is impossible to store exactly locked amount with no excesses
        expect(BigInt(lockedTons) - toNano('3.0')).toBeLessThan(toNano("0.01"))
        
        let walletData = await wallet.getData()
        expect(walletData.balance).toBe(toNano('3.0'))
        expect(walletData.owner?.equals(user1.address)).toBeTruthy()
        expect(walletData.jettonMaster?.equals(jettonMaster.address)).toBeTruthy()
        expect(await wallet.getBalance()).toBeLessThan(toNano("0.01"))

        const wrapDecrease = balanceBeforeWrap - await bundle.balance(user1.address)
        const wrapCommission = wrapDecrease - toNano('3.0')
        // wrap commission
        expect(wrapCommission).toBeLessThan(toNano('0.05'))

        // user unwrap BET and receive TON
        const balanceBeforeBurn = await bundle.balance(user1.address)
        const burnResult = await wallet.sendBurn(user1.getSender(), {
            amount: toNano('1.0'),
            responseDestination: user1.address
        })
        expectTransactionsValid(burnResult)
        expect(burnResult.transactions).toHaveLength(4)
        expect(burnResult.transactions).toHaveTransaction({
            from: jettonMaster.address,
            to: user1.address
        })

        metadata = await jettonMaster.getJettonData();
        expect(metadata.totalSupply).toBe(toNano('2.0'))
        let lockedTons2 = await jettonMaster.getBalance() - startBalance
        expect(lockedTons2).toBeGreaterThan(toNano("2.0"))
        expect(BigInt(lockedTons2) - toNano('2.0')).toBeLessThan(toNano("0.01"))

        walletData = await wallet.getData()
        expect(walletData.balance).toBe(toNano('2.0'))
        expect(walletData.owner?.equals(user1.address)).toBeTruthy()
        expect(walletData.jettonMaster?.equals(jettonMaster.address)).toBeTruthy()
        expect(await wallet.getBalance()).toBeLessThan(toNano("0.01"))
        const unwrapIncrease = await bundle.balance(user1.address) - balanceBeforeBurn
        const unwrapCommission = toNano('1.0') - unwrapIncrease
        // unwrap commission
        expect(unwrapCommission).toBeLessThan(toNano('0.03'))
    })

    test('should support transfer between owners', async () => {
        const bundle = await ContractsBundle.get()
        const jettonMaster = bundle.betJettonMaster

        const owner1 = await bundle.blkch.treasury("owner1")
        await jettonMaster.sendWrap(owner1.getSender(), {amount: toNano('10.0')})
        const wallet1 = await bundle.betWallet(owner1.address)
        expect((await wallet1.getData()).balance).toBe(toNano('10.0'))
        const owner1BalanceBefore = await bundle.balance(owner1.address)

        const owner2 = await bundle.blkch.treasury("owner2")
        await jettonMaster.sendWrap(owner2.getSender(), {amount: toNano('15.0')})
        const wallet2 = await bundle.betWallet(owner2.address)
        expect((await wallet2.getData()).balance).toBe(toNano('15.0'))
        const owner2BalanceBefore = await bundle.balance(owner2.address)

        const transferResult = await wallet1.sendTransfer(owner1.getSender(), {
            amount: toNano("5.0"),
            destination: owner2.address,
            responseDestination: owner2.address,
        })
        expectTransactionsValid(transferResult)
        expect(transferResult.transactions).toHaveLength(4)
        // internal_transfer
        expect(transferResult.transactions).toHaveTransaction({
            from: wallet1.address,
            to: wallet2.address
        })
        // transfer_notification
        expect(transferResult.transactions).toHaveTransaction({
            from: wallet2.address,
            to: owner2.address
        })

        // BET balances have to be updated after transfer
        expect((await wallet1.getData()).balance).toBe(toNano('10.0') - toNano('5.0'))
        expect((await wallet2.getData()).balance).toBe(toNano('15.0') + toNano('5.0'))
        const senderCommission = owner1BalanceBefore - await bundle.balance(owner1.address)
        expect(senderCommission).toBeLessThan(toNano('0.05'))
        // recipient receive some extra amount of TON in transfer_notification
        const recipientExcesses = await bundle.balance(owner2.address) - owner2BalanceBefore
        expect(recipientExcesses).toBeLessThan(toNano('0.01'))
        expect(recipientExcesses).toBeGreaterThan(0)

    })

})