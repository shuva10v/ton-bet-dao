import {Address, beginCell, Cell, Contract, ContractProvider, Dictionary, Sender, toNano} from "ton-core";
import {NFTEntityLevel} from "./Dao";

export type NFTEntityData = Partial<{
    init: boolean
    index: bigint
    daoAddress: Address
    ownerAddress: Address
    name: string
    uri: string
    layout: number
    level: NFTEntityLevel
    level0Parent?: Address
    level1Parent?: Address
}>


export class NFTEntity implements Contract {
    static METADATA_KEY_URI = 51065135818459385347574250312853146822620586594996463797054414300406918686668n;
    static METADATA_KEY_NAME = 59089242681608890680090686026688704441792375738894456860693970539822503415433n;
    // sha256('level')
    static METADATA_KEY_LEVEL = 228748789187412400415878024685729699334331275676571924130290804107165375190n;
    // sha256('link_level0')
    static METADATA_KEY_LINK_LEVEL0 = 52980425894522696122450762830976993059324876111996366402384618068875577391515n;
    // sha256('link_level1')
    static METADATA_KEY_LINK_LEVEL1 = 95186537016895908399999252342660077910834077423773537655532550116721965180327n;

    constructor(readonly address: Address) {}

    async getData(provider: ContractProvider): Promise<NFTEntityData> {
        const { stack } = await provider.get('get_nft_data', [])
        let data: NFTEntityData = {
            init: stack.readBoolean(),
            index: stack.readBigNumber(),
            daoAddress: stack.readAddress(),
            ownerAddress: stack.readAddress(),
        }
        let content = stack.readCell()
        data.layout = content.beginParse().loadUint(8)
        let dict = content.beginParse().loadRef().beginParse()
            .loadDictDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        data.uri = dict.get(NFTEntity.METADATA_KEY_URI).beginParse().loadStringTail();
        data.name = dict.get(NFTEntity.METADATA_KEY_NAME).beginParse().loadStringTail();
        const levelId = dict.get(NFTEntity.METADATA_KEY_LEVEL).beginParse().loadUint(8);
        if (levelId == 0) {
            data.level = NFTEntityLevel.Level0;
        } else if (levelId == 1) {
            data.level = NFTEntityLevel.Level1;
        } else if (levelId == 2) {
            data.level = NFTEntityLevel.Level2;
        } else if (levelId == 3) {
            data.level = NFTEntityLevel.Level3;
        }
        if (dict.has(NFTEntity.METADATA_KEY_LINK_LEVEL0)) {
            data.level0Parent = dict.get(NFTEntity.METADATA_KEY_LINK_LEVEL0).beginParse().loadAddress();
        }
        if (dict.has(NFTEntity.METADATA_KEY_LINK_LEVEL1)) {
            data.level1Parent = dict.get(NFTEntity.METADATA_KEY_LINK_LEVEL0).beginParse().loadAddress();
        }
        return data;
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

    async sendEditContent(provider: ContractProvider, via: Sender, params?: Partial<{
        uri: string,
        totalValue?: bigint
    }>) {
        await provider.internal(via, {
            value: params?.totalValue ?? toNano('0.05'),
            body: beginCell()
                .storeUint(0x1a0b9d51, 32) // op::edit_content
                .storeUint(0, 64) // query id
                .storeStringRefTail(params?.uri)
                .endCell()
        })
        return 0
    }
}