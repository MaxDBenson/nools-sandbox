"use strict";
var declare = require("declare.js"),
    Super = require("./WorkingMemory"),
	id = 0;
	

var Fact = declare(Super.Fact, {

    instance: {
        constructor: function (obj, optId) {
			this._super(arguments);
            this.id = optId || (obj.name || id++);
		}
    }

});

declare(Super.WorkingMemory, {

    instance: {

        getFactHandle: function (o, optId) {
            var head = {next: this.facts.head}, ret;
            while ((head = head.next)) {
                var existingFact = head.data;
                if (existingFact.equals(o)) {
                    return existingFact;
                }
            }
            if (!ret) {
                ret = new Fact(o, optId);
                ret.recency = this.recency++;
                //this.facts.push(ret);
            }
            return ret;
        }
    }

}).as(exports, "WorkingMemory");

