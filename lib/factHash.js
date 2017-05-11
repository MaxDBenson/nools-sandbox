"use strict";
var extd = require("./extended"),
    declare = extd.declare,
    LinkedList = extd.LinkedList;

declare({
    instance: {
        constructor: function () {
            this.memory = {};
            this.memoryValues = new LinkedList();
        },

        clear: function () {
            this.memoryValues.clear();
            this.memory = {};
        },


        remove: function (v) {
            var hashCode = v.hashCode,
                memory = this.memory,
                ret = memory[hashCode];
            if (ret) {
                this.memoryValues.remove(ret);
                delete memory[hashCode];
            }
            return ret;
        },

        insert: function (insert) {
            var hashCode = insert.hashCode;
            if (hashCode in this.memory) {
                throw new Error("Activation already in agenda " + insert.rule.name + " agenda");
            }
            this.memoryValues.push((this.memory[hashCode] = insert));
        }
    }
}).as(module);