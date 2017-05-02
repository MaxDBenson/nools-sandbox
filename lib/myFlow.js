"use strict";
var extd = require("./extended"),
    declare = extd.declare,
	Flow = require("./flow"),
	InitialFact = require("./pattern").InitialFact,
	Logger = require("./log");

module.exports = declare(Flow, {

    instance: {

		firstFact: null,
		logger: null,		
		types: null,

        constructor: function (name, conflictResolutionStrategy, types) {
            
			this._super(arguments);
			
			this.logger = new Logger();
			this.types = types;
        },
		
		getLogFlagSet: function(flag) {
			return this.logger.isSet(flag);
		},
		
		setLogFlag: function(flag) {
			this.logger.set(flag);
		},
		
		unsetLogFlag: function(flag) {
			this.logger.unset(flag);
		},
		
		log: function(msg) {
			this.logger.log(msg);
		},

        assert: function (fact) {
            if (fact instanceof InitialFact)
			{
				this.firstFact = fact;
			}
			this.rootNode.assertFact(this.workingMemory.assertFact(fact));
            this.emit("assert", fact, this.getFactType(fact));
            return fact;
        },

        // This method is called to remove an existing fact from working memory
        retract: function (fact) {
            //fact = this.workingMemory.getFact(fact);
            this.rootNode.retractFact(this.workingMemory.retractFact(fact));
            this.emit("retract", fact, this.getFactType(fact));
            return fact;
        },

        // This method is called to alter an existing fact.  It is essentially a
        // retract followed by an assert.
        modify: function (fact, cb) {
            //fact = this.workingMemory.getFact(fact);
            if ("function" === typeof cb) {
                cb.call(fact, fact);
            }
            this.rootNode.modifyFact(this.workingMemory.modifyFact(fact));
            this.emit("modify", fact, this.getFactType(fact));
            return fact;
        },
		
		reassertInitial: function() {
			this.retract(this.firstFact);
			this.assert(this.firstFact);
		},
		
		getFactType: function(fact) {
			var type = typeof fact;
			if (type === "object")
			{
				type = null;
				if (fact instanceof Array)
					type = "Array";
				else if (fact instanceof RegExp)
					type = "RegExp";
				else if (fact instanceof Date)
					type = "Date";
				else
				{
					for (let t in this.types)
					{
						if (this.types.hasOwnProperty(t) && this.types[t] === fact.constructor)
						{
							type = t
							break;
						}	
					}
				}
			}
			return type;
		}
    }
});