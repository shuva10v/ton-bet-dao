# BET DAO on  TON blockchain

## Architecture

### BET jetton

[TEP-74](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md) jetton
backed by TON coin (like WTON). To wrap (mint) send this message to the jetton master contract:
```
mint#00000015 query_id:uint64 amount:(VarUInteger 16) = InternalMsgBody;
```
To unwrap (receive locked TON) burn BET jettons sending messages to your wallet contract (custom_payload ignored):
```
burn#595f07bc query_id:uint64 amount:(VarUInteger 16)
              response_destination:MsgAddress custom_payload:(Maybe ^Cell)
              = InternalMsgBody;
```

### GOV jetton

### NFT event item?

## Running tests

``
npm i
npm test
``

## Deploy

TODO