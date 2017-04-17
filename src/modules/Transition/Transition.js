import _ from 'lodash'
import React from 'react'
import addClass from 'dom-helpers/class/addClass'
import removeClass from 'dom-helpers/class/removeClass'
import raf from 'dom-helpers/util/requestAnimationFrame'

import { makeDebugger, META } from '../../lib'
import TransitionGroup from './TransitionGroup'
import TransitionWrapper from './TransitionWrapper'

const debug = makeDebugger('Transition')

const TRANSITION_ENTER = 'enter'
const TRANSITION_EXIT = 'exit'

export default class Transition extends React.Component {
  static propTypes = {
    onEnter: React.PropTypes.func,
    onEntered: React.PropTypes.func,

    onExit: React.PropTypes.func,
    onExited: React.PropTypes.func,
  }

  static _meta = {
    name: 'Transition',
    type: META.TYPES.MODULE,
  }

  static Group = TransitionGroup

  constructor(...args) {
    super(...args)

    this.classNameAndNodeQueue = []
    this.transitionTimeouts = []
  }

  componentWillUnmount() {
    debug('componentWillUnmount()')
    this.unmounted = true

    if (this.timeout) clearTimeout(this.timeout)
    this.transitionTimeouts.forEach(timeout => clearTimeout(timeout))
    this.classNameAndNodeQueue.length = 0
  }

  onTransitionStart(node, animationType) {
    const { className, activeClassName } = this.getClassNames(animationType)

    _.forEach(className, cx => addClass(node, cx))
    this.queueClassAndNode(activeClassName, node)
  }

  onTransitionEnd(node, animationType) {
    const { className, activeClassName } = this.getClassNames(animationType)

    _.forEach(className, cx => removeClass(node, cx))
    _.forEach(activeClassName, cx => removeClass(node, cx))
  }

  onEnter = node => {
    this.onTransitionEnd(node, TRANSITION_EXIT)
    this.onTransitionStart(node, TRANSITION_ENTER)

    if (this.props.onEnter) this.props.onEnter(node)
  }

  onEntered = node => {
    this.onTransitionEnd(node, TRANSITION_ENTER)

    if (this.props.onEntered) this.props.onEntered(node)
  }

  onExit = node => {
    this.onTransitionEnd(node, TRANSITION_ENTER)
    this.onTransitionStart(node, TRANSITION_EXIT)

    if (this.props.onExit) this.props.onExit(node)
  }

  onExited = node => {
    this.onTransitionEnd(node, TRANSITION_EXIT)

    if (this.props.onExited) this.props.onExited(node)
  }

  getClassNames = type => {
    const { classNames } = this.props

    const className = type === TRANSITION_EXIT
      ? ['transition', 'visible', 'animating', 'out', classNames]
      : ['transition', 'visible', 'animating', 'in', classNames]

    return {
      className,
      activeClassName: ['transition', 'visible'],
    }
  }

  queueClassAndNode(className, node) {
    this.classNameAndNodeQueue.push({
      className,
      node,
    })

    if (!this.rafHandle) {
      this.rafHandle = raf(() => this.flushClassNameAndNodeQueue())
    }
  }

  flushClassNameAndNodeQueue() {
    if (!this.unmounted) {
      this.classNameAndNodeQueue.forEach((obj) => {
        // This is for to force a repaint,
        // which is necessary in order to transition styles when adding a class name.
        /* eslint-disable no-unused-expressions */
        obj.node.scrollTop
        /* eslint-enable no-unused-expressions */
        _.forEach(obj.className, cx => addClass(obj.node, cx))
      })
    }

    this.classNameAndNodeQueue.length = 0
    this.rafHandle = null
  }

  render() {
    debug('render()')

    return (
      <TransitionWrapper
        {...this.props}
        onEnter={this.onEnter}
        onEntered={this.onEntered}
        onExit={this.onExit}
        onExited={this.onExited}
        willTransition={this.transition}
      />
    )
  }
}
