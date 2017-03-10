import React, { Component, PropTypes } from 'react'
import { makeDebugger, META } from '../../lib'

const debug = makeDebugger('transition:wrapper')

export default class TransitionWrapper extends Component {
  static propTypes = {
    /** Primary content. */
    children: PropTypes.node,
  }

  static _meta = {
    name: 'TransitionWrapper',
    parent: 'Transition',
    type: META.TYPES.MODULE,
  }

  componentWillUnmount() {
    debug('componentWillMount()')
  }

  componentWillAppear = done => {
    debug('componentWillAppear()')
    done()
  }

  componentDidAppear = () => {
    debug('componentDidAppear()')
  }

  componentWillEnter = done => {
    debug('componentWillEnter()')
    done()
  }

  componentDidEnter = () => {
    debug('componentDidEnter()')
  }

  componentWillLeave = done => {
    debug('componentWillLeave()')
    done()
  }

  componentDidLeave = () => {
    debug('componentDidLeave()')
  }

  render() {
    const { children } = this.props

    return children
  }
}
