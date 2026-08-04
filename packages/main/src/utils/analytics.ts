export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  const gtag = (window as any).gtag;
  if (typeof gtag === "function") {
    gtag("event", eventName, params);
  }
}
