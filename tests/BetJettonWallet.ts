import {Address, Cell, Contract, ContractProvider} from "ton-core";

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

    // TODO generify
    async getBalance(provider: ContractProvider): Promise<bigint> {
        const state = await provider.getState()
        return state.balance
    }
}