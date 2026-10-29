// Money helpers. Amounts are always integer cents; anything shown is derived.
export const formatUSD = (cents: number) => {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${whole}.${`${abs % 100 < 10 ? "0" : ""}${abs % 100}`}`;
};

export const sumCents = (values: readonly number[]) =>
  values.reduce((total, v) => total + v, 0);
