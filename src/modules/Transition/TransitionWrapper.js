import cx from 'classnames'
import _ from 'lodash'
import { cloneElement, Component, PropTypes } from 'react'

import {
  getUnhandledProps,
  makeDebugger,
  META,
  SUI,
  useKeyOnly,
} from '../../lib'

const debug = makeDebugger('transition')

const STAGE_CALM = 0
const STAGE_ANIMATION_IN = 1
const STAGE_ANIMATION_OUT = 2

export default class TransitionWrapper extends Component {
  static propTypes = {
    animation: PropTypes.string.isRequired,

    /** Primary content. */
    children: PropTypes.node,

    className: PropTypes.string,

    duration: PropTypes.number,
  }

  static _meta = {
    name: 'TransitionWrapper',
    parent: 'Transition',
    type: META.TYPES.MODULE,
  }

  state = {
    stage: STAGE_ANIMATION_IN,
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

    const { duration } = this.props
    setTimeout(this.stopAnimation, duration)

    done()
  }

  componentDidEnter = () => {
    debug('componentDidEnter()')
  }

  componentWillLeave = done => {
    debug('componentWillLeave()')

    const { duration } = this.props

    this.setState({ stage: STAGE_ANIMATION_OUT })
    setTimeout(done, duration)
  }

  componentDidLeave = () => {
    debug('componentDidLeave()')
  }

  animationClass = () => {
    const { animation } = this.props
    const { stage } = this.state

    if (stage === STAGE_CALM) return null
    if (_.includes(SUI.STATIC_TRANSITIONS, animation)) return animation
    if (stage === STAGE_ANIMATION_IN) return `in ${animation}`
    return `out ${animation}`
  }

  stopAnimation = () => this.setState({ stage: STAGE_CALM })

  render() {
    debug('render()')

    const { children, className, duration } = this.props
    const { stage } = this.state

    const animation = this.animationClass()
    const animating = stage === STAGE_ANIMATION_IN || stage === STAGE_ANIMATION_OUT
    const visible = stage === STAGE_ANIMATION_OUT

    const childClasses = _.get(children, 'props.className', '')
    const childStyle = _.get(children, 'props.style', {})
    const classes = cx(
      childClasses,
      useKeyOnly(animating, 'animating'),
      useKeyOnly(visible, 'visible'),
      this.animationClass(),
      'transition',
      className,
    )
    const style = { ...childStyle, animationDuration: animation && `${duration}ms` }
    const rest = getUnhandledProps(TransitionWrapper, this.props)

    return cloneElement(children, { ...rest, className: classes, style })
  }
}
