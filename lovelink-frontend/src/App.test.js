import { render, screen } from '@testing-library/react';
import App from './App';

test('redirects unauthenticated root visit to LoveLink login screen', async () => {
  window.localStorage.clear();
  window.history.pushState({}, 'Root', '/');
  render(<App />);
  const heading = await screen.findByText(/LoveLink/i);
  expect(heading).toBeInTheDocument();
});
