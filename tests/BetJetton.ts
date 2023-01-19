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

export type BetJettonData = {
    totalSupply: bigint
    mintable: number
    owner: Address
    content: Cell
    walletCode: Cell
}

export class BetJetton implements Contract {
    readonly address: Address;
    readonly code: Cell;
    readonly init: { code: Cell; data: Cell; };

    constructor(workchain: number, code: Cell, initParams: {
        owner: Address,
        metadataUrl: string,
        jettonWalletCode: Cell
    }) {
        const data = beginCell()
            .storeCoins(0)
            .storeAddress(initParams.owner)
            .storeRef(beginCell().storeUint(1, 8).storeBuffer(Buffer.from(initParams.metadataUrl)))
            .storeRef(initParams.jettonWalletCode)
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

    async getBalance(provider: ContractProvider): Promise<bigint> {
        const state = await provider.getState()
        return state.balance
    }

    async getJettonData(provider: ContractProvider): Promise<BetJettonData> {
        const { stack } = await provider.get('get_jetton_data', [])
        return {
            totalSupply: stack.readBigNumber(),
            mintable: stack.readNumber(),
            owner: stack.readAddress(),
            content: stack.readCell(),
            walletCode: stack.readCell(),
        }
    }

    async sendWrap(provider: ContractProvider, via: Sender, params?: Partial<{
        value: bigint,
        totalValue?: bigint
    }>) {
        await provider.internal(via, {
            value: params?.totalValue ?? params?.value + toNano('0.03'),
            body: beginCell()
                .storeUint(21, 32) // op
                .storeUint(0, 64) // query id
                .storeCoins(params?.value)
                .endCell()
        })
        return 0
    }

    async getWalletAddress(provider: ContractProvider, address: Address): Promise<Address> {
        const { stack } = await provider.get('get_wallet_address', [{ type: 'slice',
            cell: beginCell().storeAddress(address).endCell()}])
        return stack.readAddress();
    }
}