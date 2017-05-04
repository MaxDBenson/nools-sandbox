var extd = require("../extended"),
    Context = require("../context"),
    isDefined = extd.isDefined,
    isArray = extd.isArray,
	Super = require("./fromNode");

var DEFAULT_MATCH = {
    isMatch: function () {
        return false;
    }
};

Super.extend({
    instance: {

        __createMatches: function (context) {
            var fh = context.factHash,
				o = this.from(fh),
				baseId = context.hashCode.replace(':', '-')+'-';
			if (isArray(o)) {
                for (var i = 0, l = o.length; i < l; i++) {
                    this.__checkMatch(context, o[i], true, baseId+i);
                }
            } else if (isDefined(o)) {
                this.__checkMatch(context, o, true, baseId+'0');
            }
        },

        __checkMatch: function (context, o, propogate, createFactId) {
            var newContext;
            if ((newContext = this.__createMatch(context, o, createFactId)).isMatch() && propogate) {
                this.__propagate("assert", newContext.clone());
            }
            return newContext;
        },

        __createMatch: function (lc, o, createFactId) {
            if (this.type(o)) {
                var createdFact = this.workingMemory.getFactHandle(o, createFactId),
                    createdContext,
                    rc = new Context(createdFact, null, null)
                        .set(this.alias, o),
                    createdFactId = createdFact.id;
                var fh = rc.factHash, lcFh = lc.factHash;
                for (var key in lcFh) {
                    fh[key] = lcFh[key];
                }
                var eqConstraints = this.__equalityConstraints, vars = this.__variables, i = -1, l = eqConstraints.length;
                while (++i < l) {
                    if (!eqConstraints[i](fh, fh)) {
                        createdContext = DEFAULT_MATCH;
                        break;
                    }
                }
                var fm = this.fromMemory[createdFactId];
                if (!fm) {
                    fm = this.fromMemory[createdFactId] = {};
                }
                if (!createdContext) {
                    var prop;
                    i = -1;
                    l = vars.length;
                    while (++i < l) {
                        prop = vars[i];
                        fh[prop] = o[prop];
                    }
                    lc.fromMatches[createdFact.id] = createdContext = rc.clone(createdFact, null, lc.match.merge(rc.match));
                }
                fm[lc.hashCode] = [lc, createdContext];
                return createdContext;
            }
            return DEFAULT_MATCH;
        }
    }
}).as(module);