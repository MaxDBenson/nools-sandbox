/** 
*	emits events:
*		insert -> activationId {String}, isNewActivation {Boolean}, skipped {Boolean}
*				An activation has been passed to the agenda.  Note that the activation is only
*				actually on the agenda if "skipped" is false 
*		
*		retract -> activationId {String} an activation has been removed from the agenda
*
*		branch_point -> activationIds {Array} Nools has hit a branch point (> 1 new activations on agenda)
*
*		restore -> activationIds {Array}, activationsFired {Array} The agenda has been restored to a previous branch point
*
*		fire -> ruleName {String}, variableBindings {Object}, activationId {String}, An activation is about to fire
*	
*		backtrack -> (no params) emitted when calling backtrack
*/

"use strict";
var extd = require("./extended"),
    declare = extd.declare,
    isPromise = extd.isPromiseLike,
	Super = require("./agenda"),
	newActivations = {},
	oldActivations = {};

var DEFAULT_AGENDA_GROUP = "main";
module.exports = declare(Super, {

    instance: {
		
		terminalNodes: {},
		
		register: function(node) {
			this._super(node);
			this.terminalNodes[node.name] = node;
		},
		
		/**
		*	Fire next activation on the focused agenda
		**/
        fireNext: function (inBacktrackMode, isFirstFire) {
            
			var agendaGroupStack = this.agendaGroupStack,
				ret = false,
				focusedAgenda = null,
				goBack = false,
				agendaArray,
				activation;
				
            while (this.getFocusedAgenda().isEmpty() && this.getFocused() !== DEFAULT_AGENDA_GROUP)
			{
                agendaGroupStack.pop();
            }
			focusedAgenda = this.getFocusedAgenda();
			
			activation = this.getNextActivation(focusedAgenda, isFirstFire, inBacktrackMode);
			
			if (activation) {
				this.removeActivation(activation);
				newActivations = {};
				this.flow.iAmBacktracking = false;
				this.emit("fire", activation.rule.name, activation.match.factHash, activation.activationId);
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
			else if (inBacktrackMode)
			{
				if (this.flow.peekStateStack()) {
					this.emit("backtrack");
					this.flow.runUndo();
					ret = true;
				}
				else {
					console.log('tried all branches, returning false');
				}
			}
            return ret;
        },
		
		getNextActivation: function(focusedAgenda, isFirstFire, inBacktrackMode) {
			if (!inBacktrackMode) {
				if (!focusedAgenda.isEmpty()) {
					return this.peek();
				}else {
					return null;
				}
			}
			var agendaArray,
				agendaMap = focusedAgenda.toObject("activationId");
			if (isFirstFire) {
				newActivations = agendaMap;
			}	
			var	newActivationIds = Object.keys(newActivations),
				numNewActivations = newActivationIds.length,
				alreadyFired = [],
				stateAtBranch,
				ret = null;
				
			if (numNewActivations > 0)
			{
				if (numNewActivations > 1) //branch pt
				{
					stateAtBranch = this.flow.pushState();
					this.emit("branch_point", {agenda: newActivationIds,
												state: {factRecency: stateAtBranch.factRecency,
														ruleRecency: stateAtBranch.ruleRecency,
														factIdCounter: stateAtBranch.factIdTicker}});
					stateAtBranch.activations = newActivations;
				} 
				oldActivations = newActivations;
			}
			else if (this.flow.iAmBacktracking) //restoring state
			{
				stateAtBranch = this.flow.peekStateStack();
				var	branchPtAgenda = stateAtBranch.activations,
					activation;
				//replace any missing activations	
				for (var id in branchPtAgenda)
				{
					if (id in branchPtAgenda && !(id in agendaMap)) {
						activation = branchPtAgenda[id];
						agendaMap[id] = activation;
						this.insert(this.terminalNodes[activation.name], activation);
					}
				}
				oldActivations = agendaMap;
			}
			
			agendaArray = focusedAgenda.toArray();
			if (!this.flow.iAmBacktracking) {
				//get rid of old activations
				while (agendaArray.length > 0 && !newActivations[agendaArray[agendaArray.length-1].activationId]) {
					agendaArray.pop();
				}
			} else {
				//get rid of activations (chains) already fired
				for (let i = 0; i < stateAtBranch.branchesExplored; i++) {
					alreadyFired.push(agendaArray.pop().activationId);
				}
				//emit state restore event
				this.emit("restore", {agenda: Object.keys(agendaMap),
									fired: alreadyFired,
									state: {factRecency: stateAtBranch.factRecency,
											ruleRecency: stateAtBranch.ruleRecency,
											factIdCounter: stateAtBranch.factIdTicker}});
			}
			
			if (agendaArray.length === 0) {
				ret = null;
				if (this.flow.iAmBacktracking) {
					this.flow.popStateStack();
				}
			} else {
				ret = agendaArray[agendaArray.length-1];
			}
			
			if (stateAtBranch) {
				stateAtBranch.branchesExplored++;
			}
			return ret;
		},
		
		/**
		*	Add a new activation to the agenda
		*	@param node the terminal node which caused the activation
		*	@param insert the activation object to insert
		*/
        insert: function (node, insert, skipDup) {
			
			var rule = this.rules[node.name],
				nodeRule = node.rule,
				agendaGroup = nodeRule.agendaGroup,
				id = insert.activationId,
				lastState = this.flow.peekStateStack(),
				skip = false,
				isNew = false;
			
			if (this.flow.iAmBacktracking) {
				if (lastState && lastState.activations[id]) {
					insert.recency = lastState.activations[id].recency;
				}
				else {
					skip = true;
				}
			} else if (!oldActivations[id]) {
				newActivations[id] = insert;
				isNew = true;
			}
			if (!skip) {
				skip = !rule.factTable.insert(insert, skipDup); //rtns true if inserted
				if (!skip) {
					rule.tree.insert(insert);
					this.getAgendaGroup(agendaGroup).insert(insert);
					if (nodeRule.autoFocus) {
						this.setFocus(agendaGroup);
					}
				}
			}
			this.emit('insert', id, isNew, skip);
        },
		
		retract: function (node, retract) {
			var rule = this.rules[node.name];
            retract.rule = node;
            var activation = rule.factTable.remove(retract);
            if (activation) {
                
				this.emit("retract", activation.activationId);
				
				this.getAgendaGroup(node.rule.agendaGroup).remove(activation);
                rule.tree.remove(activation);
				delete newActivations[activation.activationId];
            }
		},
		
		clear: function() {
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
		},
		
		resetOldActivations: function() {
			oldActivations = {};
		},
		
		restoreActivations: function(activations) {
			console.log("restoreActivations() "+(this.getFocusedAgenda().isEmpty() ? "agenda empty" : "agenda not empty"));
			for (let id in activations) {
				if (activations.hasOwnProperty(id)) {
					this.insert(this.terminalNodes[activations[id].name], activations[id], true);
				}
			}
		},
		
		getAgendaMap: function() {
			return this.getFocusedAgenda().toObject("activationId");
		},
		
		print: function() {
			var agendaArray = this.getFocusedAgenda().toArray().map(function(activation){
				return activation.activationId;
			});
			this.flow.log("agenda_dump", JSON.stringify(agendaArray));
		},
		
		peek: function() {
			var tree = this.getFocusedAgenda(),
				root = tree.__root;
			
            while (root.right) {
                root = root.right;
            }
            var v = root.data;
            
			return v;
        },
		
		removeActivation: function(v) {
			var tree = this.getFocusedAgenda();
            tree.remove(v);
            var rule = this.rules[v.name];
            rule.tree.remove(v);
            rule.factTable.remove(v);
		},
		
		/**
		*	Print out an object in semi-readable form
		*	Should probably be moved to some more generic utility class
		*/
		printObj: function(obj, indent, objName, flag, maxDepth)
		{
			if (!this.flow.getLogFlagSet(flag)) {
				return;
			}
			maxDepth = (maxDepth && !isNaN(maxDepth) && maxDepth > 0) ? maxDepth : 5;
			objName = objName || "object";
			var tabStr = '';
			for (let i = 0; i < indent; i++) {
				tabStr += '-->';
			}
			for (var p in obj)
			{
				if (obj.hasOwnProperty(p))
				{
					let type = typeof(obj[p]);
					this.flow.log(flag, tabStr+objName+"["+p+"] ("+type+") : "+(type !== "object" ? obj[p] : ""));
					if (typeof obj[p] === "object" && maxDepth > 0) {
						this.printObj(obj[p], indent+1, p, flag, maxDepth-1);
					}
				}
			}
		}
    }

});