import cx from 'classnames'
import _ from 'lodash'
import PropTypes from 'prop-types'
import { cloneElement, Component } from 'react'
import ReactDOM from 'react-dom'

import {
  makeDebugger,
  META,
  useKeyOnly,
} from '../../lib'
import TransitionGroup from './TransitionGroup'

const debug = makeDebugger('Transition')

export const UNMOUNTED = 'UNMOUNTED'
export const EXITED = 'EXITED'
export const ENTERING = 'ENTERING'
export const ENTERED = 'ENTERED'
export const EXITING = 'EXITING'

/**
 * A transition is an animation usually used to move content in or out of view.
 */
export default class Transition extends Component {
  static propTypes = {
    /** Named animation event to used. Must be defined in CSS. */
    animation: PropTypes.string,

    /** Primary content. */
    children: PropTypes.node,

    /** Additional classes. */
    className: PropTypes.string,

    /** Duration of the CSS transition animation in microseconds. */
    duration: PropTypes.number,

    /** Wait until the first "enter" transition to mount the component (add it to the DOM). */
    mountOnEnter: PropTypes.bool,

    /** Show the component; triggers the enter or exit animation. */
    into: PropTypes.bool,

    /**
     * A Timeout for the animation, in milliseconds, to ensure that a node doesn't transition indefinately if the
     * browser transitionEnd events are canceled or interrupted.
     *
     * By default this is set to a high number (5 seconds) as a failsafe. You should consider setting this to
     * the duration of your animation (or a bit above it).
     */
    timeout: PropTypes.object,

    /** Run the enter animation when the component mounts, if it is initially shown. */
    transitionAppear: PropTypes.bool,

    /** Unmount the component (remove it from the DOM) when it is not shown. */
    unmountOnExit: PropTypes.bool,
  }

  static defaultProps = {
    animation: 'fade',
    duration: 500,
    into: false,
    unmountOnExit: true,
    transitionAppear: false,
  }

  static _meta = {
    name: 'Transition',
    type: META.TYPES.MODULE,
  }

  static Group = TransitionGroup

  constructor(...args) {
    super(...args)

    const { initial: status, next } = this.computeInitialStatuses()
    this.nextStatus = next
    this.state = { status }
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  componentDidMount() {
    this.updateStatus(true)
  }

  componentWillReceiveProps(nextProps) {
    const { status } = this.state

    if (nextProps.into) {
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
  }

  updateStatus(mounting = false) {
    if (this.nextStatus !== null) {
      // nextStatus will always be ENTERING or EXITING.
      this.cancelNextCallback()
      const node = ReactDOM.findDOMNode(this)

      if (this.nextStatus === ENTERING) {
        this.safeSetState({ status: ENTERING }, () => {
          let { timeout } = this.props
          if (typeof timeout !== 'number') {
            timeout = mounting && timeout.appear != null ?
              timeout.appear : timeout.enter
          }

          this.onTransitionEnd(node, timeout, () => {
            this.safeSetState({ status: ENTERED })
          })
        })
      } else {
        this.safeSetState({ status: EXITING }, () => {
          let { timeout } = this.props
          if (typeof timeout !== 'number') {
            timeout = timeout.exit
          }

          this.onTransitionEnd(node, timeout, () => {
            this.safeSetState({ status: EXITED })
          })
        })
      }

      this.nextStatus = null
    } else if (this.props.unmountOnExit && this.state.status === EXITED) {
      this.setState({ status: UNMOUNTED })
    }
  }

  cancelNextCallback() {
    if (!this.nextCallback) return

    this.nextCallback.cancel()
    this.nextCallback = null
  }

  safeSetState(nextState, callback) {
    // This shouldn't be necessary, but there are weird race conditions with
    // setState callbacks and unmounting in testing, so always make sure that
    // we can cancel any pending setState callbacks after we unmount.
    this.setState(nextState, callback && this.setNextCallback(callback))
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

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  computeClasses = () => {
    const { status } = this.state
    if (status === UNMOUNTED) return null

    const { animation, children, className } = this.props
    const childClasses = _.get(children, 'props.className')

    return cx(
      childClasses,
      useKeyOnly(status === ENTERING, 'in'),
      useKeyOnly(status === EXITING, 'out'),
      useKeyOnly(status === ENTERING || status === EXITING, 'animating transition visible'),
      useKeyOnly(status === ENTERING || status === EXITING, animation),
      className,
    )
  }

  computeInitialStatuses = () => {
    const { into, mountOnEnter, transitionAppear, unmountOnExit } = this.props

    if (into) {
      if (transitionAppear) {
        return {
          initial: EXITED,
          next: ENTERING,
        }
      }
      return { initial: ENTERED }
    }

    if (mountOnEnter || unmountOnExit) return { initial: UNMOUNTED }
    return { initial: EXITED }
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
    return cloneElement(children, {
      className: this.computeClasses(),
    })
  }
}
