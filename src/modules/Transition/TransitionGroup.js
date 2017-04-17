import React, { cloneElement, isValidElement } from 'react'

import { getUnhandledProps, META } from '../../lib'
import { getChildMapping, mergeChildMappings } from '../../lib/ChildMapping'

const values = Object.values || (obj => Object.keys(obj).map(k => obj[k]))

function normalizeTimeout(timeout) {
  if (typeof timeout === 'number') return timeout
  // transitions are always "appearing" in the context of a TransitionGroup
  return { ...timeout, appear: timeout.enter }
}

export default class TransitionGroup extends React.Component {
  static propTypes = {
    component: React.PropTypes.any,
    children: React.PropTypes.node,
    timeout: React.PropTypes.any,
  }

  static defaultProps = {
    component: 'span',
  }

  static _meta = {
    name: 'Transition',
    type: META.TYPES.MODULE,
  }

  constructor(props, context) {
    super(props, context)

    const { children, timeout } = props
    const mapping = getChildMapping(children, child => {
      return cloneElement(child, {
        timeout,
        in: true,
        transitionAppear: timeout.appear !== null,
        onExited: () => this.handleExited(child.key),
      })
    })

    this.state = { children: mapping }
  }

  componentWillReceiveProps(nextProps) {
    let prevChildMapping = this.state.children
    let nextChildMapping = getChildMapping(nextProps.children)

    let children = mergeChildMappings(prevChildMapping, nextChildMapping)

    Object.keys(children).forEach((key) => {
      let child = children[key]

      if (!isValidElement(child)) return

      const onExited = () => this.handleExited(key)
      const timeout = this.props.timeout

      const hasPrev = key in prevChildMapping
      const hasNext = key in nextChildMapping

      const prevChild = prevChildMapping[key]
      const isLeaving = isValidElement(prevChild) && !prevChild.props.in

      // item is new (entering)
      if (hasNext && (!hasPrev || isLeaving)) {
        // console.log('entering', key)
        children[key] = cloneElement(child, {
          onExited,
          in: true,
          transitionAppear: true,
          timeout: normalizeTimeout(timeout),
        })
      }
      // item is old (exiting)
      else if (!hasNext && hasPrev && !isLeaving) {
        // console.log('leaving', key)
        children[key] = cloneElement(child, { in: false, timeout })
      }
      // item hasn't changed transition states
      // copy over the last transition props;
      else if (hasNext && hasPrev && isValidElement(prevChild)) {
        // console.log('unchanged', key)
        children[key] = cloneElement(child, {
          onExited,
          in: prevChild.props.in,
          transitionAppear: prevChild.props.transitionAppear,
        })
      }
    })

    this.setState({ children })
  }

  handleExited = key => {
    const currentChildMapping = getChildMapping(this.props.children)
    if (key in currentChildMapping) return

    this.setState(state => {
      const children = { ...state.children }
      delete children[key]

      return { children }
    })
  };

  render() {
    const { component: Component } = this.props
    const { children } = this.state
    const rest = getUnhandledProps(TransitionGroup, this.props)

    return <Component {...rest}>{values(children)}</Component>
  }
}
