import { Component, type ErrorInfo, type ReactNode } from 'react';

type PreviewErrorBoundaryProps = {
  children: ReactNode;
};

type PreviewErrorBoundaryState = {
  hasError: boolean;
};

export default class PreviewErrorBoundary extends Component<
  PreviewErrorBoundaryProps,
  PreviewErrorBoundaryState
> {
  state: PreviewErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PreviewErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Effect preview failed to render.', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="preview-error" role="alert">
          <strong>Preview unavailable</strong>
          <span>This effect could not be rendered. Its metadata and integration details are still available.</span>
        </div>
      );
    }

    return this.props.children;
  }
}
