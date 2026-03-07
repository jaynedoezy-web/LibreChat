import React from 'react';
/**
 * Error boundary specifically for Mermaid diagrams.
 * Falls back to displaying the raw mermaid code if rendering fails.
 */
class MermaidErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Mermaid rendering error:', error, errorInfo);
    }
    componentDidUpdate(prevProps) {
        // Reset error state if code changes (e.g., user edits the message)
        if (prevProps.code !== this.props.code && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }
    render() {
        if (this.state.hasError) {
            return (<div className="w-full overflow-hidden rounded-md border border-border-light">
          <div className="rounded-t-md bg-gray-700 px-4 py-2 font-sans text-xs text-gray-200">
            {'mermaid'}
          </div>
          <pre className="overflow-auto whitespace-pre-wrap rounded-b-md bg-gray-900 p-4 font-mono text-xs text-gray-300">
            {this.props.code}
          </pre>
        </div>);
        }
        return this.props.children;
    }
}
export default MermaidErrorBoundary;
