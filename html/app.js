import "@babel/polyfill";
import React from 'react'
import ReactDOM from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import Home from './components/Home'

const render = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('main')
  )
}

render(Home)

if (module.hot) {
  module.hot.accept('./components/Home', () => { render(require('./components/Home').default)})
}