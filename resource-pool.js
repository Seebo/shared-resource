const async_hooks = require("async_hooks");

class ResourcePool {
  constructor() {
    this._sessions = {};
    this._subsessions = {};
    this._activeSessionId = null;
    this._initHook();
  }

  _initHook() {
    this._hook = async_hooks
      .createHook({
        init: asyncId => {
          if (this._activeSessionId) {
            this._subsessions[asyncId] = this._activeSessionId;
            this._sessions[this._activeSessionId]._refs.add(asyncId);
          }
        },
        before: asyncId => {
          if (this._sessions[asyncId]) {
            this._activeSessionId = asyncId;
          } else if (this._subsessions[asyncId]) {
            this._activeSessionId = this._subsessions[asyncId];
          }
        },
        after: asyncId => {
          this._activeSessionId = null;
        },
        destroy: asyncId => {
          if (this._sessions[asyncId]) {
            for (const ref of this._sessions[asyncId]._refs) {
              delete this._subsessions[ref];
            }
            delete this._sessions[asyncId];
          }
          delete this._subsessions[asyncId];
        }
      })
      .enable();
  }

  _register(resource) {
    this._sessions[resource.asyncId()] = {
      resource,
      _refs: new Set()
    };
  }

  getCurrentResource() {
    if (this._sessions[this._activeSessionId]) {
      return this._sessions[this._activeSessionId].resource;
    }
    return null;
  }
}

module.exports = ResourcePool;