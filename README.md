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

### DAO

DAO main contract holds configuration and allows to buy (mint) NFT entities using BET jetton.
NFT entity price depends on it level.

### NFT entities

NFT entities has 4 levels. 0 level has no dependencies, other levels depends on 0 level NFT entity. Also
2 level entities has link to 1 level entity.

```
 0-level NFT <---------\
     ^                 |
     |                 |
1-level NFT            |
     ^                 |
     |                 |
2-level  NFT           |
                       |
                       |
                  3-level NFT
      
```

## Running tests

``
npm i
npm test
``

## Deploy

TODO