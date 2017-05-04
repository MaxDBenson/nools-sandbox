var extd = require("./extended"),
	declare = extd.declare;

module.exports = declare({
	
	instance: {
		flags: null,
		
		constructor: function(toSet) {
			this.flags = {};
			if (toSet)
			{
				if (typeof toSet !== "array") {
					toSet = [toSet];
				}
				toSet.forEach(function(flag) {
					this.set(flag);
				});
			}
		},
		
		isSet: function(flag) {
			return !!this.flags[flag];
		},
		
		set: function(flag) {
			this.flags[flag] = true;
		},
		
		unset: function(flag) {
			this.flags[flag] = false;
		},
		
		log: function(flag, msg) {
			if (this.flags[flag]) {
				console.log(msg);
			}
		}
	}
});