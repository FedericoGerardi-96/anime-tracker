// Remember notifications received while a step is in flight; never overlap steps.
export function createWakeSignal() {
  let pending = false;
  let release;
  return {
    wake() { pending = true; release?.(); },
    async wait(ms) {
      if (pending) { pending = false; return; }
      await new Promise((resolve) => {
        const timer = setTimeout(done, ms);
        function done() { clearTimeout(timer); release = undefined; resolve(); }
        release = done;
      });
      pending = false;
    },
  };
}
