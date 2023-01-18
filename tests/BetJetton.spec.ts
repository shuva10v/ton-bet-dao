import "@ton-community/jest-matchers"
import {Blockchain} from "@ton-community/tx-emulator";
import {BetJetton} from "./BetJetton";
import {BetDaoContracts} from "./contracts";
import {beginCell} from "ton-core"; // register matchers

describe('BET Jetton', () => {
    let blkch;
    let minter;
    let jettonMaster;
    beforeEach(async () => {
        blkch = await Blockchain.create();
        minter = await blkch.treasury('minter')
        jettonMaster = blkch.openContract(new BetJetton(0,  await BetDaoContracts.betJettonMaster(), {
            owner: minter.address,
            metadataUrl: "https://ipfs-url",
            jettonWalletCode: await BetDaoContracts.betJettonWallet()
        }))
    })

    it('should return off-chain metadata', async () => {
        let metadata = await jettonMaster.getJettonData();
        expect(metadata.mintable).toBe(-1)
        expect(metadata.content).toBe(beginCell().storeUint(1, 8).storeBuffer(Buffer.from("https://ipfs-url")))
        expect(metadata.owner).toBe(minter)
    })

    it('should wrap TON to BET 1:1', async () => {
        console.log(jettonMaster.address)
    })
})