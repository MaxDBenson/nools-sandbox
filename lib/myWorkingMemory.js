"use strict";
var declare = require("declare.js"),
    Super = require("./WorkingMemory"),
	id = 0;
	

var Fact = declare(Super.Fact, {

    instance: {
        constructor: function (obj, optId) {
			this._super(arguments);
			
            this.id = optId || id++;
		}
    }

});

declare(Super.WorkingMemory, {

    instance: {
		setFactIdTicker: function(val) {
			((val || val === 0) && !isNaN(val)) && (id = val);
		},
		
		getFactIdTicker: function() {
			return id;
		},
		
		assertFact: function (fact, optId, optRecency) {
            var ret = new Fact(fact, optId);
            ret.recency = optRecency || this.recency++;
            this.facts.push(ret);
            return ret;
        },
		
		modifyFact: function (fact, optRecency) {
            var head = {next: this.facts.head};
            while ((head = head.next)) {
                var existingFact = head.data;
                if (existingFact.equals(fact)) {
                    existingFact.recency = optRecency || this.recency++;
                    return existingFact;
                }
            }
            //if we made it here we did not find the fact
            throw new Error("the fact to modify does not exist");
        },
		
        getFactHandle: function (o, optId) {
            var ret = this.getFactHandleStrict(o);
            if (!ret) {
                ret = new Fact(o, optId);
                ret.recency = this.recency++;
                //this.facts.push(ret);
            }
            return ret;
        },
		
		getFactHandleStrict: function(o) {
			var head = {next: this.facts.head},
				ret = null;
            while ((head = head.next)) {
                var existingFact = head.data;
                if (existingFact.equals(o)) {
                    return existingFact;
                }
            }
			
			return ret;
		},
    
		genUndoOperation: function(op, fact, optProperty) {
			var ret = {},
				factHandle;
			ret.fact = fact;
			switch(op) {
			case 'assert':
				ret.operation = "retract";
				break;
			case 'retract':
				ret.operation = "assert";
				factHandle = this.getFactHandleStrict(fact);
				if (!factHandle) {
					throw new Error("Fact not found: genUndoOperation() couldn't find the fact");
				}
				ret.id = factHandle.id;
				ret.recency = factHandle.recency;
				break;
			case 'modify':
				ret.operation = "modify";
				factHandle = this.getFactHandleStrict(fact);
				if (!factHandle) {
					throw new Error("Fact not found: genUndoOperation() couldn't find the fact");
				}
				ret.recency = factHandle.recency;
				ret.propertyChanged = optProperty;
				ret.value = fact[optProperty];
				break;
			}
			return ret;
		}
	}

}).as(exports, "WorkingMemory");

