var Super = require("./terminalNode");

Super.extend({
	
	instance: {
		__assertModify: function (context) {
            var match = context.match;
            if (match.isMatch) {
                var rule = this.rule, bucket = this.bucket;
                this.agenda.insert(this, {
                    rule: rule,
                    hashCode: context.hashCode,
                    index: this.index,
                    name: rule.name,
                    recency: bucket.recency++,
                    match: match,
                    counter: bucket.counter,
					activationId: rule.name+":"+context.hashCode
                });
            }
        }
	}
}).as(module);