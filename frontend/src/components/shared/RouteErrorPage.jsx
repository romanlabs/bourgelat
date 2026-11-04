import { useRouteError } from 'react-router-dom'
import { PantallaError } from './PantallaError'

export default function RouteErrorPage() {
  return <PantallaError error={useRouteError()} />
}
