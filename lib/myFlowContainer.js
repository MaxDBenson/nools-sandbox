var extd = require("./extended"),
    forEach = extd.forEach,
	declare = extd.declare,
	instanceOf = extd.instanceOf,
	Super = require("./flowContainer"),
	InitialFact = require("./pattern").InitialFact,
    Flow = require("./myFlow"),
	useBacktracking,
	conflictStrategies = require("./conflict"),
    conflictResolution = conflictStrategies.strategy(["salience", "activationRecency"]),
	flows = {};

var FlowContainer = declare(Super, {
	instance: {
		
		constructor: function (name, cb, backtrack) {
            this.name = name;
            this.cb = cb;
            this.__rules = [];
            this.__defined = {};
            this.conflictResolutionStrategy = conflictResolution;
            if (cb) {
                cb.call(this, this);
            }
            if (!flows.hasOwnProperty(name)) {
                flows[name] = this;
            } else {
                throw new Error("Flow with " + name + " already defined");
            }
			
			useBacktracking = !!backtrack;
        },
		
		setBacktracking: function(backtrack) {
			useBacktracking = !!backtrack;
		},
		
		getSession: function () {
			
            var flow = new Flow(this.name, this.conflictResolutionStrategy, this.__defined, useBacktracking);
            forEach(this.__rules, function (rule) {
                flow.rule(rule);
            });
            flow.assert(new InitialFact());
			//assert any facts passed in
            for (var i = 0, l = arguments.length; i < l; i++) {
                flow.assert(arguments[i]);
            }
            return flow;
        }
	},
	
	"static": {
        getFlow: function (name) {
            return flows[name];
        },

        hasFlow: function (name) {
            return extd.has(flows, name);
        },

        deleteFlow: function (name) {
            if (instanceOf(name, FlowContainer)) {
                name = name.name;
            }
            delete flows[name];
            return FlowContainer;
        },

        deleteFlows: function () {
            for (var name in flows) {
                if (name in flows) {
                    delete flows[name];
                }
            }
            return FlowContainer;
        },
		
		create: function (name, cb) {
            return new FlowContainer(name, cb);
        }
	}
}).as(module);