import _ from 'lodash'
import PropTypes from 'prop-types'
import React, { Children } from 'react'
import ReactDOM from 'react-dom'

export const UNMOUNTED = 0
export const EXITED = 1
export const ENTERING = 2
export const ENTERED = 3
export const EXITING = 4

export default class TransitionWrapper extends React.Component {
  static propTypes = {
   /**
    * Show the component; triggers the enter or exit animation
    */
    in: PropTypes.bool,

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

    /**
     * Add a custom transition end trigger. Called with the transitioning
     * DOM node and a `done` callback. Allows for more fine grained transition end
     * logic. **Note:** Timeouts are still used as a fallback.
     *
     * addEndListener={(node, done) => {
     *   // use the css transitionend event to mark the finish of a transition
     *   node.addEventListener('transitionend', done, false);
     * }}
     */
    addEndListener: PropTypes.func,
    /**
    * Callback fired before the "entering" classes are applied
    */
    onEnter: PropTypes.func,
    /**
     * Callback fired after the "entering" classes are applied
     */
    onEntering: PropTypes.func,
    /**
     * Callback fired after the "enter" classes are applied
     */
    onEntered: PropTypes.func,
    /**
     * Callback fired before the "exiting" classes are applied
     */
    onExit: PropTypes.func,
    /**
     * Callback fired after the "exiting" classes are applied
     */
    onExiting: PropTypes.func,
    /**
     * Callback fired after the "exited" classes are applied
     */
    onExited: PropTypes.func,
  }

  static defaultProps = {
    in: false,
    unmountOnExit: false,
    transitionAppear: false,

    onEnter: _.noop,
    onEntering: _.noop,
    onEntered: _.noop,

    onExit: _.noop,
    onExiting: _.noop,
    onExited: _.noop,
  }

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
  }

  componentDidMount() {
    this.updateStatus(true)
  }

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
    this.cancelNextCallback()
  }

  updateStatus(mounting = false) {
    if (this.nextStatus !== null) {
      // nextStatus will always be ENTERING or EXITING.
      this.cancelNextCallback()
      const node = ReactDOM.findDOMNode(this)

      if (this.nextStatus === ENTERING) {
        this.props.onEnter(node, mounting)

        this.safeSetState({ status: ENTERING }, () => {
          let { timeout } = this.props
          if (typeof timeout !== 'number') {
            timeout = mounting && timeout.appear != null ?
              timeout.appear : timeout.enter
          }

          this.props.onEntering(node, mounting)

          this.onTransitionEnd(node, timeout, () => {
            this.safeSetState({ status: ENTERED }, () => {
              this.props.onEntered(node)
            })
          })
        })
      } else {
        this.props.onExit(node)

        this.safeSetState({ status: EXITING }, () => {
          let { timeout } = this.props
          if (typeof timeout !== 'number') {
            timeout = timeout.exit
          }

          this.props.onExiting(node)

          this.onTransitionEnd(node, timeout, () => {
            this.safeSetState({ status: EXITED }, () => {
              this.props.onExited(node)
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
      if (this.props.addEndListener) {
        this.props.addEndListener(node, this.state.status, this.nextCallback)
      }
      setTimeout(this.nextCallback, timeout)
    } else {
      setTimeout(this.nextCallback, 0)
    }
  }

  render() {
    const { children } = this.props
    const { status } = this.state

    if (status === UNMOUNTED) return null
    return Children.only(children)
  }
}
