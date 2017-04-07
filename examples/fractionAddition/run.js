/**
	Usage: node run.js <rulefile.nools> <factFile> <SAIFile> [options...]
**/
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
		initFacts.push(new types[fact.type](...fact.args));
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

//-------- execution starts here ----------//

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


