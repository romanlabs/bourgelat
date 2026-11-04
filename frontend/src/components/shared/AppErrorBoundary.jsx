import { Component } from 'react'
import { PantallaError } from './PantallaError'

// Última red de la app. Está fuera del router: lo que pinte no puede usar <Link>,
// o la pantalla de error se rompería también y quedaría en blanco.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary capturo un error de render', error, info)
  }

  render() {
    const { error } = this.state
    return error ? <PantallaError error={error} /> : this.props.children
  }
}
