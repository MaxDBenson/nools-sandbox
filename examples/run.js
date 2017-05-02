/**
	Usage: node run.js <rulefile.nools> <factFile> <SAIFile> [options...]
**/
var fs = require('fs');
var nools = require('../');

var haveReasserted = false;

var events = {	
	"assert": (f, t) => {
		log("assert", "FACT ASSERTED, type "+t+": " + JSON.stringify(f))
	},
	"modify": (f, t) => {
		log("modify", "FACT MODIFIED, type "+t+": " + JSON.stringify(f));
	},
	"retract": (f) => {
		if (!haveReasserted)
		{
			sessionGlobal.assert(f);
			haveReasserted = true;
		}
		log("retract", "FACT RETRACTED: "+JSON.stringify(f));
	},
	"fire": (name, rule) => {
		log("fire", "RULE FIRED: "+name);
	}
};
var flow = null, sessionGlobal = null;
var loggingFlags = {};

function log(flag, msg)
{
	if (loggingFlags[flag])
		console.log(msg);
}

function checkSAI(sai1, sai2)
{
	log('sai_check', 'Checking SAI...');
	log('sai_check', 'Student: '+JSON.stringify(sai1));
	log('sai_check', 'Predicted: '+JSON.stringify(sai2));
	var ret = (sai1.selection == sai2.selection &&
		sai1.action == sai2.action &&
		sai1.input  == sai2.input);
	
	if (ret) log('sai_check', 'Match!');
	else log('sai_check', 'No Match');
	log('sai_check', '');
	
	return ret;
}

function parseFacts(facts) {
	var types = {};
	var initFacts = [];
	facts.forEach((fact) => {
		if (!types[fact.type])
		{
			types[fact.type] = flow.getDefined(fact.type);
		}
		var leFact = new types[fact.type](...fact.args);
		initFacts.push(leFact);
		if (fact.other)
		{
			leFact.friends = [];
			leFact.friends.push(new types[fact.type]('jorg', 10, 12));
			leFact.friends.push(new types[fact.type]('verbn', 2, 3));
			leFact.friends.push(new types[fact.type]('hemlor', 8, 67));
		}
	});
	return initFacts;
}

function parseSAIs(sais) {
	var initSAIs = [];
	var SAI = flow.getDefined("StudentValues");
	sais.forEach((sai) => {
		initSAIs.push(new SAI(sai.selection, sai.action, sai.input));
	});
	return initSAIs;
}

function execFlow(facts, optSAIs) {
	var session = sessionGlobal = flow.getSession();
	
	//set up listeners
	for (let e in events)
	{
		if (events.hasOwnProperty(e))
		{
			listen(session, e, events[e]);
		}
	}
	
	//get session and assert facts
	facts.forEach(function(fact) {
		console.log("asserting fact: "+fact);
		session.assert(fact);
	});
/*	
	console.log("Printing session: ");
	session.print();
*/
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

function assertNextSAI(session, sais) {
	let nextSAI = sais.shift();
	log('sai_assert', "SAI ASSERTED: "+JSON.stringify(nextSAI)+'\n');
	session.assert(nextSAI);
	session.matchUntilHalt().then(
		() => { assertNextSAI(session, sais) },
		(err) => {
			console.log("There was an error");
			console.log(err);
		}
	);
}

function listen(session, e, f)
{
	session.on(e, f);
}

function reassertInitial() 
{
	sessionGlobal.reassertInitial();
}

//-------- execution starts here ----------//

//get args
var args = process.argv.slice(2),
	ruleFile,
	factFile,
	saiFile;

if (args.length < 2)
{
	console.log('Usage: node run.js <rulefile.nools> <factFile> [SAIFile] [-l[assert][retract][modify][fire][sai_check][sai_assert]]');
	process.exit();
}

ruleFile = args[0];
factFile = args[1].includes(".wme") ? args[1] : null;
saiFile = factFile ? args[2] : (args[1].includes(".sai") ? args[1] : null);

let i = args.indexOf('-l');
if (i > -1)
{
	while (i < args.length)
	{
		loggingFlags[args[i++]] = true;
	}
}

//get nools flow
flow = nools.compile(ruleFile, {scope: {checkSAI: checkSAI, reassertInitial: reassertInitial}});

var gotFacts = function(err, data) {
	if (err) throw err
	var facts = [];
	if (data)
		facts = parseFacts(JSON.parse(data));
	
	if (saiFile && fs.existsSync(saiFile))
	{
		fs.readFile(saiFile, (err, saiData) => {
			if (err) throw err;
			var sais = parseSAIs(JSON.parse(saiData));
			execFlow(facts, sais);
		});
	}
	else
	{
		execFlow(facts);
	}

}

if (factFile)
	fs.readFile(factFile, gotFacts);
else
	gotFacts();

