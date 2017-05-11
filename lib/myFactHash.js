"use strict";
var extd = require("./extended"),
    declare = extd.declare,
    LinkedList = extd.LinkedList,
	Super = require("./factHash");

declare(Super, {
    instance: {
        insert: function (insert, skipDup) {
            var hashCode = insert.hashCode;
            if (hashCode in this.memory) {
				if (skipDup) {
					return false;
				}
				else {
					throw new Error("Activation already in agenda " + insert.rule.name + " agenda");
				}
            }
            this.memoryValues.push((this.memory[hashCode] = insert));
			return true;
        }
    }
}).as(module);