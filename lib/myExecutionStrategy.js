var Super = require("./executionStrategy"),
	extd = require("./extended"),
    isPromiseLike = extd.isPromiseLike,
	doBacktracking = false;

Super.extend({
	instance: {
		constructor: function(flow, matchUntilHalt, backtrack) {
			
			this._super(arguments);
			doBacktracking = !!backtrack;
		},
		
		callNext: function(isFirstFire) {
			this.looping = true;
            var next = this.agenda.fireNext(doBacktracking, isFirstFire);
            return isPromiseLike(next) ? this.__handleAsyncNext(next) : this.__handleSyncNext(next);
		},
		
		execute: function () {
            this.setup();
            this.callNext(true);
            return this;
        }
	}
}).as(module);