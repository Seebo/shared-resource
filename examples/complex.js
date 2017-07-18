const Resource = require("..");

class Context extends Resource {
  constructor() {
    super();
    this._awaitedValues = {};
    this._storage = {};
  }

  get(key) {
    let promise;
    if (key in this._storage) {
      promise = Promise.resolve(this._storage[key]);
    } else {
      if (!(key in this._awaitedValues)) {
        const deferred = {};
        (deferred.promise = new Promise(resolve => {
          deferred.resolve = resolve;
        })), (this._awaitedValues[key] = deferred);
      }
      promise = this._awaitedValues[key].promise;
    }
    return promise;
  }

  set(key, value) {
    this._storage[key] = value;
    if (key in this._awaitedValues) {
      this._awaitedValues[key].resolve(value);
    }
  }
}

const sleep = t => new Promise(resolve => setTimeout(resolve, t));

async function taskA() {
  const a = await Context.now.get("a");
  console.log("Task A", a);
}

async function taskB() {
  const b = await Context.now.get("b");
  console.log("Task B", b);
}

async function taskC(a, b) {
  await sleep(1000);
  Context.now.set("a", a);
  await sleep(200);
  Context.now.set("b", b);
}

const main = Context.wrap(async x => {
  console.log(`Main ${x} start`, Context.now.id);
  // notice we do not await on taskC, so we need to explicitly
  // add it to the current session
  Context.addTask(taskC(x, x * 2));
  await Promise.all([taskA(), taskB()]);
  console.log(`Main ${x} end`, Context.now.id);
});

main(1);
main(2);
