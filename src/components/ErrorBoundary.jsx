import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      console.error('ErrorBoundary: capturou erro desconhecido')
      return <div style={{ color: 'red', padding: 32 }}>Ocorreu um erro inesperado. Tente recarregar a página.</div>;
    }
    return this.props.children;
  }
}
