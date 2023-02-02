import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    Slice,
    storeStateInit,
    toNano
} from "ton-core";

export type DaoNFTCollectionData = {
    nextItemIndex: bigint
    collectionContent: Cell
    owner: Address
}

export enum NFTEntityLevel {
    Level0 = 0,
    Level1,
    Level2,
    Level3,
}
const NFT_PRICE_LEVEL0 = 900;
const NFT_PRICE_LEVEL1 = 300;
const NFT_PRICE_LEVEL2 = 100;
const NFT_PRICE_LEVEL3 = 30;

export class Dao implements Contract {
    readonly address: Address;
    readonly code: Cell;
    readonly init: { code: Cell; data: Cell; };

    constructor(workchain: number, code: Cell, initParams: {
        owner: Address,
        metadataUrl: string,
        nftEntityCode: Cell
    }) {
        const data = beginCell()
            .storeCoins(toNano(NFT_PRICE_LEVEL0))
            .storeCoins(toNano(NFT_PRICE_LEVEL1))
            .storeCoins(toNano(NFT_PRICE_LEVEL2))
            .storeCoins(toNano(NFT_PRICE_LEVEL3))
            .storeUint(0, 32) // item index
            .storeAddress(initParams.owner)
            .storeRef(initParams.nftEntityCode)
            .storeRef(beginCell().storeUint(1, 8).storeBuffer(Buffer.from(initParams.metadataUrl)))
            .endCell()
        this.code = code
        this.init = { code: code, data: data }
        this.address = contractAddress(workchain, this.init)
    }

    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('1.0'),
            body: new Cell()
        })
        return contractAddress(0, this.init)
    }

    buyEntityPayload(params: Partial<{
        level: NFTEntityLevel
        name: string
        uri?: string
        itemIndex: bigint
        deployAmountTon?: bigint
        parentLevel0?: Address
        parentLevel1?: Address
        }>): Cell {
        const builder = beginCell().storeUint(0x0bf9fca0, 32) // op::dao::buy_entity()
            .storeUint(params?.level.valueOf(), 4).storeUint(params?.itemIndex, 32)
            .storeCoins(params?.deployAmountTon ?? toNano('0.04'))
            .storeStringRefTail(params?.name)
            .storeStringRefTail(params?.uri ?? "")
        if (params?.level != NFTEntityLevel.Level0) {
            builder.storeAddress(params?.parentLevel0)
        }
        if (params?.level == NFTEntityLevel.Level2) {
            builder.storeAddress(params?.parentLevel1)
        }

        return builder.endCell()
    }

    async getCollectionData(provider: ContractProvider): Promise<DaoNFTCollectionData> {
        const { stack } = await provider.get('get_collection_data', [])
        return {
            nextItemIndex: stack.readBigNumber(),
            collectionContent: stack.readCell(),
            owner: stack.readAddress(),
        }
    }

    async getNftAddress(provider: ContractProvider, index: bigint): Promise<Address> {
        const { stack } = await provider.get('get_nft_address_by_index', [{ type: 'int', value: index}])
        return stack.readAddress()
    }

    async getBalance(provider: ContractProvider): Promise<bigint> {
        const state = await provider.getState()
        return state.balance
    }
}