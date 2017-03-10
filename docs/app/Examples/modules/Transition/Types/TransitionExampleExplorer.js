import React, { Component } from 'react'
import { Button, Form, Grid, Image, Transition } from 'semantic-ui-react'

const transitions = [
  'scale',
  'fade', 'fade up', 'fade down', 'fade left', 'fade right',
]

const options = transitions.map(transition => ({ text: transition, value: transition }))

export default class TransitionExampleExplorer extends Component {
  state = {
    transition: 'scale',
    visible: true,
  }

  handleTransitionChange = (e, { value: transition }) => this.setState({ transition })

  handleVisibilityUpdate = () => {
    const { visible } = this.state
    this.setState({ visible: !visible })
  }

  render() {
    const { transition, visible } = this.state

    return (
      <Grid columns={2}>
        <Grid.Column as={Form}>
          <Form.Select
            label='Choose transition'
            onChange={this.handleTransitionChange}
            options={options}
            value={transition}
          />
          <Form.Button
            content={visible ? 'Hide leaf' : 'Show leaf'}
            onClick={this.handleVisibilityUpdate}
            type='button'
          />
        </Grid.Column>

        <Grid.Column>
          <Transition>
            <Image size='medium' src='http://semantic-ui.com/images/leaves/1.png' />
          </Transition>
        </Grid.Column>
      </Grid>
    )
  }
}
