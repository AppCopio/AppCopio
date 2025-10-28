export const cleanRut = (v: string) => v.replace(/[^0-9kK]/g, "").toUpperCase();

export const formatRut = (v: string) => {
  const s = cleanRut(v);
  if (s.length <= 1) return s;
  const body = s.slice(0, -1);
  const dv = s.slice(-1);
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${bodyWithDots}-${dv}`;
};

export const computeDV = (bodyDigits: string) => {
  let sum = 0, mul = 2;
  for (let i = bodyDigits.length - 1; i >= 0; i--) {
    sum += parseInt(bodyDigits[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
};

export const isValidRut = (rutFormattedOrNot: string) => {
  const s = cleanRut(rutFormattedOrNot);
  if (s.length < 2) return false;
  const body = s.slice(0, -1);
  const dv = s.slice(-1);
  return computeDV(body) === dv.toUpperCase();
};
