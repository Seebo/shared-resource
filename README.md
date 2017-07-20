# shared-resource
Asynchronous resources shared across async callchain via async_hooks

## Getting Started
`npm install --save shared-resource`

## Basic Usage
```js
import Resource from 'shared-resource';

const sleep = t => new Promise(resolve => setTimeout(resolve, t));

async function taskA() {
    console.log('Task A', Resource.now.id);
}

async function taskB() {
    await sleep(300);
    console.log('Task B', Resource.now.id);
}

async function taskC() {
    await sleep(1000);
    console.log('Task C', Resource.now.id);
}

const main = Resource.wrap(async x => {
    console.log(`Main ${x} start`, Resource.now.id);
    // notice we do not await on taskC, so we need to explicitly
    // add it to the current session
    Resource.addTask(taskC());
    await Promise.all([
        taskA(),
        taskB(),
    ]);
    console.log(`Main ${x} end`, Resource.now.id);
});

main(1);
main(2);

/*
Possible output:
Main 1 start 6bcc4e3f-24ae-4188-b377-c537e59858bf
Task A 6bcc4e3f-24ae-4188-b377-c537e59858bf
Main 2 start 10babdf3-d243-487b-8881-4ddc9180cb5a
Task A 10babdf3-d243-487b-8881-4ddc9180cb5a
Task B 6bcc4e3f-24ae-4188-b377-c537e59858bf
Task B 10babdf3-d243-487b-8881-4ddc9180cb5a
Main 1 end 6bcc4e3f-24ae-4188-b377-c537e59858bf
Main 2 end 10babdf3-d243-487b-8881-4ddc9180cb5a
Task C 6bcc4e3f-24ae-4188-b377-c537e59858bf
Task C 10babdf3-d243-487b-8881-4ddc9180cb5a
*/

```

## Advanced Usage (extending Resource)
```js
import Resource from 'shared-resource';
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

/*
Possible output:
Main 1 start ebe5323d-6ede-4893-89ea-c67c4a3ff332
Main 2 start 1f14b386-4e2d-4443-9237-1b735d22ea89
Task A 1
Task A 2
Task B 2
Task B 4
Main 1 end ebe5323d-6ede-4893-89ea-c67c4a3ff332
Main 2 end 1f14b386-4e2d-4443-9237-1b735d22ea89
*/

```

## API
### Resource - `import Resource from 'shared-resource'`
- **static make(...args)** Create a new `Resource` object connected to the pool, providing `args` to its constructor (inherited statically).
- **static get now** Get the current `Resource` object.
- **static addTask(promise)** Shortcut to `Resource.now.addTask(promise)`.
- **static wrap(fn, ...args)** Get a decorated `fn` that runs itself in a `Resource`, providing `args` to its constructor (inherited statically).
- **get id** Get the uuid of the instance
- **addTask(promise)** Make sure the resource lifetime doesn't end until the `promise` is resolved.
- **run(fn)** Run `fn` in the context of this resource instance.
