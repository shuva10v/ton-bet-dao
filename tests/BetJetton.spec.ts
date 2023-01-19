import {BetJetton} from "./BetJetton";
import {BetDaoContracts, ContractsBundle} from "./contracts";
import {beginCell, toNano} from "ton-core";
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
        const wrapRequest = await jettonMaster.sendWrap(user1.getSender(), {value: toNano('3.0')})
        expectTransactionsValid(wrapRequest)

        const wallet = await bundle.betWallet(user1.address)
        // internal_transfer
        expect(wrapRequest.transactions).toHaveTransaction({
            from: jettonMaster.address,
            to: wallet.address
        })
        // transfer_notification
        // TODO - add support for transfer notification
        // expect(wrapRequest.transactions).toHaveTransaction({
        //     from: wallet.address,
        //     to: user1.address
        // })
        
        const metadata = await jettonMaster.getJettonData();
        expect(metadata.totalSupply).toBe(toNano('3.0'))
        const lockedTons = await jettonMaster.getBalance() - startBalance
        expect(lockedTons).toBeGreaterThan(toNano("3.0"))
        expect(BigInt(lockedTons) - toNano('3.0')).toBeLessThan(toNano("0.01"))


        const walletData = await wallet.getData()
        expect(walletData.balance).toBe(toNano('3.0'))
        expect(walletData.owner?.equals(user1.address)).toBeTruthy()
        expect(walletData.jettonMaster?.equals(jettonMaster.address)).toBeTruthy()
        expect(await wallet.getBalance()).toBeLessThan(toNano("0.01"))

        // TODO add unwrap support
    })

})