import React from 'react'
import $ from 'jquery'
import '../styles/main.less'
import '../styles/pure.css'
// Import web3 for broadcasting transactions
const Web3 = require('web3');
// Import node-fetch to query the trading API
const fetch = require('node-fetch');
// import ethereumjs-tx to sign and serialise transactions
const Tx = require('ethereumjs-tx');

export default class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: '',
      fromCoin: 'ETH',
      isFromCoinSupported: true,
      toCoin: 'KNC',
      isToCoinSupported: true,
      ethQty: 0,
      tokenQty: 0,
      GAS_PRICE: 'medium',  // Gas price of the transaction
      USER_ACCOUNT: '0xE35A45B9D8eb40b17B3c466eB3D8712fdeF23184', // Your Ethereum wallet address
      WALLET_ID: '0xE35A45B9D8eb40b17B3c466eB3D8712fdeF23184',  // Your fee sharing address
      private_key: '48b036b995e7f14a5907e6add49d00f6ceb0601de4f3862171930cf64a133db6',
      showResult: false,
      txSuccess: false,
      txHash: '',
      tokens:[],
      txNotFinished: false,
    }
    this.TOKEN_ADDRESS = '0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6'  // use KNC contract address on Ropsten by default
    this.ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'  // Representation of ETH as an address on Ropsten
    this.apiURL = 'https://ropsten-api.kyber.network/'
  }

  async componentDidMount(){
    // Connect to Infura's ropsten node
    this.web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io"));

    // Your private key
    this.PRIVATE_KEY = Buffer.from(this.state.private_key, 'hex');

    // Get supported tokens
    let tokens = await this.getSupportedTokens()
    this.setState({
      tokens: tokens.data
    })
  }

  /**
   * Token quantity input onchange event handler.
   * Get rates
   * @param {*} e 
   */
  async handleChangeTokenQty(e){
    let qty = parseInt(e.target.value)
    /* ETH -> TOKEN */
    if(this.state.fromCoin == 'ETH' && this.state.toCoin !== 'ETH'){
      if (this.state.isToCoinSupported) {
        /*
        ######################################
        ### GET ETH/TOKEN CONVERSION RATES ###
        ######################################
        */        
        let rates = await this.getBuyRates(this.TOKEN_ADDRESS, qty);
        // Getting the source quantity
        let ethQty = rates.data[0].src_qty;
        this.setState({
          tokenQty: qty
        });
        this.setState({
          ethQty: ethQty
        });
      }
      /* TOKEN -> ETH */
    }else{
      if (this.state.isFromCoinSupported) {
        /*
        ####################################
        ### GET ENABLED STATUS OF WALLET ###
        ####################################
        */
        let isTokenEnabled = await this.isTokenEnabled()

        /*
        ####################################
        ### ENABLE WALLET IF NOT ENABLED ###
        ####################################
        */
        if(!isTokenEnabled){
          let enableTokenDetails = await this.getEnableTokenDetails(this.state.USER_ACCOUNT, this.TOKEN_ADDRESS, this.TOKEN_ADDRESS, this.state.GAS_PRICE)
          // Extract the raw transaction details
          let rawTx = enableTokenDetails.data
          // Create a new transaction
          let tx = new Tx(rawTx)
          // Signing the transaction
          tx.sign(this.PRIVATE_KEY)
          // Serialise the transaction (RLP encoding)
          let serializedTx = tx.serialize()
          // Broadcasting the transaction
          txReceipt = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).catch(error => console.log(error))
          // Log the transaction receipt
          console.log(txReceipt)
        }

        /*
        ####################################
        ### GET KNC/ETH CONVERSION RATES ###
        ####################################
        */
        let rates = await this.getSellRates(this.TOKEN_ADDRESS, qty)
        // Getting the source quantity
        let ethQty = rates.data[0].dst_qty
        this.setState({
          tokenQty: qty
        });
        this.setState({
          ethQty: ethQty
        });
      }
    }    
  }

  /**
   * Source coin select onchange event handler.
   * When the source coin is token, check if it is supported.
   * @param {*} e 
   */
  handleChangeFromCoin(e){
    let tokenSymbol = e.target.value
    if(tokenSymbol!=='ETH'){
      /*
      ###################################
      ### CHECK IF TOKEN IS SUPPORTED ###
      ###################################
      */ 
      let isTokenSupported = this.isTokenSupported(e.target.value)
      if (isTokenSupported) {
        this.setState({
          fromCoin: e.target.value,
          toCoin: 'ETH',
          ethQty: 0,
          tokenQty: 0
        });
        // set token address
        this.TOKEN_ADDRESS = $(e.target).find(':selected')[0].id.slice(1)
      } else {
        this.setState({
          message: 'Token ' + e.target.value + ' is not supported'
        })
      }
    }else{
      this.setState({
        fromCoin: e.target.value,
        toCoin: 'KNC',  // use KNC by default
        ethQty: 0,
        tokenQty: 0
      });
      // set token address
      this.TOKEN_ADDRESS = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"
    }    
  }

  /**
   * Destination coin select onchange event handler.
   * When the destination coin is token, check if it is supported.
   * @param {*} e 
   */
  handleChangeToCoin(e){
    let tokenSymbol = e.target.value
    console.log('------')
    console.log($(e.target).find(':selected')[0].id.slice(1))
    if(tokenSymbol!=='ETH'){
      /*
      ###################################
      ### CHECK IF TOKEN IS SUPPORTED ###
      ###################################
      */ 
      let isTokenSupported = this.isTokenSupported(e.target.value)
      if (isTokenSupported) {
        this.setState({
          toCoin: e.target.value,
          fromCoin: 'ETH',
          ethQty: 0,
          tokenQty: 0
        });
        this.TOKEN_ADDRESS = $(e.target).find(':selected')[0].id.slice(1)
      } else {
        this.setState({
          message: 'Token ' + e.target.value + ' is not supported'
        })
      }
    }else{
      this.setState({
        toCoin: e.target.value,
        fromCoin: 'KNC',
        ethQty: 0,
        tokenQty: 0
      });
      this.TOKEN_ADDRESS = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"
    }
  }

  /**
   * Private key onchange event handler
   * @param {*} e 
   */
  handleChangePrivateKey(e){
    this.setState({
      private_key: e.target.value
    })
    this.PRIVATE_KEY = Buffer.from(e.target.value, 'hex');
  }

  /**
   * User wallet address onchange event handler
   * @param {*} e 
   */
  handleChangeUserAccount(e){
    // set wallet_id and user_account to the same address by default
    this.setState({
      USER_ACCOUNT: e.target.value,
      WALLET_ID: e.target.value
    })
  }

  /**
   * Get all supported tokens on Kyber Network
   */
  async getSupportedTokens() {
    // Querying the API /currencies endpoint
    let tokensBasicInfoRequest = await fetch(this.apiURL + 'currencies')
    // Parsing the output
    let tokensBasicInfo = await tokensBasicInfoRequest.json()
    console.log('all tokens')
    console.log(tokensBasicInfo)
    return tokensBasicInfo
  }

  /**
   * Check if a token is supported on Kyber Network
   * @param {*} tokenStr symbol of the token
   */
  async isTokenSupported(tokenStr){
    let self = this
    let tokens = await this.getSupportedTokens();
    // Checking to see if token is supported
    return tokens.data.some(token => {
      if(tokenStr == token.symbol){
        self.TOKEN_ADDRESS = token.address
        return true
      }
    });
  }

  /**
   * Get the latest buy rate (in ETH) for the specified token.
   * @param {*} id token id
   * @param {*} qty the amount of units of the token to buy.
   */
  async getBuyRates(id, qty) {
    // Querying the API /buy_rate endpoint
    let ratesRequest = await fetch(this.apiURL + 'buy_rate?id=' + id + '&qty=' + qty)
    // Parsing the output
    let rates = await ratesRequest.json()
    console.log('rates:')
    console.log(rates)
    return rates
  }

  /**
   * Get the transaction details needed for a user to create and sign a new transaction 
   * to make the conversion between the specified pair.
   * @param {*} user_address the ETH address that will be executing the swap.
   * @param {*} src_id source token id
   * @param {*} dst_id destination asset id
   * @param {*} src_qty the source amount in the conversion 
   * @param {*} min_dst_qty 97% of the amount of assets to buy
   * @param {*} gas_price low/medium/high
   * @param {*} wallet_id the wallet address that is registered for the fee sharing program.
   */
  async getTradeDetails(user_address, src_id, dst_id, src_qty, min_dst_qty, gas_price, wallet_id) {
    // Querying the API /trade_data endpoint
    let tradeDetailsRequest = await fetch(this.apiURL + 'trade_data?user_address=' + user_address + '&src_id=' + src_id + '&dst_id=' + dst_id + '&src_qty=' + src_qty + '&min_dst_qty=' + min_dst_qty + '&gas_price=' + gas_price + '&wallet_id=' + wallet_id)
    // Parsing the output
    let tradeDetails = await tradeDetailsRequest.json()
    console.log('tradeDetails:')
    console.log(tradeDetails)
    return tradeDetails
  }

  /**
   * Get tokens enabled statuses of an Ethereum wallet. 
   * It indicates if the wallet can sell a token or not.
   * @param {*} user_address the ETH address to get information from.
   */
  async getEnabledStatuses(user_address) {
    // Querying the API /users/<user_address>/currencies endpoint
    let enabledStatusesRequest = await fetch(this.apiURL + 'users/' + user_address + '/currencies')
    // Parsing the output
    let enabledStatuses = await enabledStatusesRequest.json()
    console.log('enabledStatuses:')
    console.log(enabledStatuses)
    return enabledStatuses
  }

  /**
   * Check if the token is enabled
   */
  async isTokenEnabled(){
    let enabledStatuses = await this.getEnabledStatuses(this.state.USER_ACCOUNT)
    // Checking to see if TOKEN is enabled
    return enabledStatuses.data.some(token => {
      if (token.id.toLowerCase() == this.TOKEN_ADDRESS.toLowerCase()) {
        return token.enabled
      }
    })
  }

  /**
   * Get transaction details needed for a user to create and sign a new transaction 
   * to approve the KyberNetwork contract to spend tokens on the user's behalf.
   * @param {*} user_address 
   * @param {*} id 
   * @param {*} gas_price 
   */
  async getEnableTokenDetails(user_address, id, gas_price) {
    // Querying the API /users/<user_address>/currencies/<currency_id>/enable_data?gas_price=<gas_price> endpoint
    let enableTokenDetailsRequest = await fetch(this.apiURL + 'users/' + user_address + '/currencies/' + id + '/enable_data?gas_price=' + gas_price)
    // Parsing the output
    let enableTokenDetails = await enableTokenDetailsRequest.json()
    console.log('enableTokenDetails:')
    console.log(enableTokenDetails)
    return enabletokenDetails
  }

  /**
   * Get the latest SELL conversion rate in ETH. 
   * @param {*} id id of the token you want to sell using ETH.
   * @param {*} qty the amount of units of the token to sell
   */
  async getSellRates(id, qty) {
    // Querying the API /sell_rate endpoint
    let ratesRequest = await fetch(this.apiURL + 'sell_rate?id=' + id + '&qty=' + qty)
    // Parsing the output
    let rates = await ratesRequest.json()
    return rates
  }

  /**
   * Execute the trade
   * @param {*} tradeDetails 
   */
  async executeTrade(tradeDetails){
    this.setState({
      txNotFinished:true,
      showResult: false
    })
    // Extract the raw transaction details
    let rawTx = tradeDetails.data[0];
    // Create a new transaction
    let tx = new Tx(rawTx);
    // Signing the transaction
    tx.sign(this.PRIVATE_KEY);
    // Serialise the transaction (RLP encoding)
    let serializedTx = tx.serialize();
    // Broadcasting the transaction
    let txReceipt = await this.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
      .catch(error => { 
        console.log(error); 
        this.setState({
          txNotFinished:false
        })
      });
    // Log the transaction receipt
    this.setState({
      showResult: true,
      txSuccess: txReceipt.status,
      txHash: txReceipt.transactionHash
    })
    this.setState({
      txNotFinished:false
    })
    console.log(txReceipt);
  }

  async startSwap() {    

    
    if(this.state.ethQty>0 && this.state.tokenQty>0){
      /* ETH -> TOKEN */
      if (this.state.fromCoin == 'ETH' && this.state.toCoin !== "ETH") {
        /*
        #######################
        ### TRADE EXECUTION ###
        #######################
        */
        let tradeDetails = await this.getTradeDetails(this.state.USER_ACCOUNT, this.ETH_TOKEN_ADDRESS, this.TOKEN_ADDRESS, this.state.ethQty, this.state.tokenQty * 0.97, this.state.GAS_PRICE, this.state.WALLET_ID);
        this.executeTrade(tradeDetails)

        /* TOKEN -> ETH */
      } else if (this.state.fromCoin !== 'ETH' && this.state.toCoin == "ETH") {
        /*
        #######################
        ### TRADE EXECUTION ###
        #######################
        */
        let tradeDetails = await this.getTradeDetails(this.state.USER_ACCOUNT, this.TOKEN_ADDRESS, this.ETH_TOKEN_ADDRESS, this.state.tokenQty, this.state.ethQty * 0.97, this.state.GAS_PRICE, this.state.WALLET_ID);
        this.executeTrade(tradeDetails);
      }
    }    
  }

  render() {
    return (
      <div>
        <div className="pure-g">
          <div className="content pure-u-3-4">
            <h1>Swap with Kyber Network</h1>
            <form className="pure-form pure-form-stacked">
              <fieldset>
                  <div className="pure-g">
                    <p className="pure-u-3-5">From</p>
                    <p className="pure-u-2-5">To</p>
                    <div className="pure-u-1-5">
                        <input
                          id="fromQTY"
                          className="pure-u-23-24" 
                          type="number" placeholder="0" 
                          onChange={this.handleChangeTokenQty.bind(this)}
                          value={this.state.fromCoin!=='ETH'?this.state.tokenQty:this.state.ethQty} readOnly={this.state.fromCoin=='ETH'}/>
                    </div>
                    <div className="pure-u-1-5">
                      <label htmlFor="fromCoin"></label>
                      <select 
                        id="fromCoin" 
                        className="pure-input-1"
                        value={this.state.fromCoin} 
                        onChange={this.handleChangeFromCoin.bind(this)}
                        >
                          {
                          this.state.tokens && this.state.tokens.length && this.state.tokens.map(function(item,index){
                            return (
                              <option key={"from-coin-"+index} id={'2'+item.id}>
                                {item.symbol}
                              </option>
                            )
                          })
                        }
                      </select>
                    </div>
                    <div className="pure-u-1-5">
                      <img className="img-exchange" src={require('../img/exchange-alt-solid.svg')} alt=""/>
                    </div>
                    <div className="pure-u-1-5">
                        <input 
                          id="toQTY" 
                          className="pure-u-23-24" 
                          type="number" 
                          placeholder="0" 
                          onChange={this.handleChangeTokenQty.bind(this)}
                          value={this.state.toCoin!=='ETH'?this.state.tokenQty:this.state.ethQty} readOnly={this.state.toCoin=='ETH'}/>
                    </div>
                    <div className="pure-u-1-5">
                      <label htmlFor="toCoin"></label>
                      <select 
                        id="toCoin" 
                        className="pure-input-1"
                        value={this.state.toCoin} 
                        onChange={this.handleChangeToCoin.bind(this)}
                        >
                        {
                          this.state.tokens && this.state.tokens.length && this.state.tokens.map(function(item,index){
                            return (
                              <option key={"to-coin-"+index} id={'1'+item.id}>
                                {item.symbol}
                              </option>
                            )
                          })
                        }
                      </select>
                    </div>
                    <h2>Wallet Info</h2>
                    <div className="pure-u-1">
                        <label htmlFor="userAccount">Your {this.state.fromCoin} Address</label>
                        <input id="userAccount" className="pure-u-1" type="text" value={this.state.USER_ACCOUNT} onChange={this.handleChangeUserAccount.bind(this)} />
                    </div>
                    <div className="pure-u-1">
                        <label htmlFor="privateKey">Private Key</label>
                        <input id="privateKey" className="pure-u-1" type="password" value={this.state.private_key} onChange={this.handleChangePrivateKey.bind(this)} />
                    </div>
                    {/* <h2>Receiver</h2>
                    <div className="pure-u-1">
                        <label htmlFor="kncAddress">Your {this.state.toCoin} Address</label>
                        <input id="kncAddress" className="pure-u-1" type="text" value={this.}/>
                    </div> */}
                  </div>

                  <input type="button" className="btn-start pure-button pure-button-primary" disabled={this.state.txNotFinished}
                    onClick={this.startSwap.bind(this)} value={this.state.txNotFinished?"Trade executing...":"Start Swap"} />
              </fieldset>
            </form>
            <p>{this.state.message}</p>
            {
              this.state.showResult && ( 
                <section >
                <h3>Result</h3>
                <p>{this.state.txSuccess?'Swap successed!':'Swap failed!'}</p>
                <p>You can go <a href={'https://ropsten.etherscan.io/tx/'+this.state.txHash} target="blank">HERE</a> to check the details of your swap transaction.</p>                
                <br/>
              </section>  
              )
            }
          </div>
        </div>
      </div>
    )
  }
}