import {Address, beginCell, Cell, Contract, ContractProvider, Sender, toNano} from "ton-core";

export type WalletData = {
    balance: bigint
    owner: Address
    jettonMaster: Address
}

export class BetJettonWallet implements Contract {
    constructor(readonly address: Address) {}

    async getData(provider: ContractProvider): Promise<WalletData> {
        const { stack } = await provider.get('get_wallet_data', [])
        return {
            balance: stack.readBigNumber(),
            owner: stack.readAddress(),
            jettonMaster: stack.readAddress(),
        }
    }

    async sendBurn(provider: ContractProvider, via: Sender, params?: Partial<{
        amount: bigint,
        responseDestination: Address,
        totalValue?: bigint
    }>) {
        await provider.internal(via, {
            value: params?.totalValue ?? toNano('0.05'),
            body: beginCell()
                .storeUint(0x595f07bc, 32) // op::burn opcode
                .storeUint(0, 64) // query id
                .storeCoins(params?.amount)
                .storeAddress(params?.responseDestination)
                .storeUint(0, 1)
                .endCell()
        })
        return 0
    }

    async sendTransfer(provider: ContractProvider, via: Sender, params?: Partial<{
        amount: bigint,
        destination: Address,
        responseDestination: Address,
        forwardTonAmount?: bigint
        forwardPayload?: Cell
        totalValue?: bigint
    }>) {
        await provider.internal(via, {
            value: params?.totalValue ?? toNano('0.04'),
            body: beginCell()
                .storeUint(0xf8a7ea5, 32) // op::transfer opcode
                .storeUint(0, 64) // query id
                .storeCoins(params?.amount)
                .storeAddress(params?.destination)
                .storeAddress(params?.responseDestination)
                .storeUint(0, 1) // no custom payload
                .storeCoins(params?.forwardTonAmount ?? 0n)
                .storeUint(1, 1) // forward payload in reference cell
                .storeRef(params?.forwardPayload ?? new Cell())
                .endCell()
        })
        return 0
    }

    // TODO generify
    async getBalance(provider: ContractProvider): Promise<bigint> {
        const state = await provider.getState()
        return state.balance
    }
}