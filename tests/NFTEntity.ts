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

    // async sendTransfer(provider: ContractProvider, via: Sender, params?: Partial<{
    //     amount: bigint,
    //     destination: Address,
    //     responseDestination: Address,
    //     forwardTonAmount?: bigint
    //     forwardPayload?: Cell
    //     totalValue?: bigint
    // }>) {
    //     await provider.internal(via, {
    //         value: params?.totalValue ?? toNano('0.04'),
    //         body: beginCell()
    //             .storeUint(0xf8a7ea5, 32) // op::transfer opcode
    //             .storeUint(0, 64) // query id
    //             .storeCoins(params?.amount)
    //             .storeAddress(params?.destination)
    //             .storeAddress(params?.responseDestination)
    //             .storeUint(0, 1) // no custom payload
    //             .storeCoins(params?.forwardTonAmount ?? 0n)
    //             .storeUint(1, 1) // forward payload in reference cell
    //             .storeRef(params?.forwardPayload ?? new Cell())
    //             .endCell()
    //     })
    //     return 0
    // }
}