import test from "ava";
import { spy, stub } from "sinon";
import proxyquire from "proxyquire";

function createMockHook(hookSpec) {
  const hook = {
    enable: stub(),
    spec: hookSpec
  };
  hook.enable.returns(hook);
  return hook;
}

const ResourcePool = proxyquire("../resource-pool", {
  async_hooks: {
    createHook: createMockHook
  }
});

test("Base construction works", t => {
  const pool = new ResourcePool();
  t.is(pool._hook.enable.calledOnce, true);
});

test("Session create and manual register", t => {
  const pool = new ResourcePool();
  const resource = { asyncId: () => 1 };
  pool._register(resource);
  t.is(pool._sessions[1].resource, resource);
});

test("Current session manual management", t => {
  const pool = new ResourcePool();
  const resource = { asyncId: () => 1, id: 2 };
  pool._register(resource);
  pool._activeSessionId = 1;
  t.is(pool.getCurrentResource().id, 2);
});

test("Async hooks", t => {
  const pool = new ResourcePool();
  const resource = { asyncId: () => 1, id: 2 };
  pool._register(resource);
  pool._hook.spec.init(1);
  pool._hook.spec.before(1);
  t.is(pool.getCurrentResource().id, 2);
  pool._hook.spec.init(2);
  pool._hook.spec.init(3);
  pool._hook.spec.after(1);
  t.is(pool.getCurrentResource(), null);
  pool._hook.spec.init(4);
  pool._hook.spec.before(4);
  t.is(pool.getCurrentResource(), null);
  pool._hook.spec.before(3);
  t.is(pool.getCurrentResource().id, 2);;
  pool._hook.spec.after(3);
  pool._hook.spec.after(4);
  pool._hook.spec.destroy(2);
  pool._hook.spec.destroy(1);
  t.is(Object.keys(pool._sessions).length, 0);
  t.is(Object.keys(pool._subsessions).length, 0);
});
