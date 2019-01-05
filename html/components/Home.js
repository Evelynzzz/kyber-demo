import React from 'react'
import '../styles/main.less'
import '../styles/pure.css'

export default class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: 'Hello world!',
      fromCoin: 'ETH',
      toCoin: 'KNC',
      ETH_TOKEN_ADDRESS: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',  // Representation of ETH as an address on Ropsten
      KNC_TOKEN_ADDRESS: '0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6',  // KNC contract address on Ropsten
      QTY: 1,  // How many KNC you want to buy
      toQty: 0,
      fromQty: 0,
      toRate: 1,
      fromRate: 1,
      GAS_PRICE: 'medium',  // Gas price of the transaction
      USER_ACCOUNT: '0xE35A45B9D8eb40b17B3c466eB3D8712fdeF23184', // Your Ethereum wallet address
      WALLET_ID: '0xE35A45B9D8eb40b17B3c466eB3D8712fdeF23184',  // Your fee sharing address
      private_key: '48b036b995e7f14a5907e6add49d00f6ceb0601de4f3862171930cf64a133db6',
      showResult: false,
    }
    this.apiURL = 'https://ropsten-api.kyber.network/'
  }

  componentWillMount(){
    // Import web3 for broadcasting transactions
    var Web3 = require('web3');
    // Import node-fetch to query the trading API
    var fetch = require('node-fetch');
    // import ethereumjs-tx to sign and serialise transactions
    var Tx = require('ethereumjs-tx');

    // Connect to Infura's ropsten node
    this.web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io"));

    
    // Your private key
    this.PRIVATE_KEY = Buffer.from(this.state.private_key, 'hex');
  }

  handleChangeQTY(e){
    this.setState({
      QTY: parseInt(e.target.value)
    });
    this.setState({
      toQTY: e.target.value
    });
  }

  handleChangeFromCoin(e){
    this.setState({
      fromCoin: e.target.value
    });
    this.setState({
      toCoin: e.target.value === 'ETH'? 'KNC':'ETH'
    });
  }

  handleChangeToCoin(e){
    this.setState({
      toCoin: e.target.value
    });
    this.setState({
      fromCoin: e.target.value === 'ETH'? 'KNC':'ETH'
    });
  }

  startSwap(){
    if(this.state.fromCoin === 'ETH'){
      this.ETHToKNC()
    }else{
      this.KNCToETH()
    }    
  }

  async ETHToKNC() {

    /*
    #################################
    ### CHECK IF KNC IS SUPPORTED ###
    #################################
    */

    // Querying the API /currencies endpoint
    let tokenInfoRequest = await fetch(this.apiURL + 'currencies');
    // Parsing the output
    let tokens = await tokenInfoRequest.json();
    console.log('all tokens:')
    console.log(tokens)
    // Checking to see if KNC is supported
    let supported = tokens.data.some(token => {
      return 'KNC' == token.symbol
    });
    // If not supported, return.
    if (!supported) {
      console.log('Token is not supported');
      return
    }


    /*
    ####################################
    ### GET ETH/KNC CONVERSION RATES ###
    ####################################
    */

    // Querying the API /buy_rate endpoint
    let ratesRequest = await fetch(this.apiURL + 'buy_rate?id=' + this.state.KNC_TOKEN_ADDRESS + '&qty=' + this.state.QTY);
    // Parsing the output
    let rates = await ratesRequest.json();
    console.log('all rates:')
    console.log(rates)
    // Getting the source quantity
    let srcQty = rates.data[0].src_qty;

    /*
    #######################
    ### TRADE EXECUTION ###
    #######################
    */

    // Querying the API /trade_data endpoint
    let tradeDetailsRequest = await fetch(this.apiURL + 'trade_data?user_address=' + this.state.USER_ACCOUNT + '&src_id=' + this.state.ETH_TOKEN_ADDRESS + '&dst_id=' + this.KNC_TOKEN_ADDRESS + '&src_qty=' + srcQty + '&min_dst_qty=' + this.state.QTY * 0.97 + '&gas_price=' + this.state.GAS_PRICE + '&wallet_id=' + this.state.WALLET_ID);
    // Parsing the output
    let tradeDetails = await tradeDetailsRequest.json();
    console.log('tradeDetails:')
    console.log(tradeDetails)
    // Extract the raw transaction details
    let rawTx = tradeDetails.data[0];
    // Create a new transaction
    let tx = new Tx(rawTx);
    // Signing the transaction
    tx.sign(this.PRIVATE_KEY);
    // Serialise the transaction (RLP encoding)
    let serializedTx = tx.serialize();
    // Broadcasting the transaction
    txReceipt = await this.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).catch(error => console.log(error));
    // Log the transaction receipt
    console.log(txReceipt);
  }

  async KNCToETH() {

    /*
    #################################
    ### CHECK IF KNC IS SUPPORTED ###
    #################################
    */

    // Querying the API /currencies endpoint
    let tokenInfoRequest = await fetch(this.apiURL + 'currencies');
    // Parsing the output
    let tokens = await tokenInfoRequest.json();
    // Checking to see if KNC is supported
    let supported = tokens.data.some(token => {
      return 'KNC' == token.symbol
    });
    // If not supported, return.
    if (!supported) {
      console.log('Token is not supported');
      return
    }

    /*
    ####################################
    ### GET ENABLED STATUS OF WALLET ###
    ####################################
    */

    // Querying the API /users/<user_address>/currencies endpoint
    let enabledStatusesRequest = await fetch(this.apiURL + 'users/' + this.state.USER_ACCOUNT + '/currencies')
    // Parsing the output
    let enabledStatuses = await enabledStatusesRequest.json()
    console.log('enabledStatuses:')
    console.log(enabledStatuses)
    // Checking to see if KNC is enabled
    let enabled = enabledStatuses.data.some(token => {
      if (token.id.toLowerCase() == this.state.KNC_TOKEN_ADDRESS.toLowerCase()) {
        return token.enabled
      }
    })

    /*
    ####################################
    ### ENABLE WALLET IF NOT ENABLED ###
    ####################################
    */

    if (!enabled) {
      // Querying the API /users/<user_address>/currencies/<currency_id>/enable_data?gas_price=<gas_price> endpoint
      let enableTokenDetailsRequest = await fetch(this.apiURL + 'users/' + this.state.USER_ACCOUNT + '/currencies/' + this.state.KNC_TOKEN_ADDRESS + '/enable_data?gas_price=' + this.state.GAS_PRICE)
      // Parsing the output
      let enableTokenDetails = await enableTokenDetailsRequest.json()
      console.log('enableTokenDetails:')
      console.log(enableTokenDetails)
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

    // Querying the API /sell_rate endpoint
    let ratesRequest = await fetch(this.apiURL + 'sell_rate?id=' + this.state.KNC_TOKEN_ADDRESS + '&qty=' + this.state.QTY)
    // Parsing the output
    let rates = await ratesRequest.json()
    // Getting the source quantity
    let dstQty = rates.data[0].dst_qty

    /*
    #######################
    ### TRADE EXECUTION ###
    #######################
    */

    // Querying the API /trade_data endpoint
    tradeDetailsRequest = await fetch(this.apiURL + 'trade_data?user_address=' + this.state.USER_ACCOUNT + '&src_id=' + this.state.KNC_TOKEN_ADDRESS + '&dst_id=' + this.state.ETH_TOKEN_ADDRESS + '&src_qty=' + this.state.QTY + '&min_dst_qty=' + dstQty * 0.97 + '&gas_price=' + this.state.GAS_PRICE + '&wallet_id=' + this.state.WALLET_ID)
    // Parsing the output
    let tradeDetails = await tradeDetailsRequest.json()
    console.log('tradeDetails:')
    console.log(tradeDetails)
    // Extract the raw transaction details
    rawTx = tradeDetails.data[0]
    // Create a new transaction
    tx = new Tx(rawTx)
    // Signing the transaction
    tx.sign(this.PRIVATE_KEY)
    // Serialise the transaction (RLP encoding)
    serializedTx = tx.serialize()
    // Broadcasting the transaction
    txReceipt = await this.web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).catch(error => console.log(error))
    // Log the transaction receipt
    console.log(txReceipt)
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
                        {/* <label htmlFor="fromQTY">From</label> */}
                        <input
                          id="fromQTY"
                          className="pure-u-23-24" 
                          type="number" placeholder="0" 
                          value={this.state.QTY} 
                          onChange={this.handleChangeQTY.bind(this)}/>
                    </div>
                    <div className="pure-u-1-5">
                      <label htmlFor="fromCoin"></label>
                      <select 
                        id="fromCoin" 
                        className="pure-input-1"
                        value={this.state.fromCoin} 
                        onChange={this.handleChangeFromCoin.bind(this)}
                        >
                          <option>ETH</option>
                          <option>KNC</option>
                      </select>
                    </div>
                    <div className="pure-u-1-5">
                      <img className="img-exchange" src={require('../img/exchange-alt-solid.svg')} alt=""/>
                    </div>
                    <div className="pure-u-1-5">
                        {/* <label htmlFor="toQTY">From</label> */}
                        <input id="toQTY" className="pure-u-23-24" type="number" placeholder="0" value={this.state.toQTY} readOnly/>
                    </div>
                    <div className="pure-u-1-5">
                      <label htmlFor="toCoin"></label>
                      <select 
                        id="toCoin" 
                        className="pure-input-1"
                        value={this.state.toCoin} 
                        onChange={this.handleChangeToCoin.bind(this)}
                        >
                          <option>ETH</option>
                          <option>KNC</option>
                      </select>
                    </div>
                    <h2>Sender</h2>
                    <div className="pure-u-1">
                        <label htmlFor="userAccount">Your {this.state.fromCoin} Address</label>
                        <input id="userAccount" className="pure-u-1" type="text" placeholder="0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"/>
                    </div>
                    <div className="pure-u-1">
                        <label htmlFor="privateKey">Private Key</label>
                        <input id="privateKey" className="pure-u-1" type="password"/>
                    </div>
                    <h2>Receiver</h2>
                    <div className="pure-u-1">
                        <label htmlFor="kncAddress">Your {this.state.toCoin} Address</label>
                        <input id="kncAddress" className="pure-u-1" type="text" placeholder="KNC_TOKEN_ADDRESS"/>
                    </div>
                  </div>

                  <input type="button" className="btn-start pure-button pure-button-primary" onClick={this.startSwap.bind(this)} value="Start Swap" />
              </fieldset>
            </form>
            {
              this.state.showResult && (
                <section >
                <h3>Result</h3>
                <p>{this.state.message}</p>
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