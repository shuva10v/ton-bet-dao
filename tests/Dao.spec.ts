import {BetJetton} from "./BetJetton";
import {BetDaoContracts, ContractsBundle} from "./contracts";
import {Address, beginCell, Dictionary, toNano} from "ton-core";
import * as util from "util";
import {expectTransactionsValid} from "./test-utils";
import "@ton-community/test-utils"
import {NFTEntityLevel} from "./Dao";
import {NFTEntity} from "./NFTEntity";

describe('DAO', () => {
    test('should sell NFT entity', async () => {
        const bundle = await ContractsBundle.create()
        const jettonMaster = bundle.betJettonMaster
        const dao = bundle.dao
        const user1 = await bundle.blkch.treasury("user1")
        const wrapRequest = await jettonMaster.sendWrap(user1.getSender(), {amount: toNano('2000.0')})
        expectTransactionsValid(wrapRequest)
        const user1Wallet = await bundle.betWallet(user1.address)
        expect((await user1Wallet.getData()).balance).toBe(toNano('2000.0'))
        const daoWallet = await bundle.betWallet(dao.address)
        let collectionData = await dao.getCollectionData()
        expect(collectionData.owner?.equals(bundle.minter.address)).toBeTruthy()
        expect(collectionData.nextItemIndex).toBe(0n);

        const nftEntityAddress = await dao.getNftAddress(collectionData.nextItemIndex);
        expect((await bundle.blkch.getContract(nftEntityAddress)).accountState?.type).toBe('uninit')


        const transferResult = await user1Wallet.sendTransfer(user1.getSender(), {
            amount: toNano("1000.0"), // default price
            destination: dao.address,
            totalValue: toNano("0.1"),
            forwardTonAmount: toNano("0.05"),
            forwardPayload: bundle.dao.buyEntityPayload({
                    level: NFTEntityLevel.Level0,
                    name: "Football",
                    uri: "ipfs://default_metadata_value",
                    itemIndex: collectionData.nextItemIndex
                })
        })
        expectTransactionsValid(transferResult)
        expect(transferResult.transactions).toHaveLength(5)
        //  init
        expect(transferResult.transactions).toHaveTransaction({
            from: dao.address,
            to: nftEntityAddress,
            deploy: true
        })

        expect((await bundle.blkch.getContract(nftEntityAddress)).accountState?.type).toBe('active')

        const nftEntity = await bundle.nftEntity(0n);
        const nftData = await nftEntity.getData()
        expect(nftData.init).toBeTruthy()
        expect(nftData.index).toBe(0n)
        expect(nftData.ownerAddress?.equals(user1.address)).toBeTruthy()

        expect(nftData.individualContent.beginParse().loadUint(8)).toBe(0); // on-chain layout
        const dict = nftData.individualContent.beginParse().loadRef().beginParse()
            .loadDictDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        const uri = dict.get(NFTEntity.METADATA_KEY_URI);
        const name = dict.get(NFTEntity.METADATA_KEY_NAME);
        expect(uri).toBeDefined()
        expect(name).toBeDefined()
        expect(name.beginParse().loadStringTail()).toBe("Football")
        expect(uri.beginParse().loadStringTail()).toBe("ipfs://default_metadata_value")

        collectionData = await dao.getCollectionData()
        expect(collectionData.nextItemIndex).toBe(1n);


        // 1000 BET have been transferred to DAO contract
        expect((await daoWallet.getData()).balance).toBe(toNano('1000.0'))
        expect((await user1Wallet.getData()).balance).toBe(toNano('2000.0') - toNano('1000.0'))

    })

    test('should fail on attempt to buy NFT with wrong item index', async () => {
        const bundle = await ContractsBundle.create()
        const jettonMaster = bundle.betJettonMaster
        const dao = bundle.dao
        const user1 = await bundle.blkch.treasury("user1")
        await jettonMaster.sendWrap(user1.getSender(), {amount: toNano('2000.0')})
        const user1Wallet = await bundle.betWallet(user1.address)
        const collectionData = await dao.getCollectionData()

        const transferResult = await user1Wallet.sendTransfer(user1.getSender(), {
            amount: toNano("1000.0"), // default price
            destination: dao.address,
            totalValue: toNano("0.1"),
            forwardTonAmount: toNano("0.05"),
            forwardPayload: bundle.dao.buyEntityPayload({
                    level: NFTEntityLevel.Level0,
                    name: "Football",
                    uri: "ipfs://default_metadata_value",
                    itemIndex: collectionData.nextItemIndex + 100n  // wrong item index
                })
        })
        expect(transferResult.transactions).toHaveTransaction({
            aborted: true,
            exitCode: 80
        })
    })

    test('should allow NFT transfers', async () => {
        const bundle = await ContractsBundle.create()
        const user1 = await bundle.blkch.treasury("user1")
        const user2 = await bundle.blkch.treasury("user2")
        const user1Wallet = await bundle.addBetToUser(user1, toNano('2000'))

        await user1Wallet.sendTransfer(user1.getSender(), {
            amount: toNano("1000.0"), // default price
            destination: bundle.dao.address,
            totalValue: toNano("0.1"),
            forwardTonAmount: toNano("0.05"),
            forwardPayload: bundle.dao.buyEntityPayload({
                    level: NFTEntityLevel.Level0,
                    name: "Football",
                    itemIndex: 0n  // wrong item index
                })
        })

        const nftEntity = await bundle.nftEntity(0n);
        let nftData = await nftEntity.getData()
        expect(nftData.ownerAddress?.equals(user1.address)).toBeTruthy()

        const transferRes = await nftEntity.sendTransfer(user1.getSender(), {
            destination: user2.address
        })
        expectTransactionsValid(transferRes)

        nftData = await nftEntity.getData()
        expect(nftData.ownerAddress?.equals(user2.address)).toBeTruthy()
    })

    test('should allow editing metadata', async () => {
        // TODO
    })

    test('should allow link NFT entities between levels', async () => {
        // TODO
    })

})