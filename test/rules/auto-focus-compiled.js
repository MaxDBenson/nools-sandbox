(function(){function _getCompiled(nools){return function(){return function(options){options=options||{};var defined={Array:Array,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Date:Date,Object:Object},scope=options.scope||{},optDefined=options.defined||{};for(var i in optDefined)defined[i]=optDefined[i];return nools.flow("auto-focus-compiled",function(){var State=defined.State=this.addDefined("State",function(){var Defined=function(name,state){this.name=name,this.state=state},proto=Defined.prototype;return proto.constructor=function(name,state){this.name=name,this.state=state},Defined}());scope.console=console,this.rule("Bootstrap",{scope:scope},[[State,"a","a.name == 'A' && a.state == 'NOT_RUN'"]],function(facts,flow){var a=facts.a,a=facts.a,modify=flow.modify;modify(a,function(){this.state="FINISHED"})}),this.rule("A to B",{scope:scope},[[State,"a","a.name == 'A' && a.state == 'FINISHED'"],[State,"b","b.name == 'B' && b.state == 'NOT_RUN'"]],function(facts,flow){var b=(facts.a,facts.a,facts.b),b=facts.b,modify=flow.modify;modify(b,function(){this.state="FINISHED"})}),this.rule("B to C",{agendaGroup:"B to C",autoFocus:!0,scope:scope},[[State,"b","b.name == 'B' && b.state == 'FINISHED'"],[State,"c","c.name == 'C' && c.state == 'NOT_RUN'"]],function(facts,flow){var c=facts.c,c=facts.c,modify=flow.modify,focus=flow.focus;modify(c,function(){this.state="FINISHED"}),focus("B to D")}),this.rule("B to D",{agendaGroup:"B to D",scope:scope},[[State,"b","b.name == 'B' && b.state == 'FINISHED'"],[State,"d","d.name == 'D' && d.state == 'NOT_RUN'"]],function(facts,flow){var d=facts.d,d=facts.d,modify=flow.modify;modify(d,function(){this.state="FINISHED"})})})}}()}"undefined"!=typeof exports?"undefined"!=typeof module&&module.exports&&(module.exports=_getCompiled(require("../../"))):"function"==typeof define&&define.amd?define(["../../"],function(nools){return _getCompiled(nools)}):_getCompiled(this.nools)()}).call(this);