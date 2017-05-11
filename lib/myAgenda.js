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
        fireNext: function (inBacktrackMode) {
            
			var agendaGroupStack = this.agendaGroupStack,
				ret = false,
				focusedAgenda = null,
				goBack = false;
				
            while (this.getFocusedAgenda().isEmpty() && this.getFocused() !== DEFAULT_AGENDA_GROUP)
			{
                agendaGroupStack.pop();
            }
			focusedAgenda = this.getFocusedAgenda();
			
			if (inBacktrackMode)
			{
				goBack = this.handleBacktrack(focusedAgenda);
			}
			if (!focusedAgenda.isEmpty() && !goBack) {
				var activation = this.pop();
				if (inBacktrackMode && !this.flow.iAmBacktracking) {
					while (!newActivations[activation.activationId]) {
						activation = this.pop();
					}
				}
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
			else if (goBack)
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
		
		handleBacktrack: function(focusedAgenda) {
			var agendaMap = focusedAgenda.toObject("activationId"),
				newActivationIds = Object.keys(newActivations),
				numNewActivations = newActivationIds.length,
				alreadyFired = [],
				stateAtBranch,
				ret = false;
				
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
				//get rid of activations (chains) already fired
				for (let i = 0; i < stateAtBranch.branchesExplored; i++) {
					alreadyFired.push(this.pop().activationId);
				}
				if (focusedAgenda.isEmpty()) {
					ret = true;
					this.flow.popStateStack();
				}
				oldActivations = agendaMap;
				this.emit("restore", {agenda: Object.keys(agendaMap),
									fired: alreadyFired,
									state: {factRecency: stateAtBranch.factRecency,
											ruleRecency: stateAtBranch.ruleRecency,
											factIdCounter: stateAtBranch.factIdTicker}});
			}
			else { //no new activations and not currently restoring
				ret = true;
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
				else {
					console.log("skipped duplicate activation insert: "+insert.activationId);
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
					console.log("restoring: "+id);
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