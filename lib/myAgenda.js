"use strict";
var extd = require("./extended"),
    declare = extd.declare,
    isPromise = extd.isPromiseLike,
	Super = require("./agenda");

var DEFAULT_AGENDA_GROUP = "main";
module.exports = declare(Super, {

    instance: {

		/**
		*	Fire next activation on the focused agenda
		**/
        fireNext: function () {
            var agendaGroupStack = this.agendaGroupStack, ret = false;
            while (this.getFocusedAgenda().isEmpty() && this.getFocused() !== DEFAULT_AGENDA_GROUP) {
                agendaGroupStack.pop();
            }
            if (!this.getFocusedAgenda().isEmpty()) {
                var activation = this.pop();
                
				//save rest of agenda
				
				this.flow.log("activation_fire", "activation for rule: "+activation.rule.name+" with hashCode: "+activation.hashCode);
				this.flow.log("activation_fire");
				this.printObj(activation.match.factHash, 0, null, "activation_fire");
				this.flow.log("activation_fire");
				
				this.emit("fire", activation.rule.name, activation.match.factHash);
				var fired = activation.rule.fire(this.flow, activation.match);
                
				if (isPromise(fired)) {
                    ret = fired.then(function () {
                        //return true if an activation fired
                        return true;
                    });
                } else {
                    ret = true;
                }
            }
            //return false if activation not fired
            return ret;
        },
		
		/**
		*	Add a new activation to the agenda
		*	@param node the terminal node which caused the activation
		*	@param insert the activation object to insert
		*/
        insert: function (node, insert) {
			
			this.flow.log('agenda_insert', 'agenda insert - name: '+insert.name);
			//emit event here too?
			
			var rule = this.rules[node.name], nodeRule = node.rule, agendaGroup = nodeRule.agendaGroup;
            rule.tree.insert(insert);
            this.getAgendaGroup(agendaGroup).insert(insert);
            if (nodeRule.autoFocus) {
                this.setFocus(agendaGroup);
            }

            rule.factTable.insert(insert);
        },

        dispose: function () {
            for (var i in this.agendaGroups) {
                this.agendaGroups[i].clear();
            }
            var rules = this.rules;
            for (i in rules) {
                if (i in rules) {
                    rules[i].tree.clear();
                    rules[i].factTable.clear();

                }
            }
            this.rules = {};
        },
		
		/**
		*	Print out an object in semi-readable form
		*	Should probably be moved to some more generic utility class
		*/
		printObj: function(obj, indent, objName, flag, maxDepth)
		{
			if (!this.flow.getLogFlagSet(flag))
				return;
			
			maxDepth = (maxDepth && !isNaN(maxDepth) && maxDepth > 0) ? maxDepth : 5;
			objName = objName || "object";
			var tabStr = '';
			for (let i = 0; i < indent; i++)
				tabStr += '-->';
			for (var p in obj)
			{
				if (obj.hasOwnProperty(p))
				{
					let type = typeof(obj[p]);
					this.flow.log(flag, tabStr+objName+"["+p+"] ("+type+") : "+(type !== "object" ? obj[p] : ""));
					if (typeof obj[p] === "object" && maxDepth > 0)
						this.printObj(obj[p], indent+1, p, flag, maxDepth-1);
				}
			}
		}
    }

});