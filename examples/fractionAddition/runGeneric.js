var fs = require('fs');
var nools = require('../../');

var events = {	
	"assert": (f) => {
		log("assert", "FACT ASSERTED: " + JSON.stringify(f))
	},
	"modify": (f) => {
		log("modify", "FACT MODIFIED: " + JSON.stringify(f));
	},
	"retract": (f) => {
		log("retract", "FACT RETRACTED: "+JSON.stringify(f));
	},
	"fire": (name, rule) => {
		log("fire", "RULE FIRED: "+name);
	}
};
var flow = null;
var loggingFlags = {};

function log(flag, msg)
{
	if (loggingFlags[flag])
		console.log(msg);
}

function parseFacts(facts) {
	var types = {};
	var initFacts = [];
	facts.forEach((fact) => {
		if (!types[fact.type])
		{
			types[fact.type] = flow.getDefined(fact.type);
		}
		initFacts.push(new types[fact.type](...fact.args));
	});
	return initFacts;
}

function execFlow(facts, optSAIs) {
	//get session and assert facts
	var session = flow.getSession();
	facts.forEach(function(fact) {
		session.assert(fact);
	});
	
	//set up listeners
	for (let e in events)
	{
		if (events.hasOwnProperty(e))
		{
			listen(session, e, events[e]);
		}
	}
	
	//start matchin
	console.log('\nStarting Rule Execution...\n');
	if (optSAIs)
	{
		assertNextSAI(session, optSAIs);
	}
	else
	{
		session.match().then(() => {
			console.log('Matching Done');
		},
		(err) => {
			console.log("There was an error");
			console.log(err);
		});
	}
}

function listen(session, e, f)
{
	session.on(e, f);
}

//get args
var args = process.argv.slice(2);
if (args.length < 2)
{
	console.log('Usage: node run.js <rulefile.nools> <factFile> [SAIFile] [-l[assert][retract][modify][fire][sai_check][sai_assert]]');
	process.exit();
}

let i = args.indexOf('-l');
if (i > -1)
{
	while (i < args.length)
	{
		loggingFlags[args[i++]] = true;
	}
}

//get nools flow
flow = nools.compile(args[0], {scope: {checkSAI: checkSAI}});

//get facts and (optional) fake sais
fs.readFile(args[1], (err, factData) => {
	if (err) throw err
	var facts = parseFacts(JSON.parse(factData));
	if (args[2] && fs.existsSync(args[2]))
	{
		fs.readFile(args[2], (err, saiData) => {
			if (err) throw err;
			var sais = parseSAIs(JSON.parse(saiData));
			execFlow(facts, sais);
		});
	}
	else
	{
		execFlow(facts);
	}
});


