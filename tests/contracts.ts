import {Cell} from "ton-core";
import {SourceEntry, SourcesArray} from "@ton-community/func-js";

const { compileFunc } = require("@ton-community/func-js");
const fs = require('fs').promises;

export class BetDaoContracts {

    static async betJettonMaster(): Promise<Cell> {
        return await BetDaoContracts.compile([
                await BetDaoContracts.readFile('bet-jetton-master.fc'),
                await BetDaoContracts.readFile('stdlib.fc'),
                await BetDaoContracts.readFile('bet-jetton-utils.fc')
            ]);
    }

    static async betJettonWallet(): Promise<Cell> {
        return await BetDaoContracts.compile([
            await BetDaoContracts.readFile('bet-jetton-wallet.fc'),
            await BetDaoContracts.readFile('stdlib.fc'),
            await BetDaoContracts.readFile('bet-jetton-utils.fc')
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
