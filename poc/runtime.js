function Result(success, value){
    this.success = success;
    this.value = value;
}
Result.prototype.failed = function(){
    return this.success !== true;
};
Result.prototype.makeValue = function(){
    if(this.value instanceof Symbol)
        this.value = this.value.value;
};

FunctionSymbol = (function(){
    function FunctionSymbol(params, body)
    {
        this.params = params;
        this.body = body;
    }
    
    return FunctionSymbol;
})();

Symbol = (function(){
    var UNDEFINED = "__UNDEFINED__";
    
    function Symbol(name, value)
    {
        this.value = value;
        this.name = name;
    }
    
    Symbol.Undefined = new Symbol(UNDEFINED, "undefined");
    
    Symbol.prototype.isUndefined = function(){
        return this.name === UNDEFINED;
    };
    
    return Symbol;
})();

State = (function(){
    function State()
    {
        this._symbols = {};
    }
    
    State.prototype.addSymbol = function(name, value){
        if(value === undefined) value = null;
        var symbol = new Symbol(name, value);
        if(this._symbols[name] !== undefined)
        {
            console.warn("Duplicated symbol name \"" + name + "\" in current scope. Old symbol was discarded.");
        }
        this._symbols[name] = symbol;
        return symbol;
    };
    
    State.prototype.getSymbol = function(name){
        if(this._symbols[name] === undefined) return Symbol.Undefined;
        else return this._symbols[name];
    };
    
    return State;
})();

FirstPass = (function(){
    function FirstPass()
    {
    }
    
    var defaultResult = new Result(false, null);
    
    FirstPass.prototype.acceptArray = function(arrayNodes, state){
        var result = defaultResult;
        for(var i = 0; i < arrayNodes.length; i++)
            result = this.accept(arrayNodes[i], state);
        return result;
    };
    
    FirstPass.prototype.accept = function(ast, state){
        if(ast === undefined || ast === null) throw "invalid call to accept with null ast.";
    
        var nodeType = ast.type;
        var nodes;
        var result = defaultResult;
        
        // TODO order alphabetically
        switch(nodeType)
        {
        case "Program":
            result = this.visitProgram(ast, state);
            break;
        case "ExpressionStatement":
            result = this.accept(ast.expression, state);
            break;
        case "BinaryExpression":
            result = this.visitBinaryExpression(ast, state);
            break;
        case "AssignmentExpression":
            result = this.visitAssignmentExpression(ast, state);
            break;
        case "VariableDeclaration":
            result = this.visitVariableDeclaration(ast, state);
            break;
        case "VariableDeclarator":
            result = this.visitVariableDeclarator(ast, state);
            break;
        case "CallExpression":
            result = this.visitCallExpression(ast, state);
            break;
        case "MemberExpression":
            result = this.visitMemberExperssion(ast, state);
            break;
        case "FunctionExpression":
            result = this.visitFunctionExpression(ast, state);
            break;
        case "FunctionDeclaration":
            result = this.visitFunctionDeclaration(ast, state);
            break;
        case "BlockStatement":
            result = this.visitBlockStatement(ast, state);
            break;
        case "Identifier":
            result = this.visitIdentifier(ast, state);
            break;
        case "Literal":
            result = this.visitLiteral(ast, state);
            break;
        case "UnaryExpression":
            result = this.visitUnaryExpression(ast, state);
            break;
        case "IfStatement":
            result = this.visitIfStatement(ast, state);
            break;
        }
        return result;
    };
            
    FirstPass.prototype.visitProgram = function(ast, state){
        return this.acceptArray(ast.body, state);
    };
    
    FirstPass.prototype.visitBlockStatement = function(ast, state){
        return this.acceptArray(ast.body, state);
    };
    
    FirstPass.prototype.visitMemberExperssion = function(ast, state){
    };
    
    FirstPass.prototype.visitFunctionExpression = function(ast, state){
    };
    
    FirstPass.prototype.visitFunctionDeclaration = function(ast, state){
        if(ast.id.type === "Identifier")
        {
            return this.addFunctionDeclaration(ast.id.name, ast.params, ast.body, state);
        }
        else
        {
            console.warn("Invalid function declaration.")
            return defaultResult;
        }
    };
    
    FirstPass.prototype.addFunctionDeclaration = function(name, params, body, state){
        return state.addSymbol(name, new FunctionSymbol(params, body));
    };
    
    FirstPass.prototype.visitVariableDeclaration = function(ast, state){
        if(ast.kind === "var")
        {
            this.acceptArray(ast.declarations, state);
        }
    };
    
    FirstPass.prototype.visitVariableDeclarator = function(ast, state){
        if(ast.id.type === "Identifier")
        {
            this.addLocalVariableDeclaration(ast.id.name, ast.init, state);
        }
    };
    
    FirstPass.prototype.addLocalVariableDeclaration = function(name, init, state){
        state.addSymbol(name);
        if(init !== null)
        {
            var initResult = this.accept(init, state);
            if(initResult.success)
            {
                var symbol = state.getSymbol(name);
                initResult.makeValue();
                symbol.value = initResult.value;
            }
        }
    };
    
    FirstPass.prototype.visitAssignmentExpression = function(ast, state){
        var leftResult = this.accept(ast.left, state);
        var rightResult = this.accept(ast.right, state);
        
        if(leftResult.failed()) return defaultResult;
        if(rightResult.failed()) return defaultResult;

        if(!(leftResult.value instanceof Symbol))
        {
            console.warn("ReferenceError: Invalid left-hand side in assignment.");
            return defaultResult;
        }
        if(leftResult.value.isUndefined())
        {
            var undefinedName = ast.left.name;
            console.warn("Implicit definition of property \"" + undefinedName + "\".");
            state.addSymbol(undefinedName);
            leftResult = this.accept(ast.left, state);
        }
        
        rightResult.makeValue();
        
        var symbol = leftResult.value;
        
        switch(ast.operator)
        {
        case "=":
            symbol.value = rightResult.value;
            break;
        case "+=":
            symbol.value += rightResult.value;
            break;
        case "-=":
            symbol.value -= rightResult.value;
            break;
        case "*=":
            symbol.value *= rightResult.value;
            break;
        case "%=":
            symbol.value %= rightResult.value;
            break;
        case "<<=":
            symbol.value <<= rightResult.value;
            break;
        case ">>=":
            symbol.value >>= rightResult.value;
            break;
        case ">>>=":
            symbol.value >>>= rightResult.value;
            break;
        case "&=":
            symbol.value &= rightResult.value;
            break;
        case "|=":
            symbol.value |= rightResult.value;
            break;
        case "^=":
            symbol.value ^= rightResult.value;
            break;
        }
        return new Result(true, symbol);
    };
    
    FirstPass.prototype.visitBinaryExpression = function(ast, state){
        var leftResult = this.accept(ast.left, state);
        var rightResult = this.accept(ast.right, state);
        if(leftResult.failed()) return defaultResult;
        if(rightResult.failed()) return defaultResult;

        leftResult.makeValue();
        rightResult.makeValue();
            
        var value;
        switch(ast.operator)
        {
        case "<":
            value = leftResult.value < rightResult.value;
            break;
        case ">":
            value = leftResult.value > rightResult.value;
            break;
        case "<=":
            value = leftResult.value <= rightResult.value;
            break;
        case ">=":
            value = leftResult.value >= rightResult.value;
            break;
        case "==":
            value = leftResult.value == rightResult.value;
            break;
        case "!=":
            value = leftResult.value != rightResult.value;
            break;
        case "===":
            value = leftResult.value === rightResult.value;
            break;
        case "!==":
            value = leftResult.value !== rightResult.value;
            break;
        case "+":
            value = leftResult.value + rightResult.value;
            break;
        case "-":
            value = leftResult.value - rightResult.value;
            break;
        case "*":
            value = leftResult.value * rightResult.value;
            break;
        case "%":
            value = leftResult.value % rightResult.value;
            break;
        case "<<":
            value = leftResult.value << rightResult.value;
            break;
        case ">>":
            value = leftResult.value >> rightResult.value;
            break;
        case ">>>":
            value = leftResult.value >>> rightResult.value;
            break;
        case "&":
            value = leftResult.value & rightResult.value;
            break;
        case "|":
            value = leftResult.value | rightResult.value;
            break;
        case "^":
            value = leftResult.value ^ rightResult.value;
            break;
        case "&&":
            value = leftResult.value && rightResult.value;
            break;
        case "||":
            value = leftResult.value || rightResult.value;
            break;
        }
        return new Result(true, value);
    };
    
    FirstPass.prototype.visitUnaryExpression = function(ast, state){
        var argumentResult = this.accept(ast.argument, state);
        if(argumentResult.failed()) return defaultResult;

        argumentResult.makeValue();
            
        var value;
        switch(ast.operator)
        {
        case "!":
            value = !argumentResult.value;
            break;
        // TODO add all operators in ECMA-262 section 11.4 Unary Operators
        }
        return new Result(true, value);
    };
    
    FirstPass.prototype.visitCallExpression = function(ast, state){
        // TODO implement correctly
        var calleeResult = this.accept(ast.callee, state);
        if(calleeResult.success === true)
        {
            argumentValues = [];
            argumentValue = this.accept(ast.arguments[0], state).value;
            argumentValues.push(argumentValue);
            window[calleeResult.value].apply(window, argumentValues);
        }
        return defaultResult;
    };
    
    FirstPass.prototype.visitIdentifier = function(ast, state){
        var identifier = ast.name;
        return new Result(true, state.getSymbol(identifier));
    };
    
    FirstPass.prototype.visitLiteral = function(ast, state){
        return new Result(true, ast.value);
    };
    
    FirstPass.prototype.visitIfStatement = function(ast, state){
        var testResult = this.accept(ast.test, state);

        if(testResult.failed()) return defaultResult;
            
        testResult.makeValue();
        
        if(testResult.value)
        {
            return this.accept(ast.consequent, state);
        }
        else
        {
            if(ast.alternate !== null) return this.accept(ast.alternate, state);
        }
    };
    
    FirstPass.prototype.visit = function(ast, state){
        
    };
    
    return FirstPass;
})();

function evalPuma(programStr)
{
    var ast = window.esprima.parse(programStr);
    
    var firstPass = new FirstPass();
    return firstPass.accept(ast, new State);
}

window.onload = function(){
    // evalPuma("alert(\"hello \" + \"world\");");
}
