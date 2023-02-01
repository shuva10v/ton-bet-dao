import {Address, beginCell, Cell, ContractProvider, SendMode, toNano} from "ton-core";
import {SourceEntry, SourcesArray} from "@ton-community/func-js";
import {Blockchain, OpenedContract, TreasuryContract} from "@ton-community/sandbox";
import {BetJetton} from "./BetJetton";
import {expectTransactionsValid} from "./test-utils";
import {BetJettonWallet} from "./BetJettonWallet";
import {Dao} from "./Dao";
import {NFTEntity} from "./NFTEntity";

const { compileFunc } = require("@ton-community/func-js");
const fs = require('fs').promises;

export class BetDaoContracts {

    static async betJettonMaster(): Promise<Cell> {
        return await BetDaoContracts.compile([
                await BetDaoContracts.readFile('bet-jetton-master.fc'),
                await BetDaoContracts.readFile('stdlib.fc'),
                await BetDaoContracts.readFile('bet-jetton-utils.fc'),
                await BetDaoContracts.readFile('utils.fc')
            ]);
    }

    static async betJettonWallet(): Promise<Cell> {
        return await BetDaoContracts.compile([
            await BetDaoContracts.readFile('bet-jetton-wallet.fc'),
            await BetDaoContracts.readFile('stdlib.fc'),
            await BetDaoContracts.readFile('bet-jetton-utils.fc'),
            await BetDaoContracts.readFile('utils.fc')
        ]);
    }

    static async nftEntity(): Promise<Cell> {
        return await BetDaoContracts.compile([
            await BetDaoContracts.readFile('nft-entity.fc'),
            await BetDaoContracts.readFile('stdlib.fc'),
            await BetDaoContracts.readFile('utils.fc'),
        ]);
    }

    static async dao(): Promise<Cell> {
        return await BetDaoContracts.compile([
            await BetDaoContracts.readFile('dao.fc'),
            await BetDaoContracts.readFile('stdlib.fc'),
            await BetDaoContracts.readFile('bet-jetton-utils.fc'),
            await BetDaoContracts.readFile('utils.fc'),
        ]);
    }

    private static async readFile(name: string): Promise<SourceEntry> {
        return {
            filename: name,
            content: await fs.readFile(__dirname + '/../contracts/' + name, "binary")
        }
    }

    private static async compile(sources: SourcesArray): Promise<Cell> {
        let result = await compileFunc({
            sources: sources
        })
        if (result.status === 'error') {
            console.error(result)
            throw new Error("Unable to compile code");
        }
        return Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];
    }
}

export class ContractsBundle {
    private static instance: ContractsBundle

    public blkch
    public minter
    public betJettonMaster
    public dao

    private constructor() {
    }

    private async init() {
        this.blkch = await Blockchain.create();
        // account used to deploy smart contracts
        this.minter = await this.blkch.treasury('minter')
        // BET Jetton master smart-contract
        this.betJettonMaster = this.blkch.openContract(new BetJetton(0,  await BetDaoContracts.betJettonMaster(), {
            owner: this.minter.address,
            metadataUrl: "https://ipfs-url",
            jettonWalletCode: await BetDaoContracts.betJettonWallet()
        }))
        let deployResult = await this.betJettonMaster.sendDeploy(this.minter.getSender())
        expectTransactionsValid(deployResult)
        expect((await this.blkch.getContract(this.betJettonMaster.address)).accountState?.type).toBe('active')

        // DAO smart contract
        this.dao = this.blkch.openContract(new Dao(0,  await BetDaoContracts.dao(), {
            owner: this.minter.address,
            metadataUrl: "https://ipfs-url/dao",
            nftEntityCode: await BetDaoContracts.nftEntity()
        }))
        deployResult = await this.dao.sendDeploy(this.minter.getSender())
        expectTransactionsValid(deployResult)
        expect((await this.blkch.getContract(this.dao.address)).accountState?.type).toBe('active')
    }

    async betWallet(owner: Address): Promise<OpenedContract<BetJettonWallet>> {
        const walletAddress = await this.betJettonMaster.getWalletAddress(owner)
        return this.blkch.openContract(new BetJettonWallet(walletAddress))
    }

    async addBetToUser(user: OpenedContract<TreasuryContract>, amount: bigint): Promise<OpenedContract<BetJettonWallet>> {
        await this.betJettonMaster.sendWrap(user.getSender(), {amount: amount})
        return await this.betWallet(user.address)
    }

    async nftEntity(index: bigint): Promise<OpenedContract<NFTEntity>> {
        const nftAddress = await this.dao.getNftAddress(index)
        return this.blkch.openContract(new NFTEntity(nftAddress))
    }
    
    async balance(address: Address): Promise<bigint> {
        const ctr = await this.blkch.getContract(address)
        return ctr.account?.account?.storage?.balance?.coins
    }

    static async create(): Promise<ContractsBundle> {
        const instance = new ContractsBundle()
        await instance.init()
        return instance;
    }

    static async get(): Promise<ContractsBundle> {
        if (this.instance === undefined) {
            this.instance = await this.create()
        }
        return this.instance
    }
}
