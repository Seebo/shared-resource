import test from "ava";
import { spy } from "sinon";
import proxyquire from "proxyquire";

class MockAsyncResource {
  constructor(type) {
    this._type = type;
    this.emitBefore = spy();
    this.emitAfter = spy();
    this.emitDestroy = spy();
  }

  asyncId() {
    return 1;
  }
}

const registerSpy = spy();
let current;

class MockResourcePool {
  constructor() {
    this._register = registerSpy;
  }

  getCurrentResource() {
    return current;
  }
}

const Resource = proxyquire("../index", {
  async_hooks: {
    AsyncResource: MockAsyncResource
  },
  "./resource-pool": MockResourcePool
});

class SubResource extends Resource {
  constructor(x) {
    super();
    this.foo = x;
    current = this;
  }
}

test.beforeEach(() => {
  registerSpy.reset();
  current = null;
});

test("Basic construction of a Resource works", t => {
  const rsc = Resource.make();
  t.truthy(rsc.id);
  t.is(rsc._type, "ASYNC_RESOURCE");
  const src = SubResource.make(5);
  t.is(src.foo, 5);
});

test("Running a session calls the right methods", async t => {
  const rsc = Resource.make();
  const main = async () => {
    t.is(registerSpy.callCount, 1);
    t.is(rsc.emitBefore.calledOnce, true);
    t.is(rsc.emitAfter.calledOnce, true);
    t.is(rsc.emitDestroy.callCount, 0);
  };
  await rsc.run(main);
  t.is(rsc.emitDestroy.calledOnce, true);
});

test.serial("Correct flow of tasks", async t => {
  const rsc = Resource.make();
  current = rsc;
  let count = 0;
  async function taskB() {
    count++;
  }
  async function taskA() {
    await taskB();
    count++;
  }
  const main = async () => {
    count++;
    Resource.addTask(taskA());
  };
  await rsc.run(main);
  t.is(count, 3);
});

test.serial("Falilng task does not throw off the flow", async t => {
  const rsc = Resource.make();
  const main = async () => {
    t.is(registerSpy.calledOnce, true);
    t.is(rsc.emitBefore.calledOnce, true);
    t.is(rsc.emitAfter.calledOnce, true);
    t.is(rsc.emitDestroy.callCount, 0);
    throw new Error("foo");
  };
  await t.throws(rsc.run(main));
  t.is(rsc.emitDestroy.calledOnce, true);
});

test.serial('Resource wrapping', async t => {
    const main = SubResource.wrap(async () => {
        t.is(SubResource.now.foo, 5);
    }, 5);
    await main();
});