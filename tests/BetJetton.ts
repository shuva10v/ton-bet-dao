import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider} from "ton-core";

export type BetJettonData = {
    totalSupply: number
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

    async getJettonData(provider: ContractProvider): Promise<BetJettonData> {
        const { stack } = await provider.get('get_jetton_data', [])
        return {
            totalSupply: stack.readNumber(),
            mintable: stack.readNumber(),
            owner: stack.readAddress(),
            content: stack.readCell(),
            walletCode: stack.readCell(),
        }
    }

}