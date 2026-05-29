const IST = 'Asia/Kolkata';

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });

export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false });

export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export const fmtDateShort = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { timeZone: IST });

export const toISTInput = (d?: string | Date) => {
  const date = d ? new Date(d) : new Date();
  const offset = 5.5 * 60 * 60000;
  return new Date(date.getTime() + offset).toISOString().slice(0, 16);
};

export const toISTISO = (localInput: string) => {
  return localInput + ':00+05:30';
};
