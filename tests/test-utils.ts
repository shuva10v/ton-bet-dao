import * as util from "util";

export function expectTransactionsValid(result: any) {
    result.transactions.forEach((tx) => expect(tx?.description?.aborted,
        "Aborted transaction with exit code " + tx?.description?.computePhase?.exitCode + "\n" +
        util.inspect(tx?.description, {depth: null})).toBeFalsy())
}
