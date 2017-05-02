"use strict";
var extd = require("./extended"),
    bind = extd.bind,
    declare = extd.declare,
    nodes = require("./nodes"),
	InitialFact = require("./pattern").InitialFact,
    EventEmitter = require("events").EventEmitter,
    wm = require("./myWorkingMemory"),
    WorkingMemory = wm.WorkingMemory,
    ExecutionStragegy = require("./executionStrategy"),
    AgendaTree = require("./myAgenda"),
	Logger = require("./log");

module.exports = declare(EventEmitter, {

    instance: {

		firstFact: null,
	
        name: null,

        executionStrategy: null,
		
		logger: null,
		
		types: null,

        constructor: function (name, conflictResolutionStrategy, types) {
            this.env = null;
            this.name = name;
            this.__rules = {};
            this.conflictResolutionStrategy = conflictResolutionStrategy;
            this.workingMemory = new WorkingMemory();
            this.agenda = new AgendaTree(this, conflictResolutionStrategy);
            this.agenda.on("fire", bind(this, "emit", "fire"));
            this.agenda.on("focused", bind(this, "emit", "focused"));
            this.rootNode = new nodes.RootNode(this.workingMemory, this.agenda);
            extd.bindAll(this, "halt", "assert", "retract", "modify", "focus",
              "emit", "getFacts", "getFact");
			
			this.logger = new Logger();
			this.types = types;
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
		
        getFacts: function (Type) {
            var ret;
            if (Type) {
                ret = this.workingMemory.getFactsByType(Type);
            } else {
                ret = this.workingMemory.getFacts();
            }
            return ret;
        },

        getFact: function (Type) {
            var ret;
            if (Type) {
                ret = this.workingMemory.getFactsByType(Type);
            } else {
                ret = this.workingMemory.getFacts();
            }
            return ret && ret[0];
        },

        focus: function (focused) {
            this.agenda.setFocus(focused);
            return this;
        },

        halt: function () {
            this.executionStrategy.halt();
            return this;
        },

        dispose: function () {
            this.workingMemory.dispose();
            this.agenda.dispose();
            this.rootNode.dispose();
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

        print: function () {
            this.rootNode.print();
        },

        containsRule: function (name) {
            return this.rootNode.containsRule(name);
        },

        rule: function (rule) {
            this.rootNode.assertRule(rule);
        },

        matchUntilHalt: function (cb) {
            return (this.executionStrategy = new ExecutionStragegy(this, true)).execute().classic(cb).promise();
        },

        match: function (cb) {
            return (this.executionStrategy = new ExecutionStragegy(this)).execute().classic(cb).promise();
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