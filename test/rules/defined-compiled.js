(function(){function _getCompiled(nools){return function(){return function(options){options=options||{};var defined={Array:Array,String:String,Number:Number,Boolean:Boolean,RegExp:RegExp,Date:Date,Object:Object},scope=options.scope||{},optDefined=options.defined||{};for(var i in optDefined)defined[i]=optDefined[i];return nools.flow("defined-compiled",function(){var Point=defined.Point=this.addDefined("Point",function(){var Defined=function(x,y){this.x=x,this.y=y},proto=Defined.prototype;return proto.x=0,proto.y=0,proto.constructor=function(x,y){this.x=x,this.y=y},Defined}()),createPoint=(defined.Line=this.addDefined("Line",function(){var Defined=function(){this.points=[]},proto=Defined.prototype;return proto.points=null,proto.constructor=function(){this.points=[]},proto.addPointFromDefined=function(x,y){this.points.push(new Point(x,y))},proto.addPointWithScope=function(x,y){this.points.push(createPoint(x,y))},Defined}()),scope.createPoint=function(x,y){return new Point(x,y)});scope.console=console})}}()}"undefined"!=typeof exports?"undefined"!=typeof module&&module.exports&&(module.exports=_getCompiled(require("../../"))):"function"==typeof define&&define.amd?define(["../../"],function(nools){return _getCompiled(nools)}):_getCompiled(this.nools)()}).call(this);