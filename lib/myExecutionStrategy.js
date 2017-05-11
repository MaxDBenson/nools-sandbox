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
		
		callNext: function() {
			this.looping = true;
            var next = this.agenda.fireNext(doBacktracking);
            return isPromiseLike(next) ? this.__handleAsyncNext(next) : this.__handleSyncNext(next);
		}
	}
}).as(module);