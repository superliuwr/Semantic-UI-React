import React, { Component, PropTypes } from 'react'
import ReactTransitionGroup from 'react-addons-transition-group'

import { META } from '../../lib'
import TransitionWrapper from './TransitionWrapper'

/**
 * A transition is an animation usually used to move content in or out of view.
 */
export default class Transition extends Component {
  static propTypes = {
    animation: PropTypes.string,

    /** Primary content. */
    children: PropTypes.node,

    duration: PropTypes.number,
  }

  static defaultProps = {
    duration: 500,
  }

  static _meta = {
    name: 'Transition',
    type: META.TYPES.MODULE,
  }

  firstChild = props => {
    const childrenArray = React.Children.toArray(props.children)

    return childrenArray[0] || null
  }

  wrapChild = child => {
    const { animation, duration } = this.props

    return <TransitionWrapper animation={animation} duration={duration}>{child}</TransitionWrapper>
  }

  render() {
    return (
      <ReactTransitionGroup
        {...this.props}
        childFactory={this.wrapChild}
        component={this.firstChild}
      />
    )
  }
}
