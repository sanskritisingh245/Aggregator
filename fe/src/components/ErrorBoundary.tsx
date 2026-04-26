import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[Aggregator] render error:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card m-6 rounded-2xl border border-down/45 bg-down/10 p-6 font-mono text-sm text-down">
        <div className="font-semibold uppercase tracking-wider">Render error</div>
        <pre className="mt-3 whitespace-pre-wrap text-xs">
          {this.state.error.message}
          {"\n\n"}
          {this.state.error.stack}
        </pre>
        <button
          onClick={this.reset}
          className="mt-4 rounded-full border border-down/45 bg-down/15 px-3 py-1.5 text-xs"
        >
          dismiss
        </button>
      </div>
    );
  }
}
