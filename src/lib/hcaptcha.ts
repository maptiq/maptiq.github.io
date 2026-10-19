// Web3Forms' shared hCaptcha site key for free plans; verified on their side.
export const HCAPTCHA_SITEKEY = '50b2fe65-b00b-4b9e-ad62-3ba471098be2';

// hCaptcha is only fetched once a visitor starts using a form, so people who
// never touch it don't send anything to hCaptcha.
export function loadCaptcha(lang: string) {
  if (document.querySelector('script[src*="hcaptcha.com"]')) return;
  const script = document.createElement('script');
  script.src = `https://js.hcaptcha.com/1/api.js?recaptchacompat=off&hl=${lang}`;
  script.async = true;
  document.head.appendChild(script);
}
