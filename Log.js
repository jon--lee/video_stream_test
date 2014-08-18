function Log(roomId){
    this.actions = [];
    this.roomId = roomId;
}

Log.prototype.getId = function(){
    return this.id;
}

Log.prototype.getActions = function(){
    return this.actions;
}

Log.prototype.addAction = function(action){
    this.actions.push(action);
}

module.exports = Log;


/*var actions = [];


exports.addAction = function(temp){
    actions.push(temp);
};


exports.getActions = function(){
    return actions;
};*/