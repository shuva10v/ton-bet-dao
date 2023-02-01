import {Address, beginCell, Cell, Contract, ContractProvider, Sender, toNano} from "ton-core";

export type NFTEntityData = {
    init: boolean
    index: bigint
    daoAddress: Address
    ownerAddress: Address
    individualContent: Cell
}

export class NFTEntity implements Contract {
    constructor(readonly address: Address) {}

    async getData(provider: ContractProvider): Promise<NFTEntityData> {
        const { stack } = await provider.get('get_nft_data', [])
        return {
            init: stack.readBoolean(),
            index: stack.readBigNumber(),
            daoAddress: stack.readAddress(),
            ownerAddress: stack.readAddress(),
            individualContent: stack.readCell(),
        }
    }

    async sendTransfer(provider: ContractProvider, via: Sender, params?: Partial<{
        destination: Address,
        totalValue?: bigint
    }>) {
        await provider.internal(via, {
            value: params?.totalValue ?? toNano('0.05'),
            body: beginCell()
                .storeUint(0x5fcc3d14, 32) // op::transfer opcode
                .storeUint(0, 64) // query id
                .storeAddress(params.destination) // new owner
                .storeAddress(null) // response destination
                .storeUint(0, 1) // no custom payload
                .storeCoins(0n) // no forward_amount
                .endCell()
        })
        return 0
    }
}