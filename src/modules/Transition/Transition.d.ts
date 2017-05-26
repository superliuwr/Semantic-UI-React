import * as React from 'react';

export interface TransitionProps {
  [key: string]: any;

  /** Named animation event to used. Must be defined in CSS. */
  /* TODO: define animations */
  animation?: string;

  /** Primary content. */
  children?: React.ReactNode;

  /** Additional classes. */
  className?: string;

  /** Duration of the CSS transition animation in microseconds. */
  duration?: number;

  /** Wait until the first "enter" transition to mount the component (add it to the DOM). */
  mountOnEnter?: boolean;

  /** Show the component; triggers the enter or exit animation. */
  into?: boolean;

  /** Run the enter animation when the component mounts, if it is initially shown. */
  transitionAppear?: boolean;

  /** Unmount the component (remove it from the DOM) when it is not shown. */
  unmountOnExit?: boolean;
}

interface TransitionComponent extends React.ComponentClass<TransitionProps> {
}

declare const Transition: TransitionComponent;

export default Transition;
