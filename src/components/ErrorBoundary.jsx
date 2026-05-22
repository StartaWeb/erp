import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#ffebe6', color: '#bf2600', minHeight: '100vh' }}>
          <h2>Oops, o sistema encontrou um erro!</h2>
          <p>Por favor, tire um print desta tela e envie para o suporte:</p>
          <pre style={{ backgroundColor: 'rgba(255,255,255,0.5)', padding: '1rem', overflowX: 'auto', borderRadius: '4px', marginTop: '1rem' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#bf2600', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
