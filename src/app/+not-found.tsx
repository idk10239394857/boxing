import { Redirect } from 'expo-router';

/** Unknown paths (e.g. when hosted under a sub-path) land on the Fighter tab. */
export default function NotFound() {
  return <Redirect href="/" />;
}
