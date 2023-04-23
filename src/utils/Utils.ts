export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

export async function sleepBool(ms: number): Promise<boolean> {
    await sleep(ms);
    return true;
}


const MS_PER_SECOND: number = 1000;
const MS_PER_MINUTE: number = MS_PER_SECOND * 60;
const MS_PER_HOUR: number = MS_PER_MINUTE * 60;

export function getDurationFromMs(durationMs: number): string {
  const hh: number = Math.floor(durationMs / MS_PER_HOUR);
  durationMs %= MS_PER_HOUR;
  const mm: number = Math.floor(durationMs / MS_PER_MINUTE);
  durationMs %= MS_PER_MINUTE;
  const ss: number = Math.floor(durationMs / MS_PER_SECOND);

  return getDurationFromHHmmss(hh, mm, ss);
}

export function getDurationFromHHmmss(hh: number, m: number, ss: number): string {
  let mm: number | string = m;
  if(hh) {
      if(m < 10) mm = "0"+m;
      mm = hh + ":" + mm;
  }
  return `${mm}:${ss < 10 ? ("0"+ss) : ss}`;
}