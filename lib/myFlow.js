"use strict";
var extd = require("./extended"),
    declare = extd.declare,
	Flow = require("./flow"),
	InitialFact = require("./pattern").InitialFact,
	Logger = require("./log"),
	StateObject = require("./stateObject");

module.exports = declare(Flow, {

    instance: {

		firstFact: null,
		logger: null,
		types: null,
		stateStack: null,

        constructor: function (name, conflictResolutionStrategy, types) {
            
			this._super(arguments);
			
			this.logger = new Logger();
			this.types = types;
			this.stateStack = [];
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
		
		log: function(flag, msg) {
			this.logger.log(flag, msg);
		},

        assert: function (fact, optId, optRecency) {
            if (fact instanceof InitialFact)
			{
				this.firstFact = fact;
			}
            var wmFact = this.workingMemory.assertFact(fact, optId, optRecency);
			this.rootNode.assertFact(wmFact);
            this.emit("assert", fact, this.getFactType(fact));
            return fact;
        },

        // This method is called to remove an existing fact from working memory
        retract: function (fact) {
            var wmFact = this.workingMemory.retractFact(fact);
            this.rootNode.retractFact(wmFact);
            this.emit("retract", fact, this.getFactType(fact));
            return fact;
        },

        // This method is called to alter an existing fact.  It is essentially a
        // retract followed by an assert.
        modify: function (fact, cb, optRecency) {
            if ("function" === typeof cb) {
                cb.call(fact, fact);
            }
            this.rootNode.modifyFact(this.workingMemory.modifyFact(fact, optRecency));
            this.emit("modify", fact, this.getFactType(fact));
            return fact;
        },
		
		getFactType: function(fact) {
			var type = typeof fact;
			if (type === "object")
			{
				type = null;
				if (fact instanceof Array) {
					type = "Array";
				} else if (fact instanceof RegExp) {
					type = "RegExp";
				} else if (fact instanceof Date) {
					type = "Date";
				} else {
					for (let t in this.types)
					{
						if (this.types.hasOwnProperty(t) && this.types[t] === fact.constructor)
						{
							type = t;
							break;
						}
					}
				}
			}
			return type;
		},
		
		pushState: function() {
			//var factRecency = ...
			//var ruleRecency = ...
			this.stateStack.push(new StateObject(0, 0, this.workingMemory.getFactIdTicker()));
		},
		
		pushUndo: function(op, fact, optProperty) {
			var states = this.stateStack,
				lastStateObj,
				inverseOp;
				
			if (states.length > 0)
			{
				lastStateObj = states[states.length-1];
				inverseOp = this.workingMemory.genUndoOperation(op, fact, optProperty);
				lastStateObj.memoryOps.push(inverseOp);
			}
		},
		
		runUndo: function(stateObject) {
			console.log("runUndoList()");
			var undoList = stateObject.memoryOps,
				undo;
			this.workingMemory.setFactIdTicker(stateObject.factIdTicker);
			if (undoList) {
				while (undoList.length > 0) {
					undo = undoList.pop();
					switch(undo.operation) {
						case "assert":
							console.log("got an assert");
							this.assert(undo.fact, undo.id, undo.recency);
						break;
						case "retract":
							console.log("got a retract");
							this.retract(undo.fact);
						break;
						case "modify":
							console.log("got a modify");
							undo.fact[undo.propertyChanged] = undo.value;
							this.modify(undo.fact, null, undo.recency);
						break;
					}
				}
			}
			else {
				console.log("no undo list to run!");
			}
		}
    }
});