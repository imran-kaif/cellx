(function(undefined) {
	'use strict';

	var hasOwn = Object.prototype.hasOwnProperty;
	var toString = Object.prototype.toString;
	var push = Array.prototype.push;
	var slice = Array.prototype.slice;
	var splice = Array.prototype.splice;

	var global = Function('return this;')();

	var invokeCell;

	/**
	 * @typesign (value?, opts?: {
	 *     get?: (value): *,
	 *     validate?: (value): *,
	 *     computed?: false
	 * }): cellx;
	 *
	 * @typesign (formula: (): *, opts?: {
	 *     get?: (value): *,
	 *     set?: (value),
	 *     validate?: (value): *,
	 *     computed?: true
	 * }): cellx;
	 */
	function cellx(value, opts) {
		if (!opts) {
			opts = {};
		}

		var initialValue = value;

		function cell(value) {
			return invokeCell(cell, initialValue, opts, this, value, slice.call(arguments, 1), arguments.length);
		}
		cell.constructor = cellx;

		return cell;
	}
	cellx.cellx = cellx;

	var KEY_UID = '__cellx_uid__';
	var KEY_CELLS = '__cellx_cells__';

	if (global.Symbol && typeof Symbol.iterator == 'symbol') {
		KEY_UID = Symbol(KEY_UID);
		KEY_CELLS = Symbol(KEY_CELLS);
	}

	cellx.KEY_UID = KEY_UID;
	cellx.KEY_CELLS = KEY_CELLS;

	var uidCounter = 0;

	/**
	 * @typesign (target: Object, source: Object): Object;
	 */
	var assign = Object.assign || function(target, source) {
		for (var name in source) {
			if (hasOwn.call(source, name)) {
				target[name] = source[name];
			}
		}

		return target;
	};

	/**
	 * @typesign (a, b): boolean;
	 */
	var is = Object.is || function(a, b) {
		return a === b || (a != a && b != b);
	};

	/**
	 * @typesign (value): boolean;
	 */
	var isArray = Array.isArray || function(value) {
		return toString.call(value) == '[object Array]';
	};

	/**
	 * @typesign (description: {
	 *     Extends: Function,
	 *     Implements?: Array<Function>,
	 *     Static?: Object,
	 *     constructor?: Function
	 * }): Function;
	 */
	function createClass(description) {
		var parent;

		if (description.Extends) {
			parent = description.Extends;
			delete description.Extends;
		} else {
			parent = Object;
		}

		var constr;

		if (hasOwn.call(description, 'constructor')) {
			constr = description.constructor;
			delete description.constructor;
		} else {
			constr = function() {};
		}

		if (description.Static) {
			assign(constr, description.Static);
			delete description.Static;
		}

		var proto = constr.prototype = Object.create(parent.prototype);

		if (description.Implements) {
			description.Implements.forEach(function(mixin) {
				assign(proto, mixin.prototype);
			});

			delete description.Implements;
		}

		assign(proto, description);

		proto.constructor = constr;

		return constr;
	}

	/**
	 * @typesign (err);
	 */
	var logError;

	if (global.console) {
		if (console.error) {
			logError = function(err) {
				console.error(err === Object(err) && err.stack || err);
			};
		} else {
			logError = function(err) {
				console.log('Error: ' + (err === Object(err) && err.stack || err));
			};
		}
	} else {
		logError = function() {};
	}

	cellx.logError = logError;

	// gulp-include
	(function() {
		var Map = global.Map;
	
		if (!Map) {
			var entryStub = {
				value: undefined
			};
	
			Map = createClass({
				constructor: function(entries) {
					this._entries = Object.create(null);
					this._objectStamps = {};
	
					this._first = null;
					this._last = null;
	
					this.size = 0;
	
					if (entries) {
						for (var i = 0, l = entries.length; i < l; i++) {
							this.set(entries[i][0], entries[i][1]);
						}
					}
				},
	
				has: function(key) {
					return !!this._entries[this._getValueStamp(key)];
				},
	
				get: function(key) {
					return (this._entries[this._getValueStamp(key)] || entryStub).value;
				},
	
				set: function(key, value) {
					var entries = this._entries;
					var keyStamp = this._getValueStamp(key);
	
					if (entries[keyStamp]) {
						entries[keyStamp].value = value;
					} else {
						var entry = entries[keyStamp] = {
							key: key,
							keyStamp: keyStamp,
							value: value,
							prev: this._last,
							next: null
						};
	
						if (this.size++) {
							this._last.next = entry;
						} else {
							this._first = entry;
						}
	
						this._last = entry;
					}
	
					return this;
				},
	
				delete: function(key) {
					var keyStamp = this._getValueStamp(key);
					var entry = this._entries[keyStamp];
	
					if (!entry) {
						return false;
					}
	
					if (--this.size) {
						var prev = entry.prev;
						var next = entry.next;
	
						if (prev) {
							prev.next = next;
						} else {
							this._first = next;
						}
	
						if (next) {
							next.prev = prev;
						} else {
							this._last = prev;
						}
					} else {
						this._first = null;
						this._last = null;
					}
	
					delete this._entries[keyStamp];
					delete this._objectStamps[keyStamp];
	
					return true;
				},
	
				clear: function() {
					var entries = this._entries;
	
					for (var stamp in entries) {
						delete entries[stamp];
					}
	
					this._objectStamps = {};
	
					this._first = null;
					this._last = null;
	
					this.size = 0;
				},
	
				_getValueStamp: function(value) {
					switch (typeof value) {
						case 'undefined': {
							return 'undefined';
						}
						case 'object': {
							if (value === null) {
								return 'null';
							}
	
							break;
						}
						case 'boolean': {
							return '?' + value;
						}
						case 'number': {
							return '+' + value;
						}
						case 'string': {
							return ',' + value;
						}
					}
	
					return this._getObjectStamp(value);
				},
	
				_getObjectStamp: function(obj) {
					if (!hasOwn.call(obj, KEY_UID)) {
						if (!Object.isExtensible(obj)) {
							var stamps = this._objectStamps;
							var stamp;
	
							for (stamp in stamps) {
								if (stamps[stamp] == obj) {
									return stamp;
								}
							}
	
							stamp = String(++uidCounter);
							stamps[stamp] = obj;
	
							return stamp;
						}
	
						Object.defineProperty(obj, KEY_UID, {
							value: String(++uidCounter)
						});
					}
	
					return obj[KEY_UID];
				},
	
				forEach: function(cb, context) {
					if (context == null) {
						context = global;
					}
	
					var entry = this._first;
	
					while (entry) {
						cb.call(context, entry.value, entry.key, this);
	
						do {
							entry = entry.next;
						} while (entry && !this._entries[entry.keyStamp]);
					}
				},
	
				toString: function() {
					return '[object Map]';
				}
			});
	
			[
				['keys', function(entry) {
					return entry.key;
				}],
				['values', function(entry) {
					return entry.value;
				}],
				['entries', function(entry) {
					return [entry.key, entry.value];
				}]
			].forEach(function(iterator) {
				var getStepValue = iterator[1];
	
				Map.prototype[iterator[0]] = function() {
					var entries = this._entries;
					var entry;
					var done = false;
					var map = this;
	
					return {
						next: function() {
							if (!done) {
								if (entry) {
									do {
										entry = entry.next;
									} while (entry && !entries[entry.keyStamp]);
								} else {
									entry = map._first;
								}
	
								if (entry) {
									return {
										value: getStepValue(entry),
										done: false
									};
								}
	
								done = true;
							}
	
							return {
								value: undefined,
								done: true
							};
						}
					};
				};
			});
		}
	
		cellx.Map = Map;
	})();
	
	(function() {
		/**
		 * @typesign (cb: ());
		 */
		var nextTick;
	
		if (global.process && process.toString() == '[object process]' && process.nextTick) {
			nextTick = process.nextTick;
		} else if (global.setImmediate) {
			nextTick = function(cb) {
				setImmediate(cb);
			};
		} else if (global.Promise && Promise.toString().indexOf('[native code]') != -1) {
			var prm = Promise.resolve();
	
			nextTick = function(cb) {
				prm.then(function() {
					cb();
				});
			};
		} else if (global.postMessage && !global.ActiveXObject) {
			var queue;
	
			global.addEventListener('message', function() {
				if (queue) {
					var q = queue;
	
					queue = null;
	
					for (var i = 0, l = q.length; i < l; i++) {
						try {
							q[i]();
						} catch (err) {
							cellx.logError(err);
						}
					}
				}
			}, false);
	
			nextTick = function(cb) {
				if (queue) {
					queue.push(cb);
				} else {
					queue = [cb];
					global.postMessage('__tic__', '*');
				}
			};
		} else {
			nextTick = function(cb) {
				setTimeout(cb, 1);
			};
		}
	
		cellx.nextTick = nextTick;
	})();
	
	/**
	 * @typedef {{
	 *     target?: Object,
	 *     type: string,
	 *     bubbles?: boolean,
	 *     isPropagationStopped?: boolean
	 * }} cellx~Event
	 */
	
	(function() {
		var KEY_INNER = '__cellx_EventEmitter_inner__';
	
		if (global.Symbol && typeof Symbol.iterator == 'symbol') {
			KEY_INNER = Symbol(KEY_INNER);
		}
	
		/**
		 * @class cellx.EventEmitter
		 * @extends {Object}
		 * @typesign new (parent: cellx.EventEmitter): cellx.EventEmitter;
		 */
		var EventEmitter = createClass({
			Static: {
				KEY_INNER: KEY_INNER
			},
	
			constructor: function(parent) {
				/**
				 * @type {cellx.EventEmitter}
				 */
				this.parent = parent || null;
	
				/**
				 * @type {Object<Array<{ listener: (evt: cellx~Event): boolean|undefined, context: Object }>>}
				 */
				this._events = Object.create(null);
			},
	
			/**
			 * @typesign (
			 *     type: string,
			 *     listener: (evt: cellx~Event): boolean|undefined,
			 *     context?: Object
			 * ): cellx.EventEmitter;
			 *
			 * @typesign (
			 *     listeners: Object<(evt: cellx~Event): boolean|undefined>,
			 *     context?: Object
			 * ): cellx.EventEmitter;
			 */
			on: function(type, listener, context) {
				if (typeof type == 'object') {
					context = listener;
	
					var listeners = type;
	
					for (type in listeners) {
						this._on(type, listeners[type], context);
					}
				} else {
					this._on(type, listener, context);
				}
	
				return this;
			},
			/**
			 * @typesign (
			 *     type: string,
			 *     listener: (evt: cellx~Event): boolean|undefined,
			 *     context?: Object
			 * ): cellx.EventEmitter;
			 *
			 * @typesign (
			 *     listeners: Object<(evt: cellx~Event): boolean|undefined>,
			 *     context?: Object
			 * ): cellx.EventEmitter;
			 *
			 * @typesign (): cellx.EventEmitter;
			 */
			off: function(type, listener, context) {
				if (type) {
					if (typeof type == 'object') {
						context = listener;
	
						var listeners = type;
	
						for (type in listeners) {
							this._off(type, listeners[type], context);
						}
					} else {
						this._off(type, listener, context);
					}
				} else if (this._events) {
					this._events = Object.create(null);
				}
	
				return this;
			},
	
			/**
			 * @typesign (
			 *     type: string,
			 *     listener: (evt: cellx~Event): boolean|undefined,
			 *     context?: Object
			 * );
			 */
			_on: function(type, listener, context) {
				var index = type.indexOf(':');
	
				if (index != -1) {
					this['_' + type.slice(index + 1)]('on', type.slice(0, index), listener, context);
				} else {
					var events = (this._events || (this._events = Object.create(null)))[type];
	
					if (!events) {
						events = this._events[type] = [];
					}
	
					events.push({
						listener: listener,
						context: context || this
					});
				}
			},
			/**
			 * @typesign (
			 *     type: string,
			 *     listener: (evt: cellx~Event): boolean|undefined,
			 *     context?: Object
			 * );
			 */
			_off: function(type, listener, context) {
				var index = type.indexOf(':');
	
				if (index != -1) {
					this['_' + type.slice(index + 1)]('off', type.slice(0, index), listener, context);
				} else {
					var events = this._events && this._events[type];
	
					if (!events) {
						return;
					}
	
					if (!context) {
						context = this;
					}
	
					for (var i = events.length; i;) {
						var evt = events[--i];
	
						if (evt.context == context && (evt.listener == listener || evt.listener[KEY_INNER] === listener)) {
							events.splice(i, 1);
							break;
						}
					}
	
					if (!events.length) {
						delete this._events[type];
					}
				}
			},
	
			/**
			 * @typesign (
			 *     type: string,
			 *     listener: (evt: cellx~Event): boolean|undefined,
			 *     context?: Object
			 * ): cellx.EventEmitter;
			 */
			once: function(type, listener, context) {
				function wrapper() {
					this._off(type, wrapper, context);
					return listener.apply(this, arguments);
				}
				wrapper[KEY_INNER] = listener;
	
				this._on(type, wrapper, context);
	
				return this;
			},
	
			/**
			 * @typesign (evt: cellx~Event): cellx~Event;
			 * @typesign (type: string): cellx~Event;
			 */
			emit: function(evt) {
				if (typeof evt == 'string') {
					evt = {
						target: this,
						type: evt
					};
				} else if (!evt.target) {
					evt.target = this;
				}
	
				this._handleEvent(evt);
	
				return evt;
			},
	
			/**
			 * @typesign (evt: cellx~Event);
			 */
			_handleEvent: function(evt) {
				var events = this._events && this._events[evt.type];
	
				if (events) {
					events = events.slice();
	
					for (var i = 0, l = events.length; i < l; i++) {
						try {
							if (events[i].listener.call(events[i].context, evt) === false) {
								evt.isPropagationStopped = true;
							}
						} catch (err) {
							this._logError(err);
						}
					}
				}
	
				if (this.parent && evt.bubbles !== false && !evt.isPropagationStopped) {
					this.parent._handleEvent(evt);
				}
			},
	
			/**
			 * @typesign (err);
			 */
			_logError: function(err) {
				cellx.logError(err);
			}
		});
	
		cellx.EventEmitter = EventEmitter;
	})();
	
	var ObservableCollection;
	
	(function() {
		var Map = cellx.Map;
		var EventEmitter = cellx.EventEmitter;
	
		ObservableCollection = createClass({
			Extends: EventEmitter,
	
			constructor: function() {
				/**
				 * @type {Map<*, uint>}
				 */
				this._valueCounts = new Map();
			},
	
			/**
			 * @typesign (evt: cellx~Event);
			 */
			_onItemChange: function(evt) {
				this._handleEvent(evt);
			},
	
			/**
			 * @typesign (value);
			 */
			_registerValue: function(value) {
				var valueCounts = this._valueCounts;
				var valueCount = valueCounts.get(value);
	
				if (valueCount) {
					valueCounts.set(value, valueCount + 1);
				} else {
					valueCounts.set(value, 1);
	
					if (this.adoptsItemChanges && value instanceof EventEmitter) {
						value.on('change', this._onItemChange, this);
					}
				}
			},
	
			/**
			 * @typesign (value);
			 */
			_unregisterValue: function(value) {
				var valueCounts = this._valueCounts;
				var valueCount = valueCounts.get(value);
	
				if (valueCount > 1) {
					valueCounts.set(value, valueCount - 1);
				} else {
					valueCounts.delete(value);
	
					if (this.adoptsItemChanges && value instanceof EventEmitter) {
						value.off('change', this._onItemChange, this);
					}
				}
			},
	
			/**
			 * Уничтожает инстанс освобождая занятые им ресурсы.
			 * @typesign ();
			 */
			dispose: function() {
				if (this.adoptsItemChanges) {
					this._valueCounts.forEach(function(value) {
						if (value instanceof EventEmitter) {
							value.off('change', this._onItemChange, this);
						}
					}, this);
				}
			}
		});
	})();
	
	(function() {
		var Map = cellx.Map;
		var EventEmitter = cellx.EventEmitter;
	
		/**
		 * @class cellx.ObservableMap
		 * @extends {cellx.EventEmitter}
		 * @implements {ObservableCollection}
		 *
		 * @typesign new (entries?: Object|Array<{ 0, 1 }>|cellx.ObservableMap, opts?: {
		 *     adoptsItemChanges: boolean = true
		 * }): cellx.ObservableMap;
		 */
		var ObservableMap = createClass({
			Extends: EventEmitter,
			Implements: [ObservableCollection],
	
			constructor: function(entries, opts) {
				EventEmitter.call(this);
				ObservableCollection.call(this);
	
				this._entries = new Map();
	
				this.size = 0;
	
				/**
				 * @type {boolean}
				 */
				this.adoptsItemChanges = !opts || opts.adoptsItemChanges !== false;
	
				if (entries) {
					var mapEntries = this._entries;
	
					if (entries instanceof ObservableMap) {
						entries._entries.forEach(function(value, key) {
							mapEntries.set(key, value);
							this._registerValue(value);
						}, this);
					} else if (isArray(entries)) {
						for (var i = 0, l = entries.length; i < l; i++) {
							var entry = entries[i];
	
							mapEntries.set(entry[0], entry[1]);
							this._registerValue(entry[1]);
						}
					} else {
						for (var key in entries) {
							mapEntries.set(key, entries[key]);
							this._registerValue(entries[key]);
						}
					}
	
					this.size = mapEntries.size;
				}
			},
	
			/**
			 * @typesign (key): boolean;
			 */
			has: function(key) {
				return this._entries.has(key);
			},
	
			/**
			 * @typesign (value): boolean;
			 */
			contains: function(value) {
				return this._valueCounts.has(value);
			},
	
			/**
			 * @typesign (key): *;
			 */
			get: function(key) {
				return this._entries.get(key);
			},
	
			/**
			 * @typesign (key, value): cellx.ObservableMap;
			 */
			set: function(key, value) {
				var entries = this._entries;
				var hasKey = entries.has(key);
				var oldValue;
	
				if (hasKey) {
					oldValue = entries.get(key);
	
					if (is(oldValue, value)) {
						return this;
					}
	
					this._unregisterValue(oldValue);
				}
	
				entries.set(key, value);
				this._registerValue(value);
	
				if (!hasKey) {
					this.size++;
				}
	
				this.emit({
					type: 'change',
					subtype: hasKey ? 'update' : 'add',
					key: key,
					oldValue: oldValue,
					value: value
				});
	
				return this;
			},
	
			/**
			 * @typesign (key): boolean;
			 */
			delete: function(key) {
				var entries = this._entries;
	
				if (!entries.has(key)) {
					return false;
				}
	
				var value = entries.get(key);
	
				entries.delete(key);
				this._unregisterValue(value);
	
				this.size--;
	
				this.emit({
					type: 'change',
					subtype: 'delete',
					key: key,
					oldValue: value,
					value: undefined
				});
	
				return true;
			},
	
			/**
			 * @typesign (): cellx.ObservableMap;
			 */
			clear: function() {
				if (!this.size) {
					return this;
				}
	
				this._entries.clear();
				this._valueCounts.clear();
				this.size = 0;
	
				this.emit({
					type: 'change',
					subtype: 'clear'
				});
	
				return this;
			},
	
			/**
			 * @typesign (cb: (value, key, map: cellx.ObservableMap), context?: Object);
			 */
			forEach: function(cb, context) {
				if (context == null) {
					context = global;
				}
	
				this._entries.forEach(function(value, key) {
					cb.call(context, value, key, this);
				}, this);
			},
	
			/**
			 * @typesign (): { next: (): { value, done: boolean } };
			 */
			keys: function() {
				return this._entries.keys();
			},
	
			/**
			 * @typesign (): { next: (): { value, done: boolean } };
			 */
			values: function() {
				return this._entries.values();
			},
	
			/**
			 * @typesign (): { next: (): { value: { 0, 1 }, done: boolean } };
			 */
			entries: function() {
				return this._entries.entries();
			},
	
			/**
			 * @typesign (): cellx.ObservableMap;
			 */
			clone: function() {
				return new this.constructor(this, {
					adoptsItemChanges: this.adoptsItemChanges
				});
			}
		});
	
		cellx.ObservableMap = ObservableMap;
	
		/**
		 * @typesign (
		 *     entries?: Object|Array<{ 0, 1 }>|cellx.ObservableMap,
		 *     opts?: { adoptsItemChanges: boolean = true }
		 * ): cellx.ObservableMap;
		 *
		 * @typesign (
		 *     entries?: Object|Array<{ 0, 1 }>|cellx.ObservableMap,
		 *     adoptsItemChanges: boolean = true
		 * ): cellx.ObservableMap;
		 */
		function map(entries, opts) {
			return new ObservableMap(entries, typeof opts == 'boolean' ? { adoptsItemChanges: opts } : opts);
		}
	
		cellx.map = map;
	})();
	
	(function() {
		var EventEmitter = cellx.EventEmitter;
	
		var arrayProto = Array.prototype;
	
		/**
		 * @typesign (a, b): -1|1|0;
		 */
		function defaultComparator(a, b) {
			if (a < b) { return -1; }
			if (a > b) { return 1; }
			return 0;
		}
	
		/**
		 * @typesign (list: cellx.ObservableList, items: Array);
		 */
		function addRange(list, items) {
			var listItems = list._items;
	
			if (list.sorted) {
				var comparator = list.comparator;
	
				for (var i = 0, l = items.length; i < l; i++) {
					var item = items[i];
					var low = 0;
					var high = listItems.length;
	
					while (low != high) {
						var mid = (low + high) >> 1;
	
						if (comparator(item, listItems[mid]) < 0) {
							high = mid;
						} else {
							low = mid + 1;
						}
					}
	
					listItems.splice(low, 0, item);
					list._registerValue(item);
				}
			} else {
				push.apply(listItems, items);
	
				for (var j = items.length; j;) {
					list._registerValue(items[--j]);
				}
			}
	
			list.length = listItems.length;
		}
	
		/**
		 * @class cellx.ObservableList
		 * @extends {cellx.EventEmitter}
		 * @implements {ObservableCollection}
		 *
		 * @typesign new (items?: Array|cellx.ObservableList, opts?: {
		 *     adoptsItemChanges: boolean = true,
		 *     comparator?: (a, b): int,
		 *     sorted?: boolean
		 * }): cellx.ObservableList;
		 */
		var ObservableList = createClass({
			Extends: EventEmitter,
			Implements: [ObservableCollection],
	
			constructor: function(items, opts) {
				EventEmitter.call(this);
				ObservableCollection.call(this);
	
				if (!opts) {
					opts = {};
				}
	
				this._items = [];
	
				this.length = 0;
	
				/**
				 * @type {boolean}
				 */
				this.adoptsItemChanges = opts.adoptsItemChanges !== false;
	
				/**
				 * @type {?Function}
				 */
				this.comparator = null;
	
				this.sorted = false;
	
				if (opts.sorted || (opts.comparator && opts.sorted !== false)) {
					this.comparator = opts.comparator || defaultComparator;
					this.sorted = true;
				}
	
				if (items) {
					addRange(this, items instanceof ObservableList ? items._items : items);
				}
			},
	
			/**
			 * @typesign (index: int, allowEndIndex: boolean = false): uint|undefined;
			 */
			_validateIndex: function(index, allowEndIndex) {
				if (index === undefined) {
					return index;
				}
	
				if (index < 0) {
					index += this.length;
	
					if (index < 0) {
						throw new RangeError('Index out of range');
					}
				} else if (index >= (this.length + (allowEndIndex ? 1 : 0))) {
					throw new RangeError('Index out of range');
				}
	
				return index;
			},
	
			/**
			 * @typesign (value): boolean;
			 */
			contains: function(value) {
				return this._valueCounts.has(value);
			},
	
			/**
			 * @typesign (value, fromIndex: int = 0): int;
			 */
			indexOf: function(value, fromIndex) {
				return this._items.indexOf(value, this._validateIndex(fromIndex));
			},
	
			/**
			 * @typesign (value, fromIndex: int = -1): int;
			 */
			lastIndexOf: function(value, fromIndex) {
				return this._items.lastIndexOf(value, this._validateIndex(fromIndex));
			},
	
			/**
			 * @typesign (index: int): *;
			 */
			get: function(index) {
				return this._items[this._validateIndex(index)];
			},
	
			/**
			 * @typesign (index: int = 0, count?: uint): Array;
			 */
			getRange: function(index, count) {
				index = this._validateIndex(index || 0, true);
	
				var items = this._items;
	
				if (count === undefined) {
					return items.slice(index);
				}
	
				if (index + count > items.length) {
					throw new RangeError('"index" and "count" do not denote a valid range');
				}
	
				return items.slice(index, index + count);
			},
	
			/**
			 * @typesign (index: int, value): cellx.ObservableList;
			 */
			set: function(index, value) {
				if (this.sorted) {
					throw new TypeError('Can\'t set to sorted list');
				}
	
				index = this._validateIndex(index);
	
				var items = this._items;
	
				if (is(items[index], value)) {
					return this;
				}
	
				this._unregisterValue(items[index]);
	
				items[index] = value;
				this._registerValue(value);
	
				this.emit('change');
	
				return this;
			},
	
			/**
			 * @typesign (index: int, items: Array): cellx.ObservableList;
			 */
			setRange: function(index, items) {
				if (this.sorted) {
					throw new TypeError('Can\'t set to sorted list');
				}
	
				index = this._validateIndex(index);
	
				var itemCount = items.length;
	
				if (!itemCount) {
					return this;
				}
	
				if (index + itemCount > this.length) {
					throw new RangeError('"index" and length of "items" do not denote a valid range');
				}
	
				var listItems = this._items;
				var changed = false;
	
				for (var i = index + itemCount; i > index;) {
					var item = items[--i];
	
					if (!is(listItems[i], item)) {
						this._unregisterValue(listItems[i]);
	
						listItems[i] = item;
						this._registerValue(item);
	
						changed = true;
					}
				}
	
				if (changed) {
					this.emit('change');
				}
	
				return this;
			},
	
			/**
			 * @typesign (item): cellx.ObservableList;
			 */
			add: function(item) {
				this.addRange([item]);
				return this;
			},
	
			/**
			 * @typesign (items: Array): cellx.ObservableList;
			 */
			addRange: function(items) {
				if (!items.length) {
					return this;
				}
	
				addRange(this, items);
				this.emit('change');
	
				return this;
			},
	
			/**
			 * @typesign (index: int, item): cellx.ObservableList;
			 */
			insert: function(index, item) {
				this.insertRange(index, [item]);
				return this;
			},
	
			/**
			 * @typesign (index: int, items: Array): cellx.ObservableList;
			 */
			insertRange: function(index, items) {
				if (this.sorted) {
					throw new TypeError('Can\'t insert to sorted list');
				}
	
				index = this._validateIndex(index, true);
	
				var itemCount = items.length;
	
				if (!itemCount) {
					return this;
				}
	
				splice.apply(this._items, [].concat(index, 0, items));
	
				for (var i = itemCount; i;) {
					this._registerValue(items[--i]);
				}
	
				this.length += itemCount;
	
				this.emit('change');
	
				return this;
			},
	
			/**
			 * @typesign (item, fromIndex: int = 0): cellx.ObservableList;
			 */
			remove: function(item, fromIndex) {
				var index = this._items.indexOf(item, this._validateIndex(fromIndex));
	
				if (index == -1) {
					return this;
				}
	
				this._items.splice(index, 1);
				this._unregisterValue(item);
	
				this.length--;
	
				this.emit('change');
	
				return this;
			},
	
			/**
			 * @typesign (item, fromIndex: int = 0): cellx.ObservableList;
			 */
			removeAll: function(item, fromIndex) {
				var items = this._items;
				var index = this._validateIndex(fromIndex);
				var changed = false;
	
				while ((index = items.indexOf(item, index)) != -1) {
					items.splice(index, 1);
					this._unregisterValue(item);
	
					changed = true;
				}
	
				if (changed) {
					this.length = items.length;
					this.emit('change');
				}
	
				return this;
			},
	
			/**
			 * @typesign (index: int): cellx.ObservableList;
			 */
			removeAt: function(index) {
				this._unregisterValue(this._items.splice(this._validateIndex(index), 1)[0]);
				this.length--;
	
				this.emit('change');
	
				return this;
			},
	
			/**
			 * @typesign (index: int = 0, count?: uint): cellx.ObservableList;
			 */
			removeRange: function(index, count) {
				index = this._validateIndex(index || 0, true);
	
				var items = this._items;
	
				if (count === undefined) {
					count = items.length - index;
				} else if (index + count > items.length) {
					throw new RangeError('"index" and "count" do not denote a valid range');
				}
	
				if (!count) {
					return this;
				}
	
				for (var i = index + count; i > index;) {
					this._unregisterValue(items[--i]);
				}
				items.splice(index, count);
	
				this.length -= count;
	
				this.emit('change');
	
				return this;
			},
	
			/**
			 * @typesign (): cellx.ObservableList;
			 */
			clear: function() {
				if (this.length) {
					this._items.length = 0;
					this._valueCounts.clear();
	
					this.length = 0;
	
					this.emit('change');
				}
	
				return this;
			},
	
			/**
			 * @typesign (separator: string = ','): string;
			 */
			join: function(separator) {
				return this._items.join(separator);
			},
	
			/**
			 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList), context: Object = global);
			 */
			forEach: null,
	
			/**
			 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList): *, context: Object = global): Array;
			 */
			map: null,
	
			/**
			 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList): boolean, context: Object = global): Array;
			 */
			filter: null,
	
			/**
			 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList): boolean, context: Object = global): boolean;
			 */
			every: null,
	
			/**
			 * @typesign (cb: (item, index: uint, arr: cellx.ObservableList): boolean, context: Object = global): boolean;
			 */
			some: null,
	
			/**
			 * @typesign (cb: (accumulator: *, item, index: uint, arr: cellx.ObservableList): *, initialValue?): *;
			 */
			reduce: null,
	
			/**
			 * @typesign (cb: (accumulator: *, item, index: uint, arr: cellx.ObservableList): *, initialValue?): *;
			 */
			reduceRight: null,
	
			/**
			 * @typesign (): cellx.ObservableList;
			 */
			clone: function() {
				return new this.constructor(this, {
					adoptsItemChanges: this.adoptsItemChanges,
					comparator: this.comparator,
					sorted: this.sorted
				});
			},
	
			/**
			 * @typesign (): Array;
			 */
			toArray: function() {
				return this._items.slice();
			},
	
			/**
			 * @typesign (): string;
			 */
			toString: function() {
				return this._items.join();
			}
		});
	
		['forEach', 'map', 'filter', 'every', 'some', 'reduce', 'reduceRight'].forEach(function(name) {
			ObservableList.prototype[name] = function() {
				return arrayProto[name].apply(this._items, arguments);
			};
		});
	
		cellx.ObservableList = ObservableList;
	
		/**
		 * @typesign (items?: Array|cellx.ObservableList, opts?: {
		 *     adoptsItemChanges: boolean = true,
		 *     comparator?: (a, b): int,
		 *     sorted?: boolean
		 * }): cellx.ObservableList;
		 *
		 * @typesign (items?: Array|cellx.ObservableList, adoptsItemChanges: boolean = true): cellx.ObservableList;
		 */
		function list(items, opts) {
			return new ObservableList(items, typeof opts == 'boolean' ? { adoptsItemChanges: opts } : opts);
		}
	
		cellx.list = list;
	})();
	
	(function() {
		var nextTick = cellx.nextTick;
		var EventEmitter = cellx.EventEmitter;
	
		var KEY_INNER = EventEmitter.KEY_INNER;
	
		var error = {
			original: null
		};
	
		var currentlyRelease = false;
	
		/**
		 * @type {Array<Array<cellx.Cell>|null>}
		 */
		var releasePlan = [[]];
	
		var releasePlanIndex = 0;
		var maxLevel = -1;
	
		var calculatedCell = null;
	
		var releaseVersion = 1;
	
		function release() {
			if (releasePlanIndex > maxLevel) {
				return;
			}
	
			currentlyRelease = true;
	
			do {
				var bundle = releasePlan[releasePlanIndex];
	
				if (bundle) {
					var cell = bundle.shift();
	
					if (releasePlanIndex) {
						var index = releasePlanIndex;
	
						cell._recalc();
	
						if (!releasePlan[index].length) {
							releasePlan[index] = null;
	
							if (releasePlanIndex) {
								releasePlanIndex++;
							}
						}
					} else {
						var changeEvent = cell._changeEvent;
	
						cell._fixedValue = cell._value;
						cell._changeEvent = null;
	
						cell._changed = true;
	
						if (cell._events.change) {
							cell._handleEvent(changeEvent);
						}
	
						var slaves = cell._slaves;
	
						for (var i = slaves.length; i;) {
							var slave = slaves[--i];
	
							if (slave._fixed) {
								(releasePlan[1] || (releasePlan[1] = [])).push(slave);
	
								if (!maxLevel) {
									maxLevel = 1;
								}
	
								slave._fixed = false;
							}
						}
	
						if (!releasePlan[0].length) {
							releasePlanIndex++;
						}
					}
				} else {
					releasePlanIndex++;
				}
			} while (releasePlanIndex <= maxLevel);
	
			maxLevel = -1;
	
			releaseVersion++;
	
			currentlyRelease = false;
		}
	
		/**
		 * @class cellx.Cell
		 * @extends {cellx.EventEmitter}
		 *
		 * @example
		 * var a = new Cell(1);
		 * var b = new Cell(2);
		 * var c = new Cell(function() {
		 *     return a.get() + b.get();
		 * });
		 *
		 * c.on('change', function() {
		 *     console.log('c = ' + c.get());
		 * });
		 *
		 * console.log(c.get());
		 * // => 3
		 *
		 * a.set(5);
		 * b.set(10);
		 * // => 'c = 15'
		 *
		 * @typesign new (value?, opts?: {
		 *     owner?: Object,
		 *     get?: (value): *,
		 *     validate?: (value): *,
		 *     onchange?: (evt: cellx~Event): boolean|undefined,
		 *     onerror?: (evt: cellx~Event): boolean|undefined,
		 *     computed?: false
		 * }): cellx.Cell;
		 *
		 * @typesign new (formula: (): *, opts?: {
		 *     owner?: Object,
		 *     get?: (value): *,
		 *     set?: (value),
		 *     validate?: (value): *,
		 *     onchange?: (evt: cellx~Event): boolean|undefined,
		 *     onerror?: (evt: cellx~Event): boolean|undefined,
		 *     computed?: true
		 * }): cellx.Cell;
		 */
		var Cell = createClass({
			Extends: EventEmitter,
	
			constructor: function(value, opts) {
				EventEmitter.call(this);
	
				if (!opts) {
					opts = {};
				}
	
				this.owner = opts.owner || null;
	
				this.computed = typeof value == 'function' &&
					(opts.computed !== undefined ? opts.computed : value.constructor == Function);
	
				this._value = undefined;
				this._fixedValue = undefined;
				this.initialValue = undefined;
				this._formula = null;
	
				this._get = opts.get || null;
				this._set = opts.set || null;
	
				this._validate = opts.validate || null;
	
				/**
				 * Ведущие ячейки.
				 * @type {?Array<cellx.Cell>}
				 */
				this._masters = null;
				/**
				 * Ведомые ячейки.
				 * @type {Array<cellx.Cell>}
				 */
				this._slaves = [];
	
				/**
				 * @type {uint|undefined}
				 */
				this._level = 0;
	
				this._active = !this.computed;
	
				this._changeEvent = null;
				this._isChangeCancellable = true;
	
				this._lastErrorEvent = null;
	
				this._fixed = true;
	
				this._version = 0;
	
				this._changed = false;
	
				this._circularityCounter = 0;
	
				if (this.computed) {
					this._formula = value;
				} else {
					if (this._validate) {
						this._validate.call(this.owner || this, value);
					}
	
					this._value = this._fixedValue = this.initialValue = value;
	
					if (value instanceof EventEmitter) {
						value.on('change', this._onValueChange, this);
					}
				}
	
				if (opts.onchange) {
					this.on('change', opts.onchange);
				}
				if (opts.onerror) {
					this.on('error', opts.onerror);
				}
			},
	
			/**
			 * @type {boolean}
			 */
			get changed() {
				if (!currentlyRelease) {
					release();
				}
	
				return this._changed;
			},
	
			/**
			 * @override cellx.EventEmitter#on
			 */
			on: function(type, listener, context) {
				if (!currentlyRelease) {
					release();
				}
	
				if (this.computed && !this._events.change && !this._slaves.length) {
					this._activate();
				}
	
				EventEmitter.prototype.on.call(this, type, listener, context);
	
				return this;
			},
			/**
			 * @override cellx.EventEmitter#off
			 */
			off: function(type, listener, context) {
				if (!currentlyRelease) {
					release();
				}
	
				EventEmitter.prototype.off.call(this, type, listener, context);
	
				if (this.computed && !this._events.change && !this._slaves.length) {
					this._deactivate();
				}
	
				return this;
			},
	
			/**
			 * @override cellx.EventEmitter#_on
			 */
			_on: function(type, listener, context) {
				EventEmitter.prototype._on.call(this, type, listener, context || this.owner);
			},
			/**
			 * @override cellx.EventEmitter#_off
			 */
			_off: function(type, listener, context) {
				EventEmitter.prototype._off.call(this, type, listener, context || this.owner);
			},
	
			/**
			 * @typesign (listener: (err: Error, evt: cellx~Event): boolean|undefined): cellx.Cell;
			 */
			subscribe: function(listener) {
				function wrapper(evt) {
					return listener.call(this, evt.error || null, evt);
				}
				wrapper[KEY_INNER] = listener;
	
				this
					.on('change', wrapper)
					.on('error', wrapper);
	
				return this;
			},
			/**
			 * @typesign (listener: (err: Error, evt: cellx~Event): boolean|undefined): cellx.Cell;
			 */
			unsubscribe: function(listener) {
				this
					.off('change', listener)
					.off('error', listener);
	
				return this;
			},
	
			/**
			 * @typesign (slave: cellx.Cell);
			 */
			_registerSlave: function(slave) {
				if (this.computed && !this._events.change && !this._slaves.length) {
					this._activate();
				}
	
				this._slaves.push(slave);
			},
			/**
			 * @typesign (slave: cellx.Cell);
			 */
			_unregisterSlave: function(slave) {
				this._slaves.splice(this._slaves.indexOf(slave), 1);
	
				if (this.computed && !this._events.change && !this._slaves.length) {
					this._deactivate();
				}
			},
	
			/**
			 * @typesign ();
			 */
			_activate: function() {
				if (this._version != releaseVersion) {
					this._masters = null;
					this._level = 0;
	
					var value = this._tryFormula();
	
					if (value === error) {
						this._handleError(error.original);
					} else if (!is(this._value, value)) {
						this._value = value;
						this._changed = true;
					}
	
					this._version = releaseVersion;
				}
	
				var masters = this._masters || [];
	
				for (var i = masters.length; i;) {
					masters[--i]._registerSlave(this);
				}
	
				this._active = true;
			},
			/**
			 * @typesign ();
			 */
			_deactivate: function() {
				var masters = this._masters || [];
	
				for (var i = masters.length; i;) {
					masters[--i]._unregisterSlave(this);
				}
	
				this._active = false;
			},
	
			/**
			 * @typesign (evt: cellx~Event);
			 */
			_onValueChange: function(evt) {
				if (this._changeEvent) {
					evt.prev = this._changeEvent;
	
					this._changeEvent = evt;
	
					if (this._value === this._fixedValue) {
						this._isChangeCancellable = false;
					}
				} else {
					releasePlan[0].push(this);
	
					releasePlanIndex = 0;
	
					if (maxLevel == -1) {
						maxLevel = 0;
					}
	
					evt.prev = null;
	
					this._changeEvent = evt;
					this._isChangeCancellable = false;
	
					if (!currentlyRelease) {
						nextTick(release);
					}
				}
			},
	
			/**
			 * @typesign (): *;
			 */
			get: function() {
				if (!currentlyRelease) {
					release();
				}
	
				if (this.computed && !this._active && this._version != releaseVersion) {
					this._masters = null;
					this._level = 0;
	
					var value = this._tryFormula();
	
					if (value === error) {
						this._handleError(error.original);
					} else {
						if (!is(this._value, value)) {
							this._value = value;
							this._changed = true;
						}
					}
	
					this._version = releaseVersion;
				}
	
				if (calculatedCell) {
					if (calculatedCell._masters) {
						if (calculatedCell._masters.indexOf(this) == -1) {
							calculatedCell._masters.push(this);
	
							if (calculatedCell._level <= this._level) {
								calculatedCell._level = this._level + 1;
							}
						}
					} else {
						calculatedCell._masters = [this];
						calculatedCell._level = this._level + 1;
					}
				}
	
				return this._get ? this._get.call(this.owner || this, this._value) : this._value;
			},
	
			/**
			 * @typesign (value): boolean;
			 */
			set: function(value) {
				if (this.computed && !this._set) {
					throw new TypeError('Cannot write to read-only cell');
				}
	
				var oldValue = this._value;
	
				if (is(oldValue, value)) {
					return false;
				}
	
				if (this._validate) {
					this._validate.call(this.owner || this, value);
				}
	
				if (this.computed) {
					this._set.call(this.owner || this, value);
				} else {
					this._value = value;
	
					if (oldValue instanceof EventEmitter) {
						oldValue.off('change', this._onValueChange, this);
					}
					if (value instanceof EventEmitter) {
						value.on('change', this._onValueChange, this);
					}
	
					if (this._changeEvent) {
						if (is(value, this._fixedValue) && this._isChangeCancellable) {
							if (releasePlan[0].length == 1) {
								releasePlan[0].pop();
	
								if (!maxLevel) {
									maxLevel = -1;
								}
							} else {
								releasePlan[0].splice(releasePlan[0].indexOf(this), 1);
							}
	
							this._changeEvent = null;
						} else {
							this._changeEvent = {
								target: this,
								type: 'change',
								oldValue: oldValue,
								value: value,
								prev: this._changeEvent
							};
						}
					} else {
						releasePlan[0].push(this);
	
						releasePlanIndex = 0;
	
						if (maxLevel == -1) {
							maxLevel = 0;
						}
	
						this._changeEvent = {
							target: this,
							type: 'change',
							oldValue: oldValue,
							value: value,
							prev: null
						};
						this._isChangeCancellable = true;
	
						if (!currentlyRelease) {
							nextTick(release);
						}
					}
				}
	
				return true;
			},
	
			/**
			 * @typesign (): boolean|undefined;
			 */
			recalc: function() {
				return this._recalc(true);
			},
	
			/**
			 * @typesign (force: boolean = false): boolean|undefined;
			 */
			_recalc: function(force) {
				if (!force) {
					if (this._version == releaseVersion + 1) {
						if (++this._circularityCounter == 10) {
							this._fixed = true;
							this._version = releaseVersion + 1;
	
							this._handleError(new RangeError('Circular dependency detected'));
	
							return false;
						}
					} else {
						this._circularityCounter = 1;
					}
				}
	
				var oldMasters = this._masters;
				this._masters = null;
	
				var oldLevel = this._level;
				this._level = 0;
	
				var value = this._tryFormula();
	
				var masters = this._masters || [];
				var haveRemovedMasters = false;
	
				for (var i = oldMasters.length; i;) {
					var oldMaster = oldMasters[--i];
	
					if (masters.indexOf(oldMaster) == -1) {
						oldMaster._unregisterSlave(this);
						haveRemovedMasters = true;
					}
				}
	
				if (haveRemovedMasters || oldMasters.length < masters.length) {
					for (var j = masters.length; j;) {
						var master = masters[--j];
	
						if (oldMasters.indexOf(master) == -1) {
							master._registerSlave(this);
						}
					}
	
					var level = this._level;
	
					if (level > oldLevel) {
						(releasePlan[level] || (releasePlan[level] = [])).push(this);
	
						if (maxLevel < level) {
							maxLevel = level;
						}
	
						if (force) {
							nextTick(release);
						}
	
						return;
					}
				}
	
				this._fixed = true;
				this._version = releaseVersion + 1;
	
				if (value === error) {
					this._handleError(error.original);
				} else {
					var oldValue = this._value;
	
					if (!is(oldValue, value) || value instanceof EventEmitter) {
						this._value = value;
						this._changed = true;
	
						if (this._events.change) {
							this.emit({
								type: 'change',
								oldValue: oldValue,
								value: value,
								prev: null
							});
						}
	
						var slaves = this._slaves;
	
						for (var k = slaves.length; k;) {
							var slave = slaves[--k];
	
							if (slave._fixed) {
								var slaveLevel = slave._level;
	
								(releasePlan[slaveLevel] || (releasePlan[slaveLevel] = [])).push(slave);
	
								if (maxLevel < slaveLevel) {
									maxLevel = slaveLevel;
								}
	
								slave._fixed = false;
							}
						}
	
						return true;
					}
				}
	
				return false;
			},
	
			/**
			 * @typesign (): *;
			 */
			_tryFormula: function() {
				var prevCalculatedCell = calculatedCell;
				calculatedCell = this;
	
				try {
					var value = this._formula.call(this.owner || this);
	
					if (this._validate) {
						this._validate.call(this.owner || this, value);
					}
	
					return value;
				} catch (err) {
					error.original = err;
					return error;
				} finally {
					calculatedCell = prevCalculatedCell;
				}
			},
	
			/**
			 * @typesign (err: Error);
			 */
			_handleError: function(err) {
				this._logError(err);
	
				this._handleErrorEvent({
					type: 'error',
					error: err
				});
			},
	
			/**
			 * @typesign (evt: cellx~Event);
			 */
			_handleErrorEvent: function(evt) {
				if (this._lastErrorEvent === evt) {
					return;
				}
	
				this._lastErrorEvent = evt;
	
				this._handleEvent(evt);
	
				var slaves = this._slaves;
	
				for (var i = slaves.length; i;) {
					if (evt.isPropagationStopped) {
						break;
					}
	
					slaves[--i]._handleErrorEvent(evt);
				}
			},
	
			/**
			 * @typesign (): cellx.Cell;
			 */
			dispose: function() {
				if (!currentlyRelease) {
					release();
				}
	
				this._dispose();
	
				return this;
			},
	
			/**
			 * @typesign ();
			 */
			_dispose: function() {
				this.off();
	
				if (this._active) {
					var slaves = this._slaves;
	
					for (var i = slaves.length; i;) {
						slaves[--i]._dispose();
					}
				}
			}
		});
	
		cellx.Cell = Cell;
	})();
	
	(function() {
		var Map = cellx.Map;
		var Cell = cellx.Cell;
	
		var cellProto = Cell.prototype;
	
		invokeCell = function(wrapper, initialValue, opts, owner, firstArg, otherArgs, argCount) {
			if (!owner || owner == global) {
				owner = wrapper;
			}
	
			if (!hasOwn.call(owner, KEY_CELLS)) {
				Object.defineProperty(owner, KEY_CELLS, {
					value: new Map()
				});
			}
	
			var cell = owner[KEY_CELLS].get(wrapper);
	
			if (!cell) {
				if (initialValue != null && typeof initialValue == 'object') {
					if (typeof initialValue.clone == 'function') {
						initialValue = initialValue.clone();
					} else if (isArray(initialValue)) {
						initialValue = initialValue.slice();
					} else if (initialValue.constructor === Object) {
						initialValue = assign({}, initialValue);
					} else {
						switch (toString.call(initialValue)) {
							case '[object Date]': {
								initialValue = new Date(initialValue);
								break;
							}
							case '[object RegExp]': {
								initialValue = new RegExp(initialValue);
								break;
							}
						}
					}
				}
	
				opts = Object.create(opts);
				opts.owner = owner;
	
				cell = new Cell(initialValue, opts);
				owner[KEY_CELLS].set(wrapper, cell);
			}
	
			switch (argCount) {
				case 0: {
					return cell.get();
				}
				case 1: {
					return cell.set(firstArg);
				}
				default: {
					switch (firstArg) {
						case 'bind': {
							wrapper = wrapper.bind(owner);
							wrapper.constructor = cellx;
							return wrapper;
						}
						case 'unwrap': {
							return cell;
						}
						default: {
							return cellProto[firstArg].apply(cell, otherArgs);
						}
					}
				}
			}
		};
	})();
	
	(function() {
		function observable(target, name, descr, opts) {
			if (arguments.length == 1) {
				opts = target;
	
				return function(target, name, descr) {
					return observable(target, name, descr, opts);
				};
			}
	
			if (!opts) {
				opts = {};
			}
	
			opts.computed = false;
	
			var _name = '_' + name;
	
			target[_name] = cellx(descr.initializer(), opts);
	
			return {
				configurable: descr.configurable,
				enumerable: descr.enumerable,
	
				get: function() {
					return this[_name]();
				},
	
				set: function(value) {
					this[_name](value);
				}
			};
		}
	
		function computed(target, name, descr, opts) {
			if (arguments.length == 1) {
				opts = target;
	
				return function(target, name, descr) {
					return computed(target, name, descr, opts);
				};
			}
	
			var value = descr.initializer();
	
			if (typeof value != 'function') {
				throw new TypeError('Property value must be a function');
			}
	
			if (!opts) {
				opts = {};
			}
	
			opts.computed = true;
	
			var _name = '_' + name;
	
			target[_name] = cellx(value, opts);
	
			var descr = {
				configurable: descr.configurable,
				enumerable: descr.enumerable,
	
				get: function() {
					return this[_name]();
				}
			};
	
			if (opts.set) {
				descr.set = function(value) {
					this[_name](value);
				};
			}
	
			return descr;
		}
	
		cellx.d = {
			observable: observable,
			computed: computed
		};
	})();
	

	if (typeof exports == 'object') {
		if (typeof module == 'object') {
			module.exports = cellx;
		} else {
			exports.cellx = cellx;
		}
	} else {
		global.cellx = cellx;
	}
})();
