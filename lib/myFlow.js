/**
*	emits events:
*		state_save -> stateData {Object} (properties are factRecency, ruleRecency, and factIdCounter)
*					a new state object representing a branch point has been created
*		
*		state_restore -> stateData {Object} same as above
*					state has been restored to a previously saved point
*
*		assert -> fact {Object}, factType {String}, isAnUndo {Boolean}
*				a fact has been asserted.  isAnUndo is true if the assertion is the result of a state restore
*
*		retract -> same params as assert
*
*		modify -> same params as assert/retract
*/

"use strict";
var extd = require("./extended"),
    declare = extd.declare,
	bind = extd.bind,
	Flow = require("./flow"),
	InitialFact = require("./pattern").InitialFact,
	Logger = require("./log"),
	StateObject = require("./stateObject"),
	ExecutionStragegy = require("./myExecutionStrategy"),
	doBacktracking = false;

module.exports = declare(Flow, {

    instance: {

		firstFact: null,
		logger: null,
		types: null,
		stateStack: null,
		iAmBacktracking: false,

        constructor: function (name, conflictResolutionStrategy, types, backtrack) {
            
			this._super(arguments);
			
			this.logger = new Logger();
			this.types = types;
			this.stateStack = [];
			doBacktracking = !!backtrack
			this.agenda.on("insert", bind(this, "emit", "agenda_insert"));
			this.agenda.on("retract", bind(this, "emit", "agenda_retract"));
			this.agenda.on("branch_point", bind(this, "emit", "state_save"));
			this.agenda.on("restore", bind(this, "emit", "state_restore"));
			this.agenda.on("backtrack", bind(this, "emit", "backtrack"));
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
            this.emit("assert", fact, this.getFactType(fact), this.iAmBacktracking);
            return fact;
        },

        // This method is called to remove an existing fact from working memory
        retract: function (fact) {
            var wmFact = this.workingMemory.retractFact(fact);
            this.rootNode.retractFact(wmFact);
            this.emit("retract", fact, this.getFactType(fact), this.iAmBacktracking);
            return fact;
        },

        // This method is called to alter an existing fact.  It is essentially a
        // retract followed by an assert.
        modify: function (fact, cb, optRecency) {
            if ("function" === typeof cb) {
                cb.call(fact, fact);
            }
            this.rootNode.modifyFact(this.workingMemory.modifyFact(fact, optRecency));
            this.emit("modify", fact, this.getFactType(fact), this.iAmBacktracking);
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
		
		peekStateStack: function(){
			if (this.stateStack.length > 0)
			{
				return this.stateStack[this.stateStack.length-1];
			}
			return null;
		},
		
		popStateStack: function() {
			this.stateStack.pop();
		},
		
		pushState: function() {
			var stateObject = new StateObject(this.rootNode.bucket.recency,
											this.workingMemory.recency,
											this.workingMemory.getFactIdTicker()); 

			this.stateStack.push(stateObject);			
			return stateObject;
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
			stateObject = stateObject || this.peekStateStack();
			this.iAmBacktracking = true;
			var undoList = stateObject.memoryOps,
				fRecency = stateObject.factRecency,
				rRecency = stateObject.ruleRecency,
				fIdTicker = stateObject.factIdTicker,
				undo;
			
			this.agenda.clear();
			this.workingMemory.setFactIdTicker(fIdTicker);
			while (undoList.length > 0) {
				undo = undoList.pop();
				switch(undo.operation) {
					case "assert":
						this.assert(undo.fact, undo.id, undo.recency);
					break;
					case "retract":
						this.retract(undo.fact);
					break;
					case "modify":
						undo.fact[undo.propertyChanged] = undo.value;
						this.modify(undo.fact, null, undo.recency);
					break;
				}
			}						
			this.workingMemory.recency = fRecency;
			this.rootNode.bucket.recency = rRecency;
		},
		
		matchUntilHalt: function (cb) {
            return (this.executionStrategy = new ExecutionStragegy(this, true, doBacktracking)).execute().classic(cb).promise();
        },

        match: function (cb) {
            return (this.executionStrategy = new ExecutionStragegy(this, false, doBacktracking)).execute().classic(cb).promise();
        }
    }
});