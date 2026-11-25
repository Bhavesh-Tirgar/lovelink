export const getApiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  if (Array.isArray(data?.detail)) {
    const joined = data.detail.map((x) => x?.msg).filter(Boolean).join(', ');
    if (joined) return joined;
  }
  if (typeof data === 'string' && /service suspended/i.test(data)) {
    return 'Backend server is currently suspended or offline (HTTP 503). Please wake or redeploy the backend.';
  }
  if (status === 503) {
    return 'Backend server is temporarily unavailable (HTTP 503). Please try again shortly.';
  }
  if (status === 502 || status === 504) {
    return 'Backend server is waking up or timed out. Please try again in a moment.';
  }
  if (!err?.response && err?.message) {
    return err.message === 'Network Error'
      ? 'Unable to reach server. Please check your internet connection.'
      : err.message;
  }

  return fallback;
};
