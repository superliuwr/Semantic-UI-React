import addClass from 'dom-helpers/class/addClass'
import removeClass from 'dom-helpers/class/removeClass'
import raf from 'dom-helpers/util/requestAnimationFrame'
import cx from 'classnames'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React, { Children, cloneElement } from 'react'
import ReactDOM from 'react-dom'

import {
  makeDebugger,
  META,
  useKeyOnly
} from '../../lib'
import TransitionGroup from './TransitionGroup'

const debug = makeDebugger('Transition')

export const UNMOUNTED = 0
export const EXITED = 1
export const ENTERING = 2
export const ENTERED = 3
export const EXITING = 4

const TRANSITION_ENTER = 'enter'
const TRANSITION_EXIT = 'exit'

export default class Transition extends React.Component {
  static propTypes = {
    /**
     * Wait until the first "enter" transition to mount the component (add it to the DOM)
     */
    mountOnEnter: PropTypes.bool,

    /**
     * Unmount the component (remove it from the DOM) when it is not shown
     */
    unmountOnExit: PropTypes.bool,

    /**
     * Run the enter animation when the component mounts, if it is initially
     * shown
     */
    transitionAppear: PropTypes.bool,

    /**
     * A Timeout for the animation, in milliseconds, to ensure that a node doesn't
     * transition indefinately if the browser transitionEnd events are
     * canceled or interrupted.
     *
     * By default this is set to a high number (5 seconds) as a failsafe. You should consider
     * setting this to the duration of your animation (or a bit above it).
     */
    timeout: PropTypes.object,
  }

  static defaultProps = {
    in: false,
    unmountOnExit: true,
    transitionAppear: false,
  }

  static _meta = {
    name: 'Transition',
    type: META.TYPES.MODULE,
  }

  static Group = TransitionGroup

  constructor(props, context) {
    super(props, context)

    let initialStatus
    this.nextStatus = null

    if (props.in) {
      if (props.transitionAppear) {
        initialStatus = EXITED
        this.nextStatus = ENTERING
      } else {
        initialStatus = ENTERED
      }
    } else {
      if (props.unmountOnExit || props.mountOnEnter) {
        initialStatus = UNMOUNTED
      } else {
        initialStatus = EXITED
      }
    }

    this.state = { status: initialStatus }

    this.nextCallback = null
    this.classNameAndNodeQueue = []
    this.transitionTimeouts = []
  }

  componentDidMount() {
    this.updateStatus(true)
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  componentWillReceiveProps(nextProps) {
    const { status } = this.state

    if (nextProps.in) {
      if (status === UNMOUNTED) {
        this.setState({ status: EXITED })
      }
      if (status !== ENTERING && status !== ENTERED) {
        this.nextStatus = ENTERING
      }
    } else {
      if (status === ENTERING || status === ENTERED) {
        this.nextStatus = EXITING
      }
    }
  }

  componentDidUpdate() {
    this.updateStatus()
  }

  componentWillUnmount() {
    debug('componentWillUnmount()')

    this.cancelNextCallback()
    this.unmounted = true

    if (this.timeout) clearTimeout(this.timeout)
    this.transitionTimeouts.forEach(timeout => clearTimeout(timeout))
    this.classNameAndNodeQueue.length = 0
  }

  updateStatus(mounting = false) {
    if (this.nextStatus !== null) {
      // nextStatus will always be ENTERING or EXITING.
      this.cancelNextCallback()
      const node = ReactDOM.findDOMNode(this)

      if (this.nextStatus === ENTERING) {
        this.onTransitionItemEnd(node, TRANSITION_EXIT)
        this.onTransitionItemStart(node, TRANSITION_ENTER)

        this.safeSetState({ status: ENTERING }, () => {
          let { timeout } = this.props
          if (typeof timeout !== 'number') {
            timeout = mounting && timeout.appear != null ?
              timeout.appear : timeout.enter
          }

          this.onTransitionEnd(node, timeout, () => {
            this.safeSetState({ status: ENTERED }, () => {
              this.onTransitionItemEnd(node, TRANSITION_ENTER)
            })
          })
        })
      } else {
        this.onTransitionItemEnd(node, TRANSITION_ENTER)
        this.onTransitionItemStart(node, TRANSITION_EXIT)

        this.safeSetState({ status: EXITING }, () => {
          let { timeout } = this.props
          if (typeof timeout !== 'number') {
            timeout = timeout.exit
          }

          this.onTransitionEnd(node, timeout, () => {
            this.safeSetState({ status: EXITED }, () => {
              this.onTransitionItemEnd(node, TRANSITION_EXIT)
            })
          })
        })
      }

      this.nextStatus = null
    } else if (this.props.unmountOnExit && this.state.status === EXITED) {
      this.setState({ status: UNMOUNTED })
    }
  }

  cancelNextCallback() {
    if (this.nextCallback !== null) {
      this.nextCallback.cancel()
      this.nextCallback = null
    }
  }

  safeSetState(nextState, callback) {
    // This shouldn't be necessary, but there are weird race conditions with
    // setState callbacks and unmounting in testing, so always make sure that
    // we can cancel any pending setState callbacks after we unmount.
    this.setState(nextState, this.setNextCallback(callback))
  }

  setNextCallback(callback) {
    let active = true

    this.nextCallback = (event) => {
      if (active) {
        active = false
        this.nextCallback = null

        callback(event)
      }
    }

    this.nextCallback.cancel = () => {
      active = false
    }

    return this.nextCallback
  }

  onTransitionEnd(node, timeout, handler) {
    this.setNextCallback(handler)

    if (timeout == null) {
      this.nextCallback()
    } else if (node) {
      setTimeout(this.nextCallback, timeout)
    } else {
      setTimeout(this.nextCallback, 0)
    }
  }

  onTransitionItemStart(node, animationType) {
    const { className, activeClassName } = this.getClassNames(animationType)

    _.forEach(className, cx => addClass(node, cx))
    this.queueClassAndNode(activeClassName, node)
  }

  onTransitionItemEnd(node, animationType) {
    const { className, activeClassName } = this.getClassNames(animationType)

    _.forEach(className, cx => removeClass(node, cx))
    _.forEach(activeClassName, cx => removeClass(node, cx))
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

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  computeClasses = () => {
    const { status } = this.state
    if(status === UNMOUNTED) return null

    const { children, className } = this.props
    const childClasses = _.get(children, 'props.className')

    return cx(
      childClasses,
      useKeyOnly(ENTERING, 'in'),
      useKeyOnly(EXITING, 'out'),
      useKeyOnly(ENTERING || EXITING, 'animating transition visible'),
      className,
    )
  }

  // ----------------------------------------
  // Render
  // ----------------------------------------

  render() {
    debug('render()')
    debug('props', this.props)
    debug('state', this.state)

    const { children } = this.props
    const { status } = this.state

    if (status === UNMOUNTED) return null
    return Children.only(children)
    return cloneElement(children, {
      className: this.computeClasses()
    })
  }
}
