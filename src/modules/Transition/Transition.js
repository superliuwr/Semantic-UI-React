import React from 'react';
import ReactTransitionGroup from 'react-addons-transition-group';

import { META } from '../../lib'
import TransitionWrapper from './TransitionWrapper'

export default class Transition extends React.Component {
  static propTypes = {
    /** Primary content. */
    children: PropTypes.node,
  }

  static _meta = {
    name: 'Transition',
    type: META.TYPES.MODULE,
  }

  firstChild = props => {
    const childrenArray = React.Children.toArray(props.children)

    return childrenArray[0] || null
  }

  wrapChild = child => <TransitionWrapper>{child}</TransitionWrapper>

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