export function makeStepper(stepFn, hz = 60, maxSub = 4) {
  const dt = 1 / hz;
  let acc = 0;
  const step = (frameDt) => {
    acc += frameDt;
    let n = 0;
    while (acc >= dt && n < maxSub) {
      stepFn(dt);
      acc -= dt;
      n += 1;
    }
    if (n === maxSub) acc = 0;
    return n;
  };
  step.reset = () => { acc = 0; };
  return step;
}
