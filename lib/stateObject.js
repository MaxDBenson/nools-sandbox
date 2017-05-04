var extd = require("./extended"),
    declare = extd.declare;
	
module.exports = declare({
	
	instance: {
		
		memoryOps: null,
		activations: null,
		factIdTicker: 0,
		ruleRecency: 0,
		factRecency: 0,
		branchesExplored: 0,
		
		constructor: function(rRecency, fRecency, fidTicker) {
			this.factIdTicker = fidTicker;
			this.ruleRecency = rRecency;
			this.factRecency = fRecency;
			this.memoryOps = [];
		}
	}
});